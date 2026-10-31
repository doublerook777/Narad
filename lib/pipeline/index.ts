import * as real from "./check";
import * as realInv from "./investigate";
import * as mock from "./mock";
import type { CheckInput, Claim, Investigation, PlayerSlot } from "../types";

export async function checkTurn(input: CheckInput, emit: (c: Claim) => void): Promise<Claim[]> {
  const isReal = process.env.PIPELINE === "real";
  if (isReal) {
    return real.checkTurn(input, emit);
  }
  return mock.checkTurn(input, emit);
}

export async function investigate(
  claim: Claim,
  requestedBy: PlayerSlot | "auto",
  emit: (i: Investigation) => void
): Promise<Investigation> {
  const isReal = process.env.PIPELINE === "real";
  if (isReal) {
    return realInv.investigate(claim, requestedBy, emit);
  }
  return mock.investigate(claim, requestedBy, emit);
}
