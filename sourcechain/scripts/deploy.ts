import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {

  const { viem } = await network.connect("hardhatMainnet");

  const publicClient = await viem.getPublicClient();
  console.log("Latest block number:", await publicClient.getBlockNumber());
  
  console.log("Deploying via viem…");

  // 由插件提供的客户端
  const [walletClient] = await viem.getWalletClients();

  console.log("Deployer:", walletClient.account.address);

  // 读取编译产物
  const verifierJson = JSON.parse(
    fs.readFileSync(
      path.resolve("artifacts/contracts/Groth16Verifier.sol/Groth16Verifier.json"),
      "utf8"
    )
  );
  const ballotJson = JSON.parse(
    fs.readFileSync(
      path.resolve("artifacts/contracts/Ballot.sol/Ballot.json"),
      "utf8"
    )
  );

  // 1) 部署 Groth16Verifier
  console.log("Deploying Groth16Verifier...");
  const verifierHash = await walletClient.deployContract({
    abi: verifierJson.abi,
    bytecode: verifierJson.bytecode,
  });
  const verifierRcpt = await publicClient.waitForTransactionReceipt({ hash: verifierHash });
  const verifier = verifierRcpt.contractAddress!;
  console.log("✅ Groth16Verifier:", verifier);

  // 2) 部署 Ballot（构造参数传 Verifier 地址）
  console.log("Deploying Ballot...");
  const ballotHash = await walletClient.deployContract({
    abi: ballotJson.abi,
    bytecode: ballotJson.bytecode,
    args: [verifier],
  });
  const ballotRcpt = await publicClient.waitForTransactionReceipt({ hash: ballotHash });
  const ballot = ballotRcpt.contractAddress!;
  console.log("✅ Ballot:", ballot);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
