import type { SummaryStat } from "./dashboard.types";
import { SummaryIcons } from "./dashboard.utils";

type Props = {
  stats: SummaryStat[];
};

export default function SummaryCards({ stats }: Props) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {stats.map((stat) => {
        const Icon = SummaryIcons[stat.icon];

        return (
          <div
            key={stat.id}
            className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 px-4 py-3.5 min-h-[106px]"
          >
            <div className="flex items-start justify-between mb-2.5">
              <h3 className="text-[13px] font-semibold text-gray-600 leading-none">
                {stat.title}
              </h3>

              <div className="text-gray-400 mt-0.5">
                <Icon size={17} strokeWidth={2.2} />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[30px] leading-none font-black text-gray-900">
                {stat.count ?? 0}
                {stat.suffix ? (
                  <span className="ml-0.5 text-[20px] font-black">
                    {stat.suffix}
                  </span>
                ) : null}
              </span>

              <span className="text-[11px] text-gray-400 font-medium mt-1.5">
                {stat.label}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
