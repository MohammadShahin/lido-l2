// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract MVM_DiscountOracleStubMetis {

    // Current l2 gas price
    uint256 public discount = 1;
    uint256 public minL2Gas = 200_000;

    function getMinL2Gas() public view returns (uint256){
      return minL2Gas;
    }

    function getDiscount() public view returns (uint256){
      return discount;
    }
}
