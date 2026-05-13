import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

import { clearToken, setToken, getToken } from '../api/client';

// ---------------------------
interface AuthUser {
  email: string;
  name: string;
  initials: string;
  role: string;
  roles: string[];
}

// ---------------------------
interface AuthContextValue {
  loggedIn: boolean;
  user: AuthUser | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  initializing: boolean;
}

// ---------------------------
function normalizeRole(role?: string): string | undefined {
  if (!role) return undefined;
  return role.replace(/^ROLE_/, '');
}

// ---------------------------
function buildUser(data: any): AuthUser {
  const fullName = data.fullName ?? '';
  const email = data.email ?? '';

  const role = normalizeRole(data.role);

  const roles: string[] = Array.isArray(data.roles)
    ? data.roles.map((r: string) => normalizeRole(r)).filter(Boolean)
    : role
      ? [role]
      : [];

  const name =
    fullName ||
    email
      .split('@')[0]
      .replace('.', ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const initials = name
    .split(' ')
    .map((w: string) => w?.[0] ?? '')
    .join('')
    .toUpperCase();

  return {
    email,
    name,
    initials,
    role: role ?? (data.role ? normalizeRole(data.role) ?? '' : ''),
    roles,
  };
}

// ---------------------------
const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // ---------------------------
  // HYDRATE
  // ---------------------------
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setInitializing(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const email = payload.sub;

      setUser(
        buildUser({
          email,
          fullName: '',
          role: payload.roles?.[0],
          roles: payload.roles,
        })
      );

      setLoggedIn(true);
    } catch {
      clearToken();
    }

    setInitializing(false);
  }, []);

  // ---------------------------
  // LOGIN
  // ---------------------------
  const login = useCallback(async (email: string) => {
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error(`Login failed: ${res.status}`);

      const data = await res.json();

      const token = data.accessToken ?? data.token;
      setToken(token);

      // 🔥 USE BACKEND AS SOURCE OF TRUTH
      const authUser = buildUser(data);

      setUser(authUser);
      setLoggedIn(true);
    } catch (e: any) {
      setError(e.message || 'Login failed');
      throw e;
    }
  }, []);

  // ---------------------------
  // LOGOUT
  // ---------------------------
  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setLoggedIn(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ loggedIn, user, login, logout, error, initializing }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}