export default function TermsPage() {
  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", fontSize: "14px", lineHeight: "1.8" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "24px" }}>이용약관</h1>

      <Section title="제1조 (목적)">
        본 약관은 세무사AI(이하 &quot;서비스&quot;)가 제공하는 AI 기반 세무사 시험 학습 서비스의 이용과 관련하여, 서비스와 이용자(이하 &quot;회원&quot;) 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
      </Section>

      <Section title="제2조 (서비스의 내용)">
        <ol>
          <li>AI 기반 세무사 시험 대비 문제 생성 및 풀이</li>
          <li>모의고사 제공 및 성적 분포 분석</li>
          <li>학습 기록 및 취약점 분석</li>
          <li>오답노트 및 북마크 기능</li>
        </ol>
        본 서비스는 학습 보조 도구이며, 세무사 시험 합격을 보장하지 않습니다.
      </Section>

      <Section title="제3조 (AI 생성 콘텐츠 면책)">
        <ol>
          <li>본 서비스의 문제, 해설, 모범답안은 AI(인공지능)가 자동으로 생성한 콘텐츠입니다.</li>
          <li>AI 생성 콘텐츠는 <strong>정확성을 보장하지 않으며</strong>, 오류가 포함될 수 있습니다.</li>
          <li>본 서비스는 세무 상담, 법률 자문, 회계 감사를 대체하지 않습니다.</li>
          <li>AI가 제공한 세법 해석, 세율, 계산 결과를 실무에 적용하여 발생한 손해에 대해 서비스는 책임지지 않습니다.</li>
          <li>본 서비스는 세무사 시험 출제기관(Q-Net, 한국산업인력공단)과 아무런 관련이 없습니다.</li>
        </ol>
      </Section>

      <Section title="제4조 (회원가입 및 계정)">
        <ol>
          <li>회원가입은 이메일 또는 소셜 로그인(카카오)을 통해 가능합니다.</li>
          <li>회원은 정확한 정보를 제공해야 하며, 타인의 정보를 도용할 수 없습니다.</li>
          <li>계정의 관리 책임은 회원에게 있으며, 제3자에게 양도할 수 없습니다.</li>
        </ol>
      </Section>

      <Section title="제5조 (결제 및 요금)">
        <ol>
          <li>무료 서비스: 하루 5문제 무료 제공</li>
          <li>유료 서비스: 건당 결제 또는 이용권 구매를 통해 이용 가능</li>
          <li>결제는 카카오페이, 신용/체크카드 등 PG사가 제공하는 수단을 통해 처리됩니다.</li>
          <li>모든 가격은 부가가치세(VAT) 포함 가격입니다.</li>
        </ol>
      </Section>

      <Section title="제6조 (청약철회 및 환불)">
        <ol>
          <li><strong>열람 전</strong>: 결제일로부터 7일 이내 전액 환불 가능</li>
          <li><strong>열람 후</strong>: 디지털 콘텐츠의 특성상 청약철회가 제한됩니다 (전자상거래법 제17조 제2항 제5호)</li>
          <li><strong>서비스 오류</strong>: AI 문제 오류 또는 서비스 장애로 인한 경우, 해당 이용횟수 복원 또는 환불 처리</li>
          <li><strong>중복 결제</strong>: 확인 즉시 전액 환불</li>
          <li>환불 요청은 문의하기를 통해 접수하며, 영업일 기준 3일 이내 처리합니다.</li>
        </ol>
        <p style={{ marginTop: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
          ※ 유료 콘텐츠 결제 시 &quot;열람 후 청약철회가 제한됩니다&quot;라는 안내에 동의하셔야 합니다.
        </p>
      </Section>

      <Section title="제7조 (서비스 중단 및 변경)">
        서비스는 시스템 점검, 장애 복구, 기타 불가항력적 사유로 인해 일시적으로 중단될 수 있으며, 사전 공지 후 서비스 내용을 변경할 수 있습니다.
      </Section>

      <Section title="제8조 (저작권)">
        <ol>
          <li>서비스가 생성한 AI 문제, 해설, 모범답안의 저작권은 서비스에 귀속됩니다.</li>
          <li>회원은 개인 학습 목적으로만 콘텐츠를 이용할 수 있으며, 상업적 이용, 재배포, 무단 복제를 금지합니다.</li>
        </ol>
      </Section>

      <Section title="제9조 (면책)">
        <ol>
          <li>서비스는 AI 생성 콘텐츠의 정확성, 완전성, 최신성을 보증하지 않습니다.</li>
          <li>회원이 서비스를 통해 얻은 정보를 실무에 적용하여 발생한 손해에 대해 서비스는 책임지지 않습니다.</li>
          <li>서비스는 천재지변, 전쟁, 시스템 장애 등 불가항력에 의한 서비스 중단에 대해 책임지지 않습니다.</li>
        </ol>
      </Section>

      <Section title="제10조 (분쟁 해결)">
        본 약관과 관련된 분쟁은 대한민국 법률에 따르며, 서비스 소재지 관할 법원을 전속 관할로 합니다.
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
