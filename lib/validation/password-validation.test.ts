import {
  validatePasswordConfirmation,
  validatePasswordStrength,
} from "@/lib/validation/password-validation";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(validatePasswordStrength("1234567") !== null, "short password rejected");
assert(validatePasswordStrength("12345678") === null, "8 char ok");
assert(validatePasswordConfirmation("12345678", "12345678") === null, "match ok");
assert(validatePasswordConfirmation("12345678", "87654321") !== null, "mismatch rejected");

console.log("password-validation.test.ts OK");
