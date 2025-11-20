// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title DocumentRegistry
/// @notice 记录文档哈希和向量哈希等元数据，用于 MedRAG 检索完整性
contract DocumentRegistry {
    struct Document {
        bytes32 contentHash;     // 文本/加密对象哈希
        bytes32 embeddingHash;   // 向量/embedding 哈希
        address owner;           // 提交者
        uint64 createdAt;
    }

    uint256 public nextDocId;
    mapping(uint256 => Document) public documents;

    event DocumentRegistered(
        uint256 indexed docId,
        bytes32 contentHash,
        bytes32 embeddingHash,
        address indexed owner
    );

    function registerDocument(
        bytes32 contentHash,
        bytes32 embeddingHash
    ) external returns (uint256 docId) {
        require(contentHash != bytes32(0), "DocumentRegistry: empty content hash");

        docId = ++nextDocId;

        documents[docId] = Document({
            contentHash: contentHash,
            embeddingHash: embeddingHash,
            owner: msg.sender,
            createdAt: uint64(block.timestamp)
        });

        emit DocumentRegistered(docId, contentHash, embeddingHash, msg.sender);
    }
}
