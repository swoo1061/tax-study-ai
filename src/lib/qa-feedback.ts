/**
 * QA 피드백 루프
 * - QA/CS에서 발견한 품질 패턴을 수집
 * - 패턴별 프롬프트 개선 지시를 생성
 * - 문제 생성 시 동적으로 프롬프트에 주입
 * - 품질이슈 문제를 푼 유저 목록 관리 (고객 대응용)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const FEEDBACK_FILE = join(DATA_DIR, "qa-feedback.json");
const AFFECTED_USERS_FILE = join(DATA_DIR, "affected-users.json");

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

// ========== 품질 피드백 (QA → 생성팀) ==========

export interface QualityFeedback {
  id: string;
  issueType: "duplicate_choices" | "missing_wrong_explanation" | "keyword_mismatch" | "calculation_error" | "outdated_law" | "format_error" | "other";
  subject: string;       // 발생 과목
  description: string;   // 구체적 설명
  promptFix: string;     // 프롬프트에 추가할 지시
  severity: "low" | "medium" | "high";
  status: "active" | "resolved";
  reportCount: number;   // 같은 유형 누적 신고 수
  createdAt: number;
  resolvedAt?: number;
}

function loadFeedback(): QualityFeedback[] {
  ensureDir();
  if (!existsSync(FEEDBACK_FILE)) return [];
  try { return JSON.parse(readFileSync(FEEDBACK_FILE, "utf-8")); } catch { return []; }
}

function saveFeedback(items: QualityFeedback[]) {
  ensureDir();
  writeFileSync(FEEDBACK_FILE, JSON.stringify(items, null, 2));
}

// 이슈 유형 → 프롬프트 수정 지시 매핑
const ISSUE_TO_PROMPT_FIX: Record<string, string> = {
  duplicate_choices:
    "⚠️ 선택지 중복 금지: 5개 선택지는 반드시 서로 다른 내용이어야 합니다. 유사한 표현이나 같은 결론의 선택지를 만들지 마세요. 각 선택지는 명확히 구분 가능해야 합니다.",
  missing_wrong_explanation:
    "⚠️ 오답 해설 필수: 해설에서 정답 이유뿐만 아니라, 나머지 4개 선택지가 각각 왜 틀린지 구체적으로 설명해야 합니다. '①번은 ~이므로 틀림, ②번은 ~이므로 틀림' 형식으로.",
  keyword_mismatch:
    "⚠️ 해설-정답 일치: 해설에서 정답 선택지의 핵심 내용을 반드시 언급하고, 왜 그것이 정답인지 직접적으로 설명해야 합니다.",
  calculation_error:
    "⚠️ 계산 재검산 필수: 계산 문제는 풀이 과정을 단계별로 적은 뒤, 마지막에 반드시 재검산하세요. 중간 계산값과 최종 답이 일치하는지 확인.",
  outdated_law:
    "⚠️ 2025년 현행법 적용: 반드시 참조 법령에 제시된 최신 세율/공제한도를 사용하세요. 이전 연도 세율 적용 금지.",
  format_error:
    "⚠️ JSON 포맷 엄수: choices 배열 5개, answer는 정수 1~5, body 80자 이상을 반드시 지키세요.",
};

/**
 * QA/CS에서 품질 이슈를 신고하면 피드백으로 등록
 */
export function registerFeedback(
  issueType: QualityFeedback["issueType"],
  subject: string,
  description: string,
): QualityFeedback {
  const items = loadFeedback();

  // 같은 유형+과목의 기존 피드백이 있으면 카운트 증가
  const existing = items.find(f => f.issueType === issueType && f.subject === subject && f.status === "active");
  if (existing) {
    existing.reportCount++;
    existing.description = description; // 최신 설명으로 갱신
    // 3건 이상이면 심각도 상승
    if (existing.reportCount >= 5) existing.severity = "high";
    else if (existing.reportCount >= 3) existing.severity = "medium";
    saveFeedback(items);
    return existing;
  }

  const feedback: QualityFeedback = {
    id: crypto.randomUUID(),
    issueType,
    subject,
    description,
    promptFix: ISSUE_TO_PROMPT_FIX[issueType] || "",
    severity: "low",
    status: "active",
    reportCount: 1,
    createdAt: Date.now(),
  };
  items.push(feedback);
  saveFeedback(items);
  return feedback;
}

/**
 * 문제 생성 시 호출 — 현재 활성 피드백을 프롬프트 지시로 변환
 */
export function getActivePromptFixes(subject?: string): string {
  const items = loadFeedback().filter(f => f.status === "active");
  if (items.length === 0) return "";

  // 해당 과목 피드백 + 전체 공통 피드백
  const relevant = items.filter(f => !subject || f.subject === subject || f.subject === "전체");

  if (relevant.length === 0) return "";

  const fixes = relevant
    .sort((a, b) => b.reportCount - a.reportCount) // 빈발 순
    .slice(0, 5) // 최대 5개
    .map(f => f.promptFix)
    .filter(Boolean);

  if (fixes.length === 0) return "";

  return `\n## 품질 개선 지시 (QA팀 피드백 반영)\n${fixes.join("\n")}`;
}

/**
 * 피드백 해결 처리
 */
export function resolveFeedback(feedbackId: string) {
  const items = loadFeedback();
  const idx = items.findIndex(f => f.id === feedbackId);
  if (idx >= 0) {
    items[idx].status = "resolved";
    items[idx].resolvedAt = Date.now();
    saveFeedback(items);
  }
}

/**
 * 관리자용 — 활성 피드백 목록
 */
export function getActiveFeedback(): QualityFeedback[] {
  return loadFeedback().filter(f => f.status === "active").sort((a, b) => b.reportCount - a.reportCount);
}

export function getAllFeedback(): QualityFeedback[] {
  return loadFeedback().sort((a, b) => b.createdAt - a.createdAt);
}

// ========== 영향받은 유저 추적 (고객 대응) ==========

export interface AffectedUser {
  questionId: string;
  userId: string;
  userName: string;
  issueType: string;
  notified: boolean;
  compensated: boolean; // 코인 환불 등
  timestamp: number;
}

function loadAffectedUsers(): AffectedUser[] {
  ensureDir();
  if (!existsSync(AFFECTED_USERS_FILE)) return [];
  try { return JSON.parse(readFileSync(AFFECTED_USERS_FILE, "utf-8")); } catch { return []; }
}

function saveAffectedUsers(users: AffectedUser[]) {
  ensureDir();
  writeFileSync(AFFECTED_USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * 품질이슈 문제를 푼 유저 등록
 */
export function trackAffectedUser(questionId: string, userId: string, userName: string, issueType: string) {
  const users = loadAffectedUsers();
  if (users.find(u => u.questionId === questionId && u.userId === userId)) return; // 중복 방지
  users.push({ questionId, userId, userName, issueType, notified: false, compensated: false, timestamp: Date.now() });
  saveAffectedUsers(users);
}

/**
 * 미처리 영향 유저 조회 (관리자용)
 */
export function getUnnotifiedAffectedUsers(): AffectedUser[] {
  return loadAffectedUsers().filter(u => !u.notified);
}

/**
 * 알림/보상 처리 완료 표시
 */
export function markUserNotified(questionId: string, userId: string, compensated = false) {
  const users = loadAffectedUsers();
  const user = users.find(u => u.questionId === questionId && u.userId === userId);
  if (user) {
    user.notified = true;
    user.compensated = compensated;
    saveAffectedUsers(users);
  }
}

/**
 * 고객 대응 현황 요약
 */
export function getCustomerResponseStats() {
  const users = loadAffectedUsers();
  return {
    total: users.length,
    notified: users.filter(u => u.notified).length,
    unnotified: users.filter(u => !u.notified).length,
    compensated: users.filter(u => u.compensated).length,
  };
}
