"use client";

import { useState, useEffect } from "react";
import { getSubjectStats, getTopicStats, getWeakTopics, getDailyHistory, getRecentAttempts, clearAllData, getAttempts } from "@/lib/storage";
import { AttemptRecord, SubjectStats, TopicStats, DailyCount } from "@/lib/types";
import { SUBJECTS } from "@/lib/subjects";

export default function HistoryPage() {
  const [stats, setStats] = useState<SubjectStats[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [weakTopics, setWeakTopics] = useState<TopicStats[]>([]);
  const [daily, setDaily] = useState<DailyCount[]>([]);
  const [recent, setRecent] = useState<AttemptRecord[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setStats(getSubjectStats());
    setTopicStats(getTopicStats());
    setWeakTopics(getWeakTopics(5));
    setDaily(getDailyHistory(7));
    setRecent(getRecentAttempts(30));
    setTotal(getAttempts().length);
  }, []);

  const totalCorrect = stats.reduce((s, x) => s + x.correct, 0);
  const totalRate = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;
  const maxDaily = Math.max(...daily.map((d) => d.count), 1);

  const handleClear = () => {
    if (confirm("모든 학습 기록을 삭제하시겠습니까?")) {
      clearAllData();
      setStats([]); setTopicStats([]); setWeakTopics([]); setRecent([]); setTotal(0);
      setDaily(getDailyHistory(7));
    }
  };

  if (total === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>&#128218;</div>
        <div style={{ fontSize: "18px", fontWeight: 600 }}>아직 풀이 기록이 없습니다</div>
        <div style={{ color: "var(--text-muted)", marginTop: "8px" }}>
          <a href="/quiz" style={{ color: "var(--blue)" }}>문제 풀기</a>를 시작해보세요!
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px" }}>학습 기록</h1>
        <button className="btn btn-sm" style={{ background: "#fee2e2", color: "#991b1b" }} onClick={handleClear}>
          기록 초기화
        </button>
      </div>

      {/* Summary */}
      <div className="card" style={{ marginBottom: "20px", display: "flex", gap: "32px", justifyContent: "center", flexWrap: "wrap" }}>
        <Stat label="총 풀이" value={`${total}`} />
        <Stat label="정답" value={`${totalCorrect}`} />
        <Stat label="오답" value={`${total - totalCorrect}`} />
        <Stat label="정답률" value={`${totalRate}%`}
          color={totalRate >= 70 ? "var(--green)" : totalRate >= 40 ? "var(--yellow)" : "var(--red)"} />
      </div>

      {/* 일별 추이 (최근 7일) */}
      <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>최근 7일 풀이 추이</h2>
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "100px", justifyContent: "space-around" }}>
          {daily.map((d) => (
            <div key={d.date} style={{ textAlign: "center", flex: 1 }}>
              <div style={{
                background: d.count > 0 ? "var(--blue)" : "var(--border)",
                height: `${Math.max(4, (d.count / maxDaily) * 80)}px`,
                borderRadius: "4px 4px 0 0",
                margin: "0 auto",
                width: "100%",
                maxWidth: "40px",
                transition: "height 0.3s",
              }} />
              <div style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "4px" }}>
                {d.date.slice(5)}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>{d.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 취약 주제 TOP 5 */}
      {weakTopics.length > 0 && (
        <>
          <h2 style={{ fontSize: "16px", marginBottom: "10px", color: "var(--red)" }}>취약 주제 TOP {weakTopics.length}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
            {weakTopics.map((t, i) => (
              <div key={`${t.subject}-${t.topic}`} className="card-sm" style={{ border: "1px solid var(--border)" }}>
                <div className="flex-between">
                  <div className="flex-gap" style={{ flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: "var(--red)" }}>#{i + 1}</span>
                    <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>{t.subject}</span>
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>{t.topic}</span>
                  </div>
                  <div className="flex-gap">
                    <span style={{
                      fontWeight: 700, fontSize: "15px",
                      color: t.rate < 40 ? "var(--red)" : "var(--yellow)",
                    }}>{t.rate}%</span>
                    <span style={{ fontSize: "12px", color: "var(--text-light)" }}>({t.correct}/{t.total})</span>
                  </div>
                </div>
                <div className="progress-bar" style={{ marginTop: "8px" }}>
                  <div className="progress-fill" style={{
                    width: `${t.rate}%`,
                    background: t.rate < 40 ? "var(--red)" : "var(--yellow)",
                  }} />
                </div>
              </div>
            ))}
            <a href="/quiz" className="btn btn-sm btn-red" style={{ alignSelf: "flex-start", textAlign: "center" }}>
              취약 주제 집중 풀기
            </a>
          </div>
        </>
      )}

      {/* 과목별 통계 */}
      <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>과목별 통계</h2>
      <div className="table-wrap" style={{ marginBottom: "24px" }}>
        <table>
          <thead>
            <tr>
              <th>과목</th>
              <th style={{ textAlign: "center" }}>풀이</th>
              <th style={{ textAlign: "center" }}>정답</th>
              <th style={{ textAlign: "center" }}>오답</th>
              <th style={{ textAlign: "center" }}>정답률</th>
            </tr>
          </thead>
          <tbody>
            {stats.sort((a, b) => b.total - a.total).map((s) => (
              <tr key={s.subject}>
                <td>{s.subject}</td>
                <td style={{ textAlign: "center" }}>{s.total}</td>
                <td style={{ textAlign: "center" }}>{s.correct}</td>
                <td style={{ textAlign: "center" }}>{s.total - s.correct}</td>
                <td style={{ textAlign: "center" }}>
                  <span style={{
                    fontWeight: 600,
                    color: s.rate >= 70 ? "var(--green)" : s.rate >= 40 ? "var(--yellow)" : "var(--red)",
                  }}>{s.rate}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 최근 풀이 */}
      <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>최근 풀이 기록</h2>
      <div className="table-wrap">
        <table style={{ fontSize: "13px" }}>
          <thead>
            <tr>
              <th>시간</th>
              <th>과목</th>
              <th className="hide-mobile">주제</th>
              <th style={{ textAlign: "center" }}>결과</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((a) => (
              <tr key={a.id}>
                <td>{formatTime(a.timestamp)}</td>
                <td>{a.subject}</td>
                <td className="hide-mobile">{a.topic}</td>
                <td style={{ textAlign: "center" }}>
                  <span className="badge" style={{
                    background: a.correct ? "#dcfce7" : "#fee2e2",
                    color: a.correct ? "#166534" : "#991b1b",
                  }}>{a.correct ? "O" : "X"}</span>
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
      <div style={{ fontSize: "12px", color: "var(--text-light)" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
