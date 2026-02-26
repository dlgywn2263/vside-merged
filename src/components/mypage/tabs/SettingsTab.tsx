"use client";

import type { IDEPrefs } from "../types";
import { Card, Field, Pill, ProgressBar } from "../ui";
import { useState } from "react";

export default function SettingsTab({ prefs }: { prefs: IDEPrefs }) {
  // TODO: 실제론 props prefs를 초기값으로 쓰고, 저장 시 API 호출
  const [local, setLocal] = useState<IDEPrefs>(prefs);

  return (
    <div className="grid gap-6">
      <Card
        title="환경설정"
        desc="서비스 공통 설정. 마이페이지의 ‘기본값’ 영역."
        right={
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            onClick={() => alert("TODO: 설정 저장 API 호출")}
          >
            저장
          </button>
        }
      >
        <div className="grid gap-4">
          <Field
            label="테마"
            value={
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    local.theme === "light"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-800 hover:bg-gray-100"
                  }`}
                  onClick={() => setLocal((p) => ({ ...p, theme: "light" }))}
                >
                  light
                </button>
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    local.theme === "dark"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-800 hover:bg-gray-100"
                  }`}
                  onClick={() => setLocal((p) => ({ ...p, theme: "dark" }))}
                >
                  dark
                </button>
              </div>
            }
            hint="TODO: 서버 저장"
          />

          <Field
            label="키맵"
            value={
              <div className="flex flex-wrap gap-2">
                {(["vscode", "vim", "intellij"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      local.keymap === k
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-800 hover:bg-gray-100"
                    }`}
                    onClick={() => setLocal((p) => ({ ...p, keymap: k }))}
                  >
                    {k}
                  </button>
                ))}
              </div>
            }
          />

          <Field
            label="포맷터"
            value={
              <div className="flex flex-wrap gap-2">
                {(["prettier", "eslint", "none"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      local.formatter === f
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-800 hover:bg-gray-100"
                    }`}
                    onClick={() => setLocal((p) => ({ ...p, formatter: f }))}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
            hint="프로젝트/사용자 기본 포맷터 선택"
          />

          <Field
            label="AI 제안 강도"
            value={
              <div className="grid gap-2">
                <ProgressBar value={local.aiAssistLevel} max={3} />
                <div className="flex gap-2">
                  {([0, 1, 2, 3] as const).map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                        local.aiAssistLevel === lv
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-800 hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        setLocal((p) => ({ ...p, aiAssistLevel: lv }))
                      }
                    >
                      {lv}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-gray-500">0(꺼짐) ~ 3(강함)</div>
              </div>
            }
          />

          <Field
            label="자동 저장"
            value={
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    local.autoSave === "off"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-800 hover:bg-gray-100"
                  }`}
                  onClick={() => setLocal((p) => ({ ...p, autoSave: "off" }))}
                >
                  off
                </button>
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    local.autoSave === "afterDelay"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-800 hover:bg-gray-100"
                  }`}
                  onClick={() =>
                    setLocal((p) => ({ ...p, autoSave: "afterDelay" }))
                  }
                >
                  afterDelay
                </button>

                {local.autoSave === "afterDelay" ? (
                  <Pill>{local.autoSaveDelayMs}ms</Pill>
                ) : null}
              </div>
            }
            hint="TODO: afterDelay면 delay 조절 UI 추가 가능"
          />
        </div>
      </Card>
    </div>
  );
}
