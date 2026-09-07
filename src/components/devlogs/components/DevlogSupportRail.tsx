import { Menu } from "lucide-react";

export function DevlogSupportRail({
  isPinned,
  noDevlogCount,
  onMouseEnter,
  onMouseLeave,
  onTogglePin,
}: {
  isPinned: boolean;
  noDevlogCount: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onTogglePin: () => void;
}) {
  return (
    <aside
      className="sticky top-[60px] z-30 h-[calc(100vh-60px)] border-r border-slate-200 bg-white"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex h-full w-14 flex-col items-center gap-3 py-4">
        <button
          type="button"
          onClick={onTogglePin}
          className={`grid h-10 w-10 place-items-center rounded-xl transition ${
            isPinned
              ? "bg-blue-50 text-blue-700"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          title={isPinned ? "보조 패널 접기" : "보조 패널 펼치기"}
        >
          <Menu size={19} />
        </button>

        <div className="h-px w-8 bg-slate-200" />

        <button
          type="button"
          onClick={onTogglePin}
          className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
          title="일지 미작성 일정"
        >
          {/* <ListTodo size={17} /> */}

          {noDevlogCount > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
              {noDevlogCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onTogglePin}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
          title="개발일지 작성"
        >
          {/* <FilePenLine size={17} /> */}
        </button>
      </div>
    </aside>
  );
}
