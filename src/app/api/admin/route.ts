import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { getTicketStats, getTickets, updateTicket } from "@/lib/cs-agent";
import { getDailyQAReport, getPendingReports } from "@/lib/qa-agent";

// 간단한 관리자 체크 (첫 번째 가입자 = 관리자)
function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  return adminEmails.includes(email) || email === "admin@taxstudy.kr";
}

export async function GET(req: NextRequest) {
  const user = getUserFromCookie(req.headers.get("cookie"));
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  }

  const ticketStats = getTicketStats();
  const qaReport = getDailyQAReport();
  const openTickets = getTickets("open");
  const pendingQA = getPendingReports();

  return NextResponse.json({
    ticketStats,
    qaReport,
    openTickets: openTickets.slice(0, 20),
    pendingQA: pendingQA.slice(0, 20),
  });
}

// 티켓 처리
export async function PATCH(req: NextRequest) {
  const user = getUserFromCookie(req.headers.get("cookie"));
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  }

  const { ticketId, status, adminNote } = await req.json();
  const updated = updateTicket(ticketId, { status, adminNote });
  if (!updated) return NextResponse.json({ error: "티켓을 찾을 수 없습니다" }, { status: 404 });

  return NextResponse.json({ ticket: updated });
}
