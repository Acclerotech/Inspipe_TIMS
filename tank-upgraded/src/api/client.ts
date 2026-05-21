const BASE = '/api';

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API ${status}`);
  }
}

// ---------------------------
// TOKEN
// ---------------------------
export function getToken(): string | null {
  return localStorage.getItem('tims_token');
}

export function setToken(token: string): void {
  localStorage.setItem('tims_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('tims_token');
}

// ---------------------------
// CORE REQUEST
// ---------------------------
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

// ---------------------------
export const api = {
  get: <T>(p: string) => request<T>(p),

  post: <T>(p: string, b?: unknown) =>
    request<T>(p, {
      method: 'POST',
      body: b ? JSON.stringify(b) : undefined,
    }),

  patch: <T>(p: string, b?: unknown) =>
    request<T>(p, {
      method: 'PATCH',
      body: b ? JSON.stringify(b) : undefined,
    }),

  put: <T>(p: string, b?: unknown) =>
    request<T>(p, {
      method: 'PUT',
      body: b ? JSON.stringify(b) : undefined,
    }),

  delete: <T>(p: string) =>
    request<T>(p, { method: 'DELETE' }),
};