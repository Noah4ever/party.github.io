// Simple API client for https://api.thiering.org
// Provides typed helper methods with JSON handling, query param support, abort timeout, and token injection.

// NOTE: Switch base URL depending on environment. For local dev hitting the bundled server use localhost:5000.
// You can override at runtime by calling api.setBaseUrl(newUrl).
const normalizeBase = (url: string) => url.replace(/\/$/, "");

const env: Record<string, string | undefined> =
  typeof process !== "undefined" && process.env ? (process.env as Record<string, string | undefined>) : {};

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}
const rawOverride = env.EXPO_PUBLIC_API_BASE ?? env.API_BASE_URL ?? env.NEXT_PUBLIC_API_BASE; // support multiple conventions
const rawDevFlag = env.EXPO_PUBLIC_DEV_PARTY ?? false;

const isDevFlag = (() => {
  if (rawDevFlag === undefined) return false;
  if (typeof rawDevFlag === "boolean") return rawDevFlag;
  const value = String(rawDevFlag).toLowerCase();
  return value === "true" || value === "1" || value === "development";
})();

let BASE_URL = "https://api.thiering.org/api"; // production default
if (rawOverride) {
  BASE_URL = normalizeBase(rawOverride);
} else if (isDevFlag) {
  BASE_URL = "http://localhost:5000/api"; // local development
}

console.log(`[api] base URL: ${BASE_URL} (dev=${isDevFlag})`);

export function setBaseUrl(url: string) {
  BASE_URL = url.replace(/\/$/, "");
}

export function getBaseUrl() {
  return BASE_URL;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions<TBody = any> {
  method?: HttpMethod;
  path: string; // e.g. '/guests'
  query?: Record<string, any>;
  body?: TBody; // Will be JSON.stringified if not FormData
  headers?: Record<string, string>;
  signal?: AbortSignal; // custom abort signal
  timeoutMs?: number; // default 15s
  raw?: boolean; // if true return Response instead of parsed
}

export interface ApiErrorShape {
  status: number;
  message: string;
  url: string;
  details?: any;
}

export class ApiError extends Error implements ApiErrorShape {
  status: number;
  url: string;
  details?: any;
  constructor(init: ApiErrorShape) {
    super(init.message);
    this.status = init.status;
    this.url = init.url;
    this.details = init.details;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

function buildQuery(query?: Record<string, any>): string {
  if (!query || Object.keys(query).length === 0) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      v.forEach((val) => params.append(k, String(val)));
    } else {
      params.append(k, String(v));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function request<TResponse = any, TBody = any>(opts: RequestOptions<TBody>): Promise<TResponse | Response> {
  const { method = "GET", path, query, body, headers = {}, signal, timeoutMs = 15000, raw } = opts;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const finalSignal = signal ? mergeSignals(signal, controller.signal) : controller.signal;

  const url = `${BASE_URL}${path}${buildQuery(query)}`;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const reqHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    Accept: "application/json",
    ...headers,
  };
  if (authToken) reqHeaders.Authorization = `Bearer ${authToken}`;

  const fetchOptions: RequestInit = {
    method,
    headers: reqHeaders,
    signal: finalSignal,
  };
  if (body !== undefined) {
    fetchOptions.body = isFormData ? (body as any) : JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, fetchOptions);
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === "AbortError") {
      throw new ApiError({
        status: 0,
        url,
        message: "Request aborted (timeout or manual abort)",
      });
    }
    throw new ApiError({
      status: 0,
      url,
      message: err?.message || "Network error",
      details: err,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (raw) return res;

  const text = await res.text();
  let json: any = undefined;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON response */
    }
  }

  if (!res.ok) {
    if (res.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    throw new ApiError({
      status: res.status,
      url,
      message: json?.message || res.statusText || "Request failed",
      details: json,
    });
  }

  return json as TResponse;
}

// Merge multiple AbortSignals into one; minimal implementation
function mergeSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signals.forEach((s) => {
    if (s.aborted) controller.abort();
    else s.addEventListener("abort", onAbort, { once: true });
  });
  return controller.signal;
}

// Convenience shorthand methods
export const api = {
  request,
  setBaseUrl,
  getBaseUrl,
  onUnauthorized: setUnauthorizedHandler,
  get: <T = any>(path: string, query?: Record<string, any>, opts: Partial<RequestOptions> = {}) =>
    request<T>({ path, query, method: "GET", ...opts }),
  post: <T = any, B = any>(path: string, body?: B, opts: Partial<RequestOptions<B>> = {}) =>
    request<T, B>({ path, body, method: "POST", ...opts }),
  put: <T = any, B = any>(path: string, body?: B, opts: Partial<RequestOptions<B>> = {}) =>
    request<T, B>({ path, body, method: "PUT", ...opts }),
  patch: <T = any, B = any>(path: string, body?: B, opts: Partial<RequestOptions<B>> = {}) =>
    request<T, B>({ path, body, method: "PATCH", ...opts }),
  delete: <T = any>(path: string, opts: Partial<RequestOptions> = {}) =>
    request<T>({ path, method: "DELETE", ...opts }),
  setToken: setAuthToken,
  getToken: getAuthToken,
};

// -------- Guests Domain Helpers --------
export interface GuestDTO {
  id: string;
  name: string;
  clue1?: string;
  clue2?: string;
  groupId?: string;
}

export type CreateGuestInput = Omit<GuestDTO, "id" | "groupId">;
export type UpdateGuestInput = Partial<Omit<GuestDTO, "id" | "groupId">>;

export const guestsApi = {
  list: () => api.get<GuestDTO[]>("/guests"),
  get: (id: string) => api.get<GuestDTO>(`/guests/${id}`),
  create: (data: CreateGuestInput) => api.post<GuestDTO, CreateGuestInput>("/guests", data),
  update: (id: string, data: UpdateGuestInput) => api.put<GuestDTO, UpdateGuestInput>(`/guests/${id}`, data),
  remove: (id: string) => api.delete<void>(`/guests/${id}`),
};

export interface TimePenaltyEntryDTO {
  id: string;
  seconds: number;
  reason?: string;
  source?: string;
  questionId?: string | null;
  addedAt: string;
}

export interface GroupProgressDTO {
  completedGames: string[];
  currentGame?: string;
  quizScore?: number;
  attempts?: number;
  selfieUrl?: string;
  selfieUploadedAt?: string;
  lastSelfieChallenge?: string;
  timePenaltySeconds?: number;
  timePenaltyEvents?: TimePenaltyEntryDTO[];
}

export interface GameStateDTO {
  started: boolean;
  startedAt?: string;
  cluesUnlockedAt?: string;
}

export interface UploadSelfieResponse {
  url: string;
  absoluteUrl?: string;
  filename: string;
  guestId?: string | null;
  groupId?: string | null;
  challengeId?: string | null;
  uploadedAt: string;
}

export interface FinalScoreEntryDTO {
  id: string;
  name: string;
  durationMs: number;
  rawDurationMs: number;
  penaltySeconds: number;
  startedAt?: string;
  finishedAt?: string;
}

export interface FinalGroupSummaryDTO {
  groupId: string;
  groupName: string;
  durationMs?: number;
  rawDurationMs?: number;
  penaltySeconds: number;
  placement?: number;
  startedAt?: string;
  finishedAt?: string;
}

export interface FinalSummaryDTO {
  group: FinalGroupSummaryDTO | null;
  totalFinished: number;
  totalGroups: number;
  scoreboard: FinalScoreEntryDTO[];
  fallback?: {
    passwordStartedAt?: string | null;
    gameStartedAt?: string | null;
  };
}

export interface GroupDTO {
  id: string;
  name: string;
  guestIds: string[];
  progress: GroupProgressDTO;
  startedAt?: string;
  finishedAt?: string;
  passwordSolved?: boolean;
  guests?: GuestDTO[];
}

export type CreateGroupInput = {
  name: string;
  guestIds?: string[];
};

export type UpdateGroupInput = Partial<Pick<GroupDTO, "name" | "guestIds" | "progress">>;

export const groupsApi = {
  list: (options?: { expand?: boolean }) => api.get<GroupDTO[]>("/groups", options?.expand ? { expand: 1 } : undefined),
  create: (data: CreateGroupInput) => api.post<GroupDTO, CreateGroupInput>("/groups", data),
  update: (id: string, data: UpdateGroupInput) => api.put<GroupDTO, UpdateGroupInput>(`/groups/${id}`, data),
  remove: (id: string) => api.delete<void>(`/groups/${id}`),
};

export interface AdminDataDump {
  guests: GuestDTO[];
  groups: GroupDTO[];
  neverHaveIEverPacks: NeverHaveIEverPackDTO[];
  quizPacks: QuizPackDTO[];
  passwordGames: PasswordGameConfigDTO[];
  funnyQuestions: FunnyQuestionDTO[];
  funnyAnswers: FunnyAnswerDTO[];
}

export interface AdminUploadEntryDTO {
  filename: string;
  url: string;
  size: number;
  createdAt: string;
  updatedAt?: string;
  uploadedAt?: string;
  guestId?: string | null;
  guestName?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  challengeId?: string | null;
}

export interface AdminUploadListDTO {
  files: AdminUploadEntryDTO[];
}

export const adminApi = {
  downloadData: () => api.get<AdminDataDump>("/admin/data"),
  importData: (data: AdminDataDump) =>
    api.post<{ success: boolean; importedAt: string }, AdminDataDump>("/admin/data", data),
  clearAllData: () => api.post<{ success: boolean; clearedAt: string }>("/admin/clear-data"),
  getGameState: () => api.get<GameStateDTO>("/admin/game-state"),
  startGames: () => api.post<{ success: boolean; state: GameStateDTO }>("/admin/game/start"),
  resetGames: () => api.post<{ success: boolean; state: GameStateDTO }>("/admin/game/reset"),
  listUploads: () => api.get<AdminUploadListDTO>("/admin/uploads"),
};

export const authApi = {
  login: (password: string) =>
    api.post<{ token: string; expiresAt: number; expiresIn: number }, { password: string }>("/auth/login", {
      password,
    }),
  logout: () => api.post<void>("/auth/logout"),
  verify: () => api.get<{ token: string; expiresAt: number }>("/auth/verify"),
};

// -------- Never Have I Ever --------
export interface NeverHaveIEverPackDTO {
  id: string;
  title: string;
  statements: string[];
}

export interface UpsertNeverHaveIEverPackInput {
  title?: string;
  statements?: string[];
}

export const neverHaveIEverApi = {
  list: () => api.get<NeverHaveIEverPackDTO[]>("/games/never-have-i-ever"),
  create: (data: { title: string; statements?: string[] }) =>
    api.post<NeverHaveIEverPackDTO, { title: string; statements?: string[] }>("/games/never-have-i-ever", data),
  update: (id: string, data: UpsertNeverHaveIEverPackInput) =>
    api.put<NeverHaveIEverPackDTO, UpsertNeverHaveIEverPackInput>(`/games/never-have-i-ever/${id}`, data),
  remove: (id: string) => api.delete<void>(`/games/never-have-i-ever/${id}`),
};

// -------- Quiz Packs & Questions --------
export interface QuizAnswerOptionDTO {
  id: string;
  text: string;
  correct?: boolean;
  imageUrl?: string;
}

export interface QuizQuestionDTO {
  id: string;
  question: string;
  answers: QuizAnswerOptionDTO[];
  difficulty?: number;
  imageUrl?: string;
}

export interface QuizPackDTO {
  id: string;
  title: string;
  questions: QuizQuestionDTO[];
}

export const quizApi = {
  list: () => api.get<QuizPackDTO[]>("/games/quiz"),
  createPack: (data: { title: string; questions?: QuizQuestionDTO[] }) =>
    api.post<QuizPackDTO, { title: string; questions?: QuizQuestionDTO[] }>("/games/quiz", data),
  updatePack: (id: string, data: { title?: string }) =>
    api.put<QuizPackDTO, { title?: string }>(`/games/quiz/${id}`, data),
  deletePack: (id: string) => api.delete<void>(`/games/quiz/${id}`),
  addQuestion: (packId: string, data: Omit<QuizQuestionDTO, "id"> & { id?: string }) =>
    api.post<QuizQuestionDTO, typeof data>(`/games/quiz/${packId}/questions`, data),
  updateQuestion: (packId: string, questionId: string, data: Partial<QuizQuestionDTO>) =>
    api.put<QuizQuestionDTO, Partial<QuizQuestionDTO>>(`/games/quiz/${packId}/questions/${questionId}`, data),
  deleteQuestion: (packId: string, questionId: string) =>
    api.delete<void>(`/games/quiz/${packId}/questions/${questionId}`),
};

// -------- Funny Questions & Answers --------
export interface FunnyQuestionDTO {
  id: string;
  question: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FunnyAnswerDTO {
  id: string;
  questionId: string;
  guestId: string;
  answer: string;
  createdAt: string;
  guestName?: string | null;
  groupId?: string | null;
  groupName?: string | null;
}

export const funnyQuestionApi = {
  list: () => api.get<FunnyQuestionDTO[]>("/games/funny-questions"),
  create: (question: string) =>
    api.post<FunnyQuestionDTO, { question: string }>("/games/funny-questions", {
      question,
    }),
  update: (id: string, question: string) =>
    api.put<FunnyQuestionDTO, { question: string }>(`/games/funny-questions/${id}`, { question }),
  remove: (id: string) => api.delete<void>(`/games/funny-questions/${id}`),
  getWithAnswers: (id: string) =>
    api.get<{ question: FunnyQuestionDTO; answers: FunnyAnswerDTO[] }>(`/games/funny-questions/${id}/answers`),
  removeAnswer: (questionId: string, answerId: string) =>
    api.delete<void>(`/games/funny-questions/${questionId}/answers/${answerId}`),
  addAnswer: (questionId: string, answer: string, guestId: string) =>
    api.post(`/games/funny-answers/${questionId}`, { answer, guestId }),
};

// -------- Password Game Configs --------
export interface PasswordGameConfigDTO {
  id: string;
  validPasswords: string[];
  requiredCorrectGroups?: number;
  active: boolean;
  startedAt?: string;
  endedAt?: string;
  updatedAt?: string;
}

export interface PasswordAttemptResponseDTO {
  correct: boolean;
  solved: boolean;
  ended: boolean;
}

export const passwordGameApi = {
  get: () => api.get<PasswordGameConfigDTO>("/games/password-game"),
  update: (data: { validPasswords?: string[]; active?: boolean }) =>
    api.patch<PasswordGameConfigDTO, { validPasswords?: string[]; active?: boolean }>("/games/password-game", data),
  replace: (data: { validPasswords: string[]; active?: boolean }) =>
    api.post<PasswordGameConfigDTO, { validPasswords: string[]; active?: boolean }>("/games/password-game", data),
  addPassword: (password: string) =>
    api.post<PasswordGameConfigDTO, { password: string }>("/games/password-game/passwords", { password }),
  removePassword: (password: string) =>
    api.delete<void>(`/games/password-game/passwords/${encodeURIComponent(password)}`),
  start: () => api.post<PasswordGameConfigDTO>("/games/password-game/start"),
  attempt: (groupId: string, password: string, options?: { configId?: string }) =>
    api.post<PasswordAttemptResponseDTO, { groupId: string; password: string }>(
      options?.configId ? `/games/password-game/${options.configId}/attempt` : "/games/password-game/attempt",
      { groupId, password }
    ),
};

// -------- Public Game APIs --------
export const gameApi = {
  getNHIE: () => api.get<NeverHaveIEverPackDTO[]>("/games/never-have-i-ever"),
  getQuizQuestions: () => api.get<QuizPackDTO[]>("/games/quiz"),
  createFunnyAnswer: (questionId: string, answer: string, guestId: string) =>
    api.post<FunnyAnswerDTO, { answer: string; guestId: string }>(`/games/funny-answers/${questionId}`, {
      answer,
      guestId,
    }),
  getGameState: () => api.get<GameStateDTO>("/games/state"),
  getPartnerClues: (guestId: string) =>
    api.get<{
      unlocked: boolean;
      clues: string[];
      partnerId: string | null;
      partnerName: string | null;
      groupId?: string | null;
      groupName?: string | null;
    }>(`/games/guests/${guestId}/clues`),
  verifyPartner: (guestId: string, partnerId: string) =>
    api.post<
      {
        match: boolean;
        groupId?: string;
        groupName?: string;
        partner?: { id: string; name: string };
        completedGames?: string[];
        completedCount?: number;
      },
      { guestId: string; partnerId: string }
    >("/games/partner/verify", { guestId, partnerId }),
  recordProgress: (groupId: string, gameId: string) =>
    api.post<
      {
        success: boolean;
        completedGames: string[];
        completedCount: number;
      },
      { gameId: string }
    >(`/games/groups/${groupId}/progress`, { gameId }),
  addTimePenalty: (groupId: string, data: { seconds: number; reason?: string; source?: string; questionId?: string }) =>
    api.post<
      {
        success: boolean;
        totalPenaltySeconds: number;
        penalty: TimePenaltyEntryDTO;
      },
      { seconds: number; reason?: string; source?: string; questionId?: string }
    >(`/games/groups/${groupId}/time-penalty`, data),
  getFinalSummary: (groupId: string) => api.get<FinalSummaryDTO>("/games/final-summary", { groupId }),
  uploadSelfie: (data: FormData) => api.post<UploadSelfieResponse, FormData>("/upload", data, { timeoutMs: 20000 }),
};

// Example usage (remove or comment out in production):
// api.get('/health').then(console.log).catch(console.error);

export default api;
