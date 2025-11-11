pragma circom 2.0.0;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";


template Vote() {
    // witness

    signal input s;
    signal input r;

    // tatement
    signal output com;

    // 0 <= s < 256
    component bits = Num2Bits(8);
    bits.in <== s;

    component h = Poseidon(2);
    h.inputs[0] <== s;
    h.inputs[1] <== r;

    com <== h.out;
}

component main = Vote();
