import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const SCORES_FILE = join(process.cwd(), "data", "scores.json");

export interface ScoreRecord {
  userId: string;
  userName: string;
  examId: string;
  score: number;
  total: number;
  percentage: number;
  timestamp: number;
}

function ensureDir() {
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadScores(): ScoreRecord[] {
  ensureDir();
  if (!existsSync(SCORES_FILE)) return [];
  try { return JSON.parse(readFileSync(SCORES_FILE, "utf-8")); } catch { return []; }
}

function saveScores(scores: ScoreRecord[]) {
  ensureDir();
  writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

export function submitScore(record: ScoreRecord): ScoreRecord[] {
  const scores = loadScores();
  // 중복 방지: 같은 유저+시험이면 갱신
  const idx = scores.findIndex((s) => s.userId === record.userId && s.examId === record.examId);
  if (idx >= 0) scores[idx] = record;
  else scores.push(record);
  saveScores(scores);
  return scores.filter((s) => s.examId === record.examId);
}

export function getScoresForExam(examId: string): ScoreRecord[] {
  return loadScores().filter((s) => s.examId === examId);
}

export function getUserScore(userId: string, examId: string): ScoreRecord | null {
  return loadScores().find((s) => s.userId === userId && s.examId === examId) || null;
}

export function getUserScores(userId: string): ScoreRecord[] {
  return loadScores().filter((s) => s.userId === userId);
}

export interface Distribution {
  buckets: { label: string; count: number; isMyBucket: boolean }[];
  totalTakers: number;
  average: number;
  highest: number;
  myScore: number | null;
  myRank: number | null;
  myPercentile: number | null;
}

export function getDistribution(examId: string, userId?: string): Distribution {
  const scores = getScoresForExam(examId);
  const percentages = scores.map((s) => s.percentage).sort((a, b) => b - a);

  // 10% 구간 버킷
  const myPct = userId ? scores.find((s) => s.userId === userId)?.percentage ?? null : null;
  const buckets = [];
  for (let i = 0; i < 10; i++) {
    const lo = i * 10;
    const hi = (i + 1) * 10;
    const label = `${lo}-${hi}`;
    const count = percentages.filter((p) => p >= lo && (i === 9 ? p <= hi : p < hi)).length;
    const isMyBucket = myPct !== null && myPct >= lo && (i === 9 ? myPct <= hi : myPct < hi);
    buckets.push({ label, count, isMyBucket });
  }

  const average = percentages.length > 0 ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0;
  const highest = percentages.length > 0 ? percentages[0] : 0;

  let myRank: number | null = null;
  let myPercentile: number | null = null;
  if (myPct !== null && percentages.length > 0) {
    myRank = percentages.filter((p) => p > myPct).length + 1;
    myPercentile = Math.round((1 - (myRank - 1) / percentages.length) * 100);
  }

  return {
    buckets,
    totalTakers: scores.length,
    average,
    highest,
    myScore: myPct,
    myRank,
    myPercentile,
  };
}
