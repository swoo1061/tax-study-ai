import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getLawContext } from "@/lib/law-context";
import { getDifficultyGuide } from "@/lib/difficulty-calibration";
import { getActivePromptFixes } from "@/lib/qa-feedback";

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

const OBJ_PATTERNS = [
  "사례형: 구체적인 인물/회사 상황을 제시하고, 5개 선택지 중 정답을 고르는 문제",
  "계산형: 구체적 금액/세율을 제시하고, 계산 결과를 5개 선택지에서 고르는 문제",
  "비교형: 2~3개 유사 개념을 비교하여 옳은/틀린 설명을 5개 선택지에서 고르는 문제",
  "조건판단형: 여러 사례를 ㄱ,ㄴ,ㄷ,ㄹ로 나열하고 해당되는 조합을 5개 선택지에서 고르는 문제",
];

// ========== 프롬프트 (포맷 엄격 강제) ==========
function buildPrompt(subject: string, topic: string, session: string, difficulty: number): string {
  const isObj = session.includes("1");
  const lawCtx = getLawContext(subject, topic);
  const diffGuide = getDifficultyGuide(subject, difficulty);
  const pattern = isObj ? OBJ_PATTERNS[Math.floor(Math.random() * OBJ_PATTERNS.length)] : "";
  const qaFixes = getActivePromptFixes(subject);

  if (isObj) {
    return `당신은 세무사 시험 출제위원입니다.

${diffGuide}

## 참조 법령 (2025년 기준)
${lawCtx}

## 출제 조건
과목: ${subject} | 주제: ${topic} | 유형: ${pattern}

## 절대 규칙 (위반 시 무효)
1. 반드시 5지선다 객관식으로 출제. choices 배열에 정확히 5개 선택지
2. answer는 반드시 정수 (1, 2, 3, 4, 5 중 하나). 문자열 금지
3. body는 80자 이상. 구체적 상황/수치 포함
4. 각 선택지는 15자 이상, 서로 다른 내용
5. 해설은 200자 이상: "정답 ○번이 맞는 이유" + "나머지 번호가 틀린 이유" 각각 설명
6. 계산 문제면 해설에 풀이 과정을 단계별로 적고, 최종 결과가 정답 선택지와 일치하는지 재검산
7. 법조문은 실제 존재하는 것만 인용
${qaFixes}
출력 형식 (JSON만, 다른 텍스트 절대 금지):
{"body":"문제 본문","choices":[{"number":1,"text":"선택지"},{"number":2,"text":"선택지"},{"number":3,"text":"선택지"},{"number":4,"text":"선택지"},{"number":5,"text":"선택지"}],"answer":정답번호,"explanation":"해설"}`;
  } else {
    return `당신은 세무사 시험 출제위원입니다.

${diffGuide}

## 참조 법령 (2025년 기준)
${lawCtx}

## 출제 조건
과목: ${subject} | 주제: ${topic} | 유형: 주관식 서술/계산형

## 절대 규칙
1. body: 구체적 사례 + 계산 조건 200자 이상 (금액, 날짜, 상황 명시)
2. answer: 모범답안 200자 이상, 단계별 풀이. 계산 문제면 매 단계 수치 명시
3. explanation: 관련 법조문/기준서 인용 + 왜 이렇게 풀어야 하는지 설명
4. 계산 문제는 answer 작성 후 재검산하여 수치 오류 없는지 확인
5. 독창적 사례/숫자 사용

${qaFixes}
출력 형식 (JSON만):
{"body":"문제 본문","answer":"모범답안","explanation":"해설"}`;
  }
}

// ========== 포맷 검증 (AI 호출 없이, 즉시) ==========
interface ParsedQuestion {
  body: string;
  choices?: { number: number; text: string }[];
  answer: number | string;
  explanation: string;
}

function validateFormat(parsed: ParsedQuestion, isObj: boolean): string | null {
  if (!parsed.body || parsed.body.length < 30) return "본문 너무 짧음";
  if (!parsed.explanation || parsed.explanation.length < 50) return "해설 너무 짧음";

  if (isObj) {
    if (!parsed.choices || !Array.isArray(parsed.choices)) return "선택지 배열 없음";
    if (parsed.choices.length !== 5) return `선택지 ${parsed.choices.length}개 (5개 필요)`;
    for (const c of parsed.choices) {
      if (typeof c.number !== "number" || typeof c.text !== "string") return "선택지 형식 오류";
    }
    const ans = Number(parsed.answer);
    if (isNaN(ans) || ans < 1 || ans > 5) return `정답 번호 이상: ${parsed.answer}`;
    // answer를 숫자로 보정
    parsed.answer = ans;
  } else {
    if (typeof parsed.answer !== "string" || parsed.answer.length < 20) return "모범답안 너무 짧음";
  }

  return null; // 통과
}

// ========== 검증 에이전트 (엄격 버전) ==========
async function verifyStrict(q: ParsedQuestion, isObj: boolean, subject: string, topic: string): Promise<{
  passed: boolean;
  correctedAnswer?: number | string;
  correctedExplanation?: string;
  issues: string[];
}> {
  const client = getClient();

  const prompt = isObj
    ? `세무사 시험 문제를 검증하세요. 반드시 JSON만 출력.

문제: ${q.body}
선택지:
${q.choices!.map(c => `${c.number}. ${c.text}`).join("\n")}
제시된 정답: ${q.answer}번
제시된 해설: ${q.explanation}

검증 항목:
1. 정답이 맞는가? 문제를 직접 풀어보고, 5개 선택지 중 정답이 실제로 ${q.answer}번인지 확인
2. 다른 선택지가 정답일 가능성은 없는가?
3. 해설이 정답과 일치하는가?
4. 계산이 있다면 직접 재계산하여 수치 검증
5. 인용된 법조문이 실제 존재하고 내용이 맞는가?

출력 (JSON만):
{"passed":true/false,"correct_answer":실제정답번호,"issues":["문제점"],"fixed_explanation":"수정된 해설(필요시만)"}`
    : `세무사 시험 주관식 문제를 검증하세요.

문제: ${q.body}
모범답안: ${String(q.answer).substring(0, 800)}
해설: ${q.explanation.substring(0, 800)}

검증: 계산 재검산, 법조문 정확성, 논리 일관성 확인.

출력 (JSON만):
{"passed":true/false,"issues":["문제점"],"fixed_answer":"수정답안(필요시만)","fixed_explanation":"수정해설(필요시만)"}`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const json = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const r = JSON.parse(json);

    if (isObj && r.correct_answer && r.correct_answer !== q.answer) {
      return {
        passed: false,
        correctedAnswer: r.correct_answer,
        correctedExplanation: r.fixed_explanation || undefined,
        issues: r.issues || [`정답 ${q.answer}→${r.correct_answer} 수정`],
      };
    }

    return {
      passed: r.passed !== false,
      correctedAnswer: undefined,
      correctedExplanation: r.fixed_explanation || r.fixed_answer ? `${r.fixed_answer || ""}\n\n${r.fixed_explanation || ""}`.trim() : undefined,
      issues: r.issues || [],
    };
  } catch (e) {
    console.error("Verify error:", e);
    return { passed: true, issues: ["검증 API 실패"] };
  }
}

// ========== 생성 파이프라인 ==========
async function generateOne(subject: string, topic: string, session: string, difficulty: number, enableVerify = true) {
  // 안전한 세션 판별: "1차" 또는 "1"이 포함되면 객관식
  const isObj = session.includes("1");
  const MAX_RETRIES = 2;

  // Step 1: 생성 + 포맷 검증 (최대 2회 재시도)
  let parsed: ParsedQuestion | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const prompt = buildPrompt(subject, topic, session, difficulty);
    const systemMsg = isObj
      ? "너는 5지선다 객관식 문제 생성기다. 반드시 choices 배열에 5개 선택지를 포함하고, answer는 1~5 정수로 출력해야 한다. 주관식/서술형 절대 금지."
      : "너는 주관식 서술형 문제 생성기다. choices 배열은 포함하지 않고, answer는 모범답안 문자열로 출력한다.";
    const message = await getClient().messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 4096,
      system: systemMsg,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const candidate = JSON.parse(jsonStr) as ParsedQuestion;
      const formatError = validateFormat(candidate, isObj);

      if (!formatError) {
        parsed = candidate;
        break;
      }
      console.log(`[생성 attempt=${attempt + 1}] 포맷 오류: ${formatError}`);
      // 포맷 오류 시 피드백 포함 재시도 — 이전 오류를 알려줌
      if (attempt < MAX_RETRIES) {
        const fixMsg = await getClient().messages.create({
          model: "claude-opus-4-20250514",
          max_tokens: 4096,
          system: systemMsg,
          messages: [
            { role: "user", content: prompt },
            { role: "assistant", content: text },
            { role: "user", content: `오류: ${formatError}. ${isObj ? "반드시 choices 배열 5개 + answer는 정수 1~5로" : "answer는 문자열로"} 다시 생성해. JSON만 출력.` },
          ],
        });
        const fixText = fixMsg.content[0].type === "text" ? fixMsg.content[0].text : "";
        try {
          const fixJson = fixText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
          const fixCandidate = JSON.parse(fixJson) as ParsedQuestion;
          if (!validateFormat(fixCandidate, isObj)) { parsed = fixCandidate; break; }
        } catch {}
      }
    } catch (e) {
      console.log(`[생성 attempt=${attempt + 1}] JSON 파싱 실패`);
    }
  }

  if (!parsed) {
    throw new Error("문제 생성 실패: 포맷 검증을 통과하지 못했습니다");
  }

  let question = {
    id: crypto.randomUUID(),
    subject, topic, difficulty, session,
    type: isObj ? "객관식" as const : "주관식" as const,
    body: parsed.body,
    choices: parsed.choices || undefined,
    answer: parsed.answer,
    explanation: parsed.explanation,
    verified: false,
  };

  // Step 2: 검증 에이전트 (정답 + 해설 검증)
  if (enableVerify) {
    try {
      const result = await verifyStrict(parsed, isObj, subject, topic);
      question.verified = result.passed;

      if (!result.passed) {
        // 정답 수정
        if (result.correctedAnswer !== undefined) {
          question.answer = result.correctedAnswer;
          question.verified = true;
        }
        // 해설 수정
        if (result.correctedExplanation) {
          question.explanation = result.correctedExplanation;
          question.verified = true;
        }
      } else {
        question.verified = true;
      }
    } catch {
      question.verified = false;
    }
  }

  return question;
}

// ========== API ==========
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, topic, session, difficulty, batch, verify } = body;
    const enableVerify = verify !== false;

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
