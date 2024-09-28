// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

/**
 * @title IL2CrossDomainMessenger
 */
interface IMessageNonceHandler {
    /********************
     * Public Functions *
     ********************/

    function messageNonce() external view returns (uint256);
}
