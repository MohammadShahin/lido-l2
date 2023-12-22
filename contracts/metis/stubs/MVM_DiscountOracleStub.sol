// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { Lib_Uint } from "../utils/Lib_Uint.sol";

contract MVM_DiscountOracleStubMetis {

    // Current l2 gas price
    uint256 public discount = 1;
    uint256 public minL2Gas = 200_000;

    function getMinL2Gas() view public returns (uint256){
      return minL2Gas;
    }

    function getDiscount() view public returns (uint256){
      return discount;
    }
}
