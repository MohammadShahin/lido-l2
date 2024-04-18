// SPDX-FileCopyrightText: 2022 Lido <info@lido.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.10;

import {IERC20Bridged} from "./interfaces/IERC20Bridged.sol";

import {ERC20Permit} from "./ERC20Permit.sol";
import {ERC20Metadata} from "./ERC20Metadata.sol";


/// @notice Extends the ERC20Upgradeable functionality that allows the bridge to mint/burn tokens
contract ERC20BridgedPermit is IERC20Bridged, ERC20Permit, ERC20Metadata {
    /// @inheritdoc IERC20Bridged
    address public immutable bridge;

    /// @param name_ The name of the token
    /// @param symbol_ The symbol of the token
    /// @param decimals_ The decimals places of the token
    /// @param bridge_ The bridge address which allowd to mint/burn tokens
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address bridge_
    ) ERC20Metadata(name_, symbol_, decimals_) ERC20Permit(name_) {
        bridge = bridge_;
    }

    /// @notice Sets the name and the symbol of the tokens if they both are empty
    /// @param name_ The name of the token
    /// @param symbol_ The symbol of the token
    function initialize(string memory name_, string memory symbol_) external {
        _setERC20MetadataName(name_);
        _setERC20MetadataSymbol(symbol_);
    }

    /// @inheritdoc IERC20Bridged
    function bridgeMint(address account_, uint256 amount_) external onlyBridge {
        _mint(account_, amount_);
    }

    /// @inheritdoc IERC20Bridged
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
