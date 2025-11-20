// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./Groth16Verifier.sol";

/**
 * @title Ballot
 * @notice 接入由 snarkjs 生成的 Groth16Verifier，按 publicSignals = [com, nullifier, rid] 验证单票。
 *         - 防双投：同一 rid 下同一 nullifier 只能使用一次
 *         - 事件：链下可监听 VoteSubmitted 收集 com 等信息
 *
 * !!! 重要：
 * 若你的电路 publicSignals 顺序不是 [com, nullifier, rid]，请在下面提取顺序处调整 !!!
 */
contract Ballot {
    Groth16Verifier public verifier;

    // usedNullifier[rid][nullifier] = true → 该 rid 下此 nullifier 已用，防双投
    mapping(bytes32 => mapping(bytes32 => bool)) public usedNullifier;

    event VoteSubmitted(
        bytes32 indexed rid,
        bytes32 indexed nullifier,
        uint256 com,
        address indexed voter
    );

    constructor(address _verifier) {
        require(_verifier != address(0), "Ballot: zero verifier");
        verifier = Groth16Verifier(_verifier);
    }

    /**
     * @dev 提交一张票：
     * @param _pA Groth16 proof A
     * @param _pB Groth16 proof B
     * @param _pC Groth16 proof C
     * @param _pubSignals public signals（电路导出的公共信号）
     *
     * 约定当前顺序为：_pubSignals = [com, nullifier, rid]
     * 如果你的电路顺序不同，请相应交换下面三行的赋值。
     */
    function submitVote(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[3] calldata _pubSignals
    ) external {
        // ============== 提取公共信号 ==============
        uint256 com = _pubSignals[0];
        bytes32 nullifier = bytes32(_pubSignals[1]);
        bytes32 rid = bytes32(_pubSignals[2]);

        // ============== 防双投检查 ==============
        require(!usedNullifier[rid][nullifier], "Ballot: nullifier used");

        // ============== 验证零知识证明 ==============
        bool ok = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        require(ok, "Ballot: invalid zk proof");

        // ============== 记账 + 事件 ==============
        usedNullifier[rid][nullifier] = true;
        emit VoteSubmitted(rid, nullifier, com, msg.sender);
    }

    // --------------------- 只读辅助 ---------------------

    /// @notice 查询某 rid 下某 nullifier 是否已被使用
    function isUsed(bytes32 rid, bytes32 nullifier) external view returns (bool) {
        return usedNullifier[rid][nullifier];
    }
}