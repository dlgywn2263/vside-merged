"use client";

import { useState } from "react";
import type { Solution } from "../types";
import { Card, EmptyLine, cn, formatKST } from "../ui";

export default function ProjectsTab({
  mine,
  joined,
}: {
  mine: Solution[];
  joined: Solution[];
}) {
  return (
    <div className="grid gap-6">
      <Card
        title="프로젝트"
        // desc="최상위는 프로젝트(Project)이고, 그 아래에 모듈들이 들어갑니다."
        right={
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            onClick={() => alert("TODO: 새 프로젝트 생성 플로우로 이동")}
          >
            새 프로젝트
          </button>
        }
      >
        <div className="grid gap-6">
          <Section
            title="내가 만든 프로젝트"
            items={mine}
            empty="아직 생성한 프로젝트가 없습니다."
          />
          <Section
            title="참여 중인 프로젝트"
            items={joined}
            empty="참여 중인 프로젝트가 없습니다."
          />
        </div>
      </Card>
    </div>
  );
}

function Section({
  title,
  items,
  empty,
}: {
  title: string;
  items: Solution[];
  empty: string;
}) {
  return (
    <div>
      <div className="text-sm font-bold text-gray-900">{title}</div>
      <div className="mt-3 grid gap-3">
        {items.map((s) => (
          <SolutionRow key={s.id} s={s} />
        ))}
        {items.length === 0 ? <EmptyLine text={empty} /> : null}
      </div>
    </div>
  );
}

function SolutionRow({ s }: { s: Solution }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-black text-gray-900">{s.name}</div>
          <div className="mt-1 text-xs text-gray-500">
            {s.visibility === "team" ? "팀" : "개인"} · 프로젝트{" "}
            {s.projects.length}개 · 마지막 수정: {formatKST(s.updatedAt)}
            {s.locationLabel ? ` · 위치: ${s.locationLabel}` : ""}
          </div>

          {open ? (
            <div className="mt-3 grid gap-2">
              {s.projects.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-gray-900">
                      {p.name}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold",
                        p.status === "archived"
                          ? "bg-gray-200 text-gray-700"
                          : "bg-gray-900 text-white",
                      )}
                    >
                      {p.status === "archived" ? "ARCHIVED" : "ACTIVE"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{p.language}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
              s.role === "owner"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700",
            )}
          >
            {s.role === "owner" ? "OWNER" : "MEMBER"}
          </span>

          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "접기" : "모듈 보기"}
          </button>

          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            onClick={() => alert("TODO: 솔루션 관리/설정으로 이동")}
          >
            관리
          </button>
        </div>
      </div>
    </div>
  );
}
