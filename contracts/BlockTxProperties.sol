// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract BlockTxProperties {
    // Block properties structure
    struct BlockProperties {
        bytes32 blockHash;
        bytes32 blobHash;
        uint baseFee;
        uint blobBaseFee;
        uint chainId;
        address coinbase;
        uint difficulty;
        uint gasLimit;
        uint blockNumber;
        uint prevRandao;
        uint timestamp;
    }

    // Transaction properties structure
    struct TransactionProperties {
        uint remainingGas;
        bytes callData;
        address sender;
        bytes4 signature;
        uint value;
        uint gasPrice;
        address origin;
    }

    // Store the latest block and transaction properties
    BlockProperties public latestBlockProps;
    TransactionProperties public latestTxProps;

    // Historical records mapping
    mapping(uint => BlockProperties) public historicalBlockProps;
    mapping(uint => TransactionProperties) public historicalTxProps;
    mapping(uint => bytes32) public blockHashes;
    mapping(uint => bytes32) public blobHashes;

    // Detailed event definitions
    event BlockPropertiesUpdated(
        uint indexed blockNumber,
        uint timestamp,
        bytes32 blockHash,
        bytes32 blobHash,
        uint baseFee,
        uint blobBaseFee,
        uint chainId,
        address coinbase,
        uint difficulty,
        uint gasLimit,
        uint prevRandao
    );

    event TransactionPropertiesUpdated(
        address indexed sender,
        address indexed origin,
        uint value,
        uint gasPrice,
        uint remainingGas,
        bytes4 signature,
        bytes callData
    );

    // Event for fallback function invocation
    event FallbackCalled(address indexed sender, uint value, bytes data);

    // Event for reciver function invocation
    event ReceiveCalled(address indexed sender, uint value, bytes data);

    constructor() {
        // Automatically trigger properties update during deployment
        updateBlockProperties();
        updateTransactionProperties();
    }

    // Update block and transaction properties
    function updateProperties() public {
        updateBlockProperties();
        updateTransactionProperties();
    }

    // Function to update block properties
    function updateBlockProperties() public {
        BlockProperties memory currentBlockProps = BlockProperties({
            blockHash: blockhash(block.number - 1),
            blobHash: blobhash(0),
            baseFee: block.basefee,
            blobBaseFee: block.blobbasefee,
            chainId: block.chainid,
            coinbase: block.coinbase,
            difficulty: block.difficulty,
            gasLimit: block.gaslimit,
            blockNumber: block.number,
            prevRandao: block.prevrandao,
            timestamp: block.timestamp
        });

        // Update latest properties info
        latestBlockProps = currentBlockProps;
        historicalBlockProps[block.number] = currentBlockProps;

        blockHashes[block.number] = blockhash(block.number);

        // Emit event
        emit BlockPropertiesUpdated(
            block.number,
            block.timestamp,
            currentBlockProps.blockHash,
            currentBlockProps.blobHash,
            currentBlockProps.baseFee,
            currentBlockProps.blobBaseFee,
            currentBlockProps.chainId,
            currentBlockProps.coinbase,
            currentBlockProps.difficulty,
            currentBlockProps.gasLimit,
            currentBlockProps.prevRandao
        );
    }

    // Update transaction properties
    function updateTransactionProperties() public payable {
        TransactionProperties memory currentTxProps = TransactionProperties({
            remainingGas: gasleft(),
            callData: msg.data,
            sender: msg.sender,
            signature: msg.sig,
            value: msg.value,
            gasPrice: tx.gasprice,
            origin: tx.origin
        });

        // Update latest and historical transaction properties
        latestTxProps = currentTxProps;
        historicalTxProps[block.number] = currentTxProps;

        // Emit detailed event
        emit TransactionPropertiesUpdated(
            msg.sender,
            tx.origin,
            msg.value,
            tx.gasprice,
            gasleft(),
            msg.sig,
            msg.data
        );
    }

    // Block properties query interface
    function queryLatestBlockProperties()
        public
        view
        returns (BlockProperties memory)
    {
        return latestBlockProps;
    }

    // Transaction properties query interface
    function queryLatestTransactionProperties()
        public
        view
        returns (TransactionProperties memory)
    {
        return latestTxProps;
    }

    // Get block properties for a specific block number
    function getHistoricalBlockProperties(
        uint blockNumber
    ) public view returns (BlockProperties memory) {
        return historicalBlockProps[blockNumber];
    }

    // Get transaction properties for a specific block number
    function getHistoricalTransactionProperties(
        uint blockNumber
    ) public view returns (TransactionProperties memory) {
        return historicalTxProps[blockNumber];
    }

    // Fallback function to handle calls to non-existent functions
    fallback() external payable {
        emit FallbackCalled(msg.sender, msg.value, msg.data);
    }

    // Receive function to handle plain Ether transfers
    receive() external payable {
        emit ReceiveCalled(msg.sender, msg.value, "");
    }
}
