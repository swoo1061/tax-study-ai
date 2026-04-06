"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Question } from "@/lib/types";

type Phase = "loading" | "generating" | "exam" | "submitting" | "result" | "error";

interface ExamMeta { id: string; title: string; session: string; subjectName: string; questionCount: number; timeLimitMinutes: number; description: string; }
interface DistData { buckets: { label: string; count: number; isMyBucket: boolean }[]; totalTakers: number; average: number; highest: number; myScore: number | null; myRank: number | null; myPercentile: number | null; }

export default function ExamTakePage() {
  const { id } = useParams<{ id: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [meta, setMeta] = useState<ExamMeta | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");
  const [score, setScore] = useState(0);
  const [dist, setDist] = useState<DistData | null>(null);
  const [showExpl, setShowExpl] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);

  // Load exam
  useEffect(() => {
    (async () => {
      try {
        setPhase("generating");
        const res = await fetch(`/api/exams/${id}`);
        if (!res.ok) {
          const d = await res.json();
          if (res.status === 401) { window.location.href = "/login"; return; }
          throw new Error(d.error);
        }
        const data = await res.json();
        setMeta(data.meta);
        setQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(null));
        setTimeLeft(data.meta.timeLimitMinutes * 60);
        startTimeRef.current = Date.now();
        setPhase("exam");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "시험 로드 실패");
        setPhase("error");
      }
    })();
  }, [id]);

  // Timer
  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => { if (t <= 1) { handleSubmit(); return 0; } return t - 1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("submitting");

    const isObj = meta?.session === "1차";
    let correctCount = 0;
    questions.forEach((q, i) => {
      if (isObj && answers[i] === q.answer) correctCount++;
    });
    setScore(correctCount);

    try {
      const res = await fetch(`/api/exams/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: correctCount, total: questions.length }),
      });
      const data = await res.json();
      if (data.distribution) setDist(data.distribution);
    } catch {}

    setPhase("result");
  };

  // --- GENERATING ---
  if (phase === "loading" || phase === "generating") {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
          {phase === "loading" ? "시험 정보 로드 중..." : "시험 문제를 준비하고 있습니다..."}
        </div>
        <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
          처음 생성 시 1~2분 소요될 수 있습니다
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "20px" }}>
          {[0, 1, 2].map((i) => <div key={i} className="loading-dot" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div style={{ color: "var(--red)", fontSize: "18px", marginBottom: "12px" }}>오류</div>
        <div style={{ color: "var(--text-muted)", marginBottom: "20px" }}>{error}</div>
        <a href="/exam" className="btn btn-blue">목록으로</a>
      </div>
    );
  }

  if (phase === "submitting") {
    return <div style={{ textAlign: "center", padding: "80px 0" }}>채점 중...</div>;
  }

  // --- EXAM ---
  if (phase === "exam" && meta && questions.length > 0) {
    const q = questions[current];
    const isObj = meta.session === "1차";
    const answered = answers.filter((a) => a !== null).length;

    return (
      <div>
        <div className="flex-between" style={{ marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: "16px" }}>{meta.title}</span>
            <span style={{ color: "var(--text-muted)", marginLeft: "10px", fontSize: "13px" }}>
              {current + 1}/{questions.length} ({answered}개 답변)
            </span>
          </div>
          <div className={`timer ${timeLeft < 60 ? "warning" : ""}`}>{fmt(timeLeft)}</div>
        </div>

        <div className="progress-bar" style={{ marginBottom: "12px" }}>
          <div className="progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>

        {/* Question nav */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px" }}>
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              style={{
                width: "32px", height: "32px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                border: i === current ? "2px solid var(--purple)" : "1px solid var(--border)",
                background: answers[i] !== null ? "#e9d5ff" : "var(--bg-card)",
                cursor: "pointer", color: "var(--text)",
              }}>{i + 1}</button>
          ))}
        </div>

        {/* Question */}
        <div className="card" style={{ marginBottom: "16px", fontSize: "15px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
            Q{current + 1}. {q.topic} · 난이도 {"★".repeat(q.difficulty)}
          </div>
          {q.body}
        </div>

        {isObj && q.choices && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            {q.choices.map((c) => (
              <button key={c.number} onClick={() => { const a = [...answers]; a[current] = c.number; setAnswers(a); }}
                style={{
                  background: answers[current] === c.number ? "#dbeafe" : "var(--bg-card)",
                  border: answers[current] === c.number ? "2px solid var(--blue)" : "1px solid var(--border)",
                  borderRadius: "10px", padding: "14px 16px", textAlign: "left", cursor: "pointer", fontSize: "14px", color: "var(--text)",
                }}>
                <strong style={{ marginRight: "8px" }}>{c.number}.</strong>{c.text}
              </button>
            ))}
          </div>
        )}

        {!isObj && (
          <textarea className="textarea" value={String(answers[current] || "")}
            onChange={(e) => { const a = [...answers]; a[current] = e.target.value; setAnswers(a); }}
            placeholder="답안 작성..." style={{ marginBottom: "16px" }} />
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>이전</button>
          {current < questions.length - 1 ? (
            <button className="btn btn-purple" style={{ flex: 1 }} onClick={() => setCurrent(current + 1)}>다음</button>
          ) : (
            <button className="btn btn-red" style={{ flex: 1 }} onClick={handleSubmit}>제출 ({answered}/{questions.length})</button>
          )}
        </div>
      </div>
    );
  }

  // --- RESULT ---
  if (phase === "result" && meta) {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const isObj = meta.session === "1차";

    return (
      <div>
        <h1 style={{ fontSize: "22px", textAlign: "center", marginBottom: "20px" }}>{meta.title} 결과</h1>

        {/* Score card */}
        <div className="card" style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "52px", fontWeight: 700, color: pct >= 60 ? "var(--green)" : "var(--red)" }}>{pct}점</div>
          <div style={{ fontSize: "15px", color: "var(--text-muted)", marginTop: "4px" }}>
            {score}/{questions.length} 정답
          </div>
          {dist && dist.myPercentile !== null && (
            <div style={{ marginTop: "8px", fontSize: "14px" }}>
              상위 <strong style={{ color: "var(--blue)", fontSize: "18px" }}>{100 - dist.myPercentile + 1}%</strong>
              <span style={{ color: "var(--text-muted)" }}> · {dist.myRank}등/{dist.totalTakers}명</span>
            </div>
          )}
        </div>

        {/* Distribution chart */}
        {dist && dist.totalTakers > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>전체 성적 분포 ({dist.totalTakers}명 응시)</h2>
            <div className="card">
              <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "140px", padding: "0 4px" }}>
                {dist.buckets.map((b) => {
                  const maxCount = Math.max(...dist.buckets.map((x) => x.count), 1);
                  const h = Math.max(4, (b.count / maxCount) * 120);
                  return (
                    <div key={b.label} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: "10px", fontWeight: 600, color: b.isMyBucket ? "var(--red)" : "var(--text-muted)", marginBottom: "2px" }}>
                        {b.count > 0 ? b.count : ""}
                      </div>
                      <div style={{
                        height: `${h}px`,
                        background: b.isMyBucket ? "var(--red)" : "var(--blue)",
                        borderRadius: "3px 3px 0 0",
                        opacity: b.isMyBucket ? 1 : 0.6,
                        transition: "height 0.3s",
                        position: "relative",
                      }}>
                        {b.isMyBucket && (
                          <div style={{ position: "absolute", top: "-18px", left: "50%", transform: "translateX(-50%)", fontSize: "10px", color: "var(--red)", fontWeight: 700, whiteSpace: "nowrap" }}>
                            나
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: "9px", color: "var(--text-light)", marginTop: "4px", whiteSpace: "nowrap" }}>
                        {b.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", marginTop: "12px", fontSize: "13px", color: "var(--text-muted)" }}>
                <span>평균 <strong>{dist.average}점</strong></span>
                <span>최고 <strong>{dist.highest}점</strong></span>
                <span>응시 <strong>{dist.totalTakers}명</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Question results */}
        <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>문항별 결과</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {questions.map((q, i) => {
            const correct = isObj ? answers[i] === q.answer : false;
            return (
              <div key={i} className="card-sm" style={{ border: "1px solid var(--border)" }}>
                <div className="flex-between">
                  <div className="flex-gap">
                    <span style={{ fontWeight: 700 }}>#{i + 1}</span>
                    <span className="badge" style={{
                      background: correct ? "#dcfce7" : "#fee2e2",
                      color: correct ? "#166534" : "#991b1b",
                    }}>{correct ? "O" : "X"}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{q.topic}</span>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => setShowExpl(showExpl === i ? null : i)}>
                    {showExpl === i ? "접기" : "해설"}
                  </button>
                </div>
                {showExpl === i && (
                  <div style={{ marginTop: "10px", fontSize: "13px", lineHeight: "1.7" }}>
                    <div style={{ background: "var(--bg)", borderRadius: "8px", padding: "12px", marginBottom: "8px", whiteSpace: "pre-wrap" }}>{q.body}</div>
                    {isObj && <div style={{ marginBottom: "8px" }}>내 답: <strong>{answers[i] || "미응답"}</strong> / 정답: <strong>{q.answer}</strong></div>}
                    {!isObj && (
                      <div style={{ marginBottom: "8px" }}>
                        <div style={{ fontWeight: 600, color: "#1d4ed8", marginBottom: "4px" }}>모범답안:</div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{String(q.answer)}</div>
                      </div>
                    )}
                    <div style={{ background: "#fffbeb", padding: "12px", borderRadius: "8px", border: "1px solid #fde68a", whiteSpace: "pre-wrap" }}>{q.explanation}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <a href="/exam" className="btn btn-purple" style={{ flex: 1, textAlign: "center" }}>다른 모의고사</a>
          <a href="/history" className="btn btn-gray" style={{ flex: 1, textAlign: "center" }}>학습기록</a>
        </div>
      </div>
    );
  }

  return null;
}
