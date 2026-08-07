// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice A token that misbehaves on purpose, for tests only. Models the two ways
///         a hostile entry in the tracked-token list could try to strand an
///         inheritance: by reverting when the vault reads its balance, or by
///         failing the transfer during a claim.
contract HostileERC20 {
    bool public immutable revertOnBalance;
    bool public immutable revertOnTransfer;

    mapping(address => uint256) private _balances;

    constructor(bool revertOnBalance_, bool revertOnTransfer_) {
        revertOnBalance = revertOnBalance_;
        revertOnTransfer = revertOnTransfer_;
    }

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
    }

    function balanceOf(address account) external view returns (uint256) {
        require(!revertOnBalance, "hostile: balanceOf");
        return _balances[account];
    }

    function transfer(address, uint256) external view returns (bool) {
        require(!revertOnTransfer, "hostile: transfer");
        return false; // also lies about success when it does not revert
    }
}
