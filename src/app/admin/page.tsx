"use client";

import { useState, useEffect } from "react";

interface AdminData {
  ticketStats: { total: number; open: number; autoResolved: number; escalated: number; closed: number; byCategory: Record<string, number> };
  qaReport: { date: string; totalReports: number; byStatus: Record<string, number>; autoResolveRate: number; allTimeStats: { total: number; pending: number; fixed: number } };
  openTickets: { id: string; category: string; priority: string; subject: string; message: string; userName: string; createdAt: number; status: string }[];
  pendingQA: { id: string; questionId: string; reportType: string; description: string; status: string; createdAt: number }[];
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin").then(async r => {
      if (!r.ok) throw new Error((await r.json()).error);
      return r.json();
    }).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>;
  if (error) return <div style={{ padding: "40px", textAlign: "center", color: "var(--red)" }}>{error}</div>;
  if (!data) return null;

  const { ticketStats: ts, qaReport: qa } = data;

  const catLabel: Record<string, string> = { error_report: "오류", refund: "환불", account: "계정", payment: "결제", feature: "기능", general: "일반" };
  const prioColor: Record<string, string> = { urgent: "var(--red)", high: "#f97316", medium: "var(--yellow)", low: "var(--text-muted)" };

  return (
    <div>
      <h1 style={{ fontSize: "22px", marginBottom: "20px" }}>관리자 대시보드</h1>

      {/* CS 통계 */}
      <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>CS 현황</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "20px" }}>
        <StatCard label="전체" value={ts.total} />
        <StatCard label="미처리" value={ts.open} color="var(--red)" />
        <StatCard label="자동답변" value={ts.autoResolved} color="var(--blue)" />
        <StatCard label="에스컬레이션" value={ts.escalated} color="#f97316" />
        <StatCard label="완료" value={ts.closed} color="var(--green)" />
      </div>

      {/* QA 통계 */}
      <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>QA 현황 ({qa.date})</h2>
      <div className="card" style={{ marginBottom: "20px", display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "var(--text-light)" }}>오늘 신고</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{qa.totalReports}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "var(--text-light)" }}>자동 해결률</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--green)" }}>{qa.autoResolveRate}%</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "var(--text-light)" }}>누적 수정</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{qa.allTimeStats.fixed}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "var(--text-light)" }}>미처리</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: qa.allTimeStats.pending > 0 ? "var(--red)" : "var(--green)" }}>
            {qa.allTimeStats.pending}
          </div>
        </div>
      </div>

      {/* 미처리 티켓 */}
      <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>미처리 문의 ({data.openTickets.length}건)</h2>
      {data.openTickets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--green)" }}>모든 문의가 처리되었습니다</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {data.openTickets.map(t => (
            <div key={t.id} className="card-sm" style={{ border: "1px solid var(--border)" }}>
              <div className="flex-between" style={{ marginBottom: "4px" }}>
                <div className="flex-gap" style={{ flexWrap: "wrap" }}>
                  <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8" }}>{catLabel[t.category] || t.category}</span>
                  <span style={{ fontWeight: 600, fontSize: "13px", color: prioColor[t.priority] }}>[{t.priority}]</span>
                  <span style={{ fontSize: "13px" }}>{t.subject}</span>
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-light)" }}>
                  {t.userName} · {new Date(t.createdAt).toLocaleDateString("ko")}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{t.message.substring(0, 100)}</div>
            </div>
          ))}
        </div>
      )}

      {/* QA 미처리 */}
      {data.pendingQA.length > 0 && (
        <>
          <h2 style={{ fontSize: "16px", marginBottom: "10px", color: "var(--red)" }}>QA 미처리 ({data.pendingQA.length}건)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.pendingQA.map(r => (
              <div key={r.id} className="card-sm" style={{ border: "1px solid var(--red)", borderLeft: "3px solid var(--red)" }}>
                <div style={{ fontSize: "13px" }}>
                  <strong>{r.reportType}</strong> — {r.description.substring(0, 80)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-light)" }}>
                  문제 ID: {r.questionId.substring(0, 8)}... · {new Date(r.createdAt).toLocaleDateString("ko")}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card-sm" style={{ textAlign: "center", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: "11px", color: "var(--text-light)" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}
