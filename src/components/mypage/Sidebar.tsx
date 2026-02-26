"use client";

import { cn } from "./ui";
import type { TabKey } from "./types";

export type TabItem = {
  key: TabKey;
  label: string;
  icon: any;
  group: "기본" | "개인화";
};

export default function Sidebar({
  tab,
  setTab,
  tabs,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  tabs: TabItem[];
}) {
  const basic = tabs.filter((t) => t.group === "기본");
  const personal = tabs.filter((t) => t.group === "개인화");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold text-gray-500">기본</div>
      <nav className="mt-2 grid gap-1">
        {basic.map((t) => (
          <SideItem
            key={t.key}
            icon={t.icon}
            label={t.label}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
          />
        ))}
      </nav>

      <div className="mt-5 text-xs font-bold text-gray-500">개인화</div>
      <nav className="mt-2 grid gap-1">
        {personal.map((t) => (
          <SideItem
            key={t.key}
            icon={t.icon}
            label={t.label}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
          />
        ))}
      </nav>
    </div>
  );
}

function SideItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold flex items-center gap-2",
        active ? "bg-gray-900 text-white" : "hover:bg-gray-100 text-gray-800",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn("h-4 w-4", active ? "text-white" : "text-gray-700")}
      />
      {label}
    </button>
  );
}
