"use client";

import type { Stats } from "../types";
import { Card, Field, Pill, ProgressBar } from "../ui";

export default function IdentityTab({ stats }: { stats: Stats }) {
  return (
    <div className="grid gap-6">
      <Card title="Dev Identity" desc="대시보드랑 겹치지 않게 ‘나’ 중심으로.">
        <div className="grid gap-5">
          <Field label="대표 언어" value={<Pill>{stats.primaryLang}</Pill>} />

          <Field
            label="언어 비율"
            value={
              <div className="grid gap-2">
                {stats.langRatio.map((x) => (
                  <div key={x.label} className="grid gap-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span className="font-bold">{x.label}</span>
                      <span>{x.value}%</span>
                    </div>
                    <ProgressBar value={x.value} max={100} />
                  </div>
                ))}
              </div>
            }
          />

          <Field
            label="활동 시간대"
            value={
              <div className="grid gap-2">
                {stats.activeHours.map((x) => (
                  <div key={x.label} className="grid gap-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span className="font-bold">{x.label}</span>
                      <span>{x.value}%</span>
                    </div>
                    <ProgressBar value={x.value} max={100} />
                  </div>
                ))}
              </div>
            }
            hint="TODO: 실제론 세션 데이터 기반 집계"
          />
        </div>
      </Card>
    </div>
  );
}
