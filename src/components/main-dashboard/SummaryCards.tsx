import type { SummaryStat, SummaryStatIcon } from "./dashboard.types";
import { SummaryIcons } from "./dashboard.utils";

type Props = {
  stats: SummaryStat[];
};

// 통계마다 의미에 맞는 포인트 색을 준다. 아이콘 칸에만 쓴다.
const STAT_TONES: Record<SummaryStatIcon, string> = {
  gauge: "bg-[#EEF2FF] text-[#5873F9]",
  todo: "bg-amber-50 text-amber-600",
  check: "bg-emerald-50 text-emerald-600",
  book: "bg-purple-50 text-purple-600",
  user: "bg-blue-50 text-blue-600",
  users: "bg-emerald-50 text-emerald-600",
  calendar: "bg-[#EEF2FF] text-[#5873F9]",
  bell: "bg-rose-50 text-rose-600",
};

// 진행률 막대는 상단 헤더(DashboardHero)에 있으므로 카드는 숫자만 짧게 보여 준다.
export default function SummaryCards({ stats }: Props) {
  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = SummaryIcons[stat.icon];

        return (
          <div
            key={stat.id}
            className="flex min-w-0 items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3"
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${STAT_TONES[stat.icon]}`}
            >
              <Icon size={17} strokeWidth={2.2} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-gray-500">
                {stat.title}
              </p>

              {/* 단위가 없는 값은 모두 개수라서 "개"를 붙여 카드끼리 표현을 맞춘다 */}
              <p className="mt-0.5 flex min-w-0 items-baseline gap-1">
                <span className="text-xl font-bold leading-none tabular-nums text-gray-900">
                  {stat.count ?? 0}
                </span>

                <span className="text-xs font-semibold text-gray-400">
                  {stat.suffix ?? "개"}
                </span>

                <span className="ml-1 truncate text-[11px] text-gray-400">
                  {stat.label}
                </span>
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
