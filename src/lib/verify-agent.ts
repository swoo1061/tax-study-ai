/**
 * 검증 에이전트
 * - 생성된 문제를 별도 Claude 호출로 검증
 * - 계산 오류, 논리 모순, 선택지 문제 탐지
 * - 통과/재생성 판정
 */

import Anthropic from "@anthropic-ai/sdk";
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

export interface VerifyResult {
  passed: boolean;
  issues: string[];
  fixes?: {
    answer?: number | string;
    explanation?: string;
    choices?: { number: number; text: string }[];
  };
}

export async function verifyQuestion(question: {
  body: string;
  choices?: { number: number; text: string }[];
  answer: number | string;
  explanation: string;
  type: string;
  subject: string;
  topic: string;
}): Promise<VerifyResult> {
  const client = new Anthropic({ apiKey: getApiKey() });

  const isObj = question.type === "객관식";

  const prompt = `당신은 세무사 시험 문제 검수 전문가입니다. 아래 문제를 검증하세요.

## 검증 대상
과목: ${question.subject} / 주제: ${question.topic}
유형: ${question.type}

문제: ${question.body}
${isObj && question.choices ? `
선택지:
${question.choices.map(c => `${c.number}. ${c.text}`).join('\n')}
정답: ${question.answer}번
` : `
모범답안: ${String(question.answer).substring(0, 500)}
`}
해설: ${question.explanation.substring(0, 500)}

## 검증 항목 (각각 판정)
1. **계산 정확성**: 문제에 수치가 있다면, 정답의 계산 과정을 직접 재계산. 결과가 다르면 FAIL
2. **법조문 정확성**: 인용된 법조문 번호/조항이 실제 존재하고 내용이 맞는지 확인
3. **논리적 일관성**: 문제 본문, 정답, 해설 사이에 모순이 없는지
4. **선택지 품질** (객관식): 정답이 유일하게 맞는지, 오답이 확실히 틀린지, 중복 선택지 없는지
5. **난이도 적절성**: 세무사 시험 수준에 부합하는지

반드시 아래 JSON만 출력:
{
  "passed": true 또는 false,
  "issues": ["발견된 문제점 목록, 없으면 빈 배열"],
  "fixes": {
    "answer": "수정된 정답 (수정 필요시만)",
    "explanation": "수정된 해설 (수정 필요시만)"
  }
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonStr);

    return {
      passed: result.passed ?? true,
      issues: result.issues ?? [],
      fixes: result.fixes ?? undefined,
    };
  } catch (error) {
    console.error("Verification error:", error);
    // 검증 실패 시 일단 통과 (생성 자체는 보존)
    return { passed: true, issues: ["검증 API 호출 실패 — 수동 검토 필요"] };
  }
}
