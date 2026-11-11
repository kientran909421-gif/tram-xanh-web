import { randomInt } from "node:crypto";

export const ORDER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateOrderCode(date = new Date()): string {
  const datePart = formatCodeDate(date);
  const randomPart = Array.from(
    { length: 4 },
    () => ORDER_CODE_ALPHABET[randomInt(ORDER_CODE_ALPHABET.length)],
  ).join("");

  return `CF-${datePart}-${randomPart}`;
}

function formatCodeDate(date: Date): string {
  return date.toISOString().slice(2, 10).replaceAll("-", "");
}
