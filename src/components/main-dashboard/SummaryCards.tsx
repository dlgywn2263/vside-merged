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
            className="min-h-[88px] rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-gray-600">
                  {stat.title}
                </p>

                <div className="mt-2 flex items-end gap-1">
                  <span className="text-[26px] font-black leading-none text-gray-900">
                    {stat.count ?? 0}
                  </span>

                  {stat.suffix ? (
                    <span className="pb-0.5 text-sm font-black text-gray-900">
                      {stat.suffix}
                    </span>
                  ) : null}
                </div>

                <p className="mt-1.5 truncate text-[10px] font-medium text-gray-400">
                  {stat.label}
                </p>
              </div>

              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gray-50 text-gray-400">
                <Icon size={15} strokeWidth={2.2} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
