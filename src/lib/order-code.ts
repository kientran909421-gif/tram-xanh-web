import { randomInt } from "node:crypto";

const ORDER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateOrderCode(date = new Date()): string {
  const datePart = date.toISOString().slice(2, 10).replaceAll("-", "");
  const randomPart = Array.from(
    { length: 4 },
    () => ORDER_CODE_ALPHABET[randomInt(ORDER_CODE_ALPHABET.length)],
  ).join("");

  return `CF-${datePart}-${randomPart}`;
}
