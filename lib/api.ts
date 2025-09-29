// Simple API client for https://api.thiering.org
// Provides typed helper methods with JSON handling, query param support, abort timeout, and token injection.

// NOTE: Switch base URL depending on environment. For local dev hitting the bundled server use localhost:5000.
// You can override at runtime by calling api.setBaseUrl(newUrl).
const normalizeBase = (url: string) => url.replace(/\/$/, "");

const env: Record<string, string | undefined> =
  typeof process !== "undefined" && process.env
    ? (process.env as Record<string, string | undefined>)
    : {};
const rawOverride =
  env.EXPO_PUBLIC_API_BASE ?? env.API_BASE_URL ?? env.NEXT_PUBLIC_API_BASE; // support multiple conventions
const rawDevFlag = env.EXPO_PUBLIC_DEV ?? env.DEV ?? env.NODE_ENV;

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

export function setBaseUrl(url: string) {
  BASE_URL = url.replace(/\/$/, "");
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

async function request<TResponse = any, TBody = any>(
  opts: RequestOptions<TBody>
): Promise<TResponse | Response> {
  const {
    method = "GET",
    path,
    query,
    body,
    headers = {},
    signal,
    timeoutMs = 15000,
    raw,
  } = opts;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const finalSignal = signal
    ? mergeSignals(signal, controller.signal)
    : controller.signal;

  const url = `${BASE_URL}${path}${buildQuery(query)}`;

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

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
  get: <T = any>(
    path: string,
    query?: Record<string, any>,
    opts: Partial<RequestOptions> = {}
  ) => request<T>({ path, query, method: "GET", ...opts }),
  post: <T = any, B = any>(
    path: string,
    body?: B,
    opts: Partial<RequestOptions<B>> = {}
  ) => request<T, B>({ path, body, method: "POST", ...opts }),
  put: <T = any, B = any>(
    path: string,
    body?: B,
    opts: Partial<RequestOptions<B>> = {}
  ) => request<T, B>({ path, body, method: "PUT", ...opts }),
  patch: <T = any, B = any>(
    path: string,
    body?: B,
    opts: Partial<RequestOptions<B>> = {}
  ) => request<T, B>({ path, body, method: "PATCH", ...opts }),
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
  create: (data: CreateGuestInput) =>
    api.post<GuestDTO, CreateGuestInput>("/guests", data),
  update: (id: string, data: UpdateGuestInput) =>
    api.put<GuestDTO, UpdateGuestInput>(`/guests/${id}`, data),
  remove: (id: string) => api.delete<void>(`/guests/${id}`),
};

// Example usage (remove or comment out in production):
// api.get('/health').then(console.log).catch(console.error);

export default api;
