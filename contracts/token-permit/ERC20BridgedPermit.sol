// SPDX-FileCopyrightText: 2024 Lido <info@lido.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

import {IERC20BridgeUpgradeable} from "./interfaces/IERC20BridgeUpgradeable.sol";

import {ERC20PermitUpgradeable} from "./ERC20PermitUpgradeable.sol";
import {ERC20MetadataUpgradeable} from "./ERC20MetadataUpgradeable.sol";


/// @notice Extends the ERC20Upgradeable functionality that allows the bridge to mint/burn tokens
contract ERC20BridgedPermit is IERC20BridgeUpgradeable, ERC20PermitUpgradeable, ERC20MetadataUpgradeable {
    /// @inheritdoc IERC20BridgeUpgradeable
    address public bridge;

    /// @param name_ The name of the token
    /// @param symbol_ The symbol of the token
    /// @param decimals_ The decimals places of the token
    /// @param bridge_ The bridge address which allowed to mint/burn tokens
    function initialize(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address bridge_
    ) external initializer {
        require(bridge_ != address(0), "Bridge address cannot be zero");
        __ERC20Metadata_init_unchained(name_, symbol_, decimals_);
        __ERC20Permit_init(name_);
        bridge = bridge_;
    }

    /// @inheritdoc IERC20BridgeUpgradeable
    function bridgeMint(address account_, uint256 amount_) external onlyBridge {
        _mint(account_, amount_);
    }

    /// @inheritdoc IERC20BridgeUpgradeable
    function bridgeBurn(address account_, uint256 amount_) external onlyBridge {
        _burn(account_, amount_);
    }

    /// @dev Validates that sender of the transaction is the bridge
    modifier onlyBridge() {
        if (msg.sender != bridge) {
            revert ErrorNotBridge();
        }
        _;
    }

    error ErrorNotBridge();
}
