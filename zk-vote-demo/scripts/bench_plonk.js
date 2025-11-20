// scripts/bench_plonk.js
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const snarkjs = require("snarkjs");
const circomlibjs = require("circomlibjs");

// 要和 vote.circom 里的 depth 一致
const MERKLE_DEPTH = 8;

async function buildInput() {
  const poseidon = await circomlibjs.buildPoseidon();
  const F = poseidon.F;

  // 你可以和 Groth16 benchmark 用同一套参数
  const leaf = 123n;
  const sk_i = 456n;
  const rid = 789n;
  const s_i = 7n;      // score
  const r_i = 11n;     // randomness
  const S_max = 10n;   // max score

  const pathElements = Array(MERKLE_DEPTH).fill(0n);
  const pathIndex = Array(MERKLE_DEPTH).fill(0);

  // 用同样 Poseidon 规则计算 Merkle root
  let cur = leaf;
  for (let i = 0; i < MERKLE_DEPTH; i++) {
    const left = cur;
    const right = pathElements[i];
    cur = F.toObject(poseidon([left, right]));
  }
  const Root_reg = cur;

  // Nullifier = Poseidon(sk_i, rid)
  const Null_i = F.toObject(poseidon([sk_i, rid]));

  // Commitment = Poseidon(s_i, r_i)
  const Com_i = F.toObject(poseidon([s_i, r_i]));

  return {
    Root_reg: Root_reg.toString(),
    Com_i: Com_i.toString(),
    Null_i: Null_i.toString(),
    rid: rid.toString(),
    S_max: S_max.toString(),
    s_i: s_i.toString(),
    r_i: r_i.toString(),
    sk_i: sk_i.toString(),
    leaf: leaf.toString(),
    pathElements: pathElements.map((x) => x.toString()),
    pathIndex: pathIndex,
  };
}

async function main() {
  const wasmPath = path.join(__dirname, "..", "build", "vote_js", "vote.wasm");
  const zkeyPath = path.join(__dirname, "..", "build", "vote_plonk.zkey");

  if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
    console.error("❌ 请先确保已编译 vote.circom 且完成 PLONK setup");
    process.exit(1);
  }

  const input = await buildInput();
  const runs = 10;
  let times = [];

  console.log("🚀 开始 PLONK fullProve 基准测试 (runs =", runs, ")");

  // Warm-up
  console.log("⚙️  Warm-up...");
  await snarkjs.plonk.fullProve(input, wasmPath, zkeyPath);

  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    const { proof, publicSignals } = await snarkjs.plonk.fullProve(
      input,
      wasmPath,
      zkeyPath
    );
    const t1 = performance.now();
    const dt = t1 - t0;
    times.push(dt);
    console.log(`Run #${i + 1}: ${dt.toFixed(2)} ms`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log("=======================================");
  console.log(
    `PLONK fullProve 平均时间: ${avg.toFixed(2)} ms (witness + prove)`
  );
  console.log("=======================================");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
