import { Pencil, Plus, Trash2 } from "lucide-react";
import { stageMeta } from "@/lib/devlog/constants";
import { DevlogItem, StageType } from "@/lib/devlog/types";
import { shortDate } from "@/lib/devlog/utils";

type Props = {
  logsByStage: Record<StageType, DevlogItem[]>;
  onOpenDetail: (item: DevlogItem) => void;
  onEdit: (item: DevlogItem) => void;
  onDelete: (id: number, projectId: number) => void;
  onCreate: (stage: StageType) => void;
};

export function DevlogStageBoard({
  logsByStage,
  onOpenDetail,
  onEdit,
  onDelete,
  onCreate,
}: Props) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4">
        {(
          ["planning", "design", "implementation", "wrapup"] as StageType[]
        ).map((stage) => (
          <div key={stage} className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-4">
              <div className="text-xl font-bold text-slate-900">
                {stageMeta[stage].label}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {stageMeta[stage].description}
              </div>
            </div>

            <div className="space-y-3">
              {logsByStage[stage].length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
                  해당 단계의 개발일지가 없습니다.
                </div>
              ) : (
                logsByStage[stage].map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
                  >
                    <button
                      onClick={() => onOpenDetail(log)}
                      className="block w-full text-left"
                    >
                      <div className="text-xs font-semibold text-slate-400">
                        {shortDate(log.date)}
                      </div>
                      <div className="mt-1 line-clamp-2 text-base font-bold text-slate-900">
                        {log.title}
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {log.summary}
                      </div>
                    </button>

                    <div className="mt-3 text-xs text-slate-400">
                      {log.projectTitle}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {log.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-500"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400">
                        진행률 {log.progress ?? 0}%
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEdit(log)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(log.id, log.projectId)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <button
                onClick={() => onCreate(stage)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                <Plus size={16} />
                {stageMeta[stage].label} 일지 추가
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
