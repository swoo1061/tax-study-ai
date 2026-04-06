import { NextRequest, NextResponse } from "next/server";
import { createUser, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json();
    if (!email || !name || !password) {
      return NextResponse.json({ error: "이메일, 이름, 비밀번호를 입력하세요" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다" }, { status: 400 });
    }

    const user = await createUser(email, name, password);
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
    const msg = e instanceof Error ? e.message : "회원가입 실패";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
