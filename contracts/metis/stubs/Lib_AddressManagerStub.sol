// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/* External Imports */
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Lib_AddressManagerStubMetis
 */
contract Lib_AddressManagerStubMetis is Ownable {
    mapping(bytes32 => address) private addresses;

    constructor (address addressmgr_) {
        addresses[keccak256(abi.encodePacked("MVM_DiscountOracle"))] = addressmgr_;
    }

    function getAddress(string memory _name) external view returns (address) {
        return addresses[_getNameHash(_name)];
    }

    function _getNameHash(string memory _name) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_name));
    }
}