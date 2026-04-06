import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력하세요" }, { status: 400 });
    }

    const user = findUserByEmail(email);
    if (!user) return NextResponse.json({ error: "등록되지 않은 이메일입니다" }, { status: 401 });

    const valid = await verifyPassword(user, password);
    if (!valid) return NextResponse.json({ error: "비밀번호가 올바르지 않습니다" }, { status: 401 });

    const token = createSession(user.id);

    const res = NextResponse.json({ id: user.id, email: user.email, name: user.name });
    res.cookies.set("session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });
    return res;
  } catch (e: unknown) {
    return NextResponse.json({ error: "로그인 실패" }, { status: 500 });
  }
}
