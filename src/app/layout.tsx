"use client";

import { useState, useEffect } from "react";
import "./globals.css";
import { getWrongAttempts, getCoins } from "@/lib/storage";

interface UserInfo { id: string; email: string; name: string; }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [coinCount, setCoinCount] = useState(0);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    setWrongCount(getWrongAttempts().length);
    setCoinCount(getCoins());
    fetch("/api/auth/me").then((r) => r.json()).then((d) => { if (d.user) setUser(d.user); }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>세무사 시험 AI 문제풀이</title>
        <meta name="description" content="세무사 1·2차 시험 대비 무한 AI 문제 생성" />
      </head>
      <body suppressHydrationWarning>
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
            <a href="/support" className="nav-link" onClick={() => setMenuOpen(false)}>문의</a>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: 700 }}>
              {coinCount.toLocaleString()} coin
            </span>
            {user ? (
              <>
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>{user.name}</span>
                <button onClick={handleLogout}
                  style={{ background: "none", border: "1px solid #475569", color: "#94a3b8", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                  로그아웃
                </button>
              </>
            ) : (
              <a href="/login" style={{ color: "#fff", fontSize: "13px", background: "var(--blue)", padding: "5px 14px", borderRadius: "6px", fontWeight: 600 }}>
                로그인
              </a>
            )}
          </div>
        </nav>
        <main className="main">
          {children}
        </main>
        <footer style={{
          borderTop: "1px solid var(--border)",
          padding: "20px 24px",
          marginTop: "40px",
          fontSize: "12px",
          color: "var(--text-light)",
          textAlign: "center",
          lineHeight: "2",
        }}>
          <div style={{ marginBottom: "8px" }}>
            <a href="/info/about" style={{ marginRight: "16px" }}>회사소개</a>
            <a href="/info/terms" style={{ marginRight: "16px" }}>이용약관</a>
            <a href="/info/privacy" style={{ marginRight: "16px" }}>개인정보처리방침</a>
            <a href="/support">문의하기</a>
          </div>
          <div>
            본 서비스는 AI가 생성한 학습 보조 자료이며, 세무사 시험 출제기관과 무관합니다.
          </div>
          <div style={{ marginTop: "4px" }}>
            &copy; 2025 세무사AI. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
