import { createHash } from "node:crypto";

import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "admin_session";

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function getExpectedSessionValue() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return sha256(password);
}

export function isAdminPasswordValid(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME;
}

export function getAdminSessionValue() {
  return getExpectedSessionValue();
}

export async function isAdminAuthenticated() {
  const expected = getExpectedSessionValue();
  if (!expected) return false;
  const store = await cookies();
  return store.get(ADMIN_COOKIE_NAME)?.value === expected;
}
