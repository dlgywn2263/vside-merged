// 탭(개인/팀) + 팀 선택 + 검색/카테고리 필터 UI를 담당하는 상단 툴바 컴포넌트

"use client";

import type { Category, Mode, Team } from "./schedule.types";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  mode: Mode;
  setMode: (m: Mode) => void;

  teams: Team[];
  teamId: string;
  setTeamId: (id: string) => void;

  query: string;
  setQuery: (q: string) => void;

  categories: Category[];
  category: Category | "ALL";
  setCategory: (c: Category | "ALL") => void;
};

export default function ScopeToolbar({
  mode,
  setMode,
  teams,
  teamId,
  setTeamId,
  query,
  setQuery,
  categories,
  category,
  setCategory,
}: Props) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
      <TabsList>
        <TabsTrigger value="personal" onClick={() => setMode("personal")}>
          개인 일정
        </TabsTrigger>
        <TabsTrigger value="team" onClick={() => setMode("team")}>
          팀 일정
        </TabsTrigger>
      </TabsList>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {mode === "team" ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">팀</span>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="팀 선택" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Badge variant="secondary">내 일정</Badge>
        )}

        <Separator orientation="vertical" className="h-8" />

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색 (제목/설명/장소)"
          className="w-[240px]"
        />

        <Select value={category} onValueChange={(v) => setCategory(v as any)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
