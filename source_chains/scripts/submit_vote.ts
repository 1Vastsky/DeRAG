import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

/**
 * 用法：
 *   BALLOT=0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 npx hardhat run scripts/submit_vote_viem.ts --network hardhatMainnet
 *
 * 依赖文件（由 snarkjs 生成）：
 *   build/proof_v2.json
 *   build/public_v2.json
 *
 * 重要：publicSignals 必须与电路一致，这里假定为：[com, nullifier, rid]
 */


function toBI(x: string | number | bigint) {
  if (typeof x === "bigint") return x;
  if (typeof x === "number") return BigInt(x);
  // 兼容十进制字符串或 0x 开头十六进制
  return x.startsWith("0x") ? BigInt(x) : BigInt(x);
}

function toBytes32(x: string | number | bigint) {
  const bi = toBI(x);
  if (bi < 0n) {
    throw new Error("bytes32 不能为负数");
  }
  return (`0x${bi.toString(16).padStart(64, "0")}`) as `0x${string}`;
}

function loadJSON<T = any>(p: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(p), "utf8"));
}

async function main() {
  const ballotAddr = process.env.BALLOT;
  if (!ballotAddr) {
    throw new Error("请通过环境变量传入合约地址：BALLOT=0x... ");
  }

  // 连接 hardhat + viem（与你现有部署脚本一致）
  const { viem } = await network.connect("hardhatMainnet");
  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();

  console.log("Connected. Latest block:", await publicClient.getBlockNumber());
  console.log("Sender:", walletClient.account.address);
  console.log("Ballot:", ballotAddr);

  // 读取 ABI（Hardhat 编译产物）
  const ballotJson = loadJSON<any>("artifacts/contracts/Ballot.sol/Ballot.json");

  // 读取 snarkjs 生成的 proof & publicSignals
  const proof = loadJSON<any>("build/proof_v2.json");
  const pub = loadJSON<any>("build/public_v2.json"); // 数组：["com","nullifier","rid"]

  // 展平 Groth16 证明到 (uint[2], uint[2][2], uint[2])
  const pA: [bigint, bigint] = [toBI(proof.pi_a[0]), toBI(proof.pi_a[1])];
  const pB: [[bigint, bigint], [bigint, bigint]] = [
    [toBI(proof.pi_b[0][0]), toBI(proof.pi_b[0][1])],
    [toBI(proof.pi_b[1][0]), toBI(proof.pi_b[1][1])],
  ];
  const pC: [bigint, bigint] = [toBI(proof.pi_c[0]), toBI(proof.pi_c[1])];

  // publicSignals（必须与电路顺序一致！这里假定为 [com, nullifier, rid]）
  if (!Array.isArray(pub) || pub.length !== 3) {
    throw new Error("public_v2.json 解析失败，期望 3 个公共信号：[com, nullifier, rid]");
  }
  const pubSignals: [bigint, bigint, bigint] = [toBI(pub[0]), toBI(pub[1]), toBI(pub[2])];

  console.log("pubSignals:");
  console.log("  com       =", pubSignals[0].toString());
  console.log("  nullifier =", pubSignals[1].toString());
  console.log("  rid       =", pubSignals[2].toString());

  const ridBytes32 = toBytes32(pubSignals[2]);
  const nullifierBytes32 = toBytes32(pubSignals[1]);



const hasIsUsed = ballotJson.abi.some(
  (f: any) => f.type === 'function' && f.name === 'isUsed' && f.inputs?.length === 2
);
if (!hasIsUsed) {
  throw new Error('❌ ABI 里没有 isUsed(rid, nullifier)。请确认合约函数签名。');
}

// ✅ 提前模拟调用一次（能捕获 ABI / 参数错误）
await publicClient.simulateContract({
  address: ballotAddr as `0x${string}`,
  abi: ballotJson.abi,
  functionName: 'isUsed',
  args: [ridBytes32, nullifierBytes32],
});
console.log('✅ 模拟调用 isUsed 成功，通过 ABI 和参数检查。');



  // 可选：提交前查询是否已用（应为 false）
  const preUsed = await publicClient.readContract({
    address: ballotAddr as `0x${string}`,
    abi: ballotJson.abi,
    functionName: "isUsed",
    args: [
      ridBytes32,
      nullifierBytes32,
    ],
  });
  console.log("isUsed(before) =", preUsed);

  // 发送交易：submitVote
  console.log("Sending submitVote...");
  const txHash = await walletClient.writeContract({
    address: ballotAddr as `0x${string}`,
    abi: ballotJson.abi,
    functionName: "submitVote",
    args: [pA, pB, pC, pubSignals],
    // OP/本地一般无需手动 gas；如需可加：gas, maxFeePerGas, maxPriorityFeePerGas
  });

  console.log("tx =", txHash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("status =", receipt.status);

  // 可选：再次查询，应该为 true（说明防双投标记生效）
  const postUsed = await publicClient.readContract({
    address: ballotAddr as `0x${string}`,
    abi: ballotJson.abi,
    functionName: "isUsed",
    args: [ridBytes32, nullifierBytes32],
  });
  console.log("isUsed(after)  =", postUsed);

  console.log("Done ✅");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
