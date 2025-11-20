// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title MemberRegistry
/// @notice 维护验证者集合的 Merkle Root，供 C_vote 电路使用
contract MemberRegistry {
    address public owner;
    bytes32 private _membersRoot; // Merkle root of members

    event MembersRootUpdated(bytes32 oldRoot, bytes32 newRoot);

    modifier onlyOwner() {
        require(msg.sender == owner, "MemberRegistry: not owner");
        _;
    }

    constructor(bytes32 initialRoot) {
        owner = msg.sender;
        _membersRoot = initialRoot;
        emit MembersRootUpdated(bytes32(0), initialRoot);
    }

    function membersRoot() external view returns (bytes32) {
        return _membersRoot;
    }

    /// @notice 下线用脚本重建 Merkle Tree，再在这里更新 root
    function updateMembersRoot(bytes32 newRoot) external onlyOwner {
        bytes32 old = _membersRoot;
        _membersRoot = newRoot;
        emit MembersRootUpdated(old, newRoot);
    }
}
