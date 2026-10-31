// Switch between the mock pipeline (B) and the real one (A). A owns the final version of this file.
// TODO(A): when ./check and ./investigate exist, export them when process.env.PIPELINE === "real".
export { checkTurn, investigate } from "./mock";
