/**
 * 자체 명칭 풀
 * - 문제에서 사용하는 인물명, 회사명을 자체 브랜드로 통일
 * - 기존 교재/기출과 구분 + 저작권 리스크 제거
 * - 매번 랜덤 조합으로 다양성 확보
 */

const PERSON_FIRST = ["하늘", "별", "솔", "담", "온", "찬", "새", "빈", "결", "율", "단", "샘", "한", "시", "준"];
const PERSON_LAST = ["이", "박", "정", "최", "강", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안"];

const COMPANY_PREFIX = ["블루", "그린", "솔라", "넥스", "코어", "프라임", "스카이", "퓨처", "미래", "온빛", "한울", "새봄", "다온", "소망", "빛나"];
const COMPANY_SUFFIX = ["테크", "산업", "물산", "홀딩스", "상사", "건설", "식품", "제약", "에너지", "로지스", "커머스", "바이오", "소프트", "글로벌", "파트너스"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomPerson(): string {
  return `${pick(PERSON_LAST)}${pick(PERSON_FIRST)}`;
}

export function randomCompany(): string {
  return `(주)${pick(COMPANY_PREFIX)}${pick(COMPANY_SUFFIX)}`;
}

export function randomCompanyShort(): string {
  return `${pick(COMPANY_PREFIX)}${pick(COMPANY_SUFFIX)}`;
}

/**
 * 문제 생성용 명칭 세트 반환
 * 매번 다른 조합
 */
export function getNameSet(): {
  person1: string;
  person2: string;
  person3: string;
  company1: string;
  company2: string;
  instruction: string;
} {
  const p1 = randomPerson();
  let p2 = randomPerson();
  while (p2 === p1) p2 = randomPerson();
  let p3 = randomPerson();
  while (p3 === p1 || p3 === p2) p3 = randomPerson();

  const c1 = randomCompany();
  let c2 = randomCompany();
  while (c2 === c1) c2 = randomCompany();

  return {
    person1: p1,
    person2: p2,
    person3: p3,
    company1: c1,
    company2: c2,
    instruction: `## 명칭 규칙
사례에서 인물명은 "${p1}", "${p2}", "${p3}" 등을, 회사명은 "${c1}", "${c2}" 등을 사용하세요.
甲·乙·丙, 김○○, (주)대한~, A사/B사 같은 표현 대신 위 이름을 사용하세요.`,
  };
}
