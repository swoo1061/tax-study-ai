import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

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

  // 객관식: 랜덤 패턴 선택
  const pattern = isObj ? OBJ_PATTERNS[Math.floor(Math.random() * OBJ_PATTERNS.length)] : "";

  return `당신은 대한민국 세무사 시험 출제위원입니다. 실제 시험과 동일한 수준의 문제를 출제합니다.

## 출제 조건
- 과목: ${subject}
- 세부주제: ${topic}
- 난이도: ${difficulty}/5 (1=매우쉬움, 5=매우어려움)
- 시험: 세무사 ${session} 시험
- 유형: ${typeLabel}

${isObj ? `## 출제 유형 지정
이번 문제는 반드시 아래 유형으로 출제하세요:
→ ${pattern}

## 객관식 필수 규칙
1. **body(문제 본문)은 반드시 80자 이상** 작성. 단순히 "다음 중 옳은 것은?" 같은 한 줄 질문 금지
2. body에 구체적 상황/사례/수치/조건을 포함해야 함
3. 5개 선택지를 작성하되, 각 선택지는 15자 이상이고 서로 명확히 구분되어야 함
4. 매력적 오답(plausible distractor)을 포함 — 수험생이 실제로 헷갈릴 수 있는 선택지
5. 정답 번호는 1~5 중 하나
6. 해설: 정답인 이유 + 각 오답이 왜 틀린지 구체적으로 설명 (200자 이상)
7. 관련 법조문/기준서 번호를 해설에 반드시 인용` : `## 주관식 필수 규칙
1. body에 구체적 사례/계산조건을 200자 이상 작성 (구체적 금액, 날짜, 상황 포함)
2. 모범답안은 풀이 과정을 단계별로 상세히 작성 (200자 이상)
3. 해설에 관련 법조문/기준서 번호를 반드시 인용
4. 독창적인 사례와 숫자를 사용 (기존 교재 복제 금지)`}

## 품질 기준
- 실제 세무사 시험 기출문제와 동등한 난이도와 형식
- 독창적 사례/숫자 사용 (기존 교재나 기출문제 복제 금지)
- 세법 문제는 현행 법령(2024년 기준) 적용

반드시 아래 JSON만 출력하세요:
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
  "explanation": "상세 해설 (200자 이상, 법조문 인용 포함)"
}` : `{
  "body": "문제 본문 (200자 이상, 구체적 사례/조건)",
  "answer": "모범답안 (200자 이상, 단계별 풀이)",
  "explanation": "상세 해설 (풀이과정, 법조문/기준서 인용)"
}`}`;
}

async function generateOne(subject: string, topic: string, session: string, difficulty: number) {
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
  return {
    id: crypto.randomUUID(),
    subject, topic, difficulty, session,
    type: isObj ? "객관식" : "주관식",
    body: parsed.body,
    choices: parsed.choices || undefined,
    answer: parsed.answer,
    explanation: parsed.explanation,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, topic, session, difficulty, batch } = body;

    if (batch && Array.isArray(batch)) {
      const questions = [];
      for (const item of batch) {
        const q = await generateOne(item.subject, item.topic, item.session, item.difficulty);
        questions.push(q);
      }
      return NextResponse.json({ questions });
    }

    const q = await generateOne(subject, topic, session, difficulty);
    return NextResponse.json(q);
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
