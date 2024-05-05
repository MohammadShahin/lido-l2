// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.10;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20L1Stub is ERC20 {
    constructor() ERC20("MyToken", "MTK") {}
    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
