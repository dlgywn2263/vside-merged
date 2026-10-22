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
      <h4 className="mb-1 text-xs font-semibold text-gray-500">{title}</h4>

      {items.length === 0 ? (
        <p className="py-1.5 text-xs text-gray-400">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="-mx-2 flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-gray-50"
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    item.type === "schedule" ? "bg-[#5873F9]" : "bg-purple-400"
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-gray-900">
                    {item.title}
                  </p>

                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-gray-400">
                    <span className="truncate">{item.workspaceName}</span>

                    {item.stage ? (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="shrink-0">{item.stage}</span>
                      </>
                    ) : null}

                    {item.status ? (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="shrink-0">{item.status}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
