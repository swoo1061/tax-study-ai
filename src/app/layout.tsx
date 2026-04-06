import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "세무사 시험 AI 문제풀이",
  description: "세무사 1·2차 시험 대비 무한 AI 문제 생성",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif", background: "#f5f5f5", color: "#1a1a1a" }}>
        <nav style={{
          background: "#1e293b",
          color: "#fff",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
          fontSize: "14px",
        }}>
          <a href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "18px" }}>
            세무사 AI 문제풀이
          </a>
          <a href="/" style={{ color: "#94a3b8", textDecoration: "none" }}>홈</a>
          <a href="/quiz" style={{ color: "#94a3b8", textDecoration: "none" }}>문제풀기</a>
          <a href="/history" style={{ color: "#94a3b8", textDecoration: "none" }}>학습기록</a>
        </nav>
        <main style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
