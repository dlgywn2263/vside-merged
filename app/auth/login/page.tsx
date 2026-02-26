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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const canSubmit = useMemo(() => {
    return isEmail(email) && password.length > 0;
  }, [email, password]);

  const { login } = useAuth();
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // ✅ 이거 반드시 필요

    const user = {
      id: "u1",
      name: "이효숭",
      email: "hyoju@example.com",
    };

    login(user);
    router.replace("/dashboard"); // ✅ 메인 페이지 경로
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto flex min-h-dvh items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-10 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-gray-900 text-white grid place-items-center font-bold">
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
                  type={showPw ? "text" : "password"} // ✅ 수정
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

            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "w-full rounded-2xl px-4 py-4 text-md font-semibold transition mt-3",
                canSubmit
                  ? "bg-gray-900 text-white hover:bg-black shadow-sm"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed",
              )}
            >
              로그인
            </button>

            <div className="flex items-center justify-between text-sm text-gray-600 mt-5">
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
