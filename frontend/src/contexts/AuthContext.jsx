import { createContext, useContext, useEffect, useState } from "react";
import { http, formatApiError } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // null = checking, false = logged out, obj = logged in
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const t = localStorage.getItem("vibrae_token");
        if (!t) { setUser(false); return; }
        const { data } = await http.get("/auth/me");
        setUser(data);
      } catch {
        setUser(false);
      }
    })();
  }, []);

  async function login(email, password) {
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
  }

  async function logout() {
    try { await http.post("/auth/logout"); } catch {}
    localStorage.removeItem("vibrae_token");
    setUser(false);
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, error }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() { return useContext(AuthCtx); }
