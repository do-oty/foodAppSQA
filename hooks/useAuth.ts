import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiUser } from '../services/api';

type AuthState = {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

type UseAuthReturn = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
};

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Track mount state to avoid setting state after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const setPartial = (partial: Partial<AuthState>) => {
    if (isMounted.current) setState((prev) => ({ ...prev, ...partial }));
  };

  // ── Bootstrap: load token and fetch profile on mount ─────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await api.loadToken();
        if (!api.getToken()) {
          setPartial({ isLoading: false });
          return;
        }
        const result = await api.me();
        if (result.success && result.data) {
          setPartial({ user: result.data, isAuthenticated: true, isLoading: false });
        } else {
          await api.clearToken();
          setPartial({ isLoading: false });
        }
      } catch {
        await api.clearToken();
        setPartial({ isLoading: false });
      }
    };
    bootstrap();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setPartial({ isLoading: true, error: null });
    try {
      const result = await api.login(email, password);
      if (result.success && result.data?.user) {
        setPartial({ user: result.data.user, isAuthenticated: true, isLoading: false });
      } else {
        throw new Error('Login failed. Please check your credentials.');
      }
    } catch (err) {
      setPartial({
        error: err instanceof Error ? err.message : 'Login failed.',
        isLoading: false,
      });
      throw err;
    }
  }, []);

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(
    async (data: { email: string; password: string; full_name: string; phone?: string }) => {
      setPartial({ isLoading: true, error: null });
      try {
        const result = await api.register(data);
        if (result.success && result.data?.user) {
          setPartial({ user: result.data.user, isAuthenticated: true, isLoading: false });
        } else {
          throw new Error('Registration failed. Please try again.');
        }
      } catch (err) {
        setPartial({
          error: err instanceof Error ? err.message : 'Registration failed.',
          isLoading: false,
        });
        throw err;
      }
    },
    []
  );

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await api.logout();
    setPartial({ user: null, isAuthenticated: false, error: null });
  }, []);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const result = await api.me();
      if (result.success && result.data) {
        setPartial({ user: result.data });
      }
    } catch {
      // silently ignore
    }
  }, []);

  // ── Clear error ───────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    setPartial({ error: null });
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    clearError,
  };
}
