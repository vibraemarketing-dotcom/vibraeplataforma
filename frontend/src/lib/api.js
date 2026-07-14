import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const http = axios.create({
  baseURL: API,
  withCredentials: false,
});

http.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("vibrae_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export function formatApiError(detail) {
  if (detail == null) return "Ocorreu um erro. Tente novamente.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function waLink(phone) {
  if (!phone) return "#";
  const digits = String(phone).replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export function currency(n) {
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
