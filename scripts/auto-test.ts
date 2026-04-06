/**
 * 자동 테스트 봇 — 10개 페르소나가 독립적으로 서비스 테스트
 * 실행: npx tsx scripts/auto-test.ts
 */

const BASE = "http://localhost:3000";

interface Persona {
  id: number;
  name: string;
  email: string;
  password: string;
  behavior: "beginner" | "power" | "complainer" | "explorer" | "speed" | "careful" | "random" | "exam_focused" | "review_focused" | "edge_case";
  session: string;
  cookie: string;
}

interface TestLog {
  time: string;
  persona: string;
  action: string;
  result: "OK" | "BUG" | "QUALITY" | "ERROR";
  detail: string;
}

const logs: TestLog[] = [];

function log(persona: Persona, action: string, result: TestLog["result"], detail: string) {
  const entry = { time: new Date().toISOString().slice(11, 19), persona: persona.name, action, result, detail };
  logs.push(entry);
  const icon = result === "OK" ? "✅" : result === "BUG" ? "🐛" : result === "QUALITY" ? "⚠️" : "❌";
  console.log(`${icon} [${entry.time}] ${persona.name}: ${action} — ${detail}`);
}

async function api(path: string, options: RequestInit = {}, cookie = "") {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string> || {}) };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const setCookie = res.headers.get("set-cookie");
  const body = await res.json().catch(() => null);
  return { status: res.status, body, cookie: setCookie || "" };
}

// ========== 계정 생성 ==========
async function registerUser(p: Persona): Promise<boolean> {
  try {
    const { status, body, cookie } = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: p.email, name: p.name, password: p.password }),
    });
    if (status === 200 && body?.id) {
      const match = cookie.match(/session=([^;]+)/);
      p.cookie = match ? `session=${match[1]}` : "";
      log(p, "회원가입", "OK", `id=${body.id}`);
      return true;
    }
    // 이미 가입된 경우 로그인 시도
    const login = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: p.email, password: p.password }),
    });
    if (login.status === 200) {
      const match = login.cookie.match(/session=([^;]+)/);
      p.cookie = match ? `session=${match[1]}` : "";
      log(p, "로그인", "OK", "기존 계정");
      return true;
    }
    log(p, "회원가입", "ERROR", `status=${status} ${JSON.stringify(body)}`);
    return false;
  } catch (e: any) {
    log(p, "회원가입", "ERROR", e.message);
    return false;
  }
}

// ========== 테스트 액션들 ==========
async function testQuizGenerate(p: Persona) {
  const subjects = [
    { subject: "재정학", topic: "공공재", session: "1차" },
    { subject: "세법학개론", topic: "국세기본법", session: "1차" },
    { subject: "회계학개론", topic: "재고자산", session: "1차" },
    { subject: "상법·민법·행정소송법", topic: "회사법", session: "1차" },
    { subject: "세법학 1부", topic: "소득세 — 종합소득", session: "2차" },
    { subject: "세법학 2부", topic: "부가가치세 — 과세거래", session: "2차" },
    { subject: "회계학 1부 (재무회계)", topic: "금융상품 (KIFRS 1109)", session: "2차" },
    { subject: "회계학 2부 (원가관리회계)", topic: "CVP분석", session: "2차" },
  ];
  const pick = subjects[Math.floor(Math.random() * subjects.length)];
  const diff = Math.floor(Math.random() * 5) + 1;

  try {
    const { status, body } = await api("/api/generate", {
      method: "POST",
      body: JSON.stringify({ ...pick, difficulty: diff, verify: false }),
    });

    if (status !== 200) {
      log(p, "문제생성", "ERROR", `HTTP ${status}: ${body?.error || "unknown"}`);
      return;
    }

    const q = body;
    const isObj = pick.session === "1차" || pick.session.includes("1");

    // 포맷 검증
    if (isObj) {
      if (!q.choices || q.choices.length !== 5) {
        log(p, "문제생성", "BUG", `${pick.subject}: 선택지 ${q.choices?.length || 0}개 (5개 필요)`);
        return;
      }
      if (typeof q.answer !== "number" || q.answer < 1 || q.answer > 5) {
        log(p, "문제생성", "BUG", `${pick.subject}: 정답 타입 오류 answer=${q.answer} (${typeof q.answer})`);
        return;
      }
      // 선택지 중복
      const texts = q.choices.map((c: any) => c.text?.trim());
      if (new Set(texts).size < 5) {
        log(p, "문제생성", "QUALITY", `${pick.subject}: 선택지 중복 발견`);
        return;
      }
    } else {
      if (typeof q.answer !== "string" || q.answer.length < 20) {
        log(p, "문제생성", "BUG", `${pick.subject}: 주관식 답안 짧음 (${String(q.answer).length}자)`);
        return;
      }
    }

    // 길이 검증
    if (q.body.length < 50) {
      log(p, "문제생성", "QUALITY", `${pick.subject}: 본문 짧음 (${q.body.length}자)`);
      return;
    }
    if (q.explanation.length < 100) {
      log(p, "문제생성", "QUALITY", `${pick.subject}: 해설 짧음 (${q.explanation.length}자)`);
      return;
    }

    log(p, "문제생성", "OK", `${pick.subject}/${pick.topic} d=${diff} body=${q.body.length}자 expl=${q.explanation.length}자`);
  } catch (e: any) {
    log(p, "문제생성", "ERROR", e.message);
  }
}

async function testAuthMe(p: Persona) {
  try {
    const { status, body } = await api("/api/auth/me", {}, p.cookie);
    if (body?.user?.email === p.email) {
      log(p, "인증확인", "OK", "세션 유효");
    } else {
      log(p, "인증확인", "BUG", `세션 무효: ${JSON.stringify(body)}`);
    }
  } catch (e: any) {
    log(p, "인증확인", "ERROR", e.message);
  }
}

async function testExamList(p: Persona) {
  try {
    const { status, body } = await api("/api/exams", {}, p.cookie);
    if (status === 200 && body?.exams?.length === 8) {
      log(p, "시험목록", "OK", `${body.exams.length}개 시험, loggedIn=${body.loggedIn}`);
    } else {
      log(p, "시험목록", "BUG", `status=${status} exams=${body?.exams?.length}`);
    }
  } catch (e: any) {
    log(p, "시험목록", "ERROR", e.message);
  }
}

async function testSupport(p: Persona) {
  const subjects = ["문제 정답이 틀린 것 같아요", "환불해주세요", "비밀번호를 잊었어요", "문제 생성이 느려요", "기출문제도 제공해주세요"];
  const pick = subjects[Math.floor(Math.random() * subjects.length)];

  try {
    const { status, body } = await api("/api/support", {
      method: "POST",
      body: JSON.stringify({ subject: pick, message: `테스트 문의: ${pick}` }),
    }, p.cookie);

    if (status === 200 && body?.autoReply) {
      log(p, "문의하기", "OK", `"${pick}" → 자동응답 ${body.autoReply.length}자, 분류=${body.ticket?.category}`);
    } else if (status === 401) {
      log(p, "문의하기", "BUG", "로그인 필요 — 쿠키 누락?");
    } else {
      log(p, "문의하기", "BUG", `status=${status} ${JSON.stringify(body)}`);
    }
  } catch (e: any) {
    log(p, "문의하기", "ERROR", e.message);
  }
}

async function testPageLoad(p: Persona, path: string) {
  try {
    const res = await fetch(`${BASE}${path}`);
    if (res.status === 200) {
      log(p, `페이지(${path})`, "OK", `${res.status}`);
    } else {
      log(p, `페이지(${path})`, "BUG", `HTTP ${res.status}`);
    }
  } catch (e: any) {
    log(p, `페이지(${path})`, "ERROR", e.message);
  }
}

async function testErrorReport(p: Persona) {
  try {
    const { status, body } = await api("/api/report-error", {
      method: "POST",
      body: JSON.stringify({
        questionId: "test-q-" + Date.now(),
        reportType: "wrong_answer",
        description: "테스트 신고",
        questionData: {
          body: "테스트 문제입니다. A가 B에게 100만원을 지급했을 때 세금은?",
          choices: [
            { number: 1, text: "10만원" }, { number: 2, text: "20만원" },
            { number: 3, text: "30만원" }, { number: 4, text: "40만원" }, { number: 5, text: "50만원" },
          ],
          answer: 1, explanation: "소득세법에 따라 10%", type: "객관식", subject: "세법학개론", topic: "소득세법 기초",
        },
      }),
    }, p.cookie);

    if (status === 200) {
      log(p, "오류신고", "OK", `status=${body?.report?.status} msg=${body?.message?.substring(0, 50)}`);
    } else {
      log(p, "오류신고", status === 401 ? "BUG" : "ERROR", `HTTP ${status}`);
    }
  } catch (e: any) {
    log(p, "오류신고", "ERROR", e.message);
  }
}

async function testEdgeCases(p: Persona) {
  // 빈 바디 전송
  try {
    const { status } = await api("/api/generate", { method: "POST", body: "{}" });
    if (status === 500) log(p, "엣지:빈바디", "OK", "500 에러 정상 반환");
    else log(p, "엣지:빈바디", "BUG", `status=${status} (500 예상)`);
  } catch (e: any) { log(p, "엣지:빈바디", "ERROR", e.message); }

  // 잘못된 세션값
  try {
    const { status, body } = await api("/api/generate", {
      method: "POST",
      body: JSON.stringify({ subject: "재정학", topic: "공공재", session: "3차", difficulty: 3 }),
    });
    if (body?.choices) log(p, "엣지:3차", "BUG", "3차 세션이 선택지를 생성함");
    else log(p, "엣지:3차", "OK", "주관식으로 처리됨 (예상대로)");
  } catch (e: any) { log(p, "엣지:3차", "ERROR", e.message); }

  // 미인증 보호 API
  try {
    const { status } = await api("/api/admin");
    if (status === 403) log(p, "엣지:관리자", "OK", "403 접근거부");
    else log(p, "엣지:관리자", "BUG", `status=${status} (403 예상)`);
  } catch (e: any) { log(p, "엣지:관리자", "ERROR", e.message); }
}

// ========== 페르소나별 행동 ==========
async function runPersona(p: Persona) {
  switch (p.behavior) {
    case "beginner":
      await testPageLoad(p, "/");
      await testPageLoad(p, "/quiz");
      await testQuizGenerate(p);
      break;
    case "power":
      await testQuizGenerate(p);
      await testQuizGenerate(p);
      await testQuizGenerate(p);
      break;
    case "complainer":
      await testQuizGenerate(p);
      await testSupport(p);
      await testErrorReport(p);
      break;
    case "explorer":
      await testPageLoad(p, "/");
      await testPageLoad(p, "/quiz");
      await testPageLoad(p, "/exam");
      await testPageLoad(p, "/review");
      await testPageLoad(p, "/history");
      await testPageLoad(p, "/pricing");
      await testPageLoad(p, "/info/terms");
      await testPageLoad(p, "/info/privacy");
      await testPageLoad(p, "/info/about");
      await testPageLoad(p, "/support");
      await testPageLoad(p, "/admin");
      await testPageLoad(p, "/login");
      break;
    case "speed":
      await Promise.all([testQuizGenerate(p), testQuizGenerate(p)]);
      break;
    case "careful":
      await testAuthMe(p);
      await testExamList(p);
      await testQuizGenerate(p);
      break;
    case "random": {
      const actions = [testQuizGenerate, testAuthMe, testExamList, testSupport];
      const pick = actions[Math.floor(Math.random() * actions.length)];
      await pick(p);
      break;
    }
    case "exam_focused":
      await testExamList(p);
      break;
    case "review_focused":
      await testPageLoad(p, "/review");
      await testSupport(p);
      break;
    case "edge_case":
      await testEdgeCases(p);
      break;
  }
}

// ========== 메인 ==========
async function main() {
  const personas: Persona[] = [
    { id: 1, name: "초보_민수", email: "test1@test.com", password: "test123", behavior: "beginner", session: "", cookie: "" },
    { id: 2, name: "파워유저_지훈", email: "test2@test.com", password: "test123", behavior: "power", session: "", cookie: "" },
    { id: 3, name: "불만러_서연", email: "test3@test.com", password: "test123", behavior: "complainer", session: "", cookie: "" },
    { id: 4, name: "탐험가_하늘", email: "test4@test.com", password: "test123", behavior: "explorer", session: "", cookie: "" },
    { id: 5, name: "스피드_재원", email: "test5@test.com", password: "test123", behavior: "speed", session: "", cookie: "" },
    { id: 6, name: "꼼꼼이_은지", email: "test6@test.com", password: "test123", behavior: "careful", session: "", cookie: "" },
    { id: 7, name: "랜덤_태양", email: "test7@test.com", password: "test123", behavior: "random", session: "", cookie: "" },
    { id: 8, name: "모의고사_승우", email: "test8@test.com", password: "test123", behavior: "exam_focused", session: "", cookie: "" },
    { id: 9, name: "복습러_유나", email: "test9@test.com", password: "test123", behavior: "review_focused", session: "", cookie: "" },
    { id: 10, name: "해커_도윤", email: "test10@test.com", password: "test123", behavior: "edge_case", session: "", cookie: "" },
  ];

  console.log("=== 자동 테스트 시작 (10 페르소나) ===\n");

  // 계정 생성
  console.log("--- 계정 생성 ---");
  for (const p of personas) await registerUser(p);

  // 라운드 실행 (10분 × 10라운드 = 100분)
  const ROUNDS = 10;
  const INTERVAL_MS = 10 * 60 * 1000; // 10분

  for (let round = 1; round <= ROUNDS; round++) {
    const roundStart = Date.now();
    console.log(`\n${"=".repeat(60)}`);
    console.log(`라운드 ${round}/${ROUNDS} (${new Date().toLocaleTimeString("ko")})`);
    console.log(`${"=".repeat(60)}`);

    // 모든 페르소나 병렬 실행
    await Promise.all(personas.map(p => runPersona(p)));

    // 라운드별 중간 요약
    const roundLogs = logs.slice(-personas.length * 3);
    const roundBugs = roundLogs.filter(l => l.result === "BUG").length;
    const roundQuality = roundLogs.filter(l => l.result === "QUALITY").length;
    console.log(`\n📊 라운드 ${round} 결과: 버그 ${roundBugs}건, 품질이슈 ${roundQuality}건`);

    if (round < ROUNDS) {
      const elapsed = Date.now() - roundStart;
      const wait = Math.max(0, INTERVAL_MS - elapsed);
      console.log(`⏳ 다음 라운드까지 ${Math.round(wait / 1000)}초 대기...\n`);
      await new Promise(r => setTimeout(r, wait));
    }
  }

  // 결과 요약
  console.log(`\n${"=".repeat(60)}`);
  console.log("최종 결과 요약");
  console.log(`${"=".repeat(60)}`);

  const ok = logs.filter(l => l.result === "OK").length;
  const bugs = logs.filter(l => l.result === "BUG");
  const quality = logs.filter(l => l.result === "QUALITY");
  const errors = logs.filter(l => l.result === "ERROR");

  console.log(`총 테스트: ${logs.length}`);
  console.log(`✅ 성공: ${ok}`);
  console.log(`🐛 버그: ${bugs.length}`);
  console.log(`⚠️ 품질: ${quality.length}`);
  console.log(`❌ 에러: ${errors.length}`);

  if (bugs.length > 0) {
    console.log(`\n[버그 목록]`);
    for (const b of bugs) console.log(`  🐛 ${b.persona}: ${b.action} — ${b.detail}`);
  }
  if (quality.length > 0) {
    console.log(`\n[품질 이슈]`);
    for (const q of quality) console.log(`  ⚠️ ${q.persona}: ${q.action} — ${q.detail}`);
  }
  if (errors.length > 0) {
    console.log(`\n[에러 목록]`);
    for (const e of errors) console.log(`  ❌ ${e.persona}: ${e.action} — ${e.detail}`);
  }

  // 파일 저장
  const { writeFileSync } = await import("fs");
  writeFileSync("data/test-logs.json", JSON.stringify(logs, null, 2));
  console.log(`\n로그 저장: data/test-logs.json`);
}

main().catch(console.error);
