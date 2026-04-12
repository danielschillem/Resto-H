"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { User } from "@/types";
import { api } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    formation_code?: string,
  ) => Promise<void>;
  loginByCode: (
    formation_id: number,
    role: string,
    code: string,
  ) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  loginByCode: async () => {},
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("sgrh_user");
    const token = localStorage.getItem("sgrh_token");
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string, formation_code?: string) => {
      const res = await api.login(email, password, formation_code);
      localStorage.setItem("sgrh_token", res.token);
      localStorage.setItem("sgrh_user", JSON.stringify(res.user));
      setUser(res.user);
    },
    [],
  );

  const loginByCode = useCallback(
    async (formation_id: number, role: string, code: string) => {
      const res = await api.loginByCode(formation_id, role, code);
      localStorage.setItem("sgrh_token", res.token);
      localStorage.setItem("sgrh_user", JSON.stringify(res.user));
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    api.logout().catch(() => {});
    localStorage.removeItem("sgrh_token");
    localStorage.removeItem("sgrh_user");
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const u = await api.me();
      localStorage.setItem("sgrh_user", JSON.stringify(u));
      setUser(u);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginByCode, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
