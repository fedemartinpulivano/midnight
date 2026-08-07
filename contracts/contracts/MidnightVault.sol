// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title MidnightVault
/// @notice Non-custodial recovery vault. One clonable contract per user that holds
///         native coin + any ERC20 and enforces three human safety layers:
///
///         1. Withdrawals  — owner requests, M-of-N guardians approve. A request
///            executes automatically when the approval threshold is reached, can be
///            cancelled by the owner, is rejected only when it can mathematically no
///            longer reach the threshold, and expires after `requestTTL`.
///         2. Inheritance  — after `inactivityPeriod` without proof of life, heirs
///            claim funds pro-rata to their basis-point shares using dividend-style
///            accounting (no snapshots, late deposits distribute correctly).
///         3. Social recovery — M-of-N guardians can rotate a lost/compromised owner
///            key to a new address after a timelock the current owner can veto.
///
///         Config changes (guardians / heirs / periods) are two-phase: proposed by
///         the owner, applied only after `CONFIG_DELAY`, and vetoable by guardians.
///         Applying a config or executing a recovery invalidates all pending
///         requests and proposals, so stale approvals can never be replayed.
///
/// @dev    Deployed once as an implementation and cloned per user via EIP-1167
///         minimal proxies (see MidnightFactory). Uses an initializer instead of a
///         constructor. Self-contained on purpose: no external dependencies.
contract MidnightVault {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    enum RequestStatus {
        None,
        Pending,
        Executed,
        Cancelled,
        Rejected
    }

    enum Vote {
        None,
        Approved,
        Rejected
    }

    struct WithdrawalRequest {
        address token; // address(0) = native coin
        address to;
        uint256 amount;
        uint64 createdAt;
        uint32 approvals;
        uint32 rejections;
        RequestStatus status;
    }

    struct RecoveryProposal {
        address newOwner;
        uint64 proposedAt;
        uint32 approvals;
        bool executed;
        bool cancelled;
    }

    struct ConfigProposal {
        address[] guardians;
        uint256 threshold;
        address[] heirs;
        uint16[] shares;
        uint256 inactivityPeriod;
        uint256 requestTTL;
        uint64 proposedAt;
        uint32 vetoes;
        bool exists;
    }

    struct InitParams {
        address owner;
        address[] guardians;
        uint256 threshold;
        address[] heirs;
        uint16[] shares;
        uint256 inactivityPeriod;
        uint256 requestTTL;
    }

    /// @dev Aggregated view for the frontend: one eth_call instead of ten.
    struct VaultSummary {
        address owner;
        address[] guardians;
        uint256 threshold;
        address[] heirs;
        uint16[] shares;
        uint256 inactivityPeriod;
        uint256 requestTTL;
        uint256 lastAlive;
        uint256 nativeBalance;
        address[] trackedTokens;
        uint256 requestCount;
        uint256 minValidRequestId;
        uint256 recoveryCount;
        uint256 minValidRecoveryId;
        bool inheritanceUnlocked;
        uint256 inheritanceUnlocksAt;
        bool hasPendingConfig;
    }

    // ---------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------

    address public constant NATIVE = address(0);

    uint256 public constant MAX_GUARDIANS = 10;
    uint256 public constant MAX_HEIRS = 10;
    uint256 public constant MAX_TRACKED_TOKENS = 20;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    uint256 public constant MIN_INACTIVITY_PERIOD = 1 days;
    uint256 public constant MAX_INACTIVITY_PERIOD = 3650 days;
    uint256 public constant MIN_REQUEST_TTL = 1 hours;
    uint256 public constant MAX_REQUEST_TTL = 30 days;

    uint256 public constant CONFIG_DELAY = 2 days;
    uint256 public constant RECOVERY_DELAY = 2 days;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    bool private _initialized;
    uint256 private _reentrancyLock; // 0 = unlocked, 1 = locked

    address public owner;
    address public factory;

    address[] private _guardians;
    mapping(address => bool) public isGuardian;
    uint256 public threshold;

    address[] private _heirs;
    mapping(address => bool) public isHeir;
    mapping(address => uint16) public heirShareBps;

    uint256 public inactivityPeriod;
    uint256 public requestTTL;
    uint256 public lastAlive;

    uint256 public requestCount;
    uint256 public minValidRequestId; // requests below this id are stale
    mapping(uint256 => WithdrawalRequest) private _requests;
    mapping(uint256 => mapping(address => Vote)) public requestVote;

    address[] private _trackedTokens;
    mapping(address => bool) public isTrackedToken;

    // Dividend-style inheritance accounting, per token (NATIVE = address(0)).
    mapping(address => uint256) public totalInheritanceClaimed;
    mapping(address => mapping(address => uint256)) public inheritanceClaimedBy; // heir => token => amount

    uint256 public recoveryCount;
    uint256 public minValidRecoveryId;
    mapping(uint256 => RecoveryProposal) private _recoveries;
    mapping(uint256 => mapping(address => bool)) public recoveryApproved;

    uint256 public configNonce;
    ConfigProposal private _pendingConfig;
    mapping(uint256 => mapping(address => bool)) public configVetoed;

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error AlreadyInitialized();
    error Reentrancy();
    error NotOwner(address caller);
    error NotGuardian(address caller);
    error NotHeir(address caller);
    error ZeroAddress();
    error ZeroAmount();
    error DuplicateAddress(address account);
    error RoleConflict(address account);
    error InvalidThreshold(uint256 threshold, uint256 guardianCount);
    error InvalidShares();
    error TooMany();
    error PeriodOutOfBounds(uint256 value);
    error UnknownRequest(uint256 id);
    error StaleRequest(uint256 id);
    error RequestNotPending(uint256 id);
    error RequestExpired(uint256 id);
    error AlreadyVoted(uint256 id, address guardian);
    error InsufficientBalance(uint256 requested, uint256 available);
    error NativeTransferFailed(address to, uint256 amount);
    error TokenTransferFailed(address token, address to, uint256 amount);
    error NotAContract(address token);
    error StillActive(uint256 unlocksAt);
    error NothingToClaim();
    error UnknownRecovery(uint256 id);
    error StaleRecovery(uint256 id);
    error RecoveryClosed(uint256 id);
    error TimelockNotElapsed(uint256 readyAt);
    error ThresholdNotReached(uint256 approvals, uint256 required);
    error NoPendingConfig();
    error ConfigAlreadyPending();
    error AlreadyVetoed(address guardian);

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event VaultInitialized(address indexed owner, uint256 threshold, uint256 inactivityPeriod);
    event Deposited(address indexed from, address indexed token, uint256 amount);
    event TokenTracked(address indexed token);
    event Heartbeat(address indexed owner, uint256 timestamp);

    event WithdrawalRequested(
        uint256 indexed id, address indexed token, address indexed to, uint256 amount
    );
    event WithdrawalVoted(uint256 indexed id, address indexed guardian, bool approved);
    event WithdrawalExecuted(uint256 indexed id, address indexed token, address indexed to, uint256 amount);
    event WithdrawalCancelled(uint256 indexed id);
    event WithdrawalRejected(uint256 indexed id);

    event InheritanceClaimed(address indexed heir, address indexed token, uint256 amount);

    event RecoveryProposed(uint256 indexed id, address indexed proposer, address indexed newOwner);
    event RecoveryApproved(uint256 indexed id, address indexed guardian);
    event RecoveryVetoed(uint256 indexed id, address indexed vetoer);
    event RecoveryExecuted(uint256 indexed id, address indexed previousOwner, address indexed newOwner);

    event ConfigProposed(uint256 indexed nonce, uint256 applyAfter);
    event ConfigVetoed(uint256 indexed nonce, address indexed guardian, uint32 vetoes);
    event ConfigCancelled(uint256 indexed nonce);
    event ConfigApplied(uint256 indexed nonce);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    modifier onlyGuardian() {
        if (!isGuardian[msg.sender]) revert NotGuardian(msg.sender);
        _;
    }

    modifier onlyHeir() {
        if (!isHeir[msg.sender]) revert NotHeir(msg.sender);
        _;
    }

    modifier nonReentrant() {
        if (_reentrancyLock != 0) revert Reentrancy();
        _reentrancyLock = 1;
        _;
        _reentrancyLock = 0;
    }

    // ---------------------------------------------------------------------
    // Initialization
    // ---------------------------------------------------------------------

    /// @dev Lock the implementation contract itself so only clones can initialize.
    constructor() {
        _initialized = true;
    }

    function initialize(InitParams calldata p) external {
        if (_initialized) revert AlreadyInitialized();
        _initialized = true;

        if (p.owner == address(0)) revert ZeroAddress();
        factory = msg.sender;
        owner = p.owner;

        _setGuardians(p.guardians, p.threshold, p.owner);
        _setHeirs(p.heirs, p.shares, p.owner);
        _setPeriods(p.inactivityPeriod, p.requestTTL);

        minValidRequestId = 1;
        minValidRecoveryId = 1;
        lastAlive = block.timestamp;

        emit VaultInitialized(p.owner, p.threshold, p.inactivityPeriod);
    }

    // ---------------------------------------------------------------------
    // Deposits & proof of life
    // ---------------------------------------------------------------------

    /// @notice Anyone can fund the vault. Owner deposits also count as proof of life.
    receive() external payable {
        if (msg.sender == owner) _touch();
        emit Deposited(msg.sender, NATIVE, msg.value);
    }

    /// @notice Pull an ERC20 deposit (requires prior approve) and track the token
    ///         so it is included in inheritance claims.
    function depositToken(address token, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        _trackToken(token);
        if (msg.sender == owner) _touch();

        uint256 balanceBefore = _tokenBalance(token);
        _safeTransferFrom(token, msg.sender, address(this), amount);
        uint256 received = _tokenBalance(token) - balanceBefore;

        emit Deposited(msg.sender, token, received);
    }

    /// @notice Register a token that was sent directly via transfer so heirs can
    ///         claim it. Callable by anyone; bounded by MAX_TRACKED_TOKENS.
    function trackToken(address token) external {
        _trackToken(token);
    }

    /// @notice Free proof-of-life ping. Resets the inactivity clock without moving funds.
    function heartbeat() external onlyOwner {
        _touch();
    }

    // ---------------------------------------------------------------------
    // Withdrawals (owner requests, guardians approve M-of-N)
    // ---------------------------------------------------------------------

    function requestWithdrawal(address token, address to, uint256 amount)
        external
        onlyOwner
        returns (uint256 id)
    {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 available = token == NATIVE ? address(this).balance : _tokenBalance(token);
        if (amount > available) revert InsufficientBalance(amount, available);
        if (token != NATIVE && !isTrackedToken[token]) _trackToken(token);

        id = ++requestCount;
        _requests[id] = WithdrawalRequest({
            token: token,
            to: to,
            amount: amount,
            createdAt: uint64(block.timestamp),
            approvals: 0,
            rejections: 0,
            status: RequestStatus.Pending
        });

        _touch();
        emit WithdrawalRequested(id, token, to, amount);
    }

    function cancelWithdrawal(uint256 id) external onlyOwner {
        WithdrawalRequest storage req = _pendingRequest(id);
        req.status = RequestStatus.Cancelled;
        _touch();
        emit WithdrawalCancelled(id);
    }

    /// @notice Guardian approval. Executes automatically once `threshold` approvals
    ///         are collected.
    function approveWithdrawal(uint256 id) external onlyGuardian nonReentrant {
        WithdrawalRequest storage req = _pendingRequest(id);
        if (block.timestamp > uint256(req.createdAt) + requestTTL) revert RequestExpired(id);
        if (requestVote[id][msg.sender] != Vote.None) revert AlreadyVoted(id, msg.sender);

        requestVote[id][msg.sender] = Vote.Approved;
        req.approvals += 1;
        emit WithdrawalVoted(id, msg.sender, true);

        if (req.approvals >= threshold) {
            _executeWithdrawal(id, req);
        }
    }

    /// @notice Guardian rejection. The request dies only when it can no longer
    ///         reach the threshold — a single guardian cannot veto when N > M.
    function rejectWithdrawal(uint256 id) external onlyGuardian {
        WithdrawalRequest storage req = _pendingRequest(id);
        if (block.timestamp > uint256(req.createdAt) + requestTTL) revert RequestExpired(id);
        if (requestVote[id][msg.sender] != Vote.None) revert AlreadyVoted(id, msg.sender);

        requestVote[id][msg.sender] = Vote.Rejected;
        req.rejections += 1;
        emit WithdrawalVoted(id, msg.sender, false);

        if (req.rejections > _guardians.length - threshold) {
            req.status = RequestStatus.Rejected;
            emit WithdrawalRejected(id);
        }
    }

    function _executeWithdrawal(uint256 id, WithdrawalRequest storage req) private {
        uint256 available = req.token == NATIVE ? address(this).balance : _tokenBalance(req.token);
        if (req.amount > available) revert InsufficientBalance(req.amount, available);

        req.status = RequestStatus.Executed;
        _transferOut(req.token, req.to, req.amount);

        emit WithdrawalExecuted(id, req.token, req.to, req.amount);
    }

    // ---------------------------------------------------------------------
    // Inheritance (dividend-style, per token)
    // ---------------------------------------------------------------------

    /// @notice Claim the caller's share of one token after the inactivity period.
    /// @dev    Entitlement = (currentBalance + totalClaimed) * shareBps / 10000,
    ///         minus what this heir already claimed. No snapshots: deposits that
    ///         arrive after unlock are still split correctly, and claiming twice
    ///         only ever pays the delta.
    function claimInheritance(address token) external onlyHeir nonReentrant {
        _requireInheritanceUnlocked();
        uint256 payout = _claimableBy(msg.sender, token);
        if (payout == 0) revert NothingToClaim();

        inheritanceClaimedBy[msg.sender][token] += payout;
        totalInheritanceClaimed[token] += payout;
        _transferOut(token, msg.sender, payout);

        emit InheritanceClaimed(msg.sender, token, payout);
    }

    /// @notice Claim native + every tracked token in one transaction, skipping
    ///         empty positions instead of reverting.
    function claimAllInheritance() external onlyHeir nonReentrant {
        _requireInheritanceUnlocked();
        bool paidSomething;

        uint256 nativePayout = _claimableBy(msg.sender, NATIVE);
        if (nativePayout > 0) {
            inheritanceClaimedBy[msg.sender][NATIVE] += nativePayout;
            totalInheritanceClaimed[NATIVE] += nativePayout;
            _transferOut(NATIVE, msg.sender, nativePayout);
            emit InheritanceClaimed(msg.sender, NATIVE, nativePayout);
            paidSomething = true;
        }

        uint256 count = _trackedTokens.length;
        for (uint256 i = 0; i < count; i++) {
            address token = _trackedTokens[i];
            uint256 payout = _claimableBy(msg.sender, token);
            if (payout == 0) continue;
            inheritanceClaimedBy[msg.sender][token] += payout;
            totalInheritanceClaimed[token] += payout;
            _transferOut(token, msg.sender, payout);
            emit InheritanceClaimed(msg.sender, token, payout);
            paidSomething = true;
        }

        if (!paidSomething) revert NothingToClaim();
    }

    function _requireInheritanceUnlocked() private view {
        uint256 unlocksAt = lastAlive + inactivityPeriod;
        if (block.timestamp < unlocksAt) revert StillActive(unlocksAt);
    }

    function _claimableBy(address heir, address token) private view returns (uint256) {
        uint256 balance = token == NATIVE ? address(this).balance : _tokenBalance(token);
        uint256 totalEver = balance + totalInheritanceClaimed[token];
        uint256 entitled = (totalEver * heirShareBps[heir]) / BPS_DENOMINATOR;
        uint256 alreadyClaimed = inheritanceClaimedBy[heir][token];
        if (entitled <= alreadyClaimed) return 0;
        uint256 payout = entitled - alreadyClaimed;
        return payout > balance ? balance : payout;
    }

    // ---------------------------------------------------------------------
    // Social recovery (guardians rotate a lost owner key, owner can veto)
    // ---------------------------------------------------------------------

    function proposeRecovery(address newOwner) external onlyGuardian returns (uint256 id) {
        if (newOwner == address(0)) revert ZeroAddress();
        if (isGuardian[newOwner] || isHeir[newOwner]) revert RoleConflict(newOwner);

        id = ++recoveryCount;
        RecoveryProposal storage prop = _recoveries[id];
        prop.newOwner = newOwner;
        prop.proposedAt = uint64(block.timestamp);
        prop.approvals = 1;
        recoveryApproved[id][msg.sender] = true;

        emit RecoveryProposed(id, msg.sender, newOwner);
        emit RecoveryApproved(id, msg.sender);
    }

    function approveRecovery(uint256 id) external onlyGuardian {
        RecoveryProposal storage prop = _openRecovery(id);
        if (recoveryApproved[id][msg.sender]) revert AlreadyVoted(id, msg.sender);
        recoveryApproved[id][msg.sender] = true;
        prop.approvals += 1;
        emit RecoveryApproved(id, msg.sender);
    }

    /// @notice The current owner can kill any recovery attempt during the timelock —
    ///         proof the key is not lost.
    function vetoRecovery(uint256 id) external onlyOwner {
        RecoveryProposal storage prop = _openRecovery(id);
        prop.cancelled = true;
        _touch();
        emit RecoveryVetoed(id, msg.sender);
    }

    function executeRecovery(uint256 id) external {
        RecoveryProposal storage prop = _openRecovery(id);
        if (prop.approvals < threshold) revert ThresholdNotReached(prop.approvals, threshold);
        uint256 readyAt = uint256(prop.proposedAt) + RECOVERY_DELAY;
        if (block.timestamp < readyAt) revert TimelockNotElapsed(readyAt);

        prop.executed = true;
        address previousOwner = owner;
        owner = prop.newOwner;

        // A rotated key means the old owner is not trusted: drop every pending
        // request and every other recovery proposal.
        minValidRequestId = requestCount + 1;
        minValidRecoveryId = recoveryCount + 1;
        delete _pendingConfig;
        _touch();

        emit RecoveryExecuted(id, previousOwner, prop.newOwner);
    }

    function _openRecovery(uint256 id) private view returns (RecoveryProposal storage prop) {
        if (id == 0 || id > recoveryCount) revert UnknownRecovery(id);
        if (id < minValidRecoveryId) revert StaleRecovery(id);
        prop = _recoveries[id];
        if (prop.executed || prop.cancelled) revert RecoveryClosed(id);
    }

    // ---------------------------------------------------------------------
    // Config changes (two-phase, guardian-vetoable)
    // ---------------------------------------------------------------------

    /// @notice Owner proposes a full new configuration. It only takes effect after
    ///         CONFIG_DELAY, giving guardians time to veto a proposal made from a
    ///         compromised key.
    function proposeConfig(
        address[] calldata guardians_,
        uint256 threshold_,
        address[] calldata heirs_,
        uint16[] calldata shares_,
        uint256 inactivityPeriod_,
        uint256 requestTTL_
    ) external onlyOwner {
        if (_pendingConfig.exists) revert ConfigAlreadyPending();
        _validateGuardians(guardians_, threshold_, owner);
        _validateHeirs(heirs_, shares_, owner);
        _validatePeriods(inactivityPeriod_, requestTTL_);

        configNonce += 1;
        _pendingConfig = ConfigProposal({
            guardians: guardians_,
            threshold: threshold_,
            heirs: heirs_,
            shares: shares_,
            inactivityPeriod: inactivityPeriod_,
            requestTTL: requestTTL_,
            proposedAt: uint64(block.timestamp),
            vetoes: 0,
            exists: true
        });

        _touch();
        emit ConfigProposed(configNonce, block.timestamp + CONFIG_DELAY);
    }

    function cancelConfig() external onlyOwner {
        if (!_pendingConfig.exists) revert NoPendingConfig();
        uint256 nonce = configNonce;
        delete _pendingConfig;
        _touch();
        emit ConfigCancelled(nonce);
    }

    /// @notice Guardian veto. Reaching `threshold` vetoes kills the proposal.
    function vetoConfig() external onlyGuardian {
        if (!_pendingConfig.exists) revert NoPendingConfig();
        if (configVetoed[configNonce][msg.sender]) revert AlreadyVetoed(msg.sender);

        configVetoed[configNonce][msg.sender] = true;
        _pendingConfig.vetoes += 1;
        emit ConfigVetoed(configNonce, msg.sender, _pendingConfig.vetoes);

        if (_pendingConfig.vetoes >= threshold) {
            uint256 nonce = configNonce;
            delete _pendingConfig;
            emit ConfigCancelled(nonce);
        }
    }

    /// @notice Apply a matured config proposal. Callable by anyone (it only does
    ///         what the owner proposed and guardians did not veto).
    function applyConfig() external {
        ConfigProposal storage pending = _pendingConfig;
        if (!pending.exists) revert NoPendingConfig();
        uint256 readyAt = uint256(pending.proposedAt) + CONFIG_DELAY;
        if (block.timestamp < readyAt) revert TimelockNotElapsed(readyAt);

        _clearGuardians();
        _clearHeirs();
        _setGuardians(pending.guardians, pending.threshold, owner);
        _setHeirs(pending.heirs, pending.shares, owner);
        _setPeriods(pending.inactivityPeriod, pending.requestTTL);

        // New guardian set must not inherit votes cast under the old one.
        minValidRequestId = requestCount + 1;
        minValidRecoveryId = recoveryCount + 1;

        uint256 nonce = configNonce;
        delete _pendingConfig;
        emit ConfigApplied(nonce);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getGuardians() external view returns (address[] memory) {
        return _guardians;
    }

    function getHeirs() external view returns (address[] memory heirs, uint16[] memory shares) {
        heirs = _heirs;
        shares = new uint16[](heirs.length);
        for (uint256 i = 0; i < heirs.length; i++) {
            shares[i] = heirShareBps[heirs[i]];
        }
    }

    function getTrackedTokens() external view returns (address[] memory) {
        return _trackedTokens;
    }

    function getRequest(uint256 id) external view returns (WithdrawalRequest memory req, bool stale, bool expired) {
        if (id == 0 || id > requestCount) revert UnknownRequest(id);
        req = _requests[id];
        stale = id < minValidRequestId;
        expired = req.status == RequestStatus.Pending
            && block.timestamp > uint256(req.createdAt) + requestTTL;
    }

    function getRecovery(uint256 id) external view returns (RecoveryProposal memory prop, bool stale) {
        if (id == 0 || id > recoveryCount) revert UnknownRecovery(id);
        prop = _recoveries[id];
        stale = id < minValidRecoveryId;
    }

    function getPendingConfig()
        external
        view
        returns (
            bool exists,
            address[] memory guardians_,
            uint256 threshold_,
            address[] memory heirs_,
            uint16[] memory shares_,
            uint256 inactivityPeriod_,
            uint256 requestTTL_,
            uint256 applyAfter,
            uint32 vetoes
        )
    {
        ConfigProposal storage pending = _pendingConfig;
        exists = pending.exists;
        guardians_ = pending.guardians;
        threshold_ = pending.threshold;
        heirs_ = pending.heirs;
        shares_ = pending.shares;
        inactivityPeriod_ = pending.inactivityPeriod;
        requestTTL_ = pending.requestTTL;
        applyAfter = exists ? uint256(pending.proposedAt) + CONFIG_DELAY : 0;
        vetoes = pending.vetoes;
    }

    function claimableInheritance(address heir, address token) external view returns (uint256) {
        if (!isHeir[heir]) return 0;
        if (block.timestamp < lastAlive + inactivityPeriod) return 0;
        return _claimableBy(heir, token);
    }

    function summary() external view returns (VaultSummary memory s) {
        s.owner = owner;
        s.guardians = _guardians;
        s.threshold = threshold;
        (s.heirs, s.shares) = this.getHeirs();
        s.inactivityPeriod = inactivityPeriod;
        s.requestTTL = requestTTL;
        s.lastAlive = lastAlive;
        s.nativeBalance = address(this).balance;
        s.trackedTokens = _trackedTokens;
        s.requestCount = requestCount;
        s.minValidRequestId = minValidRequestId;
        s.recoveryCount = recoveryCount;
        s.minValidRecoveryId = minValidRecoveryId;
        s.inheritanceUnlocksAt = lastAlive + inactivityPeriod;
        s.inheritanceUnlocked = block.timestamp >= s.inheritanceUnlocksAt;
        s.hasPendingConfig = _pendingConfig.exists;
    }

    // ---------------------------------------------------------------------
    // Internal: validation & config
    // ---------------------------------------------------------------------

    function _validateGuardians(address[] calldata guardians_, uint256 threshold_, address owner_)
        private
        pure
    {
        uint256 count = guardians_.length;
        if (count == 0 || count > MAX_GUARDIANS) revert TooMany();
        if (threshold_ == 0 || threshold_ > count) revert InvalidThreshold(threshold_, count);

        for (uint256 i = 0; i < count; i++) {
            address guardian = guardians_[i];
            if (guardian == address(0)) revert ZeroAddress();
            if (guardian == owner_) revert RoleConflict(guardian);
            for (uint256 j = i + 1; j < count; j++) {
                if (guardians_[j] == guardian) revert DuplicateAddress(guardian);
            }
        }
    }

    function _validateHeirs(address[] calldata heirs_, uint16[] calldata shares_, address owner_)
        private
        pure
    {
        uint256 count = heirs_.length;
        if (count == 0 || count > MAX_HEIRS) revert TooMany();
        if (shares_.length != count) revert InvalidShares();

        uint256 totalShares;
        for (uint256 i = 0; i < count; i++) {
            address heir = heirs_[i];
            if (heir == address(0)) revert ZeroAddress();
            if (heir == owner_) revert RoleConflict(heir);
            if (shares_[i] == 0) revert InvalidShares();
            totalShares += shares_[i];
            for (uint256 j = i + 1; j < count; j++) {
                if (heirs_[j] == heir) revert DuplicateAddress(heir);
            }
        }
        if (totalShares != BPS_DENOMINATOR) revert InvalidShares();
    }

    function _validatePeriods(uint256 inactivityPeriod_, uint256 requestTTL_) private pure {
        if (inactivityPeriod_ < MIN_INACTIVITY_PERIOD || inactivityPeriod_ > MAX_INACTIVITY_PERIOD) {
            revert PeriodOutOfBounds(inactivityPeriod_);
        }
        if (requestTTL_ < MIN_REQUEST_TTL || requestTTL_ > MAX_REQUEST_TTL) {
            revert PeriodOutOfBounds(requestTTL_);
        }
    }

    function _setGuardians(address[] memory guardians_, uint256 threshold_, address owner_) private {
        // Memory variant of validation (initialize passes calldata through, applyConfig storage copy).
        uint256 count = guardians_.length;
        if (count == 0 || count > MAX_GUARDIANS) revert TooMany();
        if (threshold_ == 0 || threshold_ > count) revert InvalidThreshold(threshold_, count);

        for (uint256 i = 0; i < count; i++) {
            address guardian = guardians_[i];
            if (guardian == address(0)) revert ZeroAddress();
            if (guardian == owner_) revert RoleConflict(guardian);
            if (isGuardian[guardian]) revert DuplicateAddress(guardian);
            isGuardian[guardian] = true;
            _guardians.push(guardian);
        }
        threshold = threshold_;
    }

    function _setHeirs(address[] memory heirs_, uint16[] memory shares_, address owner_) private {
        uint256 count = heirs_.length;
        if (count == 0 || count > MAX_HEIRS) revert TooMany();
        if (shares_.length != count) revert InvalidShares();

        uint256 totalShares;
        for (uint256 i = 0; i < count; i++) {
            address heir = heirs_[i];
            if (heir == address(0)) revert ZeroAddress();
            if (heir == owner_) revert RoleConflict(heir);
            if (shares_[i] == 0) revert InvalidShares();
            if (isHeir[heir]) revert DuplicateAddress(heir);
            isHeir[heir] = true;
            heirShareBps[heir] = shares_[i];
            _heirs.push(heir);
            totalShares += shares_[i];
        }
        if (totalShares != BPS_DENOMINATOR) revert InvalidShares();
    }

    function _setPeriods(uint256 inactivityPeriod_, uint256 requestTTL_) private {
        _validatePeriods(inactivityPeriod_, requestTTL_);
        inactivityPeriod = inactivityPeriod_;
        requestTTL = requestTTL_;
    }

    function _clearGuardians() private {
        uint256 count = _guardians.length;
        for (uint256 i = 0; i < count; i++) {
            isGuardian[_guardians[i]] = false;
        }
        delete _guardians;
    }

    function _clearHeirs() private {
        uint256 count = _heirs.length;
        for (uint256 i = 0; i < count; i++) {
            isHeir[_heirs[i]] = false;
            heirShareBps[_heirs[i]] = 0;
        }
        delete _heirs;
    }

    // ---------------------------------------------------------------------
    // Internal: helpers
    // ---------------------------------------------------------------------

    function _pendingRequest(uint256 id) private view returns (WithdrawalRequest storage req) {
        if (id == 0 || id > requestCount) revert UnknownRequest(id);
        if (id < minValidRequestId) revert StaleRequest(id);
        req = _requests[id];
        if (req.status != RequestStatus.Pending) revert RequestNotPending(id);
    }

    function _touch() private {
        lastAlive = block.timestamp;
        emit Heartbeat(owner, block.timestamp);
    }

    function _trackToken(address token) private {
        if (token == address(0)) revert ZeroAddress();
        if (isTrackedToken[token]) return;
        if (token.code.length == 0) revert NotAContract(token);
        if (_trackedTokens.length >= MAX_TRACKED_TOKENS) revert TooMany();
        isTrackedToken[token] = true;
        _trackedTokens.push(token);
        emit TokenTracked(token);
    }

    function _tokenBalance(address token) private view returns (uint256) {
        (bool success, bytes memory data) =
            token.staticcall(abi.encodeWithSignature("balanceOf(address)", address(this)));
        if (!success || data.length < 32) revert NotAContract(token);
        return abi.decode(data, (uint256));
    }

    function _transferOut(address token, address to, uint256 amount) private {
        if (token == NATIVE) {
            (bool success,) = payable(to).call{value: amount}("");
            if (!success) revert NativeTransferFailed(to, amount);
        } else {
            _safeCallToken(token, abi.encodeWithSignature("transfer(address,uint256)", to, amount), to, amount);
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        _safeCallToken(
            token,
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount),
            to,
            amount
        );
    }

    /// @dev Tolerates non-standard ERC20s (e.g. USDT) that return no data,
    ///      but reverts when a token returns an explicit `false`.
    function _safeCallToken(address token, bytes memory callData, address to, uint256 amount) private {
        (bool success, bytes memory returned) = token.call(callData);
        if (!success || (returned.length > 0 && !abi.decode(returned, (bool)))) {
            revert TokenTransferFailed(token, to, amount);
        }
    }
}
