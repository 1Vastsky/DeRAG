pragma circom 2.0.0;

include "circomlib/circomlib.circom";

// 简化版单票电路：
// 私有输入： s （分数，0~255）、r（随机数）
// 公共输出： com （承诺值）
//
// 电路做两件事：
// 1) 检查 0 <= s < 256 （Num2Bits 自动保证）
// 2) 计算 com = Poseidon(s, r)
template Vote() {
    // 私有输入（witness）
    signal input s;
    signal input r;

    // 公共输出（statement）
    signal output com;

    // 1. 范围检查：0 <= s < 256
    component bits = Num2Bits(8);
    bits.in <== s;

    // 2. 承诺一致性：com = Poseidon(s, r)
    component h = Poseidon(2);
    h.inputs[0] <== s;
    h.inputs[1] <== r;

    com <== h.out;
}

component main = Vote();
