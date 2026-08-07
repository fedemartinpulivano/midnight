// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MidnightVault} from "./MidnightVault.sol";

/// @title MidnightFactory
/// @notice Deploys one MidnightVault per user as an EIP-1167 minimal proxy clone —
///         roughly 10x cheaper than deploying full contracts per user — and keeps a
///         discovery registry so the frontend can find every vault an address is
///         related to in a single call.
/// @dev    The registry reflects roles at creation time. The vault itself is the
///         source of truth after config changes or owner rotations; the frontend
///         re-checks roles against each vault before showing actions.
contract MidnightFactory {
    /// @notice The shared implementation every clone delegates to.
    address public immutable implementation;

    address[] private _allVaults;
    mapping(address => address[]) private _vaultsAsOwner;
    mapping(address => address[]) private _vaultsAsGuardian;
    mapping(address => address[]) private _vaultsAsHeir;
    mapping(address => bool) public isVault;

    error CloneFailed();

    event VaultCreated(
        address indexed vault,
        address indexed owner,
        uint256 guardianCount,
        uint256 threshold,
        uint256 heirCount,
        uint256 inactivityPeriod
    );

    constructor() {
        implementation = address(new MidnightVault());
    }

    function createVault(MidnightVault.InitParams calldata params)
        external
        returns (address vault)
    {
        vault = _clone(implementation);
        MidnightVault(payable(vault)).initialize(params);

        isVault[vault] = true;
        _allVaults.push(vault);
        _vaultsAsOwner[params.owner].push(vault);
        for (uint256 i = 0; i < params.guardians.length; i++) {
            _vaultsAsGuardian[params.guardians[i]].push(vault);
        }
        for (uint256 i = 0; i < params.heirs.length; i++) {
            _vaultsAsHeir[params.heirs[i]].push(vault);
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
