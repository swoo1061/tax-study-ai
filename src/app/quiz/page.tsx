"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSubjectByCode, getSubjectsBySession } from "@/lib/subjects";
import { saveAttempt, saveQuestion, addBookmark, removeBookmark, isBookmarked, isLimitReached, getRemainingToday, getDailyLimit, updateAttemptCorrectness } from "@/lib/storage";
import { Question, Session } from "@/lib/types";

type Phase = "setup" | "loading" | "question" | "result" | "error";

export default function QuizPageWrapper() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "40px" }}>로딩 중...</div>}>
      <QuizPage />
    </Suspense>
  );
}

function QuizPage() {
  const params = useSearchParams();
  const initSubject = params.get("subject") || "";
  const initSession = (params.get("session") as Session) || "";

  const [session, setSession] = useState<Session>(initSession || "1차");
  const [subjectCode, setSubjectCode] = useState(initSubject);
  const [topic, setTopic] = useState("랜덤");
  const [difficulty, setDifficulty] = useState(3);

  const [phase, setPhase] = useState<Phase>("setup");
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [remaining, setRemaining] = useState(getDailyLimit());
  const [lastAttemptId, setLastAttemptId] = useState("");
  const [selfGraded, setSelfGraded] = useState(false);

  useEffect(() => {
    if (initSubject) {
      const s = getSubjectByCode(initSubject);
      if (s) { setSession(s.session); setSubjectCode(s.code); }
    }
    setRemaining(getRemainingToday());
  }, [initSubject]);

  const currentSubject = getSubjectByCode(subjectCode);
  const subjects = getSubjectsBySession(session);

  const generate = useCallback(async () => {
    if (isLimitReached()) {
      window.location.href = "/pricing";
      return;
    }
    setPhase("loading");
    setSelected(null);
    setTextAnswer("");
    setBookmarked(false);
    setSelfGraded(false);

    const sub = getSubjectByCode(subjectCode);
    if (!sub) { setErrorMsg("과목을 선택하세요"); setPhase("error"); return; }

    const chosenTopic = topic === "랜덤"
      ? sub.topics[Math.floor(Math.random() * sub.topics.length)]
      : topic;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: sub.name, topic: chosenTopic, session, difficulty }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const q: Question = await res.json();
      saveQuestion(q);
      setQuestion(q);
      setPhase("question");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "문제 생성 실패");
      setPhase("error");
    }
  }, [subjectCode, topic, session, difficulty]);

  const submitAnswer = () => {
    if (!question) return;
    const isObj = question.type === "객관식";
    const userAnswer = isObj ? String(selected) : textAnswer;
    const correctAnswer = String(question.answer);
    const correct = isObj ? selected === question.answer : false;

    const attemptId = crypto.randomUUID();
    saveAttempt({
      id: attemptId,
      questionId: question.id,
      subject: question.subject,
      topic: question.topic,
      difficulty: question.difficulty,
      session: question.session,
      correct,
      userAnswer,
      correctAnswer,
      timestamp: Date.now(),
    });

    setLastAttemptId(attemptId);
    setQuestionCount((c) => c + 1);
    if (correct) setCorrectCount((c) => c + 1);
    setRemaining(getRemainingToday());
    setPhase("result");
  };

  const handleSelfGrade = (correct: boolean) => {
    updateAttemptCorrectness(lastAttemptId, correct);
    setSelfGraded(true);
    if (correct) setCorrectCount((c) => c + 1);
  };

  const toggleBookmark = () => {
    if (!question) return;
    if (bookmarked) { removeBookmark(question.id); setBookmarked(false); }
    else { addBookmark(question); setBookmarked(true); }
  };

  // --- SETUP ---
  if (phase === "setup") {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div className="flex-between" style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "22px" }}>문제 설정</h1>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            오늘 남은 문제: <strong style={{ color: remaining > 0 ? "var(--blue)" : "var(--red)" }}>{remaining}/{getDailyLimit()}</strong>
          </span>
        </div>

        <Field label="시험">
          <div className="flex-gap">
            {(["1차", "2차"] as Session[]).map((s) => (
              <button key={s} className={`btn btn-sm ${session === s ? "btn-blue" : "btn-outline"}`}
                onClick={() => { setSession(s); setSubjectCode(""); setTopic("랜덤"); }}>
                {s} 시험
              </button>
            ))}
          </div>
        </Field>

        <Field label="과목">
          <select className="select" value={subjectCode}
            onChange={(e) => { setSubjectCode(e.target.value); setTopic("랜덤"); }}>
            <option value="">과목 선택</option>
            {subjects.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </Field>

        {currentSubject && (
          <Field label="주제">
            <select className="select" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="랜덤">랜덤 (전체 주제)</option>
              {currentSubject.topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        )}

        <Field label={`난이도: ${difficulty}/5`}>
          <input type="range" min={1} max={5} value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            style={{ width: "100%" }} />
          <div className="flex-between" style={{ fontSize: "12px", color: "var(--text-light)" }}>
            <span>쉬움</span><span>보통</span><span>어려움</span>
          </div>
        </Field>

        <button className="btn btn-blue btn-full" onClick={generate} disabled={!subjectCode}
          style={{ marginTop: "8px", fontSize: "16px", padding: "14px" }}>
          문제 생성하기
        </button>
      </div>
    );
  }

  // --- LOADING ---
  if (phase === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>&#9997;&#65039;</div>
        <div style={{ fontSize: "18px", fontWeight: 600 }}>AI가 문제를 만들고 있습니다...</div>
        <div style={{ color: "var(--text-light)", fontSize: "14px", marginTop: "8px" }}>약 5~10초 소요</div>
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "20px" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="loading-dot" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  // --- ERROR ---
  if (phase === "error") {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div style={{ fontSize: "18px", color: "var(--red)", marginBottom: "12px" }}>오류 발생</div>
        <div style={{ color: "var(--text-muted)", marginBottom: "20px" }}>{errorMsg}</div>
        <button className="btn btn-blue" onClick={() => setPhase("setup")}>돌아가기</button>
      </div>
    );
  }

  // --- QUESTION / RESULT ---
  if (!question) return null;
  const isObj = question.type === "객관식";

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div className="flex-gap" style={{ flexWrap: "wrap" }}>
          <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8" }}>{question.session}</span>
          <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>{question.subject}</span>
          <span className="badge" style={{ background: "#f3e8ff", color: "#6b21a8" }}>{question.topic}</span>
        </div>
        <div className="flex-gap" style={{ fontSize: "13px", color: "var(--text-light)" }}>
          <span>{"★".repeat(question.difficulty)}{"☆".repeat(5 - question.difficulty)}</span>
          {questionCount > 0 && <span>{correctCount}/{questionCount}</span>}
          <button onClick={toggleBookmark} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>
            {bookmarked ? "★" : "☆"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="card" style={{ marginBottom: "16px", fontSize: "15px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
        {question.body}
      </div>

      {/* Choices */}
      {isObj && question.choices && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {question.choices.map((c) => {
            const isSel = selected === c.number;
            const isCorr = c.number === question.answer;
            let bg = "var(--bg-card)";
            let border = "1px solid var(--border)";
            if (phase === "result") {
              if (isCorr) { bg = "#dcfce7"; border = "2px solid var(--green)"; }
              else if (isSel && !isCorr) { bg = "#fee2e2"; border = "2px solid var(--red)"; }
            } else if (isSel) { bg = "#dbeafe"; border = "2px solid var(--blue)"; }

            return (
              <button key={c.number} onClick={() => phase === "question" && setSelected(c.number)}
                disabled={phase === "result"}
                style={{ background: bg, border, borderRadius: "10px", padding: "14px 16px", textAlign: "left", cursor: phase === "question" ? "pointer" : "default", fontSize: "14px", lineHeight: "1.5", color: "var(--text)" }}>
                <strong style={{ marginRight: "8px" }}>{c.number}.</strong>{c.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Text answer */}
      {!isObj && phase === "question" && (
        <div style={{ marginBottom: "16px" }}>
          <textarea className="textarea" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="답안을 작성하세요..." />
        </div>
      )}

      {/* Submit */}
      {phase === "question" && (
        <button className="btn btn-blue btn-full" onClick={submitAnswer}
          disabled={isObj ? selected === null : textAnswer.trim() === ""}
          style={{ fontSize: "16px", padding: "14px" }}>
          제출하기
        </button>
      )}

      {/* Result */}
      {phase === "result" && (
        <>
          {isObj && (
            <div style={{
              padding: "14px 16px", borderRadius: "10px", marginBottom: "12px", fontWeight: 600, fontSize: "16px",
              background: selected === question.answer ? "#dcfce7" : "#fee2e2",
              color: selected === question.answer ? "#166534" : "#991b1b",
            }}>
              {selected === question.answer ? "정답입니다!" : `오답입니다. 정답: ${question.answer}번`}
            </div>
          )}

          {/* 주관식 자기채점 */}
          {!isObj && (
            <div className="card" style={{ marginBottom: "12px", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px", color: "#1d4ed8" }}>모범답안</div>
              <div style={{ fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-wrap", marginBottom: "12px" }}>
                {String(question.answer)}
              </div>
              {!selfGraded ? (
                <div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" }}>
                    모범답안과 비교하여 자기채점 해주세요:
                  </div>
                  <div className="flex-gap">
                    <button className="btn btn-sm" style={{ background: "var(--green)" }} onClick={() => handleSelfGrade(true)}>
                      O 정답
                    </button>
                    <button className="btn btn-sm btn-red" onClick={() => handleSelfGrade(false)}>
                      X 오답
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "var(--green)", fontWeight: 600 }}>
                  채점 완료!
                </div>
              )}
            </div>
          )}

          <div style={{ background: "#fffbeb", borderRadius: "10px", padding: "16px", marginBottom: "16px", border: "1px solid #fde68a" }}>
            <div style={{ fontWeight: 600, marginBottom: "8px", color: "#92400e" }}>해설</div>
            <div style={{ fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>{question.explanation}</div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn btn-blue" style={{ flex: 1 }} onClick={generate}>다음 문제</button>
            <button className="btn btn-gray" style={{ flex: 1 }} onClick={() => setPhase("setup")}>설정 변경</button>
          </div>

          <button
            onClick={() => {
              const params = new URLSearchParams({
                questionId: question.id,
                subject: question.subject,
                topic: question.topic,
              });
              window.open(`/support?error=1&${params.toString()}`, "_blank");
            }}
            style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", fontSize: "12px", color: "var(--text-light)", cursor: "pointer", textDecoration: "underline" }}>
            이 문제에 오류가 있나요? 신고하기
          </button>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontWeight: 600, fontSize: "14px", marginBottom: "6px" }}>{label}</label>
      {children}
    </div>
  );
}
