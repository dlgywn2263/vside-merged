import Link from "next/link";

import type { WorkFlowItem } from "./dashboard.types";
import {
  getScheduleStatusKey,
  SCHEDULE_STATUS_META,
} from "./dashboard.utils";

type Props = {
  title: string;
  emptyText: string;
  items: WorkFlowItem[];
};

export default function WorkFlowList({ title, emptyText, items }: Props) {
  const isSchedule = title === "일정";

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        <span
          className={`h-2 w-2 rounded-sm ${
            isSchedule ? "bg-[#5873F9]" : "bg-purple-500"
          }`}
        />
        {title}
        <span className="tabular-nums text-gray-300">{items.length}</span>
      </h4>

      {items.length === 0 ? (
        <p className="py-1 text-xs text-gray-400">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const statusKey = getScheduleStatusKey(item.status);

            // 모르는 상태 값은 "할 일"로 뭉개지 않고 받은 글자 그대로 보여 준다
            const isKnownStatus =
              statusKey !== "todo" ||
              ["todo", "할 일"].includes(
                String(item.status ?? "").trim().toLowerCase(),
              );

            const scheduleMeta =
              item.type === "schedule" && isKnownStatus
                ? SCHEDULE_STATUS_META[statusKey]
                : null;

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`group relative block overflow-hidden rounded-md border border-gray-200 bg-white py-2.5 pl-3.5 pr-3 transition-colors ${
                    item.type === "schedule"
                      ? "hover:border-[#AAB8FF] hover:bg-[#F7F9FF]"
                      : "hover:border-purple-200 hover:bg-purple-50/50"
                  }`}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-[3px] ${
                      item.type === "schedule"
                        ? (scheduleMeta?.bar ?? "bg-gray-300")
                        : "bg-purple-400"
                    }`}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-[13px] font-semibold text-gray-900">
                      {item.title}
                    </p>

                    {scheduleMeta ? (
                      <span
                        className={`shrink-0 rounded border px-1.5 py-px text-[10px] font-semibold ${scheduleMeta.badge}`}
                      >
                        {scheduleMeta.label}
                      </span>
                    ) : item.status ? (
                      <span className="shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-px text-[10px] font-semibold text-gray-600">
                        {item.status}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-gray-400">
                    <span className="truncate">{item.workspaceName}</span>

                    {item.stage ? (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="shrink-0">{item.stage}</span>
                      </>
                    ) : null}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
