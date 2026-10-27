"use client";

// 경로: src/components/design/components/DesignTabToolbar.tsx
//
// 탭 줄 오른쪽 끝에 붙는 검색창과 추가 버튼.
//
// 예전에는 탭 목록 아래, 각 탭 본문 맨 위에 따로 한 줄씩 있었다. 그래서
// 탭을 고르는 줄과 그 탭에서 할 일을 고르는 줄이 위아래로 떨어져 있었고,
// 목록이 시작되는 자리가 탭마다 달라 보였다. 탭 줄 한 줄에 모으면 줄도
// 하나 줄고 "지금 이 탭에서 쓰는 도구"라는 것이 붙어 보인다.
//
// 검색어는 designUiStore 가 탭별로 들고 있어서 여기로 올려도 그대로 쓴다.
// 화면 흐름과 ERD 는 캔버스라 목록 검색이 맞지 않아 아무것도 그리지 않는다.

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { DesignMutations } from "../realtime/mutations";
import { useDesignUiStore } from "../store/designUiStore";

export function DesignTabToolbar({ mutations }: { mutations: DesignMutations | null }) {
  const activeTab = useDesignUiStore((s) => s.activeTab);
  const search = useDesignUiStore((s) => s.search);
  const setSearch = useDesignUiStore((s) => s.setSearch);
  const select = useDesignUiStore((s) => s.select);

  // 문서를 아직 못 열었으면 추가할 수 없다. 헤더는 로딩 중에도 떠 있어서
  // mutations 가 없는 순간이 실제로 있다.
  if (!mutations) return null;
  if (activeTab !== "requirements" && activeTab !== "apis") return null;

  const isRequirements = activeTab === "requirements";

  const handleAdd = () => {
    if (isRequirements) {
      select({ requirementId: mutations.addRequirement({ name: "" }) });
      return;
    }

    select({ apiId: mutations.addApi({ method: "GET", endpoint: "/api/" }) });
  };

  return (
    // 남는 가로를 검색창이 먹되 320px 에서 멈춘다. 고정폭으로 두면 넓은
    // 화면에서는 허전하고 좁은 화면에서는 버튼을 밀어낸다.
    <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
      {/*
        연한 회색 배경만으로는 흰 패널 위에서 입력창으로 보이지 않았다.
        테두리를 주고 포커스 때 테두리와 링이 같이 바뀌게 해서, 여기가
        글자를 넣는 곳이라는 것이 눌러 보기 전에 보이게 한다.
        포커스 색은 일정 관리 필터(#AAB8FF)와 같은 값이다.
      */}
      <label className="flex h-8 w-full max-w-xs items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 transition focus-within:border-[#AAB8FF] focus-within:ring-2 focus-within:ring-[#EEF3FF]">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <Input
          value={search[activeTab]}
          onChange={(event) => setSearch(activeTab, event.target.value)}
          placeholder={isRequirements ? "요구사항 검색" : "엔드포인트 검색"}
          className="h-8 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
        />
      </label>

      {/* 일정 관리 "새 일정" 버튼과 같은 브랜드색 버튼 */}
      <Button
        size="sm"
        onClick={handleAdd}
        className="h-8 shrink-0 gap-1.5 rounded-md bg-[#5873F9] px-3 text-xs font-semibold text-white hover:bg-[#4863E8]"
      >
        <Plus className="h-3.5 w-3.5" />
        {isRequirements ? "요구사항 추가" : "API 추가"}
      </Button>
    </div>
  );
}
