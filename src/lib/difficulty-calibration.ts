/**
 * 난이도 캘리브레이션
 * - 실제 기출문제 패턴을 few-shot 예시로 제공
 * - 난이도별 기준점을 명확히 제시
 */

export interface DifficultyExample {
  level: number;
  description: string;
  example: string;
}

const DIFFICULTY_SCALE: Record<string, DifficultyExample[]> = {
  "세법": [
    {
      level: 1,
      description: "단순 개념 확인. 법조문 그대로 묻는 수준",
      example: "국세기본법상 국세의 우선권에 대한 설명으로 옳은 것은? → 단순 조문 지식",
    },
    {
      level: 2,
      description: "개념 적용. 간단한 사례에 조문 적용",
      example: "거주자 甲이 2024년 이자소득 1,500만원만 있을 때 종합과세 여부 → 2,000만원 기준 단순 적용",
    },
    {
      level: 3,
      description: "복합 적용. 2~3개 조문을 결합하거나 중간 수준 계산",
      example: "부동산 임대소득이 있는 거주자의 종합소득세 계산 (필요경비율, 기본공제, 세율 적용) → 3단계 계산",
    },
    {
      level: 4,
      description: "심화 분석. 복잡한 사례에 여러 조문을 적용하고 예외규정 고려",
      example: "법인의 부당행위계산부인 해당 여부 판단 + 시가와 거래가액의 차이 계산 + 소득금액 조정 → 다단계 분석+계산",
    },
    {
      level: 5,
      description: "최고난이도. 복합 세무조정, 연결납세, 국제조세 등 다수 규정이 얽힌 종합 문제",
      example: "내국법인의 해외 자회사 배당소득에 대한 이중과세 조정 (외국납부세액공제 + 간접외국납부세액 + 조세조약 적용) → 4개 이상 규정 종합 적용",
    },
  ],
  "회계": [
    {
      level: 1,
      description: "기본 개념/정의 확인",
      example: "자산의 정의를 서술하시오 → 개념체계 그대로",
    },
    {
      level: 2,
      description: "단순 분개/계산",
      example: "상품 100만원을 외상매입한 경우 분개 → 1단계 분개",
    },
    {
      level: 3,
      description: "복합 분개 + 중간 계산",
      example: "사채 발행(할인발행) 시 유효이자율법 적용 2년차 이자비용 계산 → 여러 단계 계산",
    },
    {
      level: 4,
      description: "복잡한 기준서 적용 + 판단 필요",
      example: "금융자산 분류(SPPI 테스트 + 사업모델 판단) + 기대신용손실 측정 → 기준서 심화 적용",
    },
    {
      level: 5,
      description: "종합 문제. 연결, 합병, 복합금융상품 등",
      example: "연결재무제표 작성 시 내부거래 제거 + 미실현이익 조정 + 비지배지분 계산 + 영업권 손상검사 → 4개 이상 기준서 종합",
    },
  ],
  "법학": [
    {
      level: 1,
      description: "조문 내용 직접 확인",
      example: "민법상 성년의 나이는? → 19세",
    },
    {
      level: 2,
      description: "기본 사례에 조문 적용",
      example: "미성년자 甲이 법정대리인 동의 없이 한 매매계약의 효력 → 취소 가능",
    },
    {
      level: 3,
      description: "복합 사례 분석",
      example: "이중매매에서 소유권 귀속 판단 → 물권변동+채권법 복합",
    },
    {
      level: 4,
      description: "판례 수준의 쟁점 분석",
      example: "표현대리 성립요건 + 상대방 과실 판단 + 본인의 책임 범위",
    },
    {
      level: 5,
      description: "복합 법률관계 종합 분석",
      example: "법인격부인론 적용 가능성 + 이사의 제3자에 대한 책임 + 주주대표소송 요건 종합 검토",
    },
  ],
};

/**
 * 과목과 난이도에 맞는 캘리브레이션 지시문 반환
 */
export function getDifficultyGuide(subject: string, difficulty: number): string {
  let category = "세법";
  if (subject.includes("회계")) category = "회계";
  else if (subject.includes("상법") || subject.includes("민법") || subject.includes("행정")) category = "법학";

  const scale = DIFFICULTY_SCALE[category];
  const target = scale.find(s => s.level === difficulty) || scale[2];

  // 인접 난이도도 보여줘서 상대적 위치 이해
  const lower = scale.find(s => s.level === Math.max(1, difficulty - 1));
  const higher = scale.find(s => s.level === Math.min(5, difficulty + 1));

  return `
## 난이도 기준 (반드시 준수)
현재 요청 난이도: ${difficulty}/5

[난이도 ${Math.max(1, difficulty - 1)}] ${lower?.description}
  예: ${lower?.example}

→ [난이도 ${difficulty}] **${target.description}**
  예: ${target.example}

[난이도 ${Math.min(5, difficulty + 1)}] ${higher?.description}
  예: ${higher?.example}

**중요**: 난이도 ${difficulty}에 정확히 맞추세요. 너무 쉽거나 너무 어려우면 안 됩니다.
${difficulty >= 4 ? "이 난이도에서는 반드시 2개 이상의 법조문/기준서를 복합적으로 적용하는 문제를 출제하세요." : ""}
${difficulty <= 2 ? "이 난이도에서는 기본 개념이나 단순 적용 문제를 출제하세요. 지나치게 복잡한 계산은 피하세요." : ""}`;
}
