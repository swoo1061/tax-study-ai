import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

let _apiKey: string | null = null;

function getApiKey(): string {
  if (_apiKey) return _apiKey;

  // process.env may be empty if system env overrides .env.local
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey && envKey.length > 0) {
    _apiKey = envKey;
    return _apiKey;
  }

  // Fallback: read .env.local directly
  try {
    const envPath = join(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
      if (match) {
        _apiKey = match[1].trim();
        return _apiKey;
      }
    }
  } catch {}

  throw new Error("ANTHROPIC_API_KEY not found");
}

function getClient() {
  return new Anthropic({ apiKey: getApiKey() });
}

export async function POST(req: NextRequest) {
  try {
    const { subject, topic, session, difficulty } = await req.json();

    const isObjective = session === "1차";
    const typeLabel = isObjective ? "5지선다 객관식" : "주관식 서술형";

    const prompt = `당신은 대한민국 세무사 시험 출제위원입니다.

아래 조건에 맞는 ${typeLabel} 문제를 1개 생성하세요.

과목: ${subject}
세부주제: ${topic}
난이도: ${difficulty}/5 (1=매우쉬움, 5=매우어려움)
시험: 세무사 ${session} 시험

${isObjective ? `
**객관식 형식 규칙:**
- 문제 본문 작성
- 5개 선택지 (①~⑤)
- 정답 번호
- 상세 해설 (왜 정답인지, 왜 오답인지 각각 설명)
` : `
**주관식 형식 규칙:**
- 문제 본문 작성 (계산문제 또는 서술문제)
- 모범답안 작성
- 상세 해설 (풀이 과정, 관련 법조문/기준서 인용)
`}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만:
${isObjective ? `
{
  "body": "문제 본문",
  "choices": [
    {"number": 1, "text": "선택지1"},
    {"number": 2, "text": "선택지2"},
    {"number": 3, "text": "선택지3"},
    {"number": 4, "text": "선택지4"},
    {"number": 5, "text": "선택지5"}
  ],
  "answer": 정답번호,
  "explanation": "상세 해설"
}` : `
{
  "body": "문제 본문",
  "answer": "모범답안",
  "explanation": "상세 해설 (풀이과정 포함)"
}`}`;

    const message = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // JSON 파싱 (코드블록 제거)
    const jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    const question = {
      id: crypto.randomUUID(),
      subject,
      topic,
      difficulty,
      session,
      type: isObjective ? "객관식" : "주관식",
      body: parsed.body,
      choices: parsed.choices || undefined,
      answer: parsed.answer,
      explanation: parsed.explanation,
    };

    return NextResponse.json(question);
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
