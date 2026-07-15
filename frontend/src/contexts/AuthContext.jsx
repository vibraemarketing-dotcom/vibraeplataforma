import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { http, formatApiError } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // null = checking, false = logged out, obj = logged in
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("vibrae_token");
        if (!token) { if (!cancelled) setUser(false); return; }
        const { data } = await http.get("/auth/me");
        if (!cancelled) setUser(data);
      } catch (e) {
        if (!cancelled) setUser(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    setError("");
    try {
      const { data } = await http.post("/auth/login", { email, password });
      localStorage.setItem("vibrae_token", data.token);
      setUser(data.user);
      return data.user;
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await http.post("/auth/logout");
    } catch (e) {
      console.warn("Logout endpoint falhou (não crítico):", e?.message);
    }
    localStorage.removeItem("vibrae_token");
    setUser(false);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, login, logout, error }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() { return useContext(AuthCtx); }
