import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { submitErrorReport } from "@/lib/qa-agent";
import { getQuestionById } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const user = getUserFromCookie(req.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { questionId, reportType, description, questionData } = await req.json();
  if (!questionId || !reportType) {
    return NextResponse.json({ error: "신고 정보가 부족합니다" }, { status: 400 });
  }

  const { report, autoVerified } = await submitErrorReport(
    questionId, user.id, reportType, description || "", questionData
  );

  let message = "오류 신고가 접수되었습니다.";
  if (autoVerified) {
    if (report.status === "fixed") {
      message = "AI 검증 결과 오류가 확인되어 자동 수정되었습니다. 감사합니다!";
    } else if (report.status === "not_error") {
      message = "AI 검증 결과 해당 문제의 정답과 해설이 정확한 것으로 확인되었습니다.";
    }
  } else {
    message = "오류 신고가 접수되었습니다. 검토 후 결과를 알려드리겠습니다.";
  }

  return NextResponse.json({ report: { id: report.id, status: report.status }, message });
}
