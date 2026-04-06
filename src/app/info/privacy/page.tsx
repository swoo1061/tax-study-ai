export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", fontSize: "14px", lineHeight: "1.8" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "24px" }}>개인정보 처리방침</h1>

      <Section title="1. 수집하는 개인정보 항목">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginTop: "8px" }}>
          <thead>
            <tr style={{ background: "var(--border-light)" }}>
              <th style={thStyle}>구분</th>
              <th style={thStyle}>수집 항목</th>
              <th style={thStyle}>수집 방법</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>회원가입</td><td style={tdStyle}>이메일, 이름, 비밀번호(암호화)</td><td style={tdStyle}>직접 입력</td></tr>
            <tr><td style={tdStyle}>카카오 로그인</td><td style={tdStyle}>카카오 계정 식별자, 닉네임</td><td style={tdStyle}>카카오 API</td></tr>
            <tr><td style={tdStyle}>서비스 이용</td><td style={tdStyle}>학습 기록, 풀이 내역, 성적</td><td style={tdStyle}>자동 수집</td></tr>
            <tr><td style={tdStyle}>결제</td><td style={tdStyle}>결제 수단 정보(PG사 처리, 당사 미보관)</td><td style={tdStyle}>PG사 연동</td></tr>
            <tr><td style={tdStyle}>문의</td><td style={tdStyle}>문의 내용, 이메일</td><td style={tdStyle}>직접 입력</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="2. 개인정보 이용 목적">
        <ul>
          <li>회원 식별 및 서비스 제공</li>
          <li>학습 기록 관리 및 분석 (취약점 분석, 성적 분포)</li>
          <li>결제 처리 및 환불</li>
          <li>고객 문의 응대</li>
          <li>서비스 개선 및 통계 분석 (비식별 처리)</li>
        </ul>
      </Section>

      <Section title="3. 개인정보 보유 및 이용 기간">
        <ul>
          <li><strong>회원 탈퇴 시</strong>: 즉시 파기 (단, 법령에 따른 보존 의무 있는 경우 해당 기간 보존)</li>
          <li><strong>결제 기록</strong>: 전자상거래법에 따라 5년 보존</li>
          <li><strong>접속 로그</strong>: 통신비밀보호법에 따라 3개월 보존</li>
        </ul>
      </Section>

      <Section title="4. 개인정보 제3자 제공">
        당사는 회원의 개인정보를 제3자에게 제공하지 않습니다. 다만, 아래의 경우 예외로 합니다.
        <ul>
          <li>회원의 사전 동의가 있는 경우</li>
          <li>법령에 의해 요구되는 경우</li>
          <li>결제 처리를 위한 PG사 전달 (결제 정보에 한함)</li>
        </ul>
      </Section>

      <Section title="5. 개인정보의 파기">
        보유 기간 경과 또는 처리 목적 달성 시, 전자적 파일은 복구 불가능한 방법으로 삭제하며, 종이 문서는 파쇄합니다.
      </Section>

      <Section title="6. 회원의 권리">
        회원은 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제, 처리 정지를 요청할 수 있습니다. 요청은 문의하기를 통해 접수하며, 영업일 기준 3일 이내 처리합니다.
      </Section>

      <Section title="7. 개인정보 보호 조치">
        <ul>
          <li>비밀번호 암호화 저장 (bcrypt)</li>
          <li>HTTPS 통신 암호화</li>
          <li>접근 권한 최소화</li>
          <li>결제 정보는 PG사에서 처리하며 당사 서버에 저장하지 않음</li>
        </ul>
      </Section>

      <Section title="8. AI 서비스 관련">
        <ul>
          <li>문제 생성 시 AI(Claude API)에 전달되는 정보: 과목명, 주제명, 난이도 (개인정보 미포함)</li>
          <li>회원의 이름, 이메일 등 개인정보는 AI에 전달되지 않습니다</li>
        </ul>
      </Section>

      <Section title="9. 개인정보 보호책임자">
        <ul>
          <li>책임자: [대표자명]</li>
          <li>이메일: [이메일]</li>
          <li>전화: [전화번호]</li>
        </ul>
        개인정보 침해 신고: 개인정보침해신고센터 (privacy.kisa.or.kr / 118)
      </Section>

      <p style={{ marginTop: "30px", color: "var(--text-light)", fontSize: "13px" }}>
        시행일: 2025년 4월 7일
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "8px" }}>{title}</h2>
      <div style={{ color: "var(--text-muted)" }}>{children}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "8px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "8px", borderBottom: "1px solid var(--border-light)" };
