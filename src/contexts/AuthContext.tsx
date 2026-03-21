"use client";

import { createContext, useContext, useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  token?: string; // 로그인 JWT 저장용
};

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  login: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // 새로고침 시 로그인 유지
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const login = (user: User) => {
    setUser(user);

    // 기존 user 저장 구조 유지
    localStorage.setItem("user", JSON.stringify(user));

    // 토큰이 있으면 따로도 저장
    if (user.token) {
      localStorage.setItem("accessToken", user.token);
    }

    // 개발일지 API에서 아직 X-USER-ID 헤더를 쓰고 있으므로 userId도 따로 저장
    localStorage.setItem("userId", user.id);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userId");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
