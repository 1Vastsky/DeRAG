// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./MemberRegistry.sol";

interface IVoteVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata input
    ) external view returns (bool);
}

/// @title VoteManager
/// @notice 提交 C_vote 的 ZK 证明，记录承诺 + 防双投
contract VoteManager {
    struct VoteCommitment {
        bytes32 com;       // Pedersen commitment Com_i
        bytes32 nullifier; // Null_i = Poseidon(sk_i, rid)
    }

    address public owner;
    MemberRegistry public memberRegistry;
    IVoteVerifier public verifier;

    // queryId（或 rid） => votes
    mapping(bytes32 => VoteCommitment[]) private _votes;
    // 用过的 nullifier（全局防双投）
    mapping(bytes32 => bool) public usedNullifier;

    event VoteSubmitted(
        bytes32 indexed queryId,
        bytes32 indexed com,
        bytes32 indexed nullifier,
        address submitter
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "VoteManager: not owner");
        _;
    }

    constructor(address memberRegistry_, address verifier_) {
        owner = msg.sender;
        memberRegistry = MemberRegistry(memberRegistry_);
        verifier = IVoteVerifier(verifier_);
    }

    /// @notice 提交一个带 ZK 证明的评分投票
    /// @param queryId   本轮查询/投票的标识（可以是 rid）
    /// @param com       Pedersen 承诺 Com_i
    /// @param nullifier Null_i，防止双投
    /// @param a,b,c,input Groth16 证明参数
    function submitVote(
        bytes32 queryId,
        bytes32 com,
        bytes32 nullifier,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata input
    ) external {
        require(!usedNullifier[nullifier], "VoteManager: double vote");

        // 业务上你可以在 input 中包含 membersRoot、Com_i、Null_i、rid 等
        // 这里不给死约束，只做纯 verifier 调用
        bool ok = verifier.verifyProof(a, b, c, input);
        require(ok, "VoteManager: invalid zk proof");

        usedNullifier[nullifier] = true;

        _votes[queryId].push(VoteCommitment({com: com, nullifier: nullifier}));

        emit VoteSubmitted(queryId, com, nullifier, msg.sender);
    }

    /// @notice 返回某个 queryId 下所有承诺，供链下 tally 使用
    function getVotes(bytes32 queryId) external view returns (VoteCommitment[] memory) {
        return _votes[queryId];
    }
}
