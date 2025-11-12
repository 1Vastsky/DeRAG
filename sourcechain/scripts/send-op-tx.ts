import { network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const { viem } = await network.connect({
    network: "hardhat",
    chainType: "op", // Optimism chainType，可改为 "evm"
  });

  console.log("Connected to Hardhat network via Viem");

  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();

  console.log("Deployer:", walletClient.account.address);

  // 读取编译后的 ABI + bytecode
  const verifierJson = JSON.parse(
    fs.readFileSync(path.resolve("artifacts/contracts/Groth16Verifier.sol/Groth16Verifier.json"))
  );
  const ballotJson = JSON.parse(
    fs.readFileSync(path.resolve("artifacts/contracts/Ballot.sol/Ballot.json"))
  );

  // ================= 部署 Groth16Verifier =================
  console.log("Deploying Groth16Verifier...");
  const verifierHash = await walletClient.deployContract({
    abi: verifierJson.abi,
    bytecode: verifierJson.bytecode,
  });

  const verifierRcpt = await publicClient.waitForTransactionReceipt({
    hash: verifierHash,
  });

  const verifierAddress = verifierRcpt.contractAddress;
  console.log("✅ Groth16Verifier deployed at:", verifierAddress);

  // ================= 部署 Ballot =================
  console.log("Deploying Ballot...");
  const ballotHash = await walletClient.deployContract({
    abi: ballotJson.abi,
    bytecode: ballotJson.bytecode,
    args: [verifierAddress],
  });

  const ballotRcpt = await publicClient.waitForTransactionReceipt({
    hash: ballotHash,
  });

  const ballotAddress = ballotRcpt.contractAddress;
  console.log("✅ Ballot deployed at:", ballotAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
