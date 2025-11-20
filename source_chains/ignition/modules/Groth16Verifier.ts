import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const Groth16VerifierModule = buildModule("Groth16VerifierModule", (m) => {
  const verifier = m.contract("Groth16Verifier");

  return { verifier };
});

export default Groth16VerifierModule;
