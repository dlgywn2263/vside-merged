"use client";

import type { IDEPrefs } from "../types";
import { Card, Field, ProgressBar } from "../ui";
import { useState } from "react";

export default function CustomizeTab({ prefs }: { prefs: IDEPrefs }) {
  const [local, setLocal] = useState<IDEPrefs>(prefs);

  return (
    <div className="grid gap-6">
      <Card
        title="IDE 커스터마이징"
        desc="완전 개인 영역."
        right={
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            onClick={() => alert("TODO: IDE 설정 저장 API")}
          >
            저장
          </button>
        }
      >
        <div className="grid gap-4">
          <Field
            label="폰트"
            value={
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                value={local.fontFamily}
                onChange={(e) =>
                  setLocal((p) => ({ ...p, fontFamily: e.target.value }))
                }
              />
            }
          />
          <Field
            label="폰트 크기"
            value={
              <input
                type="number"
                className="w-28 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                value={local.fontSize}
                onChange={(e) =>
                  setLocal((p) => ({
                    ...p,
                    fontSize: Number(e.target.value || 14),
                  }))
                }
              />
            }
          />
          <Field
            label="AI 제안 강도"
            value={
              <div className="grid gap-2">
                <ProgressBar value={local.aiAssistLevel} max={3} />
              </div>
            }
          />
        </div>
      </Card>
    </div>
  );
}
