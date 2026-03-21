// 상세 모달에서 정보 카드처럼 보여주는 컴포넌트

export function DevlogInfoBlock({
  title,
  value,
  mono = false,
}: {
  title: string;
  value?: string | number;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </div>
      <div
        className={`mt-2 whitespace-pre-wrap text-sm text-slate-700 ${
          mono ? "font-mono" : ""
        }`}
      >
        {String(value || "-")}
      </div>
    </div>
  );
}
