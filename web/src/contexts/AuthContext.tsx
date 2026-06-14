import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken } from "../services/api";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("sg_token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    setAuthToken(token);
    api
      .get<User>("/auth/me")
      .then((response) => setUser(response.data))
      .catch(() => {
        localStorage.removeItem("sg_token");
        setToken(null);
        setAuthToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function login(email: string, password: string) {
    const response = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
    localStorage.setItem("sg_token", response.data.token);
    setAuthToken(response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
  }

  function logout() {
    localStorage.removeItem("sg_token");
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ user, token, loading, login, logout }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa estar dentro de AuthProvider.");
  }

  return context;
}
