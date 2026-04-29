const API_BASE = "http://localhost:8080";

function getToken() {
  if (typeof window === "undefined") return null;

  const candidates = ["accessToken", "token", "jwt", "authToken"];

  for (const key of candidates) {
    const value = localStorage.getItem(key);

    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

async function authFetch(url: string, options: RequestInit = {}) {
  try {
    const token = getToken();

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      let message = "요청 처리 중 오류가 발생했습니다.";

      try {
        const json = JSON.parse(text);
        message = json.message ?? json.error ?? message;
      } catch {
        if (text) message = text;
      }

      console.error("[account api] request failed:", {
        url,
        status: response.status,
        statusText: response.statusText,
        message,
      });

      throw new Error(message);
    }

    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    console.error("[account api] authFetch error:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("알 수 없는 오류가 발생했습니다.");
  }
}

export async function changeMyEmailApi(email: string) {
  try {
    return await authFetch("/api/users/me/email", {
      method: "PATCH",
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    console.error("[account api] changeMyEmailApi failed:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("이메일 변경에 실패했습니다.");
  }
}

export async function changeMyPasswordApi(
  currentPassword: string,
  newPassword: string,
) {
  try {
    return await authFetch("/api/users/me/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
  } catch (error) {
    console.error("[account api] changeMyPasswordApi failed:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("비밀번호 변경에 실패했습니다.");
  }
}

export async function deleteMyAccountApi() {
  try {
    return await authFetch("/api/users/me", {
      method: "DELETE",
    });
  } catch (error) {
    console.error("[account api] deleteMyAccountApi failed:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("회원 탈퇴에 실패했습니다.");
  }
}
