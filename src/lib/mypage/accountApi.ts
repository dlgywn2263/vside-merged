const API_BASE = "http://localhost:8080";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();

    let message = "요청 처리 중 오류가 발생했습니다.";

    try {
      const json = JSON.parse(text);
      message = json.message ?? json.error ?? message;
    } catch {
      if (text) message = text;
    }

    throw new Error(message);
  }

  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function changeMyEmailApi(email: string) {
  return authFetch("/api/users/me/email", {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });
}

export async function changeMyPasswordApi(
  currentPassword: string,
  newPassword: string,
) {
  return authFetch("/api/users/me/password", {
    method: "PATCH",
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}

export async function deleteMyAccountApi() {
  return authFetch("/api/users/me", {
    method: "DELETE",
  });
}
