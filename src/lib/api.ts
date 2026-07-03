"use client";

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    return { success: false, error: "Unauthorized" };
  }

  return res.json();
}

export function apiGet<T>(url: string) {
  return apiRequest<T>(url);
}

export function apiPost<T>(url: string, body: unknown) {
  return apiRequest<T>(url, { method: "POST", body: JSON.stringify(body) });
}

export function apiPut<T>(url: string, body: unknown) {
  return apiRequest<T>(url, { method: "PUT", body: JSON.stringify(body) });
}

export function apiDelete(url: string) {
  return apiRequest(url, { method: "DELETE" });
}
