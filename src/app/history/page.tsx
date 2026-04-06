"use client";

import { useState, useEffect } from "react";
import { getSubjectStats, getRecentAttempts, clearAllData, getAttempts } from "@/lib/storage";
import { AttemptRecord, SubjectStats } from "@/lib/types";

export default function HistoryPage() {
  const [stats, setStats] = useState<SubjectStats[]>([]);
  const [recent, setRecent] = useState<AttemptRecord[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setStats(getSubjectStats());
    setRecent(getRecentAttempts(50));
    setTotal(getAttempts().length);
  }, []);

  const totalCorrect = stats.reduce((s, x) => s + x.correct, 0);
  const totalRate = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

  const handleClear = () => {
    if (confirm("모든 학습 기록을 삭제하시겠습니까?")) {
      clearAllData();
      setStats([]);
      setRecent([]);
      setTotal(0);
    }
  };

  if (total === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>&#128218;</div>
        <div style={{ fontSize: "18px", fontWeight: 600 }}>아직 풀이 기록이 없습니다</div>
        <div style={{ color: "#888", marginTop: "8px" }}>
          <a href="/quiz" style={{ color: "#3b82f6" }}>문제 풀기</a>를 시작해보세요!
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px" }}>학습 기록</h1>
        <button onClick={handleClear} style={{
          padding: "6px 14px", fontSize: "13px", background: "#fee2e2", color: "#991b1b",
          border: "none", borderRadius: "6px", cursor: "pointer",
        }}>
          기록 초기화
        </button>
      </div>

      {/* Summary */}
      <div style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "20px",
        display: "flex",
        gap: "32px",
        justifyContent: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}>
        <Stat label="총 풀이" value={`${total}`} />
        <Stat label="정답" value={`${totalCorrect}`} />
        <Stat label="오답" value={`${total - totalCorrect}`} />
        <Stat label="정답률" value={`${totalRate}%`} color={totalRate >= 70 ? "#22c55e" : totalRate >= 40 ? "#eab308" : "#ef4444"} />
      </div>

      {/* Per-subject stats */}
      <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>과목별 통계</h2>
      <div style={{
        background: "#fff",
        borderRadius: "10px",
        overflow: "hidden",
        marginBottom: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={thStyle}>과목</th>
              <th style={thStyle}>풀이</th>
              <th style={thStyle}>정답</th>
              <th style={thStyle}>오답</th>
              <th style={thStyle}>정답률</th>
            </tr>
          </thead>
          <tbody>
            {stats.sort((a, b) => b.total - a.total).map((s) => (
              <tr key={s.subject}>
                <td style={tdStyle}>{s.subject}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{s.total}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{s.correct}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{s.total - s.correct}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <span style={{
                    fontWeight: 600,
                    color: s.rate >= 70 ? "#22c55e" : s.rate >= 40 ? "#eab308" : "#ef4444",
                  }}>{s.rate}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent attempts */}
      <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>최근 풀이 기록</h2>
      <div style={{
        background: "#fff",
        borderRadius: "10px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={thStyle}>시간</th>
              <th style={thStyle}>과목</th>
              <th style={thStyle}>주제</th>
              <th style={thStyle}>결과</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((a) => (
              <tr key={a.id}>
                <td style={tdStyle}>{formatTime(a.timestamp)}</td>
                <td style={tdStyle}>{a.subject}</td>
                <td style={tdStyle}>{a.topic}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: a.correct ? "#dcfce7" : "#fee2e2",
                    color: a.correct ? "#166534" : "#991b1b",
                  }}>
                    {a.correct ? "O" : "X"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "12px", color: "#888" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 700, color: color || "#1a1a1a" }}>{value}</div>
    </div>
  );
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${h}:${m}`;
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 600,
  borderBottom: "1px solid #e5e7eb",
  fontSize: "13px",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f1f5f9",
};
