"use client";

import { useState, useEffect } from "react";
import "./globals.css";
import { getWrongAttempts } from "@/lib/storage";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    setWrongCount(getWrongAttempts().length);
  }, []);

  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>세무사 시험 AI 문제풀이</title>
        <meta name="description" content="세무사 1·2차 시험 대비 무한 AI 문제 생성" />
      </head>
      <body>
        <nav className="nav">
          <a href="/" className="nav-brand">세무사 AI</a>
          <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? "\u2715" : "\u2630"}
          </button>
          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="/" className="nav-link" onClick={() => setMenuOpen(false)}>홈</a>
            <a href="/quiz" className="nav-link" onClick={() => setMenuOpen(false)}>문제풀기</a>
            <a href="/exam" className="nav-link" onClick={() => setMenuOpen(false)}>모의고사</a>
            <a href="/review" className="nav-link" onClick={() => setMenuOpen(false)}>
              오답노트
              {wrongCount > 0 && <span className="nav-badge">{wrongCount > 99 ? "99+" : wrongCount}</span>}
            </a>
            <a href="/history" className="nav-link" onClick={() => setMenuOpen(false)}>학습기록</a>
            <a href="/pricing" className="nav-link" onClick={() => setMenuOpen(false)} style={{ color: "#fbbf24" }}>Pro</a>
          </div>
        </nav>
        <main className="main">
          {children}
        </main>
      </body>
    </html>
  );
}
