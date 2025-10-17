export interface Guest {
  id: string;
  name: string;
  clue1?: string;
  clue2?: string;
  groupId?: string; // duo group id
}

export interface Group {
  id: string;
  name: string; // duo group name
  guestIds: string[]; // length 0-2 typically
  progress: GroupProgress;
  startedAt?: string; // ISO time when game started
  finishedAt?: string;
}

export interface GroupProgress {
  // You can extend per-game progress later
  completedGames: string[]; // e.g. ['never-have-i-ever', 'quiz']
  currentGame?: string; // id of current game
  quizScore?: number;
  selfieUrl?: string;
  selfieUploadedAt?: string;
  lastSelfieChallenge?: string;
  timePenaltySeconds?: number;
  timePenaltyEvents?: TimePenaltyEntry[];
}

export interface TimePenaltyEntry {
  id: string;
  seconds: number;
  reason?: string;
  source?: string;
  questionId?: string;
  addedAt: string;
}

export interface NeverHaveIEverPack {
  id: string;
  title: string;
  statements: string[]; // list of statements
}

export interface QuizQuestion {
  id: string;
  question: string;
  answers: { id: string; text: string; correct?: boolean; imageUrl?: string }[];
  imageUrl?: string;
  difficulty?: number;
}

export interface QuizPack {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface FunnyQuestion {
  id: string;
  question: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FunnyAnswer {
  id: string;
  questionId: string;
  guestId: string;
  answer: string;
  createdAt: string;
}

export interface UploadRecord {
  filename: string;
  guestId?: string | null;
  groupId?: string | null;
  challengeId?: string | null;
  uploadedAt: string;
}

export interface GameState {
  started: boolean;
  startedAt?: string;
  cluesUnlockedAt?: string;
}

export interface QuizPenaltyConfig {
  lowPenaltySeconds: number;
  minorPenaltySeconds: number;
  majorPenaltySeconds: number;
}

export interface DataShape {
  guests: Guest[];
  groups: Group[];
  neverHaveIEverPacks: NeverHaveIEverPack[];
  quizPacks: QuizPack[];
  funnyQuestions: FunnyQuestion[];
  funnyAnswers: FunnyAnswer[];
  uploads: UploadRecord[];
  gameState: GameState;
  quizPenaltyConfig: QuizPenaltyConfig;
}

export const DEFAULT_DATA: DataShape = {
  guests: [],
  groups: [],
  neverHaveIEverPacks: [],
  quizPacks: [],
  funnyQuestions: [],
  funnyAnswers: [],
  uploads: [],
  gameState: {
    started: false,
  },
  quizPenaltyConfig: {
    lowPenaltySeconds: 30,
    minorPenaltySeconds: 60,
    majorPenaltySeconds: 180,
  },
};
