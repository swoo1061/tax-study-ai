import { NextRequest, NextResponse } from "next/server";
import { getExamById } from "@/lib/exam-catalog";
import { getSubjectByCode } from "@/lib/subjects";
import { getUserFromCookie } from "@/lib/auth";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";

const EXAMS_DIR = join(process.cwd(), "data", "exams");

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = getUserFromCookie(req.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const examMeta = getExamById(id);
  if (!examMeta) return NextResponse.json({ error: "시험을 찾을 수 없습니다" }, { status: 404 });

  if (!existsSync(EXAMS_DIR)) mkdirSync(EXAMS_DIR, { recursive: true });
  const cacheFile = join(EXAMS_DIR, `${id}.json`);

  // Return cached exam
  if (existsSync(cacheFile)) {
    const questions = JSON.parse(readFileSync(cacheFile, "utf-8"));
    return NextResponse.json({ meta: examMeta, questions });
  }

  // Generate exam
  const subject = getSubjectByCode(examMeta.subjectCode);
  if (!subject) return NextResponse.json({ error: "과목 정보 없음" }, { status: 500 });

  const isObj = examMeta.session === "1차";
  const typeLabel = isObj ? "5지선다 객관식" : "주관식 서술형";

  // Spread topics evenly
  const topics = subject.topics;
  const selectedTopics: string[] = [];
  for (let i = 0; i < examMeta.questionCount; i++) {
    selectedTopics.push(topics[i % topics.length]);
  }

  const prompt = `당신은 대한민국 세무사 시험 출제위원입니다.

아래 조건에 맞는 ${typeLabel} 모의고사를 생성하세요.

과목: ${examMeta.subjectName}
시험: 세무사 ${examMeta.session} 시험
문제 수: ${examMeta.questionCount}문제
각 문제의 주제: ${selectedTopics.join(", ")}

**중요 지침:**
- 실제 세무사 시험과 동일한 수준과 형식으로 출제
- 각 문제는 서로 다른 주제를 다루어야 함
- 난이도는 1~5 중 고르게 분배 (쉬운 문제 ~ 어려운 문제)
- 독창적인 사례와 숫자를 사용 (기존 교재 복제 금지)
${isObj ? `
각 문제 형식:
- body: 문제 본문
- choices: 5개 선택지 [{number, text}]
- answer: 정답 번호 (1~5)
- explanation: 상세 해설
- topic: 해당 주제
- difficulty: 난이도 (1~5)
` : `
각 문제 형식:
- body: 문제 본문 (계산 또는 서술)
- answer: 모범답안
- explanation: 상세 해설 (풀이 과정, 법조문/기준서 인용)
- topic: 해당 주제
- difficulty: 난이도 (1~5)
`}

반드시 아래 JSON 형식으로만 응답하세요:
{ "questions": [ ... ] }`;

  try {
    const client = new Anthropic({ apiKey: getApiKey() });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    const questions = parsed.questions.map((q: Record<string, unknown>, i: number) => ({
      id: `${id}-q${i + 1}`,
      subject: examMeta.subjectName,
      topic: q.topic || selectedTopics[i],
      difficulty: q.difficulty || 3,
      session: examMeta.session,
      type: isObj ? "객관식" : "주관식",
      body: q.body,
      choices: q.choices || undefined,
      answer: q.answer,
      explanation: q.explanation,
    }));

    writeFileSync(cacheFile, JSON.stringify(questions, null, 2));
    return NextResponse.json({ meta: examMeta, questions });
  } catch (error: unknown) {
    console.error("Exam generation error:", error);
    return NextResponse.json({ error: "시험 생성 중 오류가 발생했습니다" }, { status: 500 });
  }
}
