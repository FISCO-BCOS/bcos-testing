// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Empty {
    event EmptyEvent();

    constructor() {
        emit EmptyEvent();
    }

    function emitEvent() public {
        emit EmptyEvent();
    }
}
