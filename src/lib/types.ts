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
