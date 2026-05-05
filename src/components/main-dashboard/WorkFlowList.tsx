import Link from "next/link";

import type { WorkFlowItem } from "./dashboard.types";

type Props = {
  title: string;
  emptyText: string;
  items: WorkFlowItem[];
};

export default function WorkFlowList({ title, emptyText, items }: Props) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-bold text-gray-900">{title}</h4>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-3 text-xs text-gray-400">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-xl border border-gray-200 bg-white px-3 py-3 transition hover:border-[#5873F9]/50 hover:bg-[#F7F9FF]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {item.title}
                  </p>

                  <p className="mt-1 truncate text-xs text-gray-400">
                    {item.workspaceName}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                    item.type === "schedule"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-purple-50 text-purple-600"
                  }`}
                >
                  {item.type === "schedule" ? "일정" : "일지"}
                </span>
              </div>

              {item.stage || item.status ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.stage ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                      {item.stage}
                    </span>
                  ) : null}

                  {item.status ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                      {item.status}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
