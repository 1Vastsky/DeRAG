// ignition/modules/SourceChainModule.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SourceChainModule = buildModule("SourceChainModule", (m) => {
  // 1. 参数：membersRoot，方便不同环境传不同 root
  const initialRoot = m.getParameter(
    "initialRoot",
    "0x" + "00".repeat(32) // 默认值，后面可以 update
  );

  // 2. 部署 MemberRegistry
  const memberRegistry = m.contract("MemberRegistry", [initialRoot]);

  // 3. 部署 zkSNARK Verifier（snarkjs 生成的 VoteVerifier.sol）
  const voteVerifier = m.contract("VoteVerifier");

  // 4. 部署 DocumentRegistry
  const documentRegistry = m.contract("DocumentRegistry");

  // 5. 部署 VoteManager，依赖上面两个合约地址
  const voteManager = m.contract("VoteManager", [
    memberRegistry,
    voteVerifier,
  ]);

  // 需要在 test/ 或前端里用到哪个，就 return 哪些
  return {
    memberRegistry,
    voteVerifier,
    documentRegistry,
    voteManager,
  };
});

export default SourceChainModule;
