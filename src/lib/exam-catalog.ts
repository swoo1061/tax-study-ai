export interface ExamMeta {
  id: string;
  title: string;
  session: "1차" | "2차";
  subjectCode: string;
  subjectName: string;
  questionCount: number;
  timeLimitMinutes: number;
  description: string;
  round: number; // 회차
}

export const EXAM_CATALOG: ExamMeta[] = [
  // 1차 시험 (객관식 20문제)
  {
    id: "1st-finance-r1",
    title: "재정학 제1회 모의고사",
    session: "1차",
    subjectCode: "finance",
    subjectName: "재정학",
    questionCount: 20,
    timeLimitMinutes: 50,
    description: "시장실패, 공공재, 조세이론, 재정정책 전 범위",
    round: 1,
  },
  {
    id: "1st-tax-intro-r1",
    title: "세법학개론 제1회 모의고사",
    session: "1차",
    subjectCode: "tax-intro",
    subjectName: "세법학개론",
    questionCount: 20,
    timeLimitMinutes: 50,
    description: "국세기본법, 소득세, 법인세, 부가가치세 기초 전 범위",
    round: 1,
  },
  {
    id: "1st-accounting-intro-r1",
    title: "회계학개론 제1회 모의고사",
    session: "1차",
    subjectCode: "accounting-intro",
    subjectName: "회계학개론",
    questionCount: 20,
    timeLimitMinutes: 50,
    description: "재무회계 기본개념, 자산·부채·자본, 원가회계 기초",
    round: 1,
  },
  {
    id: "1st-law-intro-r1",
    title: "상법·민법·행정소송법 제1회 모의고사",
    session: "1차",
    subjectCode: "law-intro",
    subjectName: "상법·민법·행정소송법",
    questionCount: 20,
    timeLimitMinutes: 50,
    description: "민법총칙, 물권·채권, 회사법, 행정소송법 전 범위",
    round: 1,
  },
  // 2차 시험 (주관식 5문제)
  {
    id: "2nd-tax-law-1-r1",
    title: "세법학 1부 제1회 모의고사",
    session: "2차",
    subjectCode: "tax-law-1",
    subjectName: "세법학 1부",
    questionCount: 5,
    timeLimitMinutes: 90,
    description: "소득세, 법인세, 상속·증여세 심화 서술형",
    round: 1,
  },
  {
    id: "2nd-tax-law-2-r1",
    title: "세법학 2부 제1회 모의고사",
    session: "2차",
    subjectCode: "tax-law-2",
    subjectName: "세법학 2부",
    questionCount: 5,
    timeLimitMinutes: 90,
    description: "부가가치세, 지방세, 국제조세 심화 서술형",
    round: 1,
  },
  {
    id: "2nd-accounting-1-r1",
    title: "회계학 1부 제1회 모의고사",
    session: "2차",
    subjectCode: "accounting-1",
    subjectName: "회계학 1부 (재무회계)",
    questionCount: 5,
    timeLimitMinutes: 90,
    description: "금융상품, 리스, 연결재무제표, 수익인식 심화",
    round: 1,
  },
  {
    id: "2nd-accounting-2-r1",
    title: "회계학 2부 제1회 모의고사",
    session: "2차",
    subjectCode: "accounting-2",
    subjectName: "회계학 2부 (원가관리회계)",
    questionCount: 5,
    timeLimitMinutes: 90,
    description: "종합원가, 표준원가, CVP분석, 의사결정 심화",
    round: 1,
  },
];

export function getExamById(id: string): ExamMeta | undefined {
  return EXAM_CATALOG.find((e) => e.id === id);
}
