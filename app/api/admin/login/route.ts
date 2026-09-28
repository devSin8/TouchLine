import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, adminAuthConfigured, checkAdminPassword, createAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!adminAuthConfigured()) {
    return NextResponse.json({ error: "Admin sign-in is not configured on this deployment." }, { status: 503 });
  }
  let password = "";
  try {
    const body = await request.json() as { password?: unknown };
    if (typeof body.password === "string") password = body.password;
  } catch {
    return NextResponse.json({ error: "Enter the admin password." }, { status: 400 });
  }
  if (!checkAdminPassword(password, process.env.ADMIN_UPLOAD_PASSWORD!)) {
    return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
