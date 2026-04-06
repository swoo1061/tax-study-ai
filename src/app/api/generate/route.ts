import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getLawContext } from "@/lib/law-context";
import { getDifficultyGuide } from "@/lib/difficulty-calibration";
import { verifyQuestion } from "@/lib/verify-agent";

let _apiKey: string | null = null;

function getApiKey(): string {
  if (_apiKey) return _apiKey;
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey && envKey.length > 0) { _apiKey = envKey; return _apiKey; }
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
      if (m) { _apiKey = m[1].trim(); return _apiKey; }
    }
  } catch {}
  throw new Error("ANTHROPIC_API_KEY not found");
}

function getClient() {
  return new Anthropic({ apiKey: getApiKey() });
}

// 출제 유형 랜덤 선택 (객관식)
const OBJ_PATTERNS = [
  "사례형: 구체적인 인물/회사 상황을 제시하고 법적 판단이나 계산 결과를 묻는 문제. body에 '甲은...', '(주)A사는...' 같은 구체적 사례를 100자 이상 작성",
  "계산형: 구체적 금액/세율/기간을 제시하고 세액·금액을 계산하게 하는 문제. body에 구체적 숫자와 조건을 100자 이상 작성",
  "비교형: 2~3개의 유사 개념/제도를 비교하여 차이점을 찾는 문제. body에 각 개념의 설명을 포함하여 100자 이상 작성",
  "조건판단형: 여러 조건을 제시하고 해당되는 것/해당되지 않는 것을 고르는 문제. body에 3~4가지 구체적 사례나 조건을 나열하여 100자 이상 작성",
  "빈칸/완성형: 법조문이나 원리의 핵심 내용 중 빈칸을 채우거나 올바른 문장을 고르는 문제. body에 관련 조문/원리의 맥락을 설명하여 80자 이상 작성",
];

function buildPrompt(subject: string, topic: string, session: string, difficulty: number): string {
  const isObj = session === "1차";
  const typeLabel = isObj ? "5지선다 객관식" : "주관식 서술형";
  const pattern = isObj ? OBJ_PATTERNS[Math.floor(Math.random() * OBJ_PATTERNS.length)] : "";

  // V4: 법령 컨텍스트 + 난이도 캘리브레이션 주입
  const lawCtx = getLawContext(subject, topic);
  const diffGuide = getDifficultyGuide(subject, difficulty);

  return `당신은 대한민국 세무사 시험 출제위원입니다. 실제 시험과 동일한 수준의 문제를 출제합니다.

${diffGuide}

## 참조 법령·기준 (2025년 기준, 반드시 이 데이터에 맞춰 출제)
${lawCtx}

## 출제 조건
- 과목: ${subject}
- 세부주제: ${topic}
- 시험: 세무사 ${session} 시험
- 유형: ${typeLabel}

${isObj ? `## 출제 유형
→ ${pattern}

## 객관식 필수 규칙
1. **body(문제 본문)은 반드시 80자 이상** 작성. 단순 "다음 중 옳은 것은?" 금지
2. body에 구체적 상황/사례/수치/조건 포함 필수
3. 5개 선택지, 각 15자 이상, 서로 명확히 구분
4. 매력적 오답(plausible distractor) 포함
5. 정답 번호 1~5 중 하나
6. 해설 200자 이상: 정답 이유 + 각 오답이 왜 틀린지 + 법조문 인용
7. **계산 문제는 반드시 풀이 과정을 해설에 포함하고, 직접 재검산하여 정답 확인**` : `## 주관식 필수 규칙
1. body에 구체적 사례/계산조건 200자 이상 (금액, 날짜, 상황)
2. 모범답안: 단계별 풀이 200자 이상
3. 해설에 법조문/기준서 인용 필수
4. **계산 문제는 모범답안에서 매 단계 수치를 명시하고, 최종 답과 일치하는지 재검산**
5. 독창적 사례/숫자 사용`}

## 핵심: 정확성
- 위 참조 법령의 세율/공제한도/기준금액을 **반드시 정확히** 적용
- 계산 문제는 출제 후 **직접 재계산하여 정답 검증** — 계산 오류 절대 불가
- 법조문 번호는 실제 존재하는 것만 인용

반드시 아래 JSON만 출력:
${isObj ? `{
  "body": "문제 본문 (80자 이상, 구체적 상황/사례 포함)",
  "choices": [
    {"number": 1, "text": "선택지1 (15자 이상)"},
    {"number": 2, "text": "선택지2"},
    {"number": 3, "text": "선택지3"},
    {"number": 4, "text": "선택지4"},
    {"number": 5, "text": "선택지5"}
  ],
  "answer": 정답번호,
  "explanation": "상세 해설 (200자 이상, 법조문 인용, 계산과정 포함)"
}` : `{
  "body": "문제 본문 (200자 이상, 구체적 사례/조건)",
  "answer": "모범답안 (200자 이상, 단계별 풀이)",
  "explanation": "상세 해설 (풀이과정, 법조문/기준서 인용)"
}`}`;
}

async function generateOne(subject: string, topic: string, session: string, difficulty: number, enableVerify = true) {
  const prompt = buildPrompt(subject, topic, session, difficulty);
  const message = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(jsonStr);
  const isObj = session === "1차";

  let question = {
    id: crypto.randomUUID(),
    subject, topic, difficulty, session,
    type: isObj ? "객관식" : "주관식",
    body: parsed.body,
    choices: parsed.choices || undefined,
    answer: parsed.answer,
    explanation: parsed.explanation,
    verified: false,
  };

  // V4: 검증 에이전트
  if (enableVerify) {
    try {
      const result = await verifyQuestion(question);
      question.verified = result.passed;

      if (!result.passed && result.fixes) {
        // 검증 실패 시 수정 적용
        if (result.fixes.answer !== undefined) question.answer = result.fixes.answer;
        if (result.fixes.explanation) question.explanation = result.fixes.explanation;
        question.verified = true; // 수정 후 통과 처리
      }

      // 검증 완전 실패 (수정 불가) → 재생성 1회 시도
      if (!result.passed && !result.fixes) {
        const retry = await getClient().messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        });
        const retryText = retry.content[0].type === "text" ? retry.content[0].text : "";
        const retryJson = retryText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const retryParsed = JSON.parse(retryJson);
        question = {
          ...question,
          id: crypto.randomUUID(),
          body: retryParsed.body,
          choices: retryParsed.choices || undefined,
          answer: retryParsed.answer,
          explanation: retryParsed.explanation,
          verified: true, // 재생성은 통과 처리
        };
      }
    } catch {
      // 검증 에러 시 원본 유지
      question.verified = false;
    }
  }

  return question;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, topic, session, difficulty, batch, verify } = body;
    const enableVerify = verify !== false; // 기본 true, batch에서는 false 가능

    if (batch && Array.isArray(batch)) {
      const questions = [];
      for (const item of batch) {
        const q = await generateOne(item.subject, item.topic, item.session, item.difficulty, false);
        questions.push(q);
      }
      return NextResponse.json({ questions });
    }

    const q = await generateOne(subject, topic, session, difficulty, enableVerify);
    return NextResponse.json(q);
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
