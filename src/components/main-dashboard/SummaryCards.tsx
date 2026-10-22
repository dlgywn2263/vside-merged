import type { SummaryStat } from "./dashboard.types";
import { SummaryIcons } from "./dashboard.utils";

type Props = {
  stats: SummaryStat[];
};

export default function SummaryCards({ stats }: Props) {
  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = SummaryIcons[stat.icon];

        return (
          <div
            key={stat.id}
            className="flex h-[104px] flex-col justify-between rounded-md border border-gray-200 bg-white px-4 py-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold text-gray-500">
                {stat.title}
              </p>

              <Icon
                size={15}
                strokeWidth={2}
                className="shrink-0 text-gray-300"
              />
            </div>

            <div className="min-w-0">
              {/* 단위가 없는 값은 모두 개수라서 "개"를 붙여 카드끼리 표현을 맞춘다 */}
              <p className="flex items-baseline gap-1">
                <span className="text-2xl font-bold leading-none tabular-nums text-gray-900">
                  {stat.count ?? 0}
                </span>

                <span className="text-xs font-semibold text-gray-400">
                  {stat.suffix ?? "개"}
                </span>
              </p>

              <p className="mt-1.5 truncate text-[11px] text-gray-400">
                {stat.label}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
