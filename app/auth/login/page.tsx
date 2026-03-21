"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

const API_BASE = "http://localhost:8080";

type LoginResponse = {
  accessToken: string;
  userId: number;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return isEmail(email) && password.length > 0 && !loading;
  }, [email, password, loading]);

  const { login } = useAuth();
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canSubmit) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (!res.ok) {
        throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
      }

      const data: LoginResponse = await res.json();

      /**
       * AuthContext에 로그인 상태 저장
       * 현재 백엔드 로그인 응답에는 nickname이 없으므로
       * 우선 name에는 이메일을 넣어 둠
       */
      login({
        id: String(data.userId),
        name: email.trim(),
        email: email.trim(),
        token: data.accessToken,
      });

      router.replace("/dashboard");
    } catch (err) {
      console.error("로그인 실패:", err);
      setError(
        err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto flex min-h-dvh items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-10 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gray-900 font-bold text-white">
              V
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-800">
                아이디
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={cn(
                  "mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-gray-900 outline-none transition",
                  email
                    ? isEmail(email)
                      ? "border-emerald-200 ring-2 ring-emerald-50"
                      : "border-rose-200 ring-2 ring-rose-50"
                    : "border-gray-200 focus:ring-2 focus:ring-gray-100",
                )}
              />
              {email && !isEmail(email) ? (
                <p className="mt-1 text-xs text-rose-600">
                  이메일 형식이 아니에요.
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-800">
                비밀번호
              </label>
              <div className="relative mt-1">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 text-gray-900 outline-none transition focus:ring-2 focus:ring-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-gray-500 hover:bg-gray-50"
                  aria-label="비밀번호 보기 토글"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "mt-3 w-full rounded-2xl px-4 py-4 text-md font-semibold transition",
                canSubmit
                  ? "bg-gray-900 text-white shadow-sm hover:bg-black"
                  : "cursor-not-allowed bg-gray-200 text-gray-500",
              )}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>

            <div className="mt-5 flex items-center justify-between text-sm text-gray-600">
              <span>아직 계정이 없어요</span>
              <Link
                href="/auth/signup"
                className="font-semibold text-gray-900 hover:underline"
              >
                회원가입
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
