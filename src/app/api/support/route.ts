import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { createTicket, getTicketsByUser } from "@/lib/cs-agent";

// 문의 제출
export async function POST(req: NextRequest) {
  const user = getUserFromCookie(req.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { subject, message, questionId } = await req.json();
  if (!subject || !message) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요" }, { status: 400 });
  }

  const ticket = createTicket(user.id, user.name, user.email, subject, message, questionId);

  return NextResponse.json({
    ticket: { id: ticket.id, category: ticket.category, status: ticket.status },
    autoReply: ticket.autoReply,
  });
}

// 내 문의 목록
export async function GET(req: NextRequest) {
  const user = getUserFromCookie(req.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const tickets = getTicketsByUser(user.id);
  return NextResponse.json({ tickets });
}
