import { NextRequest, NextResponse } from "next/server";
import { EXAM_CATALOG } from "@/lib/exam-catalog";
import { getUserFromCookie } from "@/lib/auth";
import { getUserScores } from "@/lib/scores";
import { existsSync } from "fs";
import { join } from "path";

export async function GET(req: NextRequest) {
  const user = getUserFromCookie(req.headers.get("cookie"));
  const userScores = user ? getUserScores(user.id) : [];

  const exams = EXAM_CATALOG.map((e) => {
    const cached = existsSync(join(process.cwd(), "data", "exams", `${e.id}.json`));
    const myScore = userScores.find((s) => s.examId === e.id);
    return {
      ...e,
      ready: cached,
      myScore: myScore?.percentage ?? null,
      taken: !!myScore,
    };
  });

  return NextResponse.json({ exams, loggedIn: !!user });
}
