import { NextResponse } from "next/server";

import {
  getAdminCookieName,
  getAdminSessionValue,
  isAdminPasswordValid,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");

  if (!isAdminPasswordValid(password)) {
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url));
  }

  const sessionValue = getAdminSessionValue();
  if (!sessionValue) {
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url));
  }

  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.set(getAdminCookieName(), sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
