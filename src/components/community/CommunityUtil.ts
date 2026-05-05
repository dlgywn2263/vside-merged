export type CurrentUser = {
  id: string;
  email?: string;
  name?: string;
  nickname?: string;
};

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;

  try {
    const rawUser = localStorage.getItem("user");

    if (rawUser) {
      const parsedUser = JSON.parse(rawUser);

      if (parsedUser?.id) {
        return {
          id: String(parsedUser.id),
          email: parsedUser.email,
          name: parsedUser.name,
          nickname: parsedUser.nickname,
        };
      }
    }

    const userId = localStorage.getItem("userId");

    if (userId) {
      return {
        id: String(userId),
      };
    }

    return null;
  } catch {
    const userId = localStorage.getItem("userId");

    return userId ? { id: String(userId) } : null;
  }
}

export function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};

  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");

  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}