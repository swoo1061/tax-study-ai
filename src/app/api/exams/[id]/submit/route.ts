import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { submitScore, getDistribution } from "@/lib/scores";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = getUserFromCookie(req.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { score, total } = await req.json();
  if (typeof score !== "number" || typeof total !== "number" || total === 0) {
    return NextResponse.json({ error: "잘못된 점수 데이터" }, { status: 400 });
  }

  const percentage = Math.round((score / total) * 100);

  submitScore({
    userId: user.id,
    userName: user.name,
    examId: id,
    score,
    total,
    percentage,
    timestamp: Date.now(),
  });

  const distribution = getDistribution(id, user.id);

  return NextResponse.json({ ok: true, distribution });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = getUserFromCookie(req.headers.get("cookie"));
  const distribution = getDistribution(id, user?.id);
  return NextResponse.json({ distribution });
}
