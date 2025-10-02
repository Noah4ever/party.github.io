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
  finishedAt?: string; // if password solved
  passwordSolved?: boolean;
}

export interface GroupProgress {
  // You can extend per-game progress later
  completedGames: string[]; // e.g. ['never-have-i-ever', 'quiz']
  currentGame?: string; // id of current game
  quizScore?: number;
  attempts?: number; // password attempts
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

export interface PasswordGameConfig {
  id: string; // single active maybe
  validPasswords: string[]; // 5 possible
  requiredCorrectGroups?: number; // e.g. 4 groups to end (optional now)
  active: boolean;
  startedAt?: string;
  endedAt?: string;
  updatedAt?: string;
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

export interface GameState {
  started: boolean;
  startedAt?: string;
  cluesUnlockedAt?: string;
}

export interface DataShape {
  guests: Guest[];
  groups: Group[];
  neverHaveIEverPacks: NeverHaveIEverPack[];
  quizPacks: QuizPack[];
  passwordGames: PasswordGameConfig[];
  funnyQuestions: FunnyQuestion[];
  funnyAnswers: FunnyAnswer[];
  gameState: GameState;
}

export const DEFAULT_DATA: DataShape = {
  guests: [],
  groups: [],
  neverHaveIEverPacks: [],
  quizPacks: [],
  passwordGames: [],
  funnyQuestions: [],
  funnyAnswers: [],
  gameState: {
    started: false,
  },
};
