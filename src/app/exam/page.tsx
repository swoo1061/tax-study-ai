"use client";

import { useState, useEffect, useRef } from "react";
import { SUBJECTS, getSubjectByCode, getSubjectsBySession } from "@/lib/subjects";
import { saveAttempt, saveExamResult, isLimitReached } from "@/lib/storage";
import { Question, Session, ExamResult } from "@/lib/types";

type Phase = "setup" | "generating" | "exam" | "result";

export default function ExamPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [session, setSession] = useState<Session>("1차");
  const [subjectCode, setSubjectCode] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(40);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [genProgress, setGenProgress] = useState(0);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [showExplanation, setShowExplanation] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentSubject = getSubjectByCode(subjectCode);
  const subjects = getSubjectsBySession(session);

  // Timer
  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { submitExam(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const startExam = async () => {
    if (isLimitReached()) { window.location.href = "/pricing"; return; }
    if (!currentSubject) return;

    setPhase("generating");
    setGenProgress(0);

    const topics = currentSubject.topics;
    const generated: Question[] = [];

    for (let i = 0; i < questionCount; i++) {
      const topic = topics[Math.floor(Math.random() * topics.length)];
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: currentSubject.name, topic, session, difficulty: 3 }),
        });
        if (res.ok) {
          const q = await res.json();
          generated.push(q);
        }
      } catch {}
      setGenProgress(i + 1);
    }

    setQuestions(generated);
    setAnswers(new Array(generated.length).fill(null));
    setTimeLeft(timeLimit * 60);
    setStartTime(Date.now());
    setCurrent(0);
    setPhase("exam");
  };

  const submitExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const isObj = session === "1차";
    const results = questions.map((q, i) => {
      if (isObj) return answers[i] === q.answer;
      return false; // 주관식은 자기채점
    });

    const score = results.filter(Boolean).length;

    // Save individual attempts
    questions.forEach((q, i) => {
      saveAttempt({
        id: crypto.randomUUID(),
        questionId: q.id,
        subject: q.subject,
        topic: q.topic,
        difficulty: q.difficulty,
        session: q.session,
        correct: results[i],
        userAnswer: String(answers[i] || ""),
        correctAnswer: String(q.answer),
        timestamp: Date.now(),
      });
    });

    const result: ExamResult = {
      id: crypto.randomUUID(),
      config: { session, subjectCode, questionCount, timeLimitMinutes: timeLimit },
      questions, answers, results, score, total: questions.length,
      startedAt: startTime, finishedAt: Date.now(),
    };
    saveExamResult(result);
    setExamResult(result);
    setPhase("result");
  };

  // --- SETUP ---
  if (phase === "setup") {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", marginBottom: "20px" }}>모의고사</h1>

        <Field label="시험">
          <div className="flex-gap">
            {(["1차", "2차"] as Session[]).map((s) => (
              <button key={s} className={`btn btn-sm ${session === s ? "btn-purple" : "btn-outline"}`}
                onClick={() => { setSession(s); setSubjectCode(""); }}>
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="과목">
          <select className="select" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)}>
            <option value="">과목 선택</option>
            {subjects.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </Field>

        <Field label="문제 수">
          <div className="flex-gap">
            {[5, 10, 20].map((n) => (
              <button key={n} className={`btn btn-sm ${questionCount === n ? "btn-purple" : "btn-outline"}`}
                onClick={() => setQuestionCount(n)}>{n}문제</button>
            ))}
          </div>
        </Field>

        <Field label={`제한시간: ${timeLimit}분`}>
          <input type="range" min={10} max={120} step={10} value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))} style={{ width: "100%" }} />
          <div className="flex-between" style={{ fontSize: "12px", color: "var(--text-light)" }}>
            <span>10분</span><span>60분</span><span>120분</span>
          </div>
        </Field>

        <button className="btn btn-purple btn-full" onClick={startExam} disabled={!subjectCode}
          style={{ marginTop: "8px", fontSize: "16px", padding: "14px" }}>
          모의고사 시작
        </button>
      </div>
    );
  }

  // --- GENERATING ---
  if (phase === "generating") {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
          문제를 생성하고 있습니다... ({genProgress}/{questionCount})
        </div>
        <div className="progress-bar" style={{ maxWidth: "400px", margin: "0 auto" }}>
          <div className="progress-fill" style={{ width: `${(genProgress / questionCount) * 100}%` }} />
        </div>
        <div style={{ color: "var(--text-light)", fontSize: "14px", marginTop: "12px" }}>
          약 {Math.max(0, (questionCount - genProgress) * 8)}초 남음
        </div>
      </div>
    );
  }

  // --- EXAM ---
  if (phase === "exam" && questions.length > 0) {
    const q = questions[current];
    const isObj = session === "1차";
    const answered = answers.filter((a) => a !== null).length;
    const isWarning = timeLeft < 60;

    return (
      <div>
        {/* Top bar */}
        <div className="flex-between" style={{ marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>
            {current + 1} / {questions.length}
            <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>({answered}개 답변)</span>
          </div>
          <div className={`timer ${isWarning ? "warning" : ""}`}>{formatTime(timeLeft)}</div>
        </div>

        <div className="progress-bar" style={{ marginBottom: "16px" }}>
          <div className="progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>

        {/* Question nav */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px" }}>
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              style={{
                width: "32px", height: "32px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                border: i === current ? "2px solid var(--purple)" : "1px solid var(--border)",
                background: answers[i] !== null ? (i === current ? "#c4b5fd" : "#e9d5ff") : (i === current ? "#ddd" : "var(--bg-card)"),
                cursor: "pointer", color: "var(--text)",
              }}>
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question body */}
        <div className="card" style={{ marginBottom: "16px", fontSize: "15px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{q.subject} · {q.topic}</div>
          {q.body}
        </div>

        {/* Choices */}
        {isObj && q.choices && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            {q.choices.map((c) => (
              <button key={c.number}
                onClick={() => { const newAns = [...answers]; newAns[current] = c.number; setAnswers(newAns); }}
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

        {/* Text answer */}
        {!isObj && (
          <textarea className="textarea" value={String(answers[current] || "")}
            onChange={(e) => { const newAns = [...answers]; newAns[current] = e.target.value; setAnswers(newAns); }}
            placeholder="답안 작성..." style={{ marginBottom: "16px" }} />
        )}

        {/* Nav buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>
            이전
          </button>
          {current < questions.length - 1 ? (
            <button className="btn btn-purple" style={{ flex: 1 }} onClick={() => setCurrent(current + 1)}>
              다음
            </button>
          ) : (
            <button className="btn btn-red" style={{ flex: 1 }} onClick={submitExam}>
              제출하기 ({answered}/{questions.length})
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- RESULT ---
  if (phase === "result" && examResult) {
    const pct = Math.round((examResult.score / examResult.total) * 100);
    const elapsed = Math.round((examResult.finishedAt - examResult.startedAt) / 1000);
    const isObj = session === "1차";

    return (
      <div>
        <h1 style={{ fontSize: "22px", marginBottom: "20px", textAlign: "center" }}>모의고사 결과</h1>

        <div className="card" style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "48px", fontWeight: 700, color: pct >= 60 ? "var(--green)" : "var(--red)", marginBottom: "8px" }}>
            {pct}점
          </div>
          <div style={{ fontSize: "15px", color: "var(--text-muted)" }}>
            {examResult.score}/{examResult.total} 정답 · 소요시간 {formatTime(elapsed)}
          </div>
        </div>

        <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>문항별 결과</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {examResult.questions.map((q, i) => (
            <div key={i} className="card-sm" style={{ border: "1px solid var(--border)" }}>
              <div className="flex-between" style={{ marginBottom: "4px" }}>
                <div className="flex-gap">
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>#{i + 1}</span>
                  <span className="badge" style={{
                    background: examResult.results[i] ? "#dcfce7" : "#fee2e2",
                    color: examResult.results[i] ? "#166534" : "#991b1b",
                  }}>
                    {examResult.results[i] ? "O" : "X"}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{q.topic}</span>
                </div>
                <button className="btn btn-sm btn-outline"
                  onClick={() => setShowExplanation(showExplanation === i ? null : i)}>
                  {showExplanation === i ? "접기" : "해설"}
                </button>
              </div>

              {showExplanation === i && (
                <div style={{ marginTop: "10px", fontSize: "13px", lineHeight: "1.7" }}>
                  <div style={{ background: "var(--bg)", borderRadius: "8px", padding: "12px", marginBottom: "8px", whiteSpace: "pre-wrap" }}>
                    {q.body}
                  </div>
                  {isObj && (
                    <div style={{ marginBottom: "8px" }}>
                      내 답: <strong>{examResult.answers[i] || "미응답"}</strong> / 정답: <strong>{q.answer}</strong>
                    </div>
                  )}
                  <div style={{ background: "#fffbeb", padding: "12px", borderRadius: "8px", border: "1px solid #fde68a", whiteSpace: "pre-wrap" }}>
                    {q.explanation}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button className="btn btn-purple" style={{ flex: 1 }} onClick={() => { setPhase("setup"); setExamResult(null); setQuestions([]); }}>
            다시 시작
          </button>
          <a href="/history" className="btn btn-gray" style={{ flex: 1, textAlign: "center" }}>학습기록</a>
        </div>
      </div>
    );
  }

  return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontWeight: 600, fontSize: "14px", marginBottom: "6px" }}>{label}</label>
      {children}
    </div>
  );
}
