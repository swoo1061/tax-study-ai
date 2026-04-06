"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SUBJECTS, getSubjectByCode, getSubjectsBySession } from "@/lib/subjects";
import { saveAttempt } from "@/lib/storage";
import { Question, Subject, Session } from "@/lib/types";

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

  // Setup state
  const [session, setSession] = useState<Session>(initSession || "1차");
  const [subjectCode, setSubjectCode] = useState(initSubject);
  const [topic, setTopic] = useState("랜덤");
  const [difficulty, setDifficulty] = useState(3);

  // Quiz state
  const [phase, setPhase] = useState<Phase>("setup");
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Auto-select subject from URL
  useEffect(() => {
    if (initSubject) {
      const s = getSubjectByCode(initSubject);
      if (s) {
        setSession(s.session);
        setSubjectCode(s.code);
        setPhase("setup");
      }
    }
  }, [initSubject]);

  const currentSubject = getSubjectByCode(subjectCode);
  const subjects = getSubjectsBySession(session);

  const generate = useCallback(async () => {
    setPhase("loading");
    setSelected(null);
    setTextAnswer("");
    setShowExplanation(false);

    const sub = getSubjectByCode(subjectCode);
    if (!sub) { setErrorMsg("과목을 선택하세요"); setPhase("error"); return; }

    const chosenTopic = topic === "랜덤"
      ? sub.topics[Math.floor(Math.random() * sub.topics.length)]
      : topic;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: sub.name,
          topic: chosenTopic,
          session,
          difficulty,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const q: Question = await res.json();
      setQuestion(q);
      setPhase("question");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "문제 생성 실패");
      setPhase("error");
    }
  }, [subjectCode, topic, session, difficulty]);

  const submitAnswer = () => {
    if (!question) return;

    const isObjective = question.type === "객관식";
    const userAnswer = isObjective ? String(selected) : textAnswer;
    const correctAnswer = String(question.answer);
    const correct = isObjective ? selected === question.answer : false; // 주관식은 항상 수동 채점

    saveAttempt({
      id: crypto.randomUUID(),
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

    setQuestionCount((c) => c + 1);
    if (correct) setCorrectCount((c) => c + 1);
    setShowExplanation(true);
    setPhase("result");
  };

  // --- SETUP ---
  if (phase === "setup") {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", marginBottom: "20px" }}>문제 설정</h1>

        <Field label="시험">
          <div style={{ display: "flex", gap: "8px" }}>
            {(["1차", "2차"] as Session[]).map((s) => (
              <Btn key={s} active={session === s} onClick={() => { setSession(s); setSubjectCode(""); setTopic("랜덤"); }}>
                {s} 시험
              </Btn>
            ))}
          </div>
        </Field>

        <Field label="과목">
          <select
            value={subjectCode}
            onChange={(e) => { setSubjectCode(e.target.value); setTopic("랜덤"); }}
            style={selectStyle}
          >
            <option value="">과목 선택</option>
            {subjects.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </Field>

        {currentSubject && (
          <Field label="주제">
            <select value={topic} onChange={(e) => setTopic(e.target.value)} style={selectStyle}>
              <option value="랜덤">랜덤 (전체 주제)</option>
              {currentSubject.topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label={`난이도: ${difficulty}/5`}>
          <input
            type="range"
            min={1}
            max={5}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888" }}>
            <span>쉬움</span><span>보통</span><span>어려움</span>
          </div>
        </Field>

        <button
          onClick={generate}
          disabled={!subjectCode}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "16px",
            fontWeight: 700,
            background: subjectCode ? "#3b82f6" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: subjectCode ? "pointer" : "not-allowed",
            marginTop: "8px",
          }}
        >
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
        <div style={{ color: "#888", fontSize: "14px", marginTop: "8px" }}>약 5~10초 소요</div>
        <LoadingDots />
      </div>
    );
  }

  // --- ERROR ---
  if (phase === "error") {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div style={{ fontSize: "18px", color: "#ef4444", marginBottom: "12px" }}>오류 발생</div>
        <div style={{ color: "#666", marginBottom: "20px" }}>{errorMsg}</div>
        <button onClick={() => setPhase("setup")} style={{ ...btnStyle, background: "#3b82f6" }}>
          돌아가기
        </button>
      </div>
    );
  }

  // --- QUESTION / RESULT ---
  if (!question) return null;
  const isObjective = question.type === "객관식";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Badge bg="#dbeafe" color="#1d4ed8">{question.session}</Badge>
          <Badge bg="#fef3c7" color="#92400e">{question.subject}</Badge>
          <Badge bg="#f3e8ff" color="#6b21a8">{question.topic}</Badge>
        </div>
        <div style={{ fontSize: "13px", color: "#888" }}>
          난이도 {"★".repeat(question.difficulty)}{"☆".repeat(5 - question.difficulty)}
          {questionCount > 0 && ` · ${correctCount}/${questionCount} 정답`}
        </div>
      </div>

      {/* Question body */}
      <div style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        fontSize: "15px",
        lineHeight: "1.7",
        whiteSpace: "pre-wrap",
      }}>
        {question.body}
      </div>

      {/* Choices (객관식) */}
      {isObjective && question.choices && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {question.choices.map((c) => {
            const isSelected = selected === c.number;
            const isCorrect = c.number === question.answer;
            let bg = "#fff";
            let border = "1px solid #e5e7eb";
            if (phase === "result") {
              if (isCorrect) { bg = "#dcfce7"; border = "2px solid #22c55e"; }
              else if (isSelected && !isCorrect) { bg = "#fee2e2"; border = "2px solid #ef4444"; }
            } else if (isSelected) {
              bg = "#dbeafe"; border = "2px solid #3b82f6";
            }

            return (
              <button
                key={c.number}
                onClick={() => phase === "question" && setSelected(c.number)}
                disabled={phase === "result"}
                style={{
                  background: bg,
                  border,
                  borderRadius: "10px",
                  padding: "14px 16px",
                  textAlign: "left",
                  cursor: phase === "question" ? "pointer" : "default",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                <strong style={{ marginRight: "8px" }}>{c.number}.</strong>
                {c.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Text answer (주관식) */}
      {!isObjective && phase === "question" && (
        <div style={{ marginBottom: "16px" }}>
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="답안을 작성하세요..."
            style={{
              width: "100%",
              minHeight: "150px",
              padding: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              fontSize: "14px",
              lineHeight: "1.7",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* Submit button */}
      {phase === "question" && (
        <button
          onClick={submitAnswer}
          disabled={isObjective ? selected === null : textAnswer.trim() === ""}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "16px",
            fontWeight: 700,
            background: (isObjective ? selected !== null : textAnswer.trim()) ? "#3b82f6" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: (isObjective ? selected !== null : textAnswer.trim()) ? "pointer" : "not-allowed",
          }}
        >
          제출하기
        </button>
      )}

      {/* Result + Explanation */}
      {phase === "result" && (
        <>
          {isObjective && (
            <div style={{
              padding: "14px 16px",
              borderRadius: "10px",
              marginBottom: "12px",
              fontWeight: 600,
              fontSize: "16px",
              background: selected === question.answer ? "#dcfce7" : "#fee2e2",
              color: selected === question.answer ? "#166534" : "#991b1b",
            }}>
              {selected === question.answer ? "정답입니다!" : `오답입니다. 정답: ${question.answer}번`}
            </div>
          )}

          {!isObjective && (
            <div style={{
              background: "#fff",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "12px",
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ fontWeight: 600, marginBottom: "8px", color: "#1d4ed8" }}>모범답안</div>
              <div style={{ fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
                {String(question.answer)}
              </div>
            </div>
          )}

          <div style={{
            background: "#fffbeb",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "16px",
            border: "1px solid #fde68a",
          }}>
            <div style={{ fontWeight: 600, marginBottom: "8px", color: "#92400e" }}>해설</div>
            <div style={{ fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
              {question.explanation}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={generate} style={{ ...btnStyle, flex: 1, background: "#3b82f6" }}>
              다음 문제
            </button>
            <button onClick={() => setPhase("setup")} style={{ ...btnStyle, flex: 1, background: "#6b7280" }}>
              설정 변경
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// --- Helper components ---

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontWeight: 600, fontSize: "14px", marginBottom: "6px" }}>{label}</label>
      {children}
    </div>
  );
}

function Btn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 20px",
        border: active ? "2px solid #3b82f6" : "1px solid #e5e7eb",
        borderRadius: "8px",
        background: active ? "#dbeafe" : "#fff",
        fontWeight: active ? 700 : 400,
        cursor: "pointer",
        fontSize: "14px",
      }}
    >
      {children}
    </button>
  );
}

function Badge({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{
      background: bg,
      color,
      padding: "2px 10px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: 600,
    }}>
      {children}
    </span>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "20px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#3b82f6",
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.2); } }`}</style>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "14px",
  background: "#fff",
};

const btnStyle: React.CSSProperties = {
  padding: "12px 20px",
  fontSize: "15px",
  fontWeight: 700,
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
};
