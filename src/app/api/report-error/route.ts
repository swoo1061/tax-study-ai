import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { submitErrorReport } from "@/lib/qa-agent";
import { registerFeedback, trackAffectedUser } from "@/lib/qa-feedback";

// 신고 유형 → 피드백 이슈 유형 매핑
const REPORT_TO_ISSUE: Record<string, string> = {
  wrong_answer: "calculation_error",
  wrong_explanation: "missing_wrong_explanation",
  outdated_law: "outdated_law",
  duplicate: "duplicate_choices",
  other: "other",
};

export async function POST(req: NextRequest) {
  const user = getUserFromCookie(req.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { questionId, reportType, description, questionData } = await req.json();
  if (!questionId || !reportType) {
    return NextResponse.json({ error: "신고 정보가 부족합니다" }, { status: 400 });
  }

  // 1. QA 에이전트로 검증
  const { report, autoVerified } = await submitErrorReport(
    questionId, user.id, reportType, description || "", questionData
  );

  // 2. 오류 확인 시 → QA 피드백 등록 (생성팀 프롬프트에 반영)
  if (report.status === "fixed" || report.status === "verified_error") {
    const issueType = REPORT_TO_ISSUE[reportType] || "other";
    const subject = questionData?.subject || "전체";
    registerFeedback(
      issueType as any,
      subject,
      `${reportType}: ${description || "유저 신고"} (문제 ${questionId.substring(0, 8)})`
    );
  }

  // 3. 영향받은 유저 추적 (고객 대응용)
  trackAffectedUser(questionId, user.id, user.name, reportType);

  // 4. 응답 메시지
  let message = "오류 신고가 접수되었습니다.";
  let customerAction = "";

  if (autoVerified) {
    if (report.status === "fixed") {
      message = "AI 검증 결과 오류가 확인되어 자동 수정되었습니다.";
      customerAction = "해당 문제의 코인 1개가 환불됩니다.";
    } else if (report.status === "not_error") {
      message = "AI 검증 결과 해당 문제의 정답과 해설이 정확한 것으로 확인되었습니다.";
      customerAction = "추가 이의가 있으시면 문의하기를 이용해주세요.";
    }
  } else {
    message = "오류 신고가 접수되었습니다. 검토 후 결과를 알려드리겠습니다.";
    customerAction = "검토 완료 시 알림을 보내드립니다.";
  }

  return NextResponse.json({
    report: { id: report.id, status: report.status },
    message,
    customerAction,
    feedbackRegistered: report.status === "fixed" || report.status === "verified_error",
  });
}
