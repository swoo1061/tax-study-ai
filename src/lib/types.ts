export type Session = "1차" | "2차";

export interface Subject {
  code: string;
  name: string;
  session: Session;
  topics: string[];
}

export interface Choice {
  number: number;
  text: string;
}

export interface Question {
  id: string;
  subject: string;
  topic: string;
  difficulty: number;
  session: Session;
  type: "객관식" | "주관식";
  body: string;
  choices?: Choice[];
  answer: number | string;
  explanation: string;
}

export interface AttemptRecord {
  id: string;
  questionId: string;
  subject: string;
  topic: string;
  difficulty: number;
  session: Session;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  timestamp: number;
}

export interface SubjectStats {
  subject: string;
  total: number;
  correct: number;
  rate: number;
}

export interface TopicStats {
  topic: string;
  subject: string;
  total: number;
  correct: number;
  rate: number;
}

export interface DailyCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ExamConfig {
  session: Session;
  subjectCode: string;
  questionCount: number;
  timeLimitMinutes: number;
}

export interface ExamResult {
  id: string;
  config: ExamConfig;
  questions: Question[];
  answers: (number | string | null)[];
  results: boolean[];
  score: number;
  total: number;
  startedAt: number;
  finishedAt: number;
}

export interface SavedQuestion extends Question {
  bookmarkedAt: number;
}
