"use client";

import { useState, useEffect } from "react";
import { SUBJECTS, getSubjectsBySession } from "@/lib/subjects";
import { getSubjectStats, getAttempts } from "@/lib/storage";
import { SubjectStats } from "@/lib/types";

export default function Home() {
  const [stats, setStats] = useState<SubjectStats[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setStats(getSubjectStats());
    setTotalCount(getAttempts().length);
  }, []);

  const totalCorrect = stats.reduce((s, x) => s + x.correct, 0);
  const totalRate = totalCount > 0 ? Math.round((totalCorrect / totalCount) * 100) : 0;

  return (
    <div>
      <div style={{ textAlign: "center", padding: "40px 0 30px" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>세무사 시험 AI 문제풀이</h1>
        <p style={{ color: "#666", fontSize: "15px" }}>
          AI가 무한으로 문제를 생성합니다. 과목과 주제를 선택하고 바로 시작하세요.
        </p>
      </div>

      {totalCount > 0 && (
        <div style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
          display: "flex",
          gap: "24px",
          justifyContent: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}>
          <StatBox label="총 풀이" value={`${totalCount}문제`} />
          <StatBox label="정답" value={`${totalCorrect}문제`} />
          <StatBox label="정답률" value={`${totalRate}%`} color={totalRate >= 70 ? "#22c55e" : totalRate >= 40 ? "#eab308" : "#ef4444"} />
        </div>
      )}

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <SessionCard session="1차" label="1차 시험 (객관식)" desc="재정학, 세법학개론, 회계학개론, 상법·민법" color="#3b82f6" />
        <SessionCard session="2차" label="2차 시험 (주관식)" desc="세법학1·2부, 회계학1·2부" color="#8b5cf6" />
      </div>

      <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>과목별 바로가기</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {SUBJECTS.map((s) => {
          const st = stats.find((x) => x.subject === s.name);
          return (
            <a
              key={s.code}
              href={`/quiz?subject=${s.code}`}
              style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "16px",
                textDecoration: "none",
                color: "#1a1a1a",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                display: "block",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{
                    fontSize: "11px",
                    background: s.session === "1차" ? "#dbeafe" : "#ede9fe",
                    color: s.session === "1차" ? "#1d4ed8" : "#6d28d9",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    marginBottom: "6px",
                    display: "inline-block",
                  }}>{s.session}</span>
                  <div style={{ fontWeight: 600, fontSize: "15px", marginTop: "4px" }}>{s.name}</div>
                </div>
                {st && (
                  <div style={{ textAlign: "right", fontSize: "13px", color: "#666" }}>
                    {st.total}문제 · {st.rate}%
                  </div>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "13px", color: "#888" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: color || "#1a1a1a" }}>{value}</div>
    </div>
  );
}

function SessionCard({ session, label, desc, color }: { session: string; label: string; desc: string; color: string }) {
  return (
    <a
      href={`/quiz?session=${session}`}
      style={{
        flex: 1,
        background: color,
        color: "#fff",
        borderRadius: "12px",
        padding: "20px",
        textDecoration: "none",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "13px", opacity: 0.85 }}>{desc}</div>
    </a>
  );
}
