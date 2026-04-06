import { AttemptRecord, SubjectStats } from "./types";

const STORAGE_KEY = "tax-study-attempts";

export function getAttempts(): AttemptRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAttempt(record: AttemptRecord) {
  const attempts = getAttempts();
  attempts.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
}

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
    subject,
    total,
    correct,
    rate: total > 0 ? Math.round((correct / total) * 100) : 0,
  }));
}

export function getRecentAttempts(n = 20): AttemptRecord[] {
  return getAttempts().slice(-n).reverse();
}

export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
}
