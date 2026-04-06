/**
 * 품질 테스트: 8과목 × 50문제 = 400문제 생성 후 분석
 * 실행: npx tsx scripts/quality-test.ts
 */

const API_URL = "http://localhost:3000/api/generate";

const SUBJECTS = [
  { name: "재정학", session: "1차", topics: ["시장실패와 정부개입","공공재","외부성","조세의 기초이론","조세의 전가와 귀착","조세와 효율성","소득세","법인세","소비세","재산세","조세행정","재정정책","공채론","지방재정","예산제도","비용편익분석","공공선택이론","소득분배와 재분배"] },
  { name: "세법학개론", session: "1차", topics: ["국세기본법","소득세법 기초","법인세법 기초","부가가치세법 기초","상속세 및 증여세법 기초","개별소비세법","지방세법 기초","조세특례제한법","국세징수법","조세범처벌법"] },
  { name: "회계학개론", session: "1차", topics: ["재무회계 기본개념","재무제표","현금및수취채권","재고자산","유형자산","무형자산","금융자산","부채","자본","수익인식","원가회계 기초","원가배분","표준원가","CVP분석"] },
  { name: "상법·민법·행정소송법", session: "1차", topics: ["민법총칙","물권법","채권법","상법총칙","회사법","어음수표법","행정소송법 기초","행정심판법"] },
  { name: "세법학 1부", session: "2차", topics: ["국세기본법 심화","소득세 — 종합소득","소득세 — 퇴직소득","소득세 — 양도소득","법인세 — 익금과 손금","법인세 — 세무조정","상속세 — 과세가액 계산","증여세 — 증여재산 평가"] },
  { name: "세법학 2부", session: "2차", topics: ["부가가치세 — 과세거래","부가가치세 — 영세율과 면세","부가가치세 — 매입세액 공제","부가가치세 — 간이과세","지방세 — 취득세","지방세 — 재산세","조세특례제한법 심화","국제조세조정에 관한 법률"] },
  { name: "회계학 1부 (재무회계)", session: "2차", topics: ["금융상품 (KIFRS 1109)","유형자산과 투자부동산","충당부채와 우발부채","수익인식 (KIFRS 1115)","리스 (KIFRS 1116)","법인세회계","연결재무제표","현금흐름표"] },
  { name: "회계학 2부 (원가관리회계)", session: "2차", topics: ["개별원가계산","종합원가계산","활동기준원가계산","표준원가계산과 차이분석","변동원가계산","CVP분석","관련원가와 의사결정","종합예산"] },
];

const QUESTIONS_PER_SUBJECT = 50;

interface Question {
  id: string;
  subject: string;
  topic: string;
  difficulty: number;
  session: string;
  type: string;
  body: string;
  choices?: { number: number; text: string }[];
  answer: number | string;
  explanation: string;
}

interface QualityIssue {
  questionIdx: number;
  subject: string;
  topic: string;
  issue: string;
  severity: "low" | "medium" | "high";
}

async function generateQuestion(subject: string, topic: string, session: string, difficulty: number): Promise<Question | null> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, topic, session, difficulty }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function analyzeQuestion(q: Question, allQuestions: Question[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // 1. 본문 길이 체크
  if (q.body.length < 30) {
    issues.push({ questionIdx: 0, subject: q.subject, topic: q.topic, issue: `본문 너무 짧음 (${q.body.length}자)`, severity: "high" });
  }

  // 2. 해설 길이
  if (q.explanation.length < 50) {
    issues.push({ questionIdx: 0, subject: q.subject, topic: q.topic, issue: `해설 너무 짧음 (${q.explanation.length}자)`, severity: "medium" });
  }

  // 3. 객관식: 선택지 수 체크
  if (q.type === "객관식") {
    if (!q.choices || q.choices.length !== 5) {
      issues.push({ questionIdx: 0, subject: q.subject, topic: q.topic, issue: `선택지 ${q.choices?.length || 0}개 (5개여야 함)`, severity: "high" });
    }
    if (typeof q.answer !== "number" || q.answer < 1 || q.answer > 5) {
      issues.push({ questionIdx: 0, subject: q.subject, topic: q.topic, issue: `정답 번호 이상: ${q.answer}`, severity: "high" });
    }
    // 선택지 중복
    if (q.choices) {
      const texts = q.choices.map(c => c.text.trim().toLowerCase());
      const unique = new Set(texts);
      if (unique.size < texts.length) {
        issues.push({ questionIdx: 0, subject: q.subject, topic: q.topic, issue: "선택지 중복 존재", severity: "high" });
      }
    }
  }

  // 4. 주관식: 모범답안 있는지
  if (q.type === "주관식") {
    if (typeof q.answer !== "string" || q.answer.length < 20) {
      issues.push({ questionIdx: 0, subject: q.subject, topic: q.topic, issue: `모범답안 너무 짧음 (${String(q.answer).length}자)`, severity: "medium" });
    }
  }

  // 5. 중복 체크 (본문 유사도 - 간단한 jaccard)
  for (const other of allQuestions) {
    if (other.id === q.id) continue;
    if (other.subject !== q.subject) continue;
    const sim = jaccardSimilarity(q.body, other.body);
    if (sim > 0.6) {
      issues.push({ questionIdx: 0, subject: q.subject, topic: q.topic, issue: `높은 유사도 (${(sim * 100).toFixed(0)}%) - 다른 문제와 중복 의심`, severity: "high" });
      break; // 한 번만 보고
    }
  }

  return issues;
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.replace(/[^가-힣a-zA-Z0-9]/g, " ").split(/\s+/).filter(w => w.length > 1));
  const wordsB = new Set(b.replace(/[^가-힣a-zA-Z0-9]/g, " ").split(/\s+/).filter(w => w.length > 1));
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

async function main() {
  console.log("=== 품질 테스트 시작 ===");
  console.log(`목표: ${SUBJECTS.length}과목 × ${QUESTIONS_PER_SUBJECT}문제 = ${SUBJECTS.length * QUESTIONS_PER_SUBJECT}문제\n`);

  const allQuestions: Question[] = [];
  const allIssues: QualityIssue[] = [];
  let failCount = 0;
  const subjectStats: Record<string, { total: number; failed: number; avgBodyLen: number; avgExplLen: number; difficulties: number[]; bodyLens: number[] }> = {};

  for (const sub of SUBJECTS) {
    console.log(`\n--- ${sub.name} (${sub.session}) ---`);
    const stats = { total: 0, failed: 0, avgBodyLen: 0, avgExplLen: 0, difficulties: [] as number[], bodyLens: [] as number[] };

    for (let i = 0; i < QUESTIONS_PER_SUBJECT; i++) {
      const topic = sub.topics[i % sub.topics.length];
      const difficulty = (i % 5) + 1; // 1~5 순환

      const q = await generateQuestion(sub.name, topic, sub.session, difficulty);
      stats.total++;

      if (!q) {
        stats.failed++;
        failCount++;
        console.log(`  [${i + 1}/${QUESTIONS_PER_SUBJECT}] FAIL - ${topic}`);
        continue;
      }

      if (!q.body || !q.explanation) {
        stats.failed++;
        failCount++;
        console.log(`  [${i + 1}/${QUESTIONS_PER_SUBJECT}] FAIL - 빈 응답`);
        continue;
      }

      allQuestions.push(q);
      stats.difficulties.push(q.difficulty);
      stats.bodyLens.push(q.body.length);
      stats.avgBodyLen += q.body.length;
      stats.avgExplLen += q.explanation.length;

      if ((i + 1) % 10 === 0) {
        console.log(`  [${i + 1}/${QUESTIONS_PER_SUBJECT}] 완료 (본문 ${q.body.length}자, 해설 ${q.explanation.length}자)`);
      }
    }

    const generated = stats.total - stats.failed;
    if (generated > 0) {
      stats.avgBodyLen = Math.round(stats.avgBodyLen / generated);
      stats.avgExplLen = Math.round(stats.avgExplLen / generated);
    }
    subjectStats[sub.name] = stats;
  }

  // 분석
  console.log("\n\n========== 품질 분석 결과 ==========\n");

  // 전체 통계
  console.log(`[전체 통계]`);
  console.log(`  생성 성공: ${allQuestions.length}/${SUBJECTS.length * QUESTIONS_PER_SUBJECT}`);
  console.log(`  생성 실패: ${failCount}`);
  console.log(`  성공률: ${((allQuestions.length / (SUBJECTS.length * QUESTIONS_PER_SUBJECT)) * 100).toFixed(1)}%\n`);

  // 과목별 통계
  console.log(`[과목별 통계]`);
  for (const [name, s] of Object.entries(subjectStats)) {
    const gen = s.total - s.failed;
    console.log(`  ${name}: ${gen}/${s.total} 성공, 평균 본문 ${s.avgBodyLen}자, 해설 ${s.avgExplLen}자`);
  }

  // 난이도 분포
  console.log(`\n[난이도 분포]`);
  for (let d = 1; d <= 5; d++) {
    const count = allQuestions.filter(q => q.difficulty === d).length;
    console.log(`  난이도 ${d}: ${count}문제 (${((count / allQuestions.length) * 100).toFixed(1)}%)`);
  }

  // 본문 길이 분포
  const bodyLens = allQuestions.map(q => q.body.length);
  console.log(`\n[본문 길이]`);
  console.log(`  최소: ${Math.min(...bodyLens)}자`);
  console.log(`  최대: ${Math.max(...bodyLens)}자`);
  console.log(`  평균: ${Math.round(bodyLens.reduce((a, b) => a + b, 0) / bodyLens.length)}자`);

  // 해설 길이 분포
  const explLens = allQuestions.map(q => q.explanation.length);
  console.log(`\n[해설 길이]`);
  console.log(`  최소: ${Math.min(...explLens)}자`);
  console.log(`  최대: ${Math.max(...explLens)}자`);
  console.log(`  평균: ${Math.round(explLens.reduce((a, b) => a + b, 0) / explLens.length)}자`);

  // 유형별
  const obj = allQuestions.filter(q => q.type === "객관식");
  const sub = allQuestions.filter(q => q.type === "주관식");
  console.log(`\n[유형별]`);
  console.log(`  객관식: ${obj.length}문제`);
  console.log(`  주관식: ${sub.length}문제`);

  // 품질 이슈 분석
  console.log(`\n[품질 이슈 분석]`);
  for (const q of allQuestions) {
    const issues = analyzeQuestion(q, allQuestions);
    for (const issue of issues) {
      issue.questionIdx = allQuestions.indexOf(q);
      allIssues.push(issue);
    }
  }

  const highIssues = allIssues.filter(i => i.severity === "high");
  const medIssues = allIssues.filter(i => i.severity === "medium");
  const lowIssues = allIssues.filter(i => i.severity === "low");

  console.log(`  심각(high): ${highIssues.length}건`);
  console.log(`  보통(medium): ${medIssues.length}건`);
  console.log(`  경미(low): ${lowIssues.length}건`);
  console.log(`  이슈 비율: ${((allIssues.length / allQuestions.length) * 100).toFixed(1)}% (${allIssues.length}/${allQuestions.length})`);

  if (highIssues.length > 0) {
    console.log(`\n  [심각 이슈 목록]`);
    for (const issue of highIssues.slice(0, 20)) {
      console.log(`    - [${issue.subject}/${issue.topic}] ${issue.issue}`);
    }
    if (highIssues.length > 20) console.log(`    ... 외 ${highIssues.length - 20}건`);
  }

  // 중복 분석 (과목별)
  console.log(`\n[중복 분석 (과목별)]`);
  for (const subj of SUBJECTS) {
    const qs = allQuestions.filter(q => q.subject === subj.name);
    let dupPairs = 0;
    for (let i = 0; i < qs.length; i++) {
      for (let j = i + 1; j < qs.length; j++) {
        if (jaccardSimilarity(qs[i].body, qs[j].body) > 0.5) dupPairs++;
      }
    }
    console.log(`  ${subj.name}: ${dupPairs}쌍 유사 (50% 이상)`);
  }

  // 최종 판정
  console.log(`\n\n========== 최종 판정 ==========`);
  const issueRate = allIssues.length / allQuestions.length;
  const highRate = highIssues.length / allQuestions.length;
  const successRate = allQuestions.length / (SUBJECTS.length * QUESTIONS_PER_SUBJECT);

  if (successRate >= 0.95 && highRate < 0.05) {
    console.log(`✅ 수익화 가능 수준 (성공률 ${(successRate * 100).toFixed(1)}%, 심각이슈 ${(highRate * 100).toFixed(1)}%)`);
  } else if (successRate >= 0.9 && highRate < 0.1) {
    console.log(`⚠️ 개선 필요하지만 MVP 수준 (성공률 ${(successRate * 100).toFixed(1)}%, 심각이슈 ${(highRate * 100).toFixed(1)}%)`);
  } else {
    console.log(`❌ 추가 개선 필요 (성공률 ${(successRate * 100).toFixed(1)}%, 심각이슈 ${(highRate * 100).toFixed(1)}%)`);
  }

  // 저장
  const { writeFileSync } = await import("fs");
  writeFileSync("data/quality-test-results.json", JSON.stringify({ questions: allQuestions, issues: allIssues, stats: subjectStats }, null, 2));
  console.log(`\n결과 저장: data/quality-test-results.json`);
}

main().catch(console.error);
