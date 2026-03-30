"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

const API_BASE = "http://localhost:8080";

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    email: "",
    password: "",
    password2: "",
  });

  const [agree, setAgree] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  });

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const passwordOk = useMemo(() => {
    return form.password.length >= 8;
  }, [form.password]);

  const passwordMatch = useMemo(() => {
    if (!form.password2) return false;
    return form.password === form.password2;
  }, [form.password, form.password2]);

  const requiredAgreed = useMemo(() => {
    return agree.terms && agree.privacy;
  }, [agree.terms, agree.privacy]);

  const canSubmit = useMemo(() => {
    return (
      form.nickname.trim().length >= 2 &&
      isEmail(form.email) &&
      passwordOk &&
      passwordMatch &&
      requiredAgreed &&
      !loading
    );
  }, [form, passwordOk, passwordMatch, requiredAgreed, loading]);

  const setAllAgree = (checked: boolean) => {
    setAgree({
      all: checked,
      terms: checked,
      privacy: checked,
      marketing: checked,
    });
  };

  const setAgreeItem = (
    key: "terms" | "privacy" | "marketing",
    checked: boolean,
  ) => {
    const next = { ...agree, [key]: checked };
    const allChecked = next.terms && next.privacy && next.marketing;
    setAgree({ ...next, all: allChecked });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          nickname: form.nickname.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("회원가입에 실패했습니다. 입력값을 다시 확인해주세요.");
      }

      router.replace("/auth/login");
    } catch (err) {
      console.error("회원가입 실패:", err);
      setError(
        err instanceof Error ? err.message : "회원가입 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-50 to-white">
      <div className="flex min-h-dvh items-center justify-center px-6 py-10">
        <div className="flex items-center justify-center">
          <div className="w-[700px] rounded-3xl border border-gray-200 bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">회원가입</h2>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gray-900 font-bold text-white">
                V
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {/* <Field
                label="이름"
                value={form.name}
                placeholder="예) 이효주"
                onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                hint="2글자 이상"
                ok={form.name.trim().length >= 2}
                showOkWhenFilled
              /> */}

              <Field
                label="닉네임"
                value={form.nickname}
                placeholder="예) mongki"
                onChange={(v) => setForm((p) => ({ ...p, nickname: v }))}
                hint="2글자 이상"
                ok={form.nickname.trim().length >= 2}
                showOkWhenFilled
              />

              <Field
                label="아이디 (이메일)"
                value={form.email}
                placeholder="you@example.com"
                onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                hint="이메일 형식으로 입력"
                ok={isEmail(form.email)}
                showOkWhenFilled
                type="email"
              />

              <div>
                <LabelRow
                  label="비밀번호"
                  ok={passwordOk}
                  showOkWhenFilled={!!form.password}
                />
                <div className="relative mt-1">
                  <input
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, password: e.target.value }))
                    }
                    placeholder="8자 이상"
                    className={cn(
                      "w-full rounded-2xl border bg-white px-4 py-3 pr-12 text-gray-900 outline-none transition",
                      form.password
                        ? passwordOk
                          ? "border-emerald-200 ring-2 ring-emerald-50"
                          : "border-rose-200 ring-2 ring-rose-50"
                        : "border-gray-200 focus:ring-2 focus:ring-gray-100",
                    )}
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
                <p
                  className={cn(
                    "mt-1 text-xs",
                    form.password
                      ? passwordOk
                        ? "text-emerald-600"
                        : "text-rose-600"
                      : "text-gray-400",
                  )}
                >
                  {form.password
                    ? passwordOk
                      ? "사용 가능한 비밀번호예요."
                      : "비밀번호는 8자 이상이어야 해요."
                    : "비밀번호는 8자 이상을 권장해요."}
                </p>
              </div>

              <div>
                <LabelRow
                  label="비밀번호 확인"
                  ok={passwordMatch}
                  showOkWhenFilled={!!form.password2}
                />
                <div className="relative mt-1">
                  <input
                    type={showPw2 ? "text" : "password"}
                    value={form.password2}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, password2: e.target.value }))
                    }
                    placeholder="비밀번호 다시 입력"
                    className={cn(
                      "w-full rounded-2xl border bg-white px-4 py-3 pr-12 text-gray-900 outline-none transition",
                      form.password2
                        ? passwordMatch
                          ? "border-emerald-200 ring-2 ring-emerald-50"
                          : "border-rose-200 ring-2 ring-rose-50"
                        : "border-gray-200 focus:ring-2 focus:ring-gray-100",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw2((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-gray-500 hover:bg-gray-50"
                    aria-label="비밀번호 확인 보기 토글"
                  >
                    {showPw2 ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    form.password2
                      ? passwordMatch
                        ? "text-emerald-600"
                        : "text-rose-600"
                      : "text-gray-400",
                  )}
                >
                  {form.password2
                    ? passwordMatch
                      ? "비밀번호가 일치해요."
                      : "비밀번호가 일치하지 않아요."
                    : "비밀번호를 다시 한 번 입력해주세요"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <input
                      type="checkbox"
                      checked={agree.all}
                      onChange={(e) => setAllAgree(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    전체 동의
                  </label>
                  <span className="text-xs text-gray-500">선택 포함</span>
                </div>

                <div className="mt-3 space-y-2">
                  <AgreeRow
                    checked={agree.terms}
                    onChange={(v) => setAgreeItem("terms", v)}
                    label={
                      <>
                        (필수) 이용약관 동의
                        <span className="ml-2 text-xs text-gray-500">보기</span>
                      </>
                    }
                  />
                  <AgreeRow
                    checked={agree.privacy}
                    onChange={(v) => setAgreeItem("privacy", v)}
                    label={
                      <>
                        (필수) 개인정보 처리방침 동의
                        <span className="ml-2 text-xs text-gray-500">보기</span>
                      </>
                    }
                  />
                  <AgreeRow
                    checked={agree.marketing}
                    onChange={(v) => setAgreeItem("marketing", v)}
                    label="(선택) 마케팅 정보 수신 동의"
                  />
                </div>

                {!requiredAgreed ? (
                  <p className="mt-2 text-xs text-rose-600">
                    필수 약관 2개는 반드시 동의해주세요.
                  </p>
                ) : null}
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
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  canSubmit
                    ? "bg-gray-900 text-white shadow-sm hover:bg-black"
                    : "cursor-not-allowed bg-gray-200 text-gray-500",
                )}
              >
                {loading ? "가입 중..." : "회원가입 완료"}
              </button>

              <p className="text-center text-sm text-gray-600">
                이미 계정이 있어요{" "}
                <Link
                  href="/auth/login"
                  className="font-semibold text-gray-900 hover:underline"
                >
                  로그인
                </Link>
              </p>
            </form>
          </div>
        </div>

        <div className="lg:hidden -mt-6 text-center text-xs text-gray-500">
          가입 후 개인/팀 워크스페이스를 만들고 IDE로 바로 이동할 수 있어.
        </div>
      </div>
    </div>
  );
}

function LabelRow({
  label,
  ok,
  showOkWhenFilled,
}: {
  label: string;
  ok: boolean;
  showOkWhenFilled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-semibold text-gray-800">{label}</label>
      {showOkWhenFilled ? (
        <span
          className={cn(
            "text-xs font-medium",
            ok ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {ok ? "OK" : "CHECK"}
        </span>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  hint,
  ok,
  showOkWhenFilled,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  hint?: string;
  ok: boolean;
  showOkWhenFilled?: boolean;
  type?: string;
}) {
  const filled = value.trim().length > 0;

  return (
    <div>
      <LabelRow
        label={label}
        ok={ok}
        showOkWhenFilled={showOkWhenFilled && filled}
      />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-gray-900 outline-none transition",
          filled
            ? ok
              ? "border-emerald-200 ring-2 ring-emerald-50"
              : "border-rose-200 ring-2 ring-rose-50"
            : "border-gray-200 focus:ring-2 focus:ring-gray-100",
        )}
      />
      {hint ? (
        <p
          className={cn(
            "mt-1 text-xs",
            filled
              ? ok
                ? "text-emerald-600"
                : "text-rose-600"
              : "text-gray-400",
          )}
        >
          {filled ? (ok ? "입력 완료" : hint) : hint}
        </p>
      ) : null}
    </div>
  );
}

function AgreeRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
    </label>
  );
}
