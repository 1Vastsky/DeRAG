pragma circom 2.0.0;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";

template VoteV2() {
    // ==== 私有输入 ====
    signal input s;     // 分数
    signal input r;     // 随机数
    signal input sk;    // 私钥 (secret key)

    // ==== 公共输入 ====
    signal input rid;   // 当前轮次 (round id)

    // ==== 公共输出 ====
    signal output com;        // 承诺
    signal output nullifier;  // 防双投标识

    // 1️⃣ 范围检查
    component bits = Num2Bits(8);
    bits.in <== s;

    // 2️⃣ com = Poseidon(s, r)
    component h1 = Poseidon(2);
    h1.inputs[0] <== s;
    h1.inputs[1] <== r;
    com <== h1.out;

    // 3️⃣ nullifier = Poseidon(sk, rid)
    component h2 = Poseidon(2);
    h2.inputs[0] <== sk;
    h2.inputs[1] <== rid;
    nullifier <== h2.out;
}

// ✳️ 关键修改在这里：显式声明 public signals 列表
component main { public [rid] } = VoteV2();
