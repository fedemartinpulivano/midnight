// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MidnightVault} from "./MidnightVault.sol";

/// @title MidnightFactory
/// @notice Deploys one MidnightVault per user as an EIP-1167 minimal proxy clone —
///         roughly 10x cheaper than deploying full contracts per user — and keeps a
///         discovery registry so the frontend can find every vault an address is
///         related to in a single call.
/// @dev    Vaults call back into `syncRoles` whenever a config change or an owner
///         rotation moves roles around, so the registry keeps matching the vault
///         instead of freezing at creation time. Without that callback a recovered
///         owner would never find their own vault. The vault stays the source of
///         truth: the frontend re-checks roles against it before showing actions.
contract MidnightFactory {
    /// @notice The shared implementation every clone delegates to.
    address public immutable implementation;

    address[] private _allVaults;
    mapping(address => address[]) private _vaultsAsOwner;
    mapping(address => address[]) private _vaultsAsGuardian;
    mapping(address => address[]) private _vaultsAsHeir;
    mapping(address => bool) public isVault;

    // account => vault => position in the list above, stored as index + 1 so that
    // zero keeps meaning "not listed". Enables O(1) removal on role changes.
    mapping(address => mapping(address => uint256)) private _ownerIndex;
    mapping(address => mapping(address => uint256)) private _guardianIndex;
    mapping(address => mapping(address => uint256)) private _heirIndex;

    error CloneFailed();
    error NotAVault(address caller);

    event VaultCreated(
        address indexed vault,
        address indexed owner,
        uint256 guardianCount,
        uint256 threshold,
        uint256 heirCount,
        uint256 inactivityPeriod
    );
    event RolesSynced(address indexed vault, address indexed previousOwner, address indexed newOwner);

    constructor() {
        implementation = address(new MidnightVault());
    }

    function createVault(MidnightVault.InitParams calldata params)
        external
        returns (address vault)
    {
        vault = _clone(implementation);
        isVault[vault] = true;
        MidnightVault(payable(vault)).initialize(params);

        _allVaults.push(vault);
        _add(_vaultsAsOwner[params.owner], _ownerIndex[params.owner], vault);
        for (uint256 i = 0; i < params.guardians.length; i++) {
            address guardian = params.guardians[i];
            _add(_vaultsAsGuardian[guardian], _guardianIndex[guardian], vault);
        }
        for (uint256 i = 0; i < params.heirs.length; i++) {
            address heir = params.heirs[i];
            _add(_vaultsAsHeir[heir], _heirIndex[heir], vault);
        }

        emit VaultCreated(
            vault,
            params.owner,
            params.guardians.length,
            params.threshold,
            params.heirs.length,
            params.inactivityPeriod
        );
    }

    /// @notice Called by a vault when its roles change, so discovery keeps working
    ///         for whoever holds those roles now.
    /// @dev    The vault passes both the old and the new sets and the registry
    ///         rebuilds the difference: removing an account that is immediately
    ///         re-added is a no-op in membership terms, which keeps the vault side
    ///         free of set-difference logic. Only registered vaults may call this,
    ///         and a vault can only ever move its own entries.
    function syncRoles(
        address previousOwner,
        address newOwner,
        address[] calldata oldGuardians,
        address[] calldata newGuardians,
        address[] calldata oldHeirs,
        address[] calldata newHeirs
    ) external {
        if (!isVault[msg.sender]) revert NotAVault(msg.sender);
        address vault = msg.sender;

        if (previousOwner != newOwner) {
            _remove(_vaultsAsOwner[previousOwner], _ownerIndex[previousOwner], vault);
            _add(_vaultsAsOwner[newOwner], _ownerIndex[newOwner], vault);
        }

        for (uint256 i = 0; i < oldGuardians.length; i++) {
            address guardian = oldGuardians[i];
            _remove(_vaultsAsGuardian[guardian], _guardianIndex[guardian], vault);
        }
        for (uint256 i = 0; i < newGuardians.length; i++) {
            address guardian = newGuardians[i];
            _add(_vaultsAsGuardian[guardian], _guardianIndex[guardian], vault);
        }

        for (uint256 i = 0; i < oldHeirs.length; i++) {
            address heir = oldHeirs[i];
            _remove(_vaultsAsHeir[heir], _heirIndex[heir], vault);
        }
        for (uint256 i = 0; i < newHeirs.length; i++) {
            address heir = newHeirs[i];
            _add(_vaultsAsHeir[heir], _heirIndex[heir], vault);
        }

        emit RolesSynced(vault, previousOwner, newOwner);
    }

    function _add(
        address[] storage list,
        mapping(address => uint256) storage index,
        address vault
    ) private {
        if (index[vault] != 0) return;
        list.push(vault);
        index[vault] = list.length;
    }

    function _remove(
        address[] storage list,
        mapping(address => uint256) storage index,
        address vault
    ) private {
        uint256 position = index[vault];
        if (position == 0) return;

        uint256 slot = position - 1;
        uint256 last = list.length - 1;
        if (slot != last) {
            address moved = list[last];
            list[slot] = moved;
            index[moved] = position;
        }
        list.pop();
        index[vault] = 0;
    }

    // ---------------------------------------------------------------------
    // Discovery
    // ---------------------------------------------------------------------

    function vaultsOfOwner(address account) external view returns (address[] memory) {
        return _vaultsAsOwner[account];
    }

    function vaultsOfGuardian(address account) external view returns (address[] memory) {
        return _vaultsAsGuardian[account];
    }

    function vaultsOfHeir(address account) external view returns (address[] memory) {
        return _vaultsAsHeir[account];
    }

    function allVaults() external view returns (address[] memory) {
        return _allVaults;
    }

    function vaultCount() external view returns (uint256) {
        return _allVaults.length;
    }

    // ---------------------------------------------------------------------
    // EIP-1167 minimal proxy
    // ---------------------------------------------------------------------

    function _clone(address target) private returns (address instance) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, target))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            instance := create(0, ptr, 0x37)
        }
        if (instance == address(0)) revert CloneFailed();
    }
}
