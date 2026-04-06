"use client";

import { useState } from "react";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { email, name, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      window.location.href = "/";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "40px auto" }}>
      <h1 style={{ fontSize: "24px", textAlign: "center", marginBottom: "24px" }}>
        {mode === "login" ? "로그인" : "회원가입"}
      </h1>

      <form onSubmit={handleSubmit} className="card" style={{ padding: "24px" }}>
        {mode === "register" && (
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>이름</label>
            <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="홍길동" required />
          </div>
        )}

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>이메일</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com" required />
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>비밀번호</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "register" ? "6자 이상" : "비밀번호"} required minLength={6} />
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "14px" }}>
            {error}
          </div>
        )}

        <button className="btn btn-blue btn-full" type="submit" disabled={loading}
          style={{ padding: "12px", fontSize: "15px" }}>
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "가입하기"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: "16px", fontSize: "14px", color: "var(--text-muted)" }}>
        {mode === "login" ? (
          <>계정이 없으신가요? <button onClick={() => { setMode("register"); setError(""); }}
            style={{ color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            회원가입</button></>
        ) : (
          <>이미 계정이 있으신가요? <button onClick={() => { setMode("login"); setError(""); }}
            style={{ color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            로그인</button></>
        )}
      </div>

      {/* Kakao placeholder */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <div style={{ fontSize: "12px", color: "var(--text-light)", marginBottom: "10px" }}>또는</div>
        <button className="btn btn-full" disabled
          style={{ background: "#FEE500", color: "#191919", opacity: 0.5, fontSize: "14px", padding: "10px" }}>
          카카오로 시작하기 (준비 중)
        </button>
      </div>
    </div>
  );
}
