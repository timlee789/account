// 백엔드 호출 공통 래퍼: base URL, 401 → 로그인 이동, 오류 메시지 추출을 한 곳에서 처리한다.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("Unauthorized", 401);
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).detail ?? "";
    } catch {
      /* JSON 이 아닌 오류 응답(예: 프록시 오류) */
    }
    throw new ApiError(detail || `HTTP ${res.status}`, res.status);
  }
  return res.json();
}

export const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

/** 사용자에게 보여줄 오류 문구 */
export function errorMessage(e: unknown, fallback = "요청을 처리하지 못했습니다."): string {
  if (e instanceof ApiError) {
    if (e.status === 503) return "데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
    return `${fallback} (${e.message})`;
  }
  return "서버에 연결할 수 없습니다.";
}
