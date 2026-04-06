import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromCookie(req.headers.get("cookie"));
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
