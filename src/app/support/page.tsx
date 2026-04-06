"use client";

import { useState, useEffect } from "react";

interface TicketItem {
  id: string; category: string; subject: string; status: string;
  autoReply: string; adminNote?: string; createdAt: number;
}

export default function SupportPage() {
  const [tab, setTab] = useState<"new" | "my">("new");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ autoReply: string } | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);

  useEffect(() => {
    if (tab === "my") {
      fetch("/api/support").then(r => r.json()).then(d => setTickets(d.tickets || [])).catch(() => {});
    }
  }, [tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({ autoReply: data.autoReply });
      setSubject("");
      setMessage("");
    } catch (e: unknown) {
      setResult({ autoReply: e instanceof Error ? e.message : "문의 접수에 실패했습니다." });
    } finally {
      setLoading(false);
    }
  };

  const categoryLabel: Record<string, string> = {
    error_report: "오류신고", refund: "환불", account: "계정",
    payment: "결제", feature: "기능요청", general: "일반",
  };
  const statusLabel: Record<string, string> = {
    open: "접수", auto_resolved: "자동답변", escalated: "검토중", closed: "완료",
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "16px" }}>문의하기</h1>

      <div className="tabs" style={{ marginBottom: "20px" }}>
        <button className={`tab ${tab === "new" ? "active" : ""}`} onClick={() => setTab("new")}>새 문의</button>
        <button className={`tab ${tab === "my" ? "active" : ""}`} onClick={() => setTab("my")}>내 문의 내역</button>
      </div>

      {tab === "new" && (
        <>
          <form onSubmit={handleSubmit} className="card" style={{ padding: "24px" }}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>제목</label>
              <input className="input" value={subject} onChange={e => setSubject(e.target.value)} required
                placeholder="예: 문제 정답 오류, 결제 문의, 환불 요청..." />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>내용</label>
              <textarea className="textarea" value={message} onChange={e => setMessage(e.target.value)} required
                placeholder="문의 내용을 자세히 작성해주세요. 문제 오류 신고 시 과목, 주제, 문제 내용을 포함해주시면 빠르게 처리됩니다." />
            </div>
            <button className="btn btn-blue btn-full" type="submit" disabled={loading}>
              {loading ? "접수 중..." : "문의 접수"}
            </button>
          </form>

          {result && (
            <div className="card" style={{ marginTop: "16px", border: "1px solid var(--blue)" }}>
              <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px", color: "var(--blue)" }}>자동 응답</div>
              <div style={{ fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>
                {result.autoReply}
              </div>
            </div>
          )}

          <div style={{ marginTop: "20px", fontSize: "13px", color: "var(--text-light)" }}>
            <p>* AI가 문의 내용을 분석하여 자동 답변을 제공합니다.</p>
            <p>* 자동 답변으로 해결되지 않는 경우, 담당자가 24시간 이내 추가 답변드립니다.</p>
          </div>
        </>
      )}

      {tab === "my" && (
        <>
          {tickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              문의 내역이 없습니다.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {tickets.map(t => (
                <div key={t.id} className="card-sm" style={{ border: "1px solid var(--border)" }}>
                  <div className="flex-between" style={{ marginBottom: "6px" }}>
                    <div className="flex-gap">
                      <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                        {categoryLabel[t.category] || t.category}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: "14px" }}>{t.subject}</span>
                    </div>
                    <span className="badge" style={{
                      background: t.status === "closed" ? "#dcfce7" : t.status === "open" ? "#fef3c7" : "#dbeafe",
                      color: t.status === "closed" ? "#166534" : t.status === "open" ? "#92400e" : "#1d4ed8",
                    }}>
                      {statusLabel[t.status] || t.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px" }}>
                    {new Date(t.createdAt).toLocaleDateString("ko")} {new Date(t.createdAt).toLocaleTimeString("ko", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {t.autoReply && (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", background: "var(--bg)", padding: "10px", borderRadius: "8px", whiteSpace: "pre-wrap" }}>
                      {t.autoReply}
                    </div>
                  )}
                  {t.adminNote && (
                    <div style={{ fontSize: "13px", color: "var(--blue)", background: "#eff6ff", padding: "10px", borderRadius: "8px", marginTop: "6px" }}>
                      <strong>관리자:</strong> {t.adminNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
