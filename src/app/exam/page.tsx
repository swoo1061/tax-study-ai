"use client";

import { useState, useEffect } from "react";

interface ExamItem {
  id: string; title: string; session: string; subjectName: string;
  questionCount: number; timeLimitMinutes: number; description: string;
  ready: boolean; myScore: number | null; taken: boolean;
}

export default function ExamCatalogPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "1차" | "2차">("all");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/exams");
      const data = await res.json();
      setExams(data.exams);
      setLoggedIn(data.loggedIn);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === "all" ? exams : exams.filter((e) => e.session === filter);

  if (loading) return <div style={{ textAlign: "center", padding: "40px" }}>로딩 중...</div>;

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "4px" }}>실전 모의고사</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
          실제 시험과 동일한 형식 · 모든 응시자 동일 문제 · 성적 분포 확인
        </p>
      </div>

      {!loggedIn && (
        <div className="card" style={{ marginBottom: "20px", background: "#fffbeb", border: "1px solid #fde68a", textAlign: "center" }}>
          <div style={{ fontSize: "14px", color: "#92400e" }}>
            모의고사를 응시하려면 <a href="/login" style={{ color: "var(--blue)", fontWeight: 600 }}>로그인</a>이 필요합니다.
          </div>
        </div>
      )}

      <div className="tabs" style={{ marginBottom: "20px" }}>
        {(["all", "1차", "2차"] as const).map((f) => (
          <button key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "전체" : f}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {filtered.map((e) => (
          <div key={e.id} className="card" style={{ border: "1px solid var(--border)", position: "relative" }}>
            {e.taken && (
              <div style={{
                position: "absolute", top: "10px", right: "10px",
                background: (e.myScore ?? 0) >= 60 ? "var(--green)" : "var(--red)",
                color: "#fff", fontSize: "11px", fontWeight: 700,
                padding: "2px 8px", borderRadius: "4px",
              }}>{e.myScore}점</div>
            )}

            <span className="badge" style={{
              background: e.session === "1차" ? "#dbeafe" : "#ede9fe",
              color: e.session === "1차" ? "#1d4ed8" : "#6d28d9",
              marginBottom: "8px",
            }}>{e.session}</span>

            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "6px 0 4px" }}>{e.title}</h3>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>{e.description}</div>

            <div style={{ fontSize: "12px", color: "var(--text-light)", marginBottom: "12px" }}>
              {e.questionCount}문제 · {e.timeLimitMinutes}분
              {e.ready && <span style={{ color: "var(--green)", marginLeft: "6px" }}> 준비완료</span>}
              {!e.ready && <span style={{ color: "var(--yellow)", marginLeft: "6px" }}> 첫 응시 시 생성</span>}
            </div>

            <a href={loggedIn ? `/exam/${e.id}` : "/login"}
              className={`btn btn-sm btn-full ${e.session === "1차" ? "btn-blue" : "btn-purple"}`}
              style={{ textAlign: "center", display: "block" }}>
              {e.taken ? "다시 응시" : "응시하기"}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
