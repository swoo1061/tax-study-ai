"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSubjectByCode, getSubjectsBySession } from "@/lib/subjects";
import { saveAttempt, saveQuestion, addBookmark, removeBookmark, isBookmarked, isLimitReached, updateAttemptCorrectness, getCoins, useCoins, COIN_COSTS } from "@/lib/storage";
import { Question, Session } from "@/lib/types";

type Phase = "setup" | "loading" | "question" | "result" | "error" | "summary";

export default function QuizPageWrapper() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "40px" }}>로딩 중...</div>}>
      <QuizPage />
    </Suspense>
  );
}

const QUIZ_SESSION_KEY = "tax-study-quiz-session";

interface QuizSession {
  phase: Phase;
  questions: Question[];
  currentIdx: number;
  answers: (number | string | null)[];
  results: (boolean | null)[];
  selfGraded: Record<number, boolean>;
  session: Session;
  subjectCode: string;
  topic: string;
  difficulty: number;
  batchSize: number;
}

function saveQuizSession(data: QuizSession) {
  try { localStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(data)); } catch {}
}

function loadQuizSession(): QuizSession | null {
  try {
    const raw = localStorage.getItem(QUIZ_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.questions || data.questions.length === 0) return null;
    return data;
  } catch { return null; }
}

function clearQuizSession() {
  localStorage.removeItem(QUIZ_SESSION_KEY);
}

function QuizPage() {
  const params = useSearchParams();
  const initSubject = params.get("subject") || "";
  const initSession = (params.get("session") as Session) || "";

  const [session, setSession] = useState<Session>(initSession || "1차");
  const [subjectCode, setSubjectCode] = useState(initSubject);
  const [topic, setTopic] = useState("랜덤");
  const [difficulty, setDifficulty] = useState(3);
  const [batchSize, setBatchSize] = useState(1);

  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);
  const [results, setResults] = useState<(boolean | null)[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [genProgress, setGenProgress] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [coins, setCoins] = useState(0);
  const [selfGraded, setSelfGraded] = useState<Record<number, boolean>>({});
  const [reportOpen, setReportOpen] = useState<Record<number, boolean>>({});
  const [reportType, setReportType] = useState("wrong_answer");
  const [reportDesc, setReportDesc] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState<Record<number, { message: string; status: string; correctedAnswer?: number | string; correctedExplanation?: string; customerAction?: string }>>({});
  const [mounted, setMounted] = useState(false);

  // 클라이언트 마운트 + 세션 복구
  useEffect(() => {
    setMounted(true);
    if (initSubject) {
      const s = getSubjectByCode(initSubject);
      if (s) { setSession(s.session); setSubjectCode(s.code); }
    }
    setCoins(getCoins());

    // 저장된 세션 복구
    const saved = loadQuizSession();
    if (saved && saved.phase !== "setup" && saved.phase !== "loading") {
      setPhase(saved.phase);
      setQuestions(saved.questions);
      setCurrentIdx(saved.currentIdx);
      setAnswers(saved.answers);
      setResults(saved.results);
      setSelfGraded(saved.selfGraded || {});
      setSession(saved.session);
      setSubjectCode(saved.subjectCode);
      setTopic(saved.topic);
      setDifficulty(saved.difficulty);
      setBatchSize(saved.batchSize);
      setShowExplanation(saved.results[saved.currentIdx] !== null);
    }
  }, [initSubject]);

  // 세션 자동 저장 (상태 변경 시)
  useEffect(() => {
    if (phase === "setup" || phase === "loading" || phase === "error" || questions.length === 0) return;
    saveQuizSession({ phase, questions, currentIdx, answers, results, selfGraded, session, subjectCode, topic, difficulty, batchSize });
  }, [phase, questions, currentIdx, answers, results, selfGraded]);

  const currentSubject = getSubjectByCode(subjectCode);
  const subjects = getSubjectsBySession(session);
  const question = questions[currentIdx] || null;

  const generate = useCallback(async () => {
    const cost = batchSize * COIN_COSTS.question;
    if (!useCoins(cost, `문제 ${batchSize}개 생성`)) {
      window.location.href = "/pricing";
      return;
    }
    setCoins(getCoins());
    setPhase("loading");
    setQuestions([]);
    setAnswers([]);
    setResults([]);
    setCurrentIdx(0);
    setShowExplanation(false);
    setBookmarked(false);
    setSelfGraded({});
    setGenProgress(0);

    const sub = getSubjectByCode(subjectCode);
    if (!sub) { setErrorMsg("과목을 선택하세요"); setPhase("error"); return; }

    const generated: Question[] = [];

    try {
      for (let i = 0; i < batchSize; i++) {
        const chosenTopic = topic === "랜덤"
          ? sub.topics[Math.floor(Math.random() * sub.topics.length)]
          : topic;

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: sub.name, topic: chosenTopic, session, difficulty }),
        });
        if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
        const q: Question = await res.json();
        saveQuestion(q);
        generated.push(q);
        setGenProgress(i + 1);
      }

      setQuestions(generated);
      setAnswers(new Array(generated.length).fill(null));
      setResults(new Array(generated.length).fill(null));
      setPhase("question");
    } catch (e: unknown) {
      if (generated.length > 0) {
        // 일부 성공 시 그것만이라도 사용
        setQuestions(generated);
        setAnswers(new Array(generated.length).fill(null));
        setResults(new Array(generated.length).fill(null));
        setPhase("question");
      } else {
        setErrorMsg(e instanceof Error ? e.message : "문제 생성 실패");
        setPhase("error");
      }
    }
  }, [subjectCode, topic, session, difficulty, batchSize]);

  const submitAnswer = () => {
    if (!question) return;
    const isObj = question.type === "객관식";
    const userAnswer = isObj ? answers[currentIdx] : answers[currentIdx];
    const correctAnswer = question.answer;
    const correct = isObj ? userAnswer === correctAnswer : false;

    const newResults = [...results];
    newResults[currentIdx] = correct;
    setResults(newResults);

    saveAttempt({
      id: crypto.randomUUID(),
      questionId: question.id,
      subject: question.subject,
      topic: question.topic,
      difficulty: question.difficulty,
      session: question.session,
      correct,
      userAnswer: String(userAnswer || ""),
      correctAnswer: String(correctAnswer),
      timestamp: Date.now(),
    });

    setCoins(getCoins());
    setShowExplanation(true);
  };

  const handleSelfGrade = (correct: boolean) => {
    const newResults = [...results];
    newResults[currentIdx] = correct;
    setResults(newResults);
    setSelfGraded({ ...selfGraded, [currentIdx]: true });
  };

  const goNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setShowExplanation(false);
      setBookmarked(false);
    } else {
      setPhase("summary");
    }
  };

  const toggleBookmark = () => {
    if (!question) return;
    if (bookmarked) { removeBookmark(question.id); setBookmarked(false); }
    else { addBookmark(question); setBookmarked(true); }
  };

  const totalAnswered = results.filter(r => r !== null).length;
  const totalCorrect = results.filter(r => r === true).length;

  // 클라이언트 마운트 전에는 빈 화면 (hydration 안전)
  if (!mounted) {
    return <div style={{ textAlign: "center", padding: "40px" }}>로딩 중...</div>;
  }

  // --- SETUP ---
  if (phase === "setup") {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div className="flex-between" style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "22px" }}>문제 설정</h1>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            보유 코인: <strong style={{ color: coins > 0 ? "var(--blue)" : "var(--red)" }}>{coins.toLocaleString()}</strong>
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

        <Field label="문제 수">
          <div className="flex-gap">
            {[1, 5, 10].map((n) => (
              <button key={n} className={`btn btn-sm ${batchSize === n ? "btn-blue" : "btn-outline"}`}
                onClick={() => setBatchSize(n)}>
                {n}문제
              </button>
            ))}
          </div>
          {batchSize > 1 && (
            <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "6px" }}>
              {batchSize}문제를 한 번에 생성합니다. 약 {batchSize * 8}초 소요 예상
            </div>
          )}
        </Field>

        <button className="btn btn-blue btn-full" onClick={generate} disabled={!subjectCode}
          style={{ marginTop: "8px", fontSize: "16px", padding: "14px" }}>
          {batchSize === 1 ? "문제 생성하기" : `${batchSize}문제 생성하기`}
        </button>
      </div>
    );
  }

  // --- LOADING ---
  if (phase === "loading") {
    return <LoadingScreen batchSize={batchSize} genProgress={genProgress} />;
  }

  // --- ERROR ---
  if (phase === "error") {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div style={{ fontSize: "18px", color: "var(--red)", marginBottom: "12px" }}>오류 발생</div>
        <div style={{ color: "var(--text-muted)", marginBottom: "20px" }}>{errorMsg}</div>
        <button className="btn btn-blue" onClick={() => { clearQuizSession(); setPhase("setup"); }}>돌아가기</button>
      </div>
    );
  }

  // --- SUMMARY (다수 문제 완료 후) ---
  if (phase === "summary") {
    const pct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    return (
      <div>
        <h1 style={{ fontSize: "22px", textAlign: "center", marginBottom: "20px" }}>풀이 완료</h1>

        <div className="card" style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "48px", fontWeight: 700, color: pct >= 60 ? "var(--green)" : "var(--red)" }}>{pct}점</div>
          <div style={{ color: "var(--text-muted)" }}>{totalCorrect}/{totalAnswered} 정답</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {questions.map((q, i) => (
            <div key={i} className="card-sm" style={{ border: "1px solid var(--border)", cursor: "pointer" }}
              onClick={() => { setCurrentIdx(i); setShowExplanation(true); setPhase("question"); }}>
              <div className="flex-between">
                <div className="flex-gap">
                  <span style={{ fontWeight: 700 }}>#{i + 1}</span>
                  <span className="badge" style={{
                    background: results[i] === true ? "#dcfce7" : results[i] === false ? "#fee2e2" : "#f1f5f9",
                    color: results[i] === true ? "#166534" : results[i] === false ? "#991b1b" : "#666",
                  }}>{results[i] === true ? "O" : results[i] === false ? "X" : "-"}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{q.topic}</span>
                </div>
                <span style={{ fontSize: "12px", color: "var(--text-light)" }}>해설 보기</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-purple" style={{ flex: 1 }} onClick={() => { clearQuizSession(); generate(); }}>새로 풀기</button>
          <button className="btn btn-gray" style={{ flex: 1 }} onClick={() => { clearQuizSession(); setPhase("setup"); }}>설정 변경</button>
        </div>
      </div>
    );
  }

  // --- QUESTION ---
  if (!question) return null;
  const isObj = question.type === "객관식";
  const isAnswered = results[currentIdx] !== null;
  const showingExplanation = showExplanation && isAnswered;

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        <div className="flex-gap" style={{ flexWrap: "wrap" }}>
          {questions.length > 1 && (
            <span style={{ fontWeight: 700, fontSize: "15px" }}>{currentIdx + 1}/{questions.length}</span>
          )}
          <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8" }}>{question.session}</span>
          <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>{question.subject}</span>
          <span className="badge" style={{ background: "#f3e8ff", color: "#6b21a8" }}>{question.topic}</span>
        </div>
        <div className="flex-gap" style={{ fontSize: "13px", color: "var(--text-light)" }}>
          <span>{"★".repeat(question.difficulty)}{"☆".repeat(5 - question.difficulty)}</span>
          {totalAnswered > 0 && <span>{totalCorrect}/{totalAnswered}</span>}
          <button onClick={toggleBookmark} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>
            {bookmarked ? "★" : "☆"}
          </button>
          <button onClick={() => { clearQuizSession(); setPhase("setup"); }}
            style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>
            새 문제
          </button>
        </div>
      </div>

      {/* Question nav (다수 문제일 때) */}
      {questions.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px" }}>
          {questions.map((_, i) => (
            <button key={i} onClick={() => { setCurrentIdx(i); setShowExplanation(results[i] !== null); setBookmarked(false); }}
              style={{
                width: "32px", height: "32px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                border: i === currentIdx ? "2px solid var(--blue)" : "1px solid var(--border)",
                background: results[i] === true ? "#dcfce7" : results[i] === false ? "#fee2e2" : (i === currentIdx ? "#dbeafe" : "var(--bg-card)"),
                cursor: "pointer", color: "var(--text)",
              }}>{i + 1}</button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="card" style={{ marginBottom: "16px", fontSize: "15px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
        {question.body}
      </div>

      {/* Choices */}
      {isObj && question.choices && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {question.choices.map((c) => {
            const isSel = answers[currentIdx] === c.number;
            const isCorr = c.number === question.answer;
            let bg = "var(--bg-card)";
            let border = "1px solid var(--border)";
            if (showingExplanation) {
              if (isCorr) { bg = "#dcfce7"; border = "2px solid var(--green)"; }
              else if (isSel && !isCorr) { bg = "#fee2e2"; border = "2px solid var(--red)"; }
            } else if (isSel) { bg = "#dbeafe"; border = "2px solid var(--blue)"; }

            return (
              <button key={c.number}
                onClick={() => {
                  if (!isAnswered) {
                    const newAns = [...answers]; newAns[currentIdx] = c.number; setAnswers(newAns);
                  }
                }}
                disabled={isAnswered}
                style={{ background: bg, border, borderRadius: "10px", padding: "14px 16px", textAlign: "left", cursor: isAnswered ? "default" : "pointer", fontSize: "14px", lineHeight: "1.5", color: "var(--text)" }}>
                <strong style={{ marginRight: "8px" }}>{c.number}.</strong>{c.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Text answer */}
      {!isObj && !isAnswered && (
        <textarea className="textarea" value={String(answers[currentIdx] || "")}
          onChange={(e) => { const a = [...answers]; a[currentIdx] = e.target.value; setAnswers(a); }}
          placeholder="답안을 작성하세요..." style={{ marginBottom: "16px" }} />
      )}

      {/* Submit */}
      {!isAnswered && (
        <button className="btn btn-blue btn-full" onClick={submitAnswer}
          disabled={isObj ? answers[currentIdx] === null : !String(answers[currentIdx] || "").trim()}
          style={{ fontSize: "16px", padding: "14px" }}>
          제출하기
        </button>
      )}

      {/* Result + Explanation */}
      {showingExplanation && (
        <>
          {isObj && (
            <div style={{
              padding: "14px 16px", borderRadius: "10px", marginBottom: "12px", fontWeight: 600, fontSize: "16px",
              background: results[currentIdx] ? "#dcfce7" : "#fee2e2",
              color: results[currentIdx] ? "#166534" : "#991b1b",
            }}>
              {results[currentIdx] ? "정답입니다!" : `오답입니다. 정답: ${String(question.answer).replace(/번$/, "")}번`}
            </div>
          )}

          {!isObj && (
            <div className="card" style={{ marginBottom: "12px", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px", color: "#1d4ed8" }}>모범답안</div>
              <div style={{ fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-wrap", marginBottom: "12px" }}>
                {String(question.answer)}
              </div>
              {!selfGraded[currentIdx] ? (
                <div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" }}>자기채점:</div>
                  <div className="flex-gap">
                    <button className="btn btn-sm" style={{ background: "var(--green)" }} onClick={() => handleSelfGrade(true)}>O 정답</button>
                    <button className="btn btn-sm btn-red" onClick={() => handleSelfGrade(false)}>X 오답</button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "var(--green)", fontWeight: 600 }}>채점 완료!</div>
              )}
            </div>
          )}

          <div style={{ background: "#fffbeb", borderRadius: "10px", padding: "16px", marginBottom: "16px", border: "1px solid #fde68a" }}>
            <div style={{ fontWeight: 600, marginBottom: "8px", color: "#92400e" }}>해설</div>
            <div style={{ fontSize: "14px", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>{question.explanation}</div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {currentIdx < questions.length - 1 ? (
              <button className="btn btn-blue" style={{ flex: 1 }} onClick={goNext}>다음 문제</button>
            ) : questions.length > 1 ? (
              <button className="btn btn-blue" style={{ flex: 1 }} onClick={() => setPhase("summary")}>결과 보기</button>
            ) : (
              <button className="btn btn-blue" style={{ flex: 1 }} onClick={generate}>다음 문제</button>
            )}
            <button className="btn btn-purple" style={{ flex: 1 }} onClick={() => { clearQuizSession(); generate(); }}>새로 풀기</button>
            <button className="btn btn-gray" style={{ flex: "none", padding: "12px 16px" }} onClick={() => { clearQuizSession(); setPhase("setup"); }}>설정</button>
          </div>

          {/* 인라인 오류 신고 (문제별 독립) */}
          {!reportOpen[currentIdx] && !reportResult[currentIdx] && !reportLoading && (
            <button onClick={() => { setReportOpen({ ...reportOpen, [currentIdx]: true }); setReportDesc(""); }}
              style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", fontSize: "12px", color: "var(--text-light)", cursor: "pointer", textDecoration: "underline" }}>
              이 문제에 오류가 있나요?
            </button>
          )}

          {reportOpen[currentIdx] && !reportResult[currentIdx] && (
            <div style={{ marginTop: "12px", border: "1px solid var(--red)", borderRadius: "10px", padding: "16px", background: "var(--bg-card)" }}>
              <div className="flex-between" style={{ marginBottom: "10px" }}>
                <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--red)" }}>오류 신고</span>
                <button onClick={() => setReportOpen({ ...reportOpen, [currentIdx]: false })}
                  style={{ background: "none", border: "none", color: "var(--text-light)", cursor: "pointer", fontSize: "16px" }}>✕</button>
              </div>

              <div style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>오류 유형</div>
                <div className="flex-gap" style={{ flexWrap: "wrap" }}>
                  {[
                    { value: "wrong_answer", label: "정답 오류" },
                    { value: "wrong_explanation", label: "해설 오류" },
                    { value: "outdated_law", label: "법령 구버전" },
                    { value: "other", label: "기타" },
                  ].map((opt) => (
                    <button key={opt.value}
                      className={`btn btn-sm ${reportType === opt.value ? "btn-red" : "btn-outline"}`}
                      onClick={() => setReportType(opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "10px" }}>
                <textarea className="textarea"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="어떤 부분이 잘못되었는지 간단히 설명해주세요 (선택)"
                  style={{ minHeight: "60px", fontSize: "13px" }} />
              </div>

              <button className="btn btn-red btn-full btn-sm" disabled={reportLoading}
                onClick={async () => {
                  setReportLoading(true);
                  const idx = currentIdx;
                  try {
                    const res = await fetch("/api/report-error", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        questionId: question.id,
                        reportType,
                        description: reportDesc,
                        questionData: {
                          body: question.body,
                          choices: question.choices,
                          answer: question.answer,
                          explanation: question.explanation,
                          type: question.type,
                          subject: question.subject,
                          topic: question.topic,
                        },
                      }),
                    });
                    const data = await res.json();
                    const rStatus = data.report?.status || "open";

                    // 오류 인정 → 문제 자체를 새로 생성해서 통째로 교체
                    if (rStatus === "fixed" || rStatus === "verified_error") {
                      setReportResult({ ...reportResult, [idx]: {
                        message: "오류가 확인되었습니다. 새 문제를 생성하고 있습니다...",
                        status: "regenerating",
                      }});

                      // 코인 환불
                      const { refundCoins } = await import("@/lib/storage");
                      refundCoins(1, "오류 문제 환불");
                      setCoins(getCoins());

                      // 같은 과목/주제/난이도로 새 문제 생성
                      try {
                        const regenRes = await fetch("/api/generate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            subject: question.subject,
                            topic: question.topic,
                            session: question.session,
                            difficulty: question.difficulty,
                          }),
                        });
                        if (regenRes.ok) {
                          const newQ = await regenRes.json();
                          const newQuestions = [...questions];
                          newQuestions[idx] = newQ;
                          setQuestions(newQuestions);
                          // 답안/결과 리셋
                          const newAnswers = [...answers]; newAnswers[idx] = null; setAnswers(newAnswers);
                          const newResults = [...results]; newResults[idx] = null; setResults(newResults);
                          setShowExplanation(false);
                          setReportResult({ ...reportResult, [idx]: {
                            message: "새 문제로 교체되었습니다! 코인 1개가 환불되었습니다.",
                            status: "fixed",
                          }});
                        } else {
                          setReportResult({ ...reportResult, [idx]: {
                            message: "오류가 확인되었습니다. 새 문제 생성에 실패했지만 코인은 환불되었습니다.",
                            status: "fixed",
                          }});
                        }
                      } catch {
                        setReportResult({ ...reportResult, [idx]: {
                          message: "오류가 확인되어 코인이 환불되었습니다. 다음 문제로 넘어가세요.",
                          status: "fixed",
                        }});
                      }
                    } else {
                      setReportResult({ ...reportResult, [idx]: {
                        message: data.message || "신고가 접수되었습니다.",
                        status: rStatus,
                        customerAction: data.customerAction,
                      }});
                    }
                  } catch {
                    setReportResult({ ...reportResult, [idx]: { message: "신고 접수에 실패했습니다.", status: "error" } });
                  } finally {
                    setReportLoading(false);
                    setReportOpen({ ...reportOpen, [idx]: false });
                  }
                }}>
                {reportLoading ? "AI 검증 중..." : "신고하기"}
              </button>
            </div>
          )}

          {reportResult[currentIdx]?.status === "regenerating" && (
            <div style={{ marginTop: "16px", textAlign: "center", padding: "20px", background: "#fffbeb", borderRadius: "12px", border: "1px solid #fde68a" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px", animation: "pulse 1.5s ease-in-out infinite" }}>&#9997;&#65039;</div>
              <div style={{ fontSize: "15px", fontWeight: 600 }}>새 문제를 생성하고 있습니다...</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>오류가 확인되어 같은 주제의 새 문제로 교체합니다</div>
              <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px" }}>
                {[0, 1, 2].map((i) => <div key={i} className="loading-dot" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}

          {reportResult[currentIdx] && reportResult[currentIdx].status !== "regenerating" && (
            <div style={{
              marginTop: "12px",
              borderRadius: "12px",
              overflow: "hidden",
              border: `2px solid ${reportResult[currentIdx].status === "fixed" ? "var(--green)" : reportResult[currentIdx].status === "not_error" ? "var(--blue)" : "var(--yellow)"}`,
              animation: reportResult[currentIdx].status === "fixed" ? "slideIn 0.4s ease-out" : undefined,
            }}>
              {/* 헤더 */}
              <div style={{
                padding: "14px 16px",
                background: reportResult[currentIdx].status === "fixed" ? "var(--green)" : reportResult[currentIdx].status === "not_error" ? "var(--blue)" : "var(--yellow)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                {reportResult[currentIdx].status === "regenerating" && <><span style={{ fontSize: "20px" }}>&#9997;&#65039;</span> 새 문제를 생성하고 있습니다...</>}
                {reportResult[currentIdx].status === "fixed" && <><span style={{ fontSize: "20px" }}>&#9989;</span> 새 문제로 교체되었습니다</>}
                {reportResult[currentIdx].status === "not_error" && <><span style={{ fontSize: "20px" }}>&#9989;</span> 검증 완료 — 정답이 맞습니다</>}
                {reportResult[currentIdx].status !== "fixed" && reportResult[currentIdx].status !== "not_error" && <><span style={{ fontSize: "20px" }}>&#128203;</span> 신고가 접수되었습니다</>}
              </div>

              {/* 본문 */}
              <div style={{ padding: "14px 16px", background: reportResult[currentIdx].status === "fixed" ? "#dcfce7" : reportResult[currentIdx].status === "not_error" ? "#dbeafe" : "#fffbeb" }}>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                  {reportResult[currentIdx].message}
                </div>

                {/* 오류 인정 시 추가 액션 표시 */}
                {reportResult[currentIdx].status === "fixed" && (
                  <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ padding: "10px 12px", background: "#fff", borderRadius: "8px", fontSize: "13px" }}>
                      <div style={{ fontWeight: 600, color: "var(--green)", marginBottom: "4px" }}>문제가 새로 교체되었습니다</div>
                      <div style={{ color: "var(--text-muted)" }}>
                        오류가 있던 문제가 새로 생성된 문제로 교체되었습니다. 다시 풀어보세요!
                      </div>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "8px 12px", background: "#fff", borderRadius: "8px",
                      fontSize: "13px", fontWeight: 600, color: "var(--green)",
                    }}>
                      <span style={{ fontSize: "16px" }}>&#127881;</span>
                      코인 1개가 환불되었습니다
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                      신고해주셔서 감사합니다. 같은 유형의 오류가 반복되지 않도록 AI 생성 품질에 반영됩니다.
                    </div>
                  </div>
                )}

                {/* 정답 확인 시 */}
                {reportResult[currentIdx].status === "not_error" && reportResult[currentIdx].customerAction && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
                    {reportResult[currentIdx].customerAction}
                  </div>
                )}

                {/* 접수 시 */}
                {reportResult[currentIdx].status !== "fixed" && reportResult[currentIdx].status !== "not_error" && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
                    담당자가 확인 후 결과를 알려드리겠습니다.
                  </div>
                )}
              </div>
            </div>
          )}
          {/* 교체/확인 완료 후에도 새 문제에 대한 신고 가능 */}
          {reportResult[currentIdx] && reportResult[currentIdx].status !== "regenerating" && (
            <button onClick={() => {
              const newResult = { ...reportResult };
              delete newResult[currentIdx];
              setReportResult(newResult);
              setReportOpen({ ...reportOpen, [currentIdx]: true });
              setReportDesc("");
            }}
              style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", fontSize: "12px", color: "var(--text-light)", cursor: "pointer", textDecoration: "underline" }}>
              이 문제도 오류가 있나요?
            </button>
          )}
          <style>{`@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
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

// ========== 재밌는 로딩 화면 ==========
const LOADING_MESSAGES = [
  { emoji: "📚", text: "법조문 뒤지는 중..." },
  { emoji: "🧮", text: "세율 계산하는 중..." },
  { emoji: "✍️", text: "선택지 다듬는 중..." },
  { emoji: "🔍", text: "매력적인 오답 만드는 중..." },
  { emoji: "📋", text: "해설 작성하는 중..." },
  { emoji: "🎯", text: "난이도 조절하는 중..." },
  { emoji: "⚖️", text: "정답 검증하는 중..." },
  { emoji: "🏛️", text: "국세청 자료 확인하는 중..." },
  { emoji: "📐", text: "계산 과정 재검산 중..." },
  { emoji: "🎓", text: "출제위원 회의 중..." },
  { emoji: "💡", text: "사례 시나리오 구성 중..." },
  { emoji: "🔢", text: "숫자 넣어서 문제 만드는 중..." },
  { emoji: "📝", text: "거의 다 됐어요!" },
  { emoji: "🏆", text: "합격의 길이 가까워지고 있어요!" },
  { emoji: "☕", text: "잠깐, AI도 커피 한 잔..." },
  { emoji: "🤓", text: "이 문제 풀 수 있으려나..." },
  { emoji: "📖", text: "교과서 200페이지 읽는 중..." },
  { emoji: "🧠", text: "두뇌 풀가동 중..." },
  { emoji: "⏰", text: "좋은 문제는 시간이 걸립니다..." },
  { emoji: "🎁", text: "특별한 문제 준비 중..." },
];

const TIPS = [
  "오답노트를 자주 복습하면 정답률이 올라가요!",
  "모의고사를 꾸준히 풀면 실전 감각이 생겨요",
  "취약 주제를 집중 공략하세요",
  "해설을 꼼꼼히 읽는 것이 합격의 지름길!",
  "틀린 문제는 3번 이상 복습하세요",
  "하루 10문제 꾸준히 > 한 번에 100문제",
  "계산 문제는 직접 손으로 풀어보세요",
  "법조문 번호까지 외우면 실전에서 유리해요",
];

function LoadingScreen({ batchSize, genProgress }: { batchSize: number; genProgress: number }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    const elapsedTimer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => { clearInterval(msgTimer); clearInterval(elapsedTimer); };
  }, []);

  const msg = LOADING_MESSAGES[msgIdx];
  const tip = TIPS[Math.floor(elapsed / 8) % TIPS.length];

  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{
        fontSize: "50px",
        marginBottom: "16px",
        animation: "pulse 1.5s ease-in-out infinite",
      }}>{msg.emoji}</div>

      <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>
        {msg.text}
      </div>

      {batchSize > 1 && (
        <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "12px" }}>
          {genProgress}/{batchSize}문제 완료
        </div>
      )}

      {batchSize > 1 && (
        <div className="progress-bar" style={{ maxWidth: "300px", margin: "0 auto 16px" }}>
          <div className="progress-fill" style={{ width: `${(genProgress / batchSize) * 100}%` }} />
        </div>
      )}

      <div style={{
        fontSize: "12px",
        color: "var(--text-light)",
        marginTop: "16px",
      }}>
        {elapsed}초 경과
      </div>

      <div style={{
        marginTop: "24px",
        padding: "12px 20px",
        background: "var(--bg-card)",
        borderRadius: "10px",
        maxWidth: "350px",
        margin: "24px auto 0",
        border: "1px solid var(--border)",
      }}>
        <div style={{ fontSize: "11px", color: "var(--blue)", fontWeight: 600, marginBottom: "4px" }}>
          TIP
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
          {tip}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "20px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="loading-dot" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}
