import { AttemptRecord, SubjectStats, TopicStats, DailyCount, Question, SavedQuestion, ExamResult } from "./types";

// --- Keys ---
const ATTEMPTS_KEY = "tax-study-attempts";
const QUESTIONS_KEY = "tax-study-questions";
const BOOKMARKS_KEY = "tax-study-bookmarks";
const DAILY_KEY = "tax-study-daily";
const EXAMS_KEY = "tax-study-exams";
const COINS_KEY = "tax-study-coins";
const COIN_LOG_KEY = "tax-study-coin-log";

const FREE_DAILY_LIMIT = 5;
const INITIAL_COINS = 999999; // 무한 충전

// --- Attempts ---
export function getAttempts(): AttemptRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || "[]");
  } catch { return []; }
}

export function saveAttempt(record: AttemptRecord) {
  const attempts = getAttempts();
  attempts.push(record);
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  incrementDailyCount();
}

export function updateAttemptCorrectness(attemptId: string, correct: boolean) {
  const attempts = getAttempts();
  const idx = attempts.findIndex((a) => a.id === attemptId);
  if (idx >= 0) {
    attempts[idx].correct = correct;
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  }
}

export function getRecentAttempts(n = 20): AttemptRecord[] {
  return getAttempts().slice(-n).reverse();
}

export function getWrongAttempts(): AttemptRecord[] {
  return getAttempts().filter((a) => !a.correct).reverse();
}

export function getWrongAttemptsBySubject(subject?: string): AttemptRecord[] {
  let wrong = getWrongAttempts();
  if (subject) wrong = wrong.filter((a) => a.subject === subject);
  return wrong;
}

// --- Stats ---
export function getSubjectStats(): SubjectStats[] {
  const attempts = getAttempts();
  const map = new Map<string, { total: number; correct: number }>();
  for (const a of attempts) {
    const cur = map.get(a.subject) || { total: 0, correct: 0 };
    cur.total++;
    if (a.correct) cur.correct++;
    map.set(a.subject, cur);
  }
  return Array.from(map.entries()).map(([subject, { total, correct }]) => ({
    subject, total, correct,
    rate: total > 0 ? Math.round((correct / total) * 100) : 0,
  }));
}

export function getTopicStats(): TopicStats[] {
  const attempts = getAttempts();
  const map = new Map<string, { subject: string; total: number; correct: number }>();
  for (const a of attempts) {
    const key = `${a.subject}|${a.topic}`;
    const cur = map.get(key) || { subject: a.subject, total: 0, correct: 0 };
    cur.total++;
    if (a.correct) cur.correct++;
    map.set(key, cur);
  }
  return Array.from(map.entries()).map(([key, { subject, total, correct }]) => ({
    topic: key.split("|")[1],
    subject, total, correct,
    rate: total > 0 ? Math.round((correct / total) * 100) : 0,
  }));
}

export function getWeakTopics(n = 5): TopicStats[] {
  return getTopicStats()
    .filter((t) => t.total >= 2)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, n);
}

export function getDailyHistory(days = 7): DailyCount[] {
  const attempts = getAttempts();
  const result: DailyCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = attempts.filter((a) => new Date(a.timestamp).toISOString().slice(0, 10) === dateStr).length;
    result.push({ date: dateStr, count });
  }
  return result;
}

// --- Questions (저장소) ---
export function saveQuestion(q: Question) {
  const questions = getSavedQuestions();
  questions[q.id] = q;
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
}

function getSavedQuestions(): Record<string, Question> {
  try {
    return JSON.parse(localStorage.getItem(QUESTIONS_KEY) || "{}");
  } catch { return {}; }
}

export function getQuestionById(id: string): Question | null {
  return getSavedQuestions()[id] || null;
}

// --- Bookmarks ---
export function getBookmarks(): SavedQuestion[] {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
  } catch { return []; }
}

export function addBookmark(q: Question) {
  const bookmarks = getBookmarks();
  if (bookmarks.find((b) => b.id === q.id)) return;
  bookmarks.push({ ...q, bookmarkedAt: Date.now() });
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function removeBookmark(questionId: string) {
  const bookmarks = getBookmarks().filter((b) => b.id !== questionId);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function isBookmarked(questionId: string): boolean {
  return getBookmarks().some((b) => b.id === questionId);
}

// --- Coins ---
export interface CoinLog {
  id: string;
  type: "charge" | "use" | "refund";
  amount: number;
  balance: number;
  description: string;
  timestamp: number;
}

export const COIN_COSTS = {
  question: 1,      // 문제 1개 = 1코인
  exam_small: 5,    // 모의고사 5문제 = 5코인
  exam_medium: 10,  // 모의고사 10문제 = 10코인
  exam_large: 20,   // 모의고사 20문제 = 20코인
} as const;

function initCoins() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(COINS_KEY) === null) {
    localStorage.setItem(COINS_KEY, String(INITIAL_COINS));
    addCoinLog("charge", INITIAL_COINS, INITIAL_COINS, "초기 충전");
  }
}

export function getCoins(): number {
  if (typeof window === "undefined") return 0;
  initCoins();
  return parseInt(localStorage.getItem(COINS_KEY) || "0", 10);
}

export function useCoins(amount: number, description: string): boolean {
  const current = getCoins();
  if (current < amount) return false;
  const newBalance = current - amount;
  localStorage.setItem(COINS_KEY, String(newBalance));
  addCoinLog("use", -amount, newBalance, description);
  return true;
}

export function chargeCoins(amount: number, description: string) {
  const current = getCoins();
  const newBalance = current + amount;
  localStorage.setItem(COINS_KEY, String(newBalance));
  addCoinLog("charge", amount, newBalance, description);
}

export function refundCoins(amount: number, description: string) {
  const current = getCoins();
  const newBalance = current + amount;
  localStorage.setItem(COINS_KEY, String(newBalance));
  addCoinLog("refund", amount, newBalance, description);
}

function addCoinLog(type: CoinLog["type"], amount: number, balance: number, description: string) {
  const logs = getCoinLogs();
  logs.push({ id: crypto.randomUUID(), type, amount, balance, description, timestamp: Date.now() });
  // 최근 200건만 유지
  if (logs.length > 200) logs.splice(0, logs.length - 200);
  localStorage.setItem(COIN_LOG_KEY, JSON.stringify(logs));
}

export function getCoinLogs(): CoinLog[] {
  try { return JSON.parse(localStorage.getItem(COIN_LOG_KEY) || "[]"); } catch { return []; }
}

export function hasEnoughCoins(amount: number): boolean {
  return getCoins() >= amount;
}

// --- Daily tracking (통계용, 제한 아님) ---
function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyData(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DAILY_KEY) || "{}");
  } catch { return {}; }
}

function incrementDailyCount() {
  const data = getDailyData();
  const today = getTodayKey();
  data[today] = (data[today] || 0) + 1;
  const keys = Object.keys(data).sort();
  while (keys.length > 7) { delete data[keys.shift()!]; }
  localStorage.setItem(DAILY_KEY, JSON.stringify(data));
}

export function getTodayCount(): number {
  return getDailyData()[getTodayKey()] || 0;
}

export function getRemainingToday(): number {
  return Math.max(0, FREE_DAILY_LIMIT - getTodayCount());
}

export function isLimitReached(): boolean {
  return !hasEnoughCoins(1); // 코인 기반으로 변경
}

export function getDailyLimit(): number {
  return FREE_DAILY_LIMIT;
}

// --- Exam results ---
export function getExamResults(): ExamResult[] {
  try {
    return JSON.parse(localStorage.getItem(EXAMS_KEY) || "[]");
  } catch { return []; }
}

export function saveExamResult(result: ExamResult) {
  const results = getExamResults();
  results.push(result);
  localStorage.setItem(EXAMS_KEY, JSON.stringify(results));
}

// --- Clear ---
export function clearAllData() {
  localStorage.removeItem(ATTEMPTS_KEY);
  localStorage.removeItem(QUESTIONS_KEY);
  localStorage.removeItem(BOOKMARKS_KEY);
  localStorage.removeItem(DAILY_KEY);
  localStorage.removeItem(EXAMS_KEY);
  localStorage.removeItem(COINS_KEY);
  localStorage.removeItem(COIN_LOG_KEY);
}
