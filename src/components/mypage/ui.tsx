"use client";

export function cn(...s: (string | false | null | undefined)[]) {
  return s.filter(Boolean).join(" ");
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function formatKST(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export function ProgressBar({
  value,
  max = 100,
}: {
  value: number;
  max?: number;
}) {
  const pct = clamp(Math.round((value / max) * 100), 0, 100);
  return (
    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
      <div className="h-full bg-gray-900" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700">
      {children}
    </span>
  );
}

export function Card({
  title,
  desc,
  right,
  children,
}: {
  title: string;
  desc?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {desc ? <p className="mt-1 text-sm text-gray-500">{desc}</p> : null}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-3">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="sm:col-span-2">
        <div className="text-sm text-gray-900">{value}</div>
        {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
      </div>
    </div>
  );
}

export function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
      {text}
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-black text-gray-900">{value}</div>
    </div>
  );
}
