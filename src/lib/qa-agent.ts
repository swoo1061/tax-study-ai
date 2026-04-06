/**
 * QA 에이전트
 * - 오류 신고 접수 → 자동 재검증 → 수정 or 확인
 * - 일일 품질 리포트
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { verifyQuestion, VerifyResult } from "./verify-agent";

const DATA_DIR = join(process.cwd(), "data");
const REPORTS_FILE = join(DATA_DIR, "qa-reports.json");
const FIXED_FILE = join(DATA_DIR, "qa-fixes.json");

export interface ErrorReport {
  id: string;
  questionId: string;
  userId: string;
  reportType: "wrong_answer" | "wrong_explanation" | "outdated_law" | "duplicate" | "other";
  description: string;
  status: "pending" | "verified_error" | "not_error" | "fixed";
  verifyResult?: VerifyResult;
  fixApplied?: boolean;
  createdAt: number;
  resolvedAt?: number;
}

export interface QAFix {
  questionId: string;
  originalAnswer: number | string;
  fixedAnswer?: number | string;
  originalExplanation: string;
  fixedExplanation?: string;
  reason: string;
  fixedAt: number;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadReports(): ErrorReport[] {
  ensureDir();
  if (!existsSync(REPORTS_FILE)) return [];
  try { return JSON.parse(readFileSync(REPORTS_FILE, "utf-8")); } catch { return []; }
}

function saveReports(reports: ErrorReport[]) {
  ensureDir();
  writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

function loadFixes(): QAFix[] {
  ensureDir();
  if (!existsSync(FIXED_FILE)) return [];
  try { return JSON.parse(readFileSync(FIXED_FILE, "utf-8")); } catch { return []; }
}

function saveFixes(fixes: QAFix[]) {
  ensureDir();
  writeFileSync(FIXED_FILE, JSON.stringify(fixes, null, 2));
}

/**
 * 오류 신고 접수 + 자동 검증
 */
export async function submitErrorReport(
  questionId: string,
  userId: string,
  reportType: ErrorReport["reportType"],
  description: string,
  questionData?: { body: string; choices?: { number: number; text: string }[]; answer: number | string; explanation: string; type: string; subject: string; topic: string }
): Promise<{ report: ErrorReport; autoVerified: boolean }> {

  const report: ErrorReport = {
    id: crypto.randomUUID(),
    questionId, userId, reportType, description,
    status: "pending",
    createdAt: Date.now(),
  };

  // 자동 검증 시도 (문제 데이터가 있는 경우)
  let autoVerified = false;
  if (questionData) {
    try {
      const result = await verifyQuestion(questionData);
      report.verifyResult = result;

      if (!result.passed) {
        report.status = "verified_error";

        // 자동 수정 적용
        if (result.fixes) {
          const fix: QAFix = {
            questionId,
            originalAnswer: questionData.answer,
            fixedAnswer: result.fixes.answer,
            originalExplanation: questionData.explanation,
            fixedExplanation: result.fixes.explanation,
            reason: result.issues.join("; "),
            fixedAt: Date.now(),
          };
          const fixes = loadFixes();
          fixes.push(fix);
          saveFixes(fixes);
          report.fixApplied = true;
          report.status = "fixed";
          report.resolvedAt = Date.now();
        }
        autoVerified = true;
      } else {
        report.status = "not_error";
        report.resolvedAt = Date.now();
        autoVerified = true;
      }
    } catch {
      // 검증 실패 시 pending 유지 → 수동 검토
    }
  }

  const reports = loadReports();
  reports.push(report);
  saveReports(reports);

  return { report, autoVerified };
}

/**
 * 문제에 적용된 수정사항 조회
 */
export function getFixForQuestion(questionId: string): QAFix | null {
  return loadFixes().find(f => f.questionId === questionId) || null;
}

/**
 * 일일 품질 리포트
 */
export function getDailyQAReport() {
  const reports = loadReports();
  const today = new Date().toISOString().slice(0, 10);
  const todayReports = reports.filter(r =>
    new Date(r.createdAt).toISOString().slice(0, 10) === today
  );

  return {
    date: today,
    totalReports: todayReports.length,
    byStatus: {
      pending: todayReports.filter(r => r.status === "pending").length,
      verifiedError: todayReports.filter(r => r.status === "verified_error").length,
      notError: todayReports.filter(r => r.status === "not_error").length,
      fixed: todayReports.filter(r => r.status === "fixed").length,
    },
    byType: {
      wrongAnswer: todayReports.filter(r => r.reportType === "wrong_answer").length,
      wrongExplanation: todayReports.filter(r => r.reportType === "wrong_explanation").length,
      outdatedLaw: todayReports.filter(r => r.reportType === "outdated_law").length,
      duplicate: todayReports.filter(r => r.reportType === "duplicate").length,
      other: todayReports.filter(r => r.reportType === "other").length,
    },
    autoResolveRate: todayReports.length > 0
      ? Math.round((todayReports.filter(r => r.status !== "pending").length / todayReports.length) * 100)
      : 100,
    allTimeStats: {
      total: reports.length,
      pending: reports.filter(r => r.status === "pending").length,
      fixed: reports.filter(r => r.status === "fixed").length,
    },
  };
}

export function getPendingReports(): ErrorReport[] {
  return loadReports().filter(r => r.status === "pending").sort((a, b) => b.createdAt - a.createdAt);
}
