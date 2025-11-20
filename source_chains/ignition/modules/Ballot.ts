import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import Groth16VerifierModule from "./Groth16Verifier.js";

const BallotModule = buildModule("BallotModule", (m) => {
  const { verifier } = m.useModule(Groth16VerifierModule);

  const ballot = m.contract("Ballot", [verifier]);

  return { ballot, verifier };
});

export default BallotModule;
