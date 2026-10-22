import type { SummaryStat, SummaryStatIcon } from "./dashboard.types";
import { SummaryIcons } from "./dashboard.utils";

type Props = {
  stats: SummaryStat[];
};

// 통계마다 의미에 맞는 포인트 색을 준다. 아이콘 칸·진행 막대에만 쓴다.
const STAT_TONES: Record<SummaryStatIcon, { tile: string; bar: string }> = {
  gauge: { tile: "bg-[#EEF2FF] text-[#5873F9]", bar: "bg-[#5873F9]" },
  todo: { tile: "bg-amber-50 text-amber-600", bar: "bg-amber-500" },
  check: { tile: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  book: { tile: "bg-purple-50 text-purple-600", bar: "bg-purple-500" },
  user: { tile: "bg-blue-50 text-blue-600", bar: "bg-blue-500" },
  users: { tile: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  calendar: { tile: "bg-[#EEF2FF] text-[#5873F9]", bar: "bg-[#5873F9]" },
  bell: { tile: "bg-rose-50 text-rose-600", bar: "bg-rose-500" },
};

export default function SummaryCards({ stats }: Props) {
  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = SummaryIcons[stat.icon];

        const tone = STAT_TONES[stat.icon];

        const count = stat.count ?? 0;

        const isPercent = stat.suffix === "%";

        return (
          <div
            key={stat.id}
            className="flex flex-col rounded-md border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${tone.tile}`}
              >
                <Icon size={16} strokeWidth={2.2} />
              </span>

              <p className="truncate text-xs font-semibold text-gray-600">
                {stat.title}
              </p>
            </div>

            {/* 단위가 없는 값은 모두 개수라서 "개"를 붙여 카드끼리 표현을 맞춘다 */}
            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-[30px] font-bold leading-none tracking-tight tabular-nums text-gray-900">
                {count}
              </span>

              <span className="text-sm font-semibold text-gray-400">
                {stat.suffix ?? "개"}
              </span>
            </p>

            {isPercent ? (
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${tone.bar} transition-all duration-500`}
                  style={{ width: `${Math.min(Math.max(count, 0), 100)}%` }}
                />
              </div>
            ) : null}

            {/* 설명은 카드 바닥에 붙여 네 카드의 기준선을 맞춘다 */}
            <div className="mt-auto pt-3">
              <p className="truncate border-t border-gray-100 pt-2.5 text-[11px] text-gray-500">
                {stat.label}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
