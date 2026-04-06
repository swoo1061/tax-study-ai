/**
 * CS 에이전트
 * - 문의 자동 분류 + FAQ 매칭 + 1차 응답 생성
 * - 에스컬레이션 판단
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const TICKETS_FILE = join(DATA_DIR, "tickets.json");

export type TicketCategory = "error_report" | "refund" | "account" | "payment" | "feature" | "general";
export type TicketStatus = "open" | "auto_resolved" | "escalated" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface Ticket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: TicketCategory;
  priority: TicketPriority;
  subject: string;
  message: string;
  questionId?: string; // 오류신고 시 해당 문제 ID
  status: TicketStatus;
  autoReply: string;
  adminNote?: string;
  createdAt: number;
  resolvedAt?: number;
}

// --- FAQ 데이터 ---
const FAQ: { keywords: string[]; category: TicketCategory; answer: string; priority: TicketPriority }[] = [
  {
    keywords: ["정답", "틀", "오답", "오류", "잘못"],
    category: "error_report",
    priority: "high",
    answer: "문제 오류 신고가 접수되었습니다. AI 검증 에이전트가 자동으로 재검증을 진행하며, 확인 후 수정 결과를 알려드리겠습니다. 해당 문제는 이용횟수에서 차감하지 않습니다.",
  },
  {
    keywords: ["환불", "취소", "결제취소", "돈"],
    category: "refund",
    priority: "high",
    answer: "환불 요청이 접수되었습니다.\n\n• 콘텐츠 열람 전: 결제일로부터 7일 이내 전액 환불 가능합니다.\n• 콘텐츠 열람 후: 디지털 콘텐츠 특성상 환불이 제한됩니다.\n• 중복 결제/오류 결제: 확인 후 즉시 환불 처리해드립니다.\n\n구체적인 결제 내역(날짜, 금액)을 알려주시면 빠르게 처리하겠습니다.",
  },
  {
    keywords: ["비밀번호", "로그인", "접속", "비번"],
    category: "account",
    priority: "medium",
    answer: "로그인에 어려움이 있으시군요.\n\n• 비밀번호 분실: 로그인 페이지에서 '비밀번호 찾기'를 이용해주세요.\n• 카카오 로그인: 현재 준비 중이며, 이메일 가입을 이용해주세요.\n• 계속 문제가 있으시면 가입하신 이메일을 알려주시면 확인해드리겠습니다.",
  },
  {
    keywords: ["탈퇴", "삭제", "개인정보", "탈퇴하고"],
    category: "account",
    priority: "medium",
    answer: "회원탈퇴 요청이 접수되었습니다. 탈퇴 시 모든 학습 기록과 개인정보가 즉시 삭제되며 복구가 불가능합니다. 탈퇴를 진행하시겠습니까? 확인 후 24시간 이내 처리해드리겠습니다.",
  },
  {
    keywords: ["결제", "안됨", "안돼", "실패", "카드"],
    category: "payment",
    priority: "high",
    answer: "결제 오류가 발생한 것 같습니다.\n\n• 카드 한도/잔액을 확인해주세요.\n• 다른 결제 수단(카카오페이 등)을 시도해보세요.\n• 결제는 완료되었으나 서비스가 제공되지 않은 경우, 주문번호를 알려주시면 즉시 확인하겠습니다.",
  },
  {
    keywords: ["느려", "오래", "로딩", "시간"],
    category: "general",
    priority: "low",
    answer: "AI가 실시간으로 문제를 생성하므로 5~15초 정도 소요됩니다. 모의고사는 사전 생성된 문제를 사용하므로 즉시 시작 가능합니다. 1분 이상 로딩이 지속되면 페이지를 새로고침해주세요.",
  },
  {
    keywords: ["법", "바뀌", "개정", "최신", "옛날"],
    category: "error_report",
    priority: "medium",
    answer: "현재 2025년 기준 법령을 적용하고 있습니다. 누락된 개정사항을 발견하시면 구체적인 내용(법조문, 변경 내용)을 알려주시면 신속하게 반영하겠습니다.",
  },
  {
    keywords: ["기출", "기출문제", "과거문제"],
    category: "feature",
    priority: "low",
    answer: "기출문제 서비스는 Q-Net 공개 데이터 확인 후 순차적으로 추가할 예정입니다. 현재는 AI가 실제 시험과 동일한 수준의 문제를 무한 생성하여 제공하고 있습니다.",
  },
  {
    keywords: ["영수증", "세금계산서", "증빙"],
    category: "payment",
    priority: "low",
    answer: "결제 영수증은 결제 완료 시 등록된 이메일로 자동 발송됩니다. 세금계산서 발급이 필요하시면 사업자등록번호와 함께 요청해주세요.",
  },
];

// --- 자동 분류 ---
function classifyTicket(subject: string, message: string): { category: TicketCategory; priority: TicketPriority; autoReply: string } {
  const text = (subject + " " + message).toLowerCase();

  for (const faq of FAQ) {
    const matched = faq.keywords.some(kw => text.includes(kw));
    if (matched) {
      return { category: faq.category, priority: faq.priority, autoReply: faq.answer };
    }
  }

  return {
    category: "general",
    priority: "low",
    autoReply: "문의가 접수되었습니다. 담당자가 확인 후 24시간 이내에 답변드리겠습니다. 감사합니다.",
  };
}

// --- 티켓 CRUD ---
function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadTickets(): Ticket[] {
  ensureDir();
  if (!existsSync(TICKETS_FILE)) return [];
  try { return JSON.parse(readFileSync(TICKETS_FILE, "utf-8")); } catch { return []; }
}

function saveTickets(tickets: Ticket[]) {
  ensureDir();
  writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

export function createTicket(
  userId: string, userName: string, userEmail: string,
  subject: string, message: string, questionId?: string
): Ticket {
  const { category, priority, autoReply } = classifyTicket(subject, message);

  const ticket: Ticket = {
    id: crypto.randomUUID(),
    userId, userName, userEmail,
    category, priority,
    subject, message,
    questionId,
    status: category === "error_report" && questionId ? "open" : (autoReply ? "auto_resolved" : "open"),
    autoReply,
    createdAt: Date.now(),
  };

  const tickets = loadTickets();
  tickets.push(ticket);
  saveTickets(tickets);
  return ticket;
}

export function getTickets(status?: TicketStatus): Ticket[] {
  const tickets = loadTickets();
  if (status) return tickets.filter(t => t.status === status).sort((a, b) => b.createdAt - a.createdAt);
  return tickets.sort((a, b) => b.createdAt - a.createdAt);
}

export function getTicketsByUser(userId: string): Ticket[] {
  return loadTickets().filter(t => t.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
}

export function updateTicket(ticketId: string, update: { status?: TicketStatus; adminNote?: string }): Ticket | null {
  const tickets = loadTickets();
  const idx = tickets.findIndex(t => t.id === ticketId);
  if (idx < 0) return null;
  if (update.status) tickets[idx].status = update.status;
  if (update.adminNote) tickets[idx].adminNote = update.adminNote;
  if (update.status === "closed") tickets[idx].resolvedAt = Date.now();
  saveTickets(tickets);
  return tickets[idx];
}

export function getTicketStats() {
  const tickets = loadTickets();
  return {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    autoResolved: tickets.filter(t => t.status === "auto_resolved").length,
    escalated: tickets.filter(t => t.status === "escalated").length,
    closed: tickets.filter(t => t.status === "closed").length,
    byCategory: {
      error_report: tickets.filter(t => t.category === "error_report").length,
      refund: tickets.filter(t => t.category === "refund").length,
      account: tickets.filter(t => t.category === "account").length,
      payment: tickets.filter(t => t.category === "payment").length,
      feature: tickets.filter(t => t.category === "feature").length,
      general: tickets.filter(t => t.category === "general").length,
    },
  };
}
