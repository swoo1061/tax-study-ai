"use client";

import { useState, useEffect } from "react";
import { SUBJECTS } from "@/lib/subjects";
import { getSubjectStats, getAttempts, getWeakTopics, getDailyHistory, getRemainingToday, getDailyLimit } from "@/lib/storage";
import { SubjectStats, TopicStats, DailyCount } from "@/lib/types";

export default function Home() {
  const [stats, setStats] = useState<SubjectStats[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [weakTopics, setWeakTopics] = useState<TopicStats[]>([]);
  const [daily, setDaily] = useState<DailyCount[]>([]);
  const [remaining, setRemaining] = useState(getDailyLimit());

  useEffect(() => {
    setStats(getSubjectStats());
    setTotalCount(getAttempts().length);
    setWeakTopics(getWeakTopics(3));
    setDaily(getDailyHistory(7));
    setRemaining(getRemainingToday());
  }, []);

  const totalCorrect = stats.reduce((s, x) => s + x.correct, 0);
  const totalRate = totalCount > 0 ? Math.round((totalCorrect / totalCount) * 100) : 0;

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
        <h1 style={{ fontSize: "26px", marginBottom: "8px" }}>세무사 시험 AI 문제풀이</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>
          AI가 무한으로 문제를 생성합니다. 과목을 선택하고 바로 시작하세요.
        </p>
        <div style={{ fontSize: "13px", color: "var(--text-light)", marginTop: "6px" }}>
          오늘 남은 무료 문제: <strong style={{ color: remaining > 0 ? "var(--blue)" : "var(--red)" }}>{remaining}/{getDailyLimit()}</strong>
        </div>
      </div>

      {/* Stats bar */}
      {totalCount > 0 && (
        <div className="card" style={{ marginBottom: "20px", display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
          <StatBox label="총 풀이" value={`${totalCount}`} />
          <StatBox label="정답률" value={`${totalRate}%`}
            color={totalRate >= 70 ? "var(--green)" : totalRate >= 40 ? "var(--yellow)" : "var(--red)"} />
          <StatBox label="오늘" value={`${daily[daily.length - 1]?.count || 0}문제`} />
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <ActionCard href="/quiz?session=1차" label="1차 시험" desc="객관식 문제풀기" color="var(--blue)" />
        <ActionCard href="/quiz?session=2차" label="2차 시험" desc="주관식 문제풀기" color="var(--purple)" />
        <ActionCard href="/exam" label="모의고사" desc="시간제한 실전 연습" color="#059669" />
        <ActionCard href="/review" label="오답노트" desc="틀린 문제 복습" color="#dc2626" />
      </div>

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "10px", color: "var(--red)" }}>취약 주제</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {weakTopics.map((t) => (
              <div key={`${t.subject}-${t.topic}`} className="card-sm"
                style={{ border: "1px solid var(--border)" }}>
                <div className="flex-between">
                  <div className="flex-gap" style={{ flexWrap: "wrap" }}>
                    <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>{t.subject}</span>
                    <span style={{ fontSize: "14px" }}>{t.topic}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: t.rate < 40 ? "var(--red)" : "var(--yellow)" }}>
                    {t.rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject grid */}
      <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>과목별 바로가기</h2>
      <div className="grid-2">
        {SUBJECTS.map((s) => {
          const st = stats.find((x) => x.subject === s.name);
          return (
            <a key={s.code} href={`/quiz?subject=${s.code}`} className="card-sm"
              style={{ display: "block", border: "1px solid var(--border)" }}>
              <div className="flex-between">
                <div>
                  <span className="badge" style={{
                    background: s.session === "1차" ? "#dbeafe" : "#ede9fe",
                    color: s.session === "1차" ? "#1d4ed8" : "#6d28d9",
                    marginBottom: "4px",
                  }}>{s.session}</span>
                  <div style={{ fontWeight: 600, fontSize: "14px", marginTop: "4px" }}>{s.name}</div>
                </div>
                {st && (
                  <div style={{ textAlign: "right", fontSize: "12px", color: "var(--text-muted)" }}>
                    {st.total}문제
                    <br />
                    <span style={{
                      fontWeight: 600,
                      color: st.rate >= 70 ? "var(--green)" : st.rate >= 40 ? "var(--yellow)" : "var(--red)",
                    }}>{st.rate}%</span>
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
      <div style={{ fontSize: "12px", color: "var(--text-light)" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}

function ActionCard({ href, label, desc, color }: { href: string; label: string; desc: string; color: string }) {
  return (
    <a href={href} style={{
      background: color,
      color: "#fff",
      borderRadius: "var(--radius)",
      padding: "18px",
      textAlign: "center",
      display: "block",
    }}>
      <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "12px", opacity: 0.85 }}>{desc}</div>
    </a>
  );
}
