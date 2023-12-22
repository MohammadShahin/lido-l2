// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;


contract OVM_GasPriceOracleStubMetis {

    address public owner;

    uint256 public minErc20BridgeCost = 20;
    
    constructor(address _owner) {
        owner = _owner;
    }
}
