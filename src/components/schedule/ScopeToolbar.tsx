"use client";

import type { Category, Mode, WorkspaceOption } from "./schedule.types";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  personalWorkspaces: WorkspaceOption[];
  selectedPersonalWorkspaceId: string;
  setSelectedPersonalWorkspaceId: (id: string) => void;

  teamWorkspaces: WorkspaceOption[];
  selectedTeamWorkspaceId: string;
  setSelectedTeamWorkspaceId: (id: string) => void;

  query: string;
  setQuery: (q: string) => void;

  categories: Category[];
  category: Category | "ALL";
  setCategory: (c: Category | "ALL") => void;
};

export default function ScopeToolbar({
  mode,
  setMode,
  personalWorkspaces,
  selectedPersonalWorkspaceId,
  setSelectedPersonalWorkspaceId,
  teamWorkspaces,
  selectedTeamWorkspaceId,
  setSelectedTeamWorkspaceId,
  query,
  setQuery,
  categories,
  category,
  setCategory,
}: Props) {
  const workspaceOptions =
    mode === "personal" ? personalWorkspaces : teamWorkspaces;

  const selectedWorkspaceId =
    mode === "personal" ? selectedPersonalWorkspaceId : selectedTeamWorkspaceId;

  const setSelectedWorkspaceId =
    mode === "personal"
      ? setSelectedPersonalWorkspaceId
      : setSelectedTeamWorkspaceId;

  return (
    <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
      <TabsList>
        <TabsTrigger value="personal" onClick={() => setMode("personal")}>
          개인 일정
        </TabsTrigger>
        <TabsTrigger value="team" onClick={() => setMode("team")}>
          팀 일정
        </TabsTrigger>
      </TabsList>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {mode === "personal" ? "개인 프로젝트" : "팀 프로젝트"}
          </span>
          <Select
            value={selectedWorkspaceId}
            onValueChange={setSelectedWorkspaceId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="프로젝트 선택" />
            </SelectTrigger>
            <SelectContent>
              {workspaceOptions.map((workspace) => (
                <SelectItem
                  key={workspace.workspaceId}
                  value={workspace.workspaceId}
                >
                  {workspace.workspaceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-8" />

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색 (제목/설명/장소)"
          className="w-[240px]"
        />

        <Select
          value={category}
          onValueChange={(v) => setCategory(v as Category | "ALL")}
        >
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
