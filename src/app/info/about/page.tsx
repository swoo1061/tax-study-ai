export default function AboutPage() {
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "24px" }}>회사 소개</h1>

      <div className="card" style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>세무사AI</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.8" }}>
          세무사AI는 AI 기술을 활용하여 세무사 시험 수험생에게 무한 문제 생성, 실전 모의고사, 취약점 분석 서비스를 제공합니다. 누구나 부담 없이 양질의 학습 콘텐츠에 접근할 수 있도록 합니다.
        </p>
      </div>

      <div className="card" style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>사업자 정보</h2>
        <table style={{ fontSize: "14px", lineHeight: "2" }}>
          <tbody>
            <InfoRow label="상호" value="[상호명]" />
            <InfoRow label="대표자" value="[대표자명]" />
            <InfoRow label="사업자등록번호" value="[000-00-00000]" />
            <InfoRow label="통신판매업신고" value="[제0000-서울OO-0000호]" />
            <InfoRow label="소재지" value="[주소]" />
            <InfoRow label="이메일" value="[이메일]" />
            <InfoRow label="전화" value="[전화번호]" />
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>서비스 안내</h2>
        <ul style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "2", paddingLeft: "20px" }}>
          <li>AI 기반 세무사 1·2차 시험 문제 무한 생성</li>
          <li>8개 과목 실전 모의고사 (전체 응시자 성적 분포 제공)</li>
          <li>오답노트, 북마크, 취약점 분석</li>
          <li>일일 무료 5문제 + 유료 이용권</li>
        </ul>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ fontWeight: 600, paddingRight: "20px", color: "var(--text)" }}>{label}</td>
      <td style={{ color: "var(--text-muted)" }}>{value}</td>
    </tr>
  );
}
