/**
 * 전체 서비스 종합 테스트 (Opus 모델)
 * 10 페르소나 × 10라운드 × 10분 = 100분
 *
 * 테스트 범위:
 * - 모든 페이지 로드 + 응답 시간
 * - 8과목 × 5난이도 문제 생성 + 포맷/품질 검증
 * - 문제 풀이 + 정답 체크 + 해설 일관성
 * - 모의고사 응시 + 점수 제출 + 분포
 * - CS 문의 + 오류 신고 + 자동 응답
 * - 엣지케이스 (빈 입력, 잘못된 값, 미인증, 동시 요청)
 * - UX 체크 (응답 시간, 데이터 크기, 빈 상태)
 */

const BASE = "http://localhost:3000";

interface Persona {
  id: number; name: string; email: string; password: string;
  behavior: string; cookie: string;
}

interface TestLog {
  time: string; round: number; persona: string;
  category: string; action: string;
  result: "OK" | "BUG" | "QUALITY" | "UX" | "ERROR";
  detail: string; durationMs?: number;
}

const logs: TestLog[] = [];
let currentRound = 0;

function log(p: Persona, category: string, action: string, result: TestLog["result"], detail: string, durationMs?: number) {
  const entry: TestLog = {
    time: new Date().toISOString().slice(11, 19),
    round: currentRound, persona: p.name,
    category, action, result, detail, durationMs,
  };
  logs.push(entry);
  const icon = { OK: "✅", BUG: "🐛", QUALITY: "⚠️", UX: "🎨", ERROR: "❌" }[result];
  const dur = durationMs ? ` (${durationMs}ms)` : "";
  console.log(`${icon} [R${currentRound} ${entry.time}] ${p.name}: [${category}] ${action} — ${detail}${dur}`);
}

async function api(path: string, options: RequestInit = {}, cookie = "") {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string> || {}) };
  if (cookie) headers["Cookie"] = cookie;
  const start = Date.now();
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const duration = Date.now() - start;
  const setCookie = res.headers.get("set-cookie");
  const body = await res.json().catch(() => null);
  return { status: res.status, body, cookie: setCookie || "", duration };
}

async function pageLoad(path: string): Promise<{ status: number; duration: number; size: number }> {
  const start = Date.now();
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  return { status: res.status, duration: Date.now() - start, size: text.length };
}

// ========== 계정 ==========
async function register(p: Persona): Promise<boolean> {
  try {
    let r = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ email: p.email, name: p.name, password: p.password }) });
    if (r.status !== 200) r = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: p.email, password: p.password }) });
    if (r.status === 200) {
      const m = r.cookie.match(/session=([^;]+)/);
      p.cookie = m ? `session=${m[1]}` : "";
      log(p, "인증", "로그인", "OK", `${r.duration}ms`, r.duration);
      return true;
    }
    log(p, "인증", "로그인", "ERROR", `status=${r.status}`);
    return false;
  } catch (e: any) { log(p, "인증", "로그인", "ERROR", e.message); return false; }
}

// ========== 페이지 로드 + UX ==========
async function testAllPages(p: Persona) {
  const pages = ["/", "/quiz", "/exam", "/review", "/history", "/pricing", "/login", "/support", "/info/terms", "/info/privacy", "/info/about", "/admin"];
  for (const path of pages) {
    try {
      const { status, duration, size } = await pageLoad(path);
      if (status !== 200) {
        log(p, "페이지", path, "BUG", `HTTP ${status}`, duration);
      } else if (duration > 5000) {
        log(p, "페이지", path, "UX", `로딩 느림 ${duration}ms (5초 초과)`, duration);
      } else if (size < 500) {
        log(p, "페이지", path, "UX", `응답 작음 ${size}bytes (빈 페이지?)`, duration);
      } else {
        log(p, "페이지", path, "OK", `${size}B`, duration);
      }
    } catch (e: any) { log(p, "페이지", path, "ERROR", e.message); }
  }
}

// ========== 문제 생성 + 풀이 + 정답 검증 ==========
async function testSolveAndVerify(p: Persona, subjectOverride?: string) {
  const subjects = [
    { subject: "재정학", topic: "공공재", session: "1차" },
    { subject: "재정학", topic: "조세의 전가와 귀착", session: "1차" },
    { subject: "세법학개론", topic: "국세기본법", session: "1차" },
    { subject: "세법학개론", topic: "소득세법 기초", session: "1차" },
    { subject: "회계학개론", topic: "유형자산", session: "1차" },
    { subject: "회계학개론", topic: "재고자산", session: "1차" },
    { subject: "상법·민법·행정소송법", topic: "민법총칙", session: "1차" },
    { subject: "상법·민법·행정소송법", topic: "회사법", session: "1차" },
    { subject: "세법학 1부", topic: "소득세 — 종합소득", session: "2차" },
    { subject: "세법학 2부", topic: "부가가치세 — 과세거래", session: "2차" },
    { subject: "회계학 1부 (재무회계)", topic: "금융상품 (KIFRS 1109)", session: "2차" },
    { subject: "회계학 2부 (원가관리회계)", topic: "CVP분석", session: "2차" },
  ];
  const pick = subjectOverride
    ? subjects.find(s => s.subject.includes(subjectOverride)) || subjects[0]
    : subjects[Math.floor(Math.random() * subjects.length)];
  const diff = Math.floor(Math.random() * 5) + 1;

  try {
    const { status, body: q, duration } = await api("/api/generate", {
      method: "POST",
      body: JSON.stringify({ ...pick, difficulty: diff }),
    });

    if (status !== 200) {
      log(p, "문제생성", pick.subject, "ERROR", `HTTP ${status}: ${q?.error}`, duration);
      return;
    }

    // UX: 응답 시간 체크
    if (duration > 30000) {
      log(p, "문제생성", "응답시간", "UX", `${duration}ms (30초 초과 — 유저 이탈 위험)`, duration);
    } else if (duration > 15000) {
      log(p, "문제생성", "응답시간", "UX", `${duration}ms (15초 초과 — 느림)`, duration);
    }

    const isObj = pick.session.includes("1");

    // 포맷 검증
    if (isObj) {
      if (!q.choices || q.choices.length !== 5) {
        log(p, "문제생성", "포맷", "BUG", `선택지 ${q.choices?.length || 0}개`, duration);
        return;
      }
      if (typeof q.answer !== "number" || q.answer < 1 || q.answer > 5) {
        log(p, "문제생성", "포맷", "BUG", `정답=${q.answer} (${typeof q.answer})`, duration);
        return;
      }
      // 선택지 중복
      const texts = q.choices.map((c: any) => c.text?.trim().toLowerCase());
      const uniq = new Set(texts);
      if (uniq.size < 5) {
        log(p, "문제생성", "선택지중복", "QUALITY", `중복 선택지 (${5 - uniq.size}개)`, duration);
      }
      // 선택지 유사도
      for (let i = 0; i < q.choices.length; i++) {
        for (let j = i + 1; j < q.choices.length; j++) {
          if (jaccard(q.choices[i].text, q.choices[j].text) > 0.8) {
            log(p, "문제생성", "선택지유사", "QUALITY", `${i+1}번≈${j+1}번 유사도 높음`);
          }
        }
      }
    } else {
      if (typeof q.answer !== "string" || q.answer.length < 20) {
        log(p, "문제생성", "포맷", "BUG", `주관식 답안 ${String(q.answer).length}자`);
        return;
      }
    }

    // 본문/해설 길이
    if (q.body.length < 80 && isObj) {
      log(p, "문제생성", "본문길이", "QUALITY", `${q.body.length}자 (80자 미만)`);
    }
    if (q.explanation.length < 150) {
      log(p, "문제생성", "해설길이", "QUALITY", `${q.explanation.length}자 (150자 미만)`);
    }

    // 정답-해설 일관성 (객관식)
    if (isObj) {
      const explLower = q.explanation.toLowerCase();
      // 해설에서 다른 번호를 정답이라고 하는지
      for (let i = 1; i <= 5; i++) {
        if (i === q.answer) continue;
        if (explLower.includes(`정답은 ${i}`) || explLower.includes(`정답: ${i}`) || explLower.includes(`답은 ${i}번`)) {
          log(p, "문제검증", "정답불일치", "BUG", `해설이 ${i}번 정답이라 하지만 answer=${q.answer}`);
        }
      }

      // 오답 해설 포함 여부
      const hasWrongExpl = q.explanation.includes("①") || q.explanation.includes("②") ||
        q.explanation.includes("1번") || q.explanation.includes("2번") ||
        q.explanation.includes("첫째") || q.explanation.includes("나머지");
      if (!hasWrongExpl) {
        log(p, "문제검증", "오답해설", "QUALITY", `오답별 해설 미포함`);
      }
    }

    log(p, "문제생성", pick.subject, "OK",
      `d=${diff} body=${q.body.length}자 expl=${q.explanation.length}자 verified=${q.verified}`, duration);

  } catch (e: any) {
    log(p, "문제생성", "오류", "ERROR", e.message);
  }
}

function jaccard(a: string, b: string): number {
  const wa = new Set(a.split(/\s+/).filter(w => w.length > 1));
  const wb = new Set(b.split(/\s+/).filter(w => w.length > 1));
  const inter = [...wa].filter(x => wb.has(x)).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 ? inter / union : 0;
}

// ========== 모의고사 ==========
async function testExam(p: Persona) {
  try {
    const { body: list, duration: listDur } = await api("/api/exams", {}, p.cookie);
    if (!list?.exams) { log(p, "모의고사", "목록", "ERROR", "exams 없음"); return; }

    const exam = list.exams[Math.floor(Math.random() * list.exams.length)];
    log(p, "모의고사", "선택", "OK", `${exam.title}`, listDur);

    const { status, body: data, duration } = await api(`/api/exams/${exam.id}`, {}, p.cookie);
    if (status !== 200) {
      log(p, "모의고사", "로드", status === 401 ? "OK" : "ERROR", `HTTP ${status}`, duration);
      return;
    }

    if (duration > 120000) {
      log(p, "모의고사", "생성시간", "UX", `${Math.round(duration/1000)}초 (2분 초과)`, duration);
    }

    const qs = data.questions;
    const isObj = exam.session.includes("1");
    let score = 0, issues: string[] = [];

    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      if (isObj) {
        if (!q.choices || q.choices.length !== 5) { issues.push(`Q${i+1}:선택지${q.choices?.length}`); continue; }
        if (typeof q.answer !== "number") { issues.push(`Q${i+1}:정답타입${typeof q.answer}`); continue; }
        if (Math.random() > 0.4) score++; // 60% 정답률 시뮬
      }
    }

    if (issues.length > 0) log(p, "모의고사", "풀이", "BUG", issues.join(" | "));
    else log(p, "모의고사", "풀이", "OK", `${score}/${qs.length} (${Math.round(score/qs.length*100)}%)`, duration);

    // 제출
    const { body: sub, duration: subDur } = await api(`/api/exams/${exam.id}/submit`, {
      method: "POST", body: JSON.stringify({ score, total: qs.length }),
    }, p.cookie);

    if (sub?.distribution) {
      const d = sub.distribution;
      log(p, "모의고사", "제출+분포", "OK", `응시${d.totalTakers}명 평균${d.average}점 순위${d.myRank}등`, subDur);
    } else {
      log(p, "모의고사", "제출", "BUG", `분포 없음`);
    }
  } catch (e: any) { log(p, "모의고사", "오류", "ERROR", e.message); }
}

// ========== CS/문의 ==========
async function testCS(p: Persona) {
  const inquiries = [
    "문제 정답이 틀린 것 같아요", "환불해주세요", "비밀번호를 잊었어요",
    "문제 생성이 너무 느려요", "기출문제도 제공해주세요", "탈퇴하고 싶어요",
    "영수증 발급해주세요", "카카오 로그인이 안 돼요",
  ];
  const msg = inquiries[Math.floor(Math.random() * inquiries.length)];

  try {
    const { status, body, duration } = await api("/api/support", {
      method: "POST", body: JSON.stringify({ subject: msg, message: `테스트: ${msg}` }),
    }, p.cookie);

    if (status === 200 && body?.autoReply) {
      log(p, "CS", msg.substring(0, 15), "OK", `분류=${body.ticket?.category} 응답${body.autoReply.length}자`, duration);
    } else {
      log(p, "CS", "문의", "BUG", `HTTP ${status}`, duration);
    }
  } catch (e: any) { log(p, "CS", "오류", "ERROR", e.message); }
}

// ========== 오류 신고 ==========
async function testReport(p: Persona) {
  try {
    const { status, body, duration } = await api("/api/report-error", {
      method: "POST",
      body: JSON.stringify({
        questionId: "test-" + Date.now(),
        reportType: ["wrong_answer", "wrong_explanation", "outdated_law"][Math.floor(Math.random() * 3)],
        description: "자동 테스트 신고",
        questionData: {
          body: "甲이 2024년 소득세를 계산할 때 다음 중 올바른 것은?",
          choices: [
            { number: 1, text: "10%" }, { number: 2, text: "20%" },
            { number: 3, text: "30%" }, { number: 4, text: "40%" }, { number: 5, text: "50%" },
          ],
          answer: 2, explanation: "소득세법 제55조에 따라 20% 적용", type: "객관식", subject: "세법학개론", topic: "소득세법 기초",
        },
      }),
    }, p.cookie);

    if (status === 200) log(p, "QA", "오류신고", "OK", `status=${body?.report?.status}`, duration);
    else log(p, "QA", "오류신고", "BUG", `HTTP ${status}`, duration);
  } catch (e: any) { log(p, "QA", "오류신고", "ERROR", e.message); }
}

// ========== 엣지케이스 + 돌발행동 ==========
async function testEdge(p: Persona) {
  // 빈 바디
  const r1 = await api("/api/generate", { method: "POST", body: "{}" });
  if (r1.status >= 400) log(p, "엣지", "빈바디", "OK", `${r1.status}`, r1.duration);
  else log(p, "엣지", "빈바디", "BUG", `${r1.status} (에러 예상)`, r1.duration);

  // 잘못된 세션
  const r2 = await api("/api/generate", { method: "POST", body: JSON.stringify({ subject: "재정학", topic: "공공재", session: "99차", difficulty: 3 }) });
  log(p, "엣지", "99차세션", r2.body?.choices ? "BUG" : "OK", `type=${r2.body?.type}`, r2.duration);

  // 난이도 0, 100
  const r3 = await api("/api/generate", { method: "POST", body: JSON.stringify({ subject: "재정학", topic: "공공재", session: "1차", difficulty: 0 }) });
  log(p, "엣지", "난이도0", r3.status === 200 ? "OK" : "BUG", `status=${r3.status}`, r3.duration);

  // 미인증 API
  const r4 = await api("/api/admin");
  log(p, "엣지", "미인증관리자", r4.status === 403 ? "OK" : "BUG", `${r4.status}`);

  // 미인증 문의
  const r5 = await api("/api/support", { method: "POST", body: JSON.stringify({ subject: "test", message: "test" }) });
  log(p, "엣지", "미인증문의", r5.status === 401 ? "OK" : "BUG", `${r5.status}`);

  // 미인증 시험
  const r6 = await api("/api/exams/1st-finance-r1");
  log(p, "엣지", "미인증시험", r6.status === 401 ? "OK" : "BUG", `${r6.status}`);

  // 존재하지 않는 시험
  const r7 = await api("/api/exams/nonexistent-exam", {}, p.cookie);
  log(p, "엣지", "없는시험", r7.status === 404 ? "OK" : "BUG", `${r7.status}`);

  // 이중 가입
  const r8 = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ email: p.email, name: p.name, password: p.password }) });
  log(p, "엣지", "이중가입", r8.status === 400 ? "OK" : "BUG", `${r8.status} ${r8.body?.error?.substring(0, 30)}`);

  // 잘못된 비밀번호
  const r9 = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: p.email, password: "wrongpass" }) });
  log(p, "엣지", "잘못된비번", r9.status === 401 ? "OK" : "BUG", `${r9.status}`);

  // 점수 제출 잘못된 값
  const r10 = await api("/api/exams/1st-finance-r1/submit", { method: "POST", body: JSON.stringify({ score: -5, total: 0 }) }, p.cookie);
  log(p, "엣지", "잘못된점수", r10.status === 400 ? "OK" : "BUG", `${r10.status}`);
}

// ========== 인증 관련 ==========
async function testAuth(p: Persona) {
  const { body, duration } = await api("/api/auth/me", {}, p.cookie);
  if (body?.user?.email === p.email) log(p, "인증", "세션확인", "OK", `${duration}ms`, duration);
  else log(p, "인증", "세션확인", "BUG", `세션 무효`, duration);

  // 로그아웃 → 재로그인
  await api("/api/auth/logout", { method: "POST" }, p.cookie);
  const { status, cookie } = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: p.email, password: p.password }) });
  if (status === 200) {
    const m = cookie.match(/session=([^;]+)/);
    p.cookie = m ? `session=${m[1]}` : p.cookie;
    log(p, "인증", "로그아웃→재로그인", "OK", "세션 갱신");
  } else {
    log(p, "인증", "재로그인", "BUG", `${status}`);
  }
}

// ========== 페르소나별 행동 ==========
const BEHAVIORS: Record<string, (p: Persona) => Promise<void>> = {
  full_tester: async (p) => {
    await testAllPages(p);
    await testSolveAndVerify(p);
    await testCS(p);
  },
  power_solver: async (p) => {
    await testSolveAndVerify(p, "재정학");
    await testSolveAndVerify(p, "세법학");
    await testSolveAndVerify(p, "회계학");
  },
  complainer: async (p) => {
    await testSolveAndVerify(p);
    await testCS(p);
    await testReport(p);
  },
  exam_taker: async (p) => {
    await testExam(p);
  },
  speed_runner: async (p) => {
    await Promise.all([testSolveAndVerify(p), testSolveAndVerify(p)]);
  },
  careful: async (p) => {
    await testAuth(p);
    await testSolveAndVerify(p);
  },
  random: async (p) => {
    const acts = [testSolveAndVerify, testCS, testReport, testAuth];
    await acts[Math.floor(Math.random() * acts.length)](p);
  },
  essay_solver: async (p) => {
    await testSolveAndVerify(p, "세법학 1부");
    await testSolveAndVerify(p, "회계학 1부");
  },
  ux_checker: async (p) => {
    await testAllPages(p);
  },
  hacker: async (p) => {
    await testEdge(p);
  },
};

// ========== 메인 ==========
async function main() {
  const personas: Persona[] = [
    { id: 1, name: "풀테스터_민수", email: "ft1@test.com", password: "test123", behavior: "full_tester", cookie: "" },
    { id: 2, name: "파워풀이_지훈", email: "ft2@test.com", password: "test123", behavior: "power_solver", cookie: "" },
    { id: 3, name: "불만러_서연", email: "ft3@test.com", password: "test123", behavior: "complainer", cookie: "" },
    { id: 4, name: "모의고사_승우", email: "ft4@test.com", password: "test123", behavior: "exam_taker", cookie: "" },
    { id: 5, name: "스피드_재원", email: "ft5@test.com", password: "test123", behavior: "speed_runner", cookie: "" },
    { id: 6, name: "꼼꼼이_은지", email: "ft6@test.com", password: "test123", behavior: "careful", cookie: "" },
    { id: 7, name: "랜덤_태양", email: "ft7@test.com", password: "test123", behavior: "random", cookie: "" },
    { id: 8, name: "서술형_하늘", email: "ft8@test.com", password: "test123", behavior: "essay_solver", cookie: "" },
    { id: 9, name: "UX체커_유나", email: "ft9@test.com", password: "test123", behavior: "ux_checker", cookie: "" },
    { id: 10, name: "해커_도윤", email: "ft10@test.com", password: "test123", behavior: "hacker", cookie: "" },
  ];

  console.log("=== Opus 모델 종합 테스트 (10인 × 10라운드 × 10분) ===\n");

  for (const p of personas) await register(p);

  const ROUNDS = 10;
  const INTERVAL = 10 * 60 * 1000;

  for (let r = 1; r <= ROUNDS; r++) {
    currentRound = r;
    const start = Date.now();
    console.log(`\n${"=".repeat(70)}`);
    console.log(`라운드 ${r}/${ROUNDS} (${new Date().toLocaleTimeString("ko")})`);
    console.log(`${"=".repeat(70)}`);

    await Promise.all(personas.map(p => BEHAVIORS[p.behavior](p)));

    // 라운드 요약
    const rLogs = logs.filter(l => l.round === r);
    const summary = {
      ok: rLogs.filter(l => l.result === "OK").length,
      bug: rLogs.filter(l => l.result === "BUG").length,
      quality: rLogs.filter(l => l.result === "QUALITY").length,
      ux: rLogs.filter(l => l.result === "UX").length,
      error: rLogs.filter(l => l.result === "ERROR").length,
    };
    const avgDur = rLogs.filter(l => l.durationMs && l.category === "문제생성").map(l => l.durationMs!);
    const avgGen = avgDur.length > 0 ? Math.round(avgDur.reduce((a, b) => a + b, 0) / avgDur.length) : 0;

    console.log(`\n📊 R${r}: ✅${summary.ok} 🐛${summary.bug} ⚠️${summary.quality} 🎨${summary.ux} ❌${summary.error} | 생성평균 ${avgGen}ms`);

    if (r < ROUNDS) {
      const wait = Math.max(0, INTERVAL - (Date.now() - start));
      console.log(`⏳ ${Math.round(wait / 1000)}초 대기...\n`);
      await new Promise(res => setTimeout(res, wait));
    }
  }

  // ========== 최종 결과 ==========
  console.log(`\n${"=".repeat(70)}`);
  console.log("최종 결과");
  console.log(`${"=".repeat(70)}`);

  const total = logs.length;
  const ok = logs.filter(l => l.result === "OK").length;
  const bugs = logs.filter(l => l.result === "BUG");
  const quality = logs.filter(l => l.result === "QUALITY");
  const ux = logs.filter(l => l.result === "UX");
  const errors = logs.filter(l => l.result === "ERROR");

  console.log(`총 ${total}건: ✅${ok} 🐛${bugs.length} ⚠️${quality.length} 🎨${ux.length} ❌${errors.length}`);
  console.log(`성공률: ${(ok / total * 100).toFixed(1)}%`);

  const genLogs = logs.filter(l => l.category === "문제생성" && l.durationMs);
  if (genLogs.length > 0) {
    const durations = genLogs.map(l => l.durationMs!);
    console.log(`\n문제 생성 응답시간:`);
    console.log(`  평균: ${Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)}ms`);
    console.log(`  최소: ${Math.min(...durations)}ms`);
    console.log(`  최대: ${Math.max(...durations)}ms`);
  }

  if (bugs.length) { console.log(`\n🐛 버그:`); bugs.forEach(b => console.log(`  ${b.persona}: [${b.category}] ${b.action} — ${b.detail}`)); }
  if (quality.length) { console.log(`\n⚠️ 품질:`); quality.forEach(q => console.log(`  ${q.persona}: [${q.category}] ${q.action} — ${q.detail}`)); }
  if (ux.length) { console.log(`\n🎨 UX:`); ux.forEach(u => console.log(`  ${u.persona}: [${u.category}] ${u.action} — ${u.detail}`)); }
  if (errors.length) { console.log(`\n❌ 에러:`); errors.forEach(e => console.log(`  ${e.persona}: [${e.category}] ${e.action} — ${e.detail}`)); }

  const { writeFileSync } = await import("fs");
  writeFileSync("data/opus-test-logs.json", JSON.stringify(logs, null, 2));
  console.log(`\n로그: data/opus-test-logs.json`);
}

main().catch(console.error);
