"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getWrongAttempts, getBookmarks, removeBookmark, getQuestionById } from "@/lib/storage";
import { AttemptRecord, SavedQuestion } from "@/lib/types";

export default function ReviewPageWrapper() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <ReviewPage />
    </Suspense>
  );
}

function ReviewPage() {
  const params = useSearchParams();
  const initTab = params.get("tab") || "wrong";

  const [tab, setTab] = useState<"wrong" | "bookmarks">(initTab as "wrong" | "bookmarks");
  const [wrongAttempts, setWrongAttempts] = useState<AttemptRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<SavedQuestion[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("");

  useEffect(() => {
    setWrongAttempts(getWrongAttempts());
    setBookmarks(getBookmarks());
  }, []);

  const subjects = [...new Set(wrongAttempts.map((a) => a.subject))];
  const filtered = subjectFilter
    ? wrongAttempts.filter((a) => a.subject === subjectFilter)
    : wrongAttempts;

  const handleRemoveBookmark = (id: string) => {
    removeBookmark(id);
    setBookmarks(getBookmarks());
  };

  return (
    <div>
      <h1 style={{ fontSize: "22px", marginBottom: "16px" }}>복습</h1>

      <div className="tabs">
        <button className={`tab ${tab === "wrong" ? "active" : ""}`} onClick={() => setTab("wrong")}>
          오답노트 ({wrongAttempts.length})
        </button>
        <button className={`tab ${tab === "bookmarks" ? "active" : ""}`} onClick={() => setTab("bookmarks")}>
          북마크 ({bookmarks.length})
        </button>
      </div>

      {/* --- Wrong answers --- */}
      {tab === "wrong" && (
        <>
          {wrongAttempts.length === 0 ? (
            <EmptyState icon="&#127881;" text="오답이 없습니다!" sub="모든 문제를 맞혔어요." />
          ) : (
            <>
              <div style={{ marginBottom: "16px" }}>
                <select className="select" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
                  style={{ maxWidth: "300px" }}>
                  <option value="">전체 과목</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filtered.map((a) => {
                  const isExp = expanded === a.id;
                  const question = getQuestionById(a.questionId);

                  return (
                    <div key={a.id} className="card-sm" style={{ border: "1px solid var(--border)", cursor: "pointer" }}
                      onClick={() => setExpanded(isExp ? null : a.id)}>
                      <div className="flex-between">
                        <div className="flex-gap" style={{ flexWrap: "wrap" }}>
                          <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>X</span>
                          <span style={{ fontWeight: 600, fontSize: "14px" }}>{a.subject}</span>
                          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{a.topic}</span>
                        </div>
                        <span style={{ fontSize: "12px", color: "var(--text-light)" }}>
                          {new Date(a.timestamp).toLocaleDateString("ko")}
                        </span>
                      </div>

                      {isExp && (
                        <div style={{ marginTop: "12px", fontSize: "13px", lineHeight: "1.7" }}>
                          {question ? (
                            <>
                              <div style={{ background: "var(--bg)", borderRadius: "8px", padding: "12px", marginBottom: "8px", whiteSpace: "pre-wrap" }}>
                                {question.body}
                              </div>
                              <div style={{ marginBottom: "8px" }}>
                                <span style={{ color: "var(--red)" }}>내 답: {a.userAnswer || "미응답"}</span>
                                {" / "}
                                <span style={{ color: "var(--green)" }}>정답: {a.correctAnswer}</span>
                              </div>
                              <div style={{ background: "#fffbeb", padding: "12px", borderRadius: "8px", border: "1px solid #fde68a", whiteSpace: "pre-wrap" }}>
                                {question.explanation}
                              </div>
                              <a href={`/quiz?subject=${encodeURIComponent(a.subject)}`}
                                className="btn btn-sm btn-blue" style={{ marginTop: "10px", display: "inline-block", textAlign: "center" }}>
                                같은 주제 다시 풀기
                              </a>
                            </>
                          ) : (
                            <div style={{ color: "var(--text-muted)" }}>
                              내 답: {a.userAnswer || "미응답"} / 정답: {a.correctAnswer}
                              <br />원본 문제가 저장되지 않았습니다.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* --- Bookmarks --- */}
      {tab === "bookmarks" && (
        <>
          {bookmarks.length === 0 ? (
            <EmptyState icon="&#9734;" text="북마크가 없습니다" sub="문제 풀이 후 ★ 버튼으로 북마크하세요." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {bookmarks.map((q) => {
                const isExp = expanded === q.id;
                return (
                  <div key={q.id} className="card-sm" style={{ border: "1px solid var(--border)" }}>
                    <div className="flex-between" style={{ cursor: "pointer" }} onClick={() => setExpanded(isExp ? null : q.id)}>
                      <div className="flex-gap" style={{ flexWrap: "wrap" }}>
                        <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>{q.subject}</span>
                        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{q.topic}</span>
                        <span style={{ fontSize: "12px", color: "var(--text-light)" }}>
                          {"★".repeat(q.difficulty)}
                        </span>
                      </div>
                      <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); handleRemoveBookmark(q.id); }}>
                        삭제
                      </button>
                    </div>

                    {isExp && (
                      <div style={{ marginTop: "12px", fontSize: "13px", lineHeight: "1.7" }}>
                        <div style={{ background: "var(--bg)", borderRadius: "8px", padding: "12px", marginBottom: "8px", whiteSpace: "pre-wrap" }}>
                          {q.body}
                        </div>
                        {q.choices && (
                          <div style={{ marginBottom: "8px" }}>
                            {q.choices.map((c) => (
                              <div key={c.number} style={{
                                padding: "4px 0",
                                fontWeight: c.number === q.answer ? 700 : 400,
                                color: c.number === q.answer ? "var(--green)" : "var(--text)",
                              }}>
                                {c.number}. {c.text} {c.number === q.answer && " ✓"}
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ background: "#fffbeb", padding: "12px", borderRadius: "8px", border: "1px solid #fde68a", whiteSpace: "pre-wrap" }}>
                          {q.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ fontSize: "40px", marginBottom: "12px" }} dangerouslySetInnerHTML={{ __html: icon }} />
      <div style={{ fontSize: "18px", fontWeight: 600 }}>{text}</div>
      <div style={{ color: "var(--text-muted)", marginTop: "6px", fontSize: "14px" }}>{sub}</div>
    </div>
  );
}
