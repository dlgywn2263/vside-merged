"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiWorkspaceDetailResponse,
  DevlogItem,
  FormValue,
  ProjectOption,
  SortType,
  StageType,
} from "@/lib/devlog/types";
import { emptyForm } from "@/lib/devlog/constants";
import {
  getProjectPosts,
  mapApiDevlogToItem,
  todayYmd,
} from "@/lib/devlog/utils";
import {
  createDevlog,
  deleteDevlog,
  fetchWorkspaceDevlogs,
  updateDevlog,
} from "@/lib/devlog/api";
import { DevlogHeader } from "./DevlogHeader";
import { DevlogStageBoard } from "./DevlogStageBoard";
import { DevlogDetailModal } from "./DevlogDetailModal";
import { DevlogFormModal } from "./DevlogFormModal";
import DevlogScheduleReadonlyPanel from "./DevlogScheduleReadonlyPanel";
import type { Mode } from "@/components/schedule/schedule.types";

export function DevlogWorkspaceView({ workspaceId }: { workspaceId: string }) {
  const [workspaceName, setWorkspaceName] = useState("프로젝트 관리");
  const [workspaceModeLabel, setWorkspaceModeLabel] = useState("워크스페이스");
  const [scheduleMode, setScheduleMode] = useState<Mode>("personal");

  /**
   * 개발일지 상태
   */
  const [logs, setLogs] = useState<DevlogItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState<StageType | "all">("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [sort, setSort] = useState<SortType>("latest");

  const [detailTarget, setDetailTarget] = useState<DevlogItem | null>(null);
  const [editingTarget, setEditingTarget] = useState<DevlogItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [form, setForm] = useState<FormValue>({
    ...emptyForm,
    date: todayYmd(),
  });

  useEffect(() => {
    if (!workspaceId) return;
    loadWorkspace();
  }, [workspaceId]);

  /**
   * 개발일지 로드
   */
  async function loadWorkspace() {
    setLoading(true);

    try {
      const data: ApiWorkspaceDetailResponse =
        await fetchWorkspaceDevlogs(workspaceId);

      setWorkspaceName(data.name);
      setWorkspaceModeLabel(
        data.mode === "team" ? "팀 워크스페이스" : "개인 워크스페이스",
      );
      setScheduleMode(data.mode);

      const mappedProjects: ProjectOption[] = (data.projects ?? [])
        .map((project, index) => {
          const rawId = project.projectId ?? project.id;
          const numericProjectId = Number(rawId);

          return {
            id: numericProjectId,
            name:
              project.projectTitle ?? project.name ?? `프로젝트 ${index + 1}`,
          };
        })
        .filter((project) => !Number.isNaN(project.id) && project.id > 0);

      setProjects(mappedProjects);

      const flattenedLogs: DevlogItem[] = (data.projects ?? []).flatMap(
        (project) =>
          getProjectPosts(project).map((post) =>
            mapApiDevlogToItem(post, project, data.uuid),
          ),
      );

      setLogs(flattenedLogs);
    } catch (error) {
      console.error("loadWorkspace error:", error);
      alert("개발일지 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * 필터용 태그 목록
   */
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();

    logs.forEach((log) => {
      log.tags.forEach((tag) => tagSet.add(tag));
    });

    return ["all", ...Array.from(tagSet)];
  }, [logs]);

  /**
   * 오른쪽 개발일지 필터링
   */
  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const next = logs.filter((log) => {
      const text = [
        log.title,
        log.summary,
        log.content,
        log.projectTitle,
        log.goal ?? "",
        log.design ?? "",
        log.issue ?? "",
        log.solution ?? "",
        log.nextPlan ?? "",
        ...(log.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      const matchesKeyword = !keyword || text.includes(keyword);
      const matchesStage =
        selectedStage === "all" || log.stage === selectedStage;
      const matchesTag =
        selectedTag === "all" || log.tags.includes(selectedTag);
      const matchesProject =
        selectedProjectId === "all" ||
        String(log.projectId) === selectedProjectId;

      return matchesKeyword && matchesStage && matchesTag && matchesProject;
    });

    next.sort((a, b) =>
      sort === "latest"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date),
    );

    return next;
  }, [logs, search, selectedStage, selectedTag, selectedProjectId, sort]);

  /**
   * 단계별 보드 데이터
   */
  const logsByStage = useMemo(() => {
    return {
      planning: filteredLogs.filter((log) => log.stage === "planning"),
      design: filteredLogs.filter((log) => log.stage === "design"),
      implementation: filteredLogs.filter(
        (log) => log.stage === "implementation",
      ),
      wrapup: filteredLogs.filter((log) => log.stage === "wrapup"),
    };
  }, [filteredLogs]);

  function openCreateModal(defaultStage?: StageType) {
    setDetailTarget(null);
    setEditingTarget(null);

    setForm({
      ...emptyForm,
      projectId: projects[0]?.id ? String(projects[0].id) : "",
      date: todayYmd(),
      stage: defaultStage ?? "planning",
    });

    setIsCreateOpen(true);
  }

  function openEditModal(item: DevlogItem) {
    setDetailTarget(null);
    setIsCreateOpen(false);
    setEditingTarget(item);

    setForm({
      projectId: String(item.projectId),
      title: item.title,
      summary: item.summary,
      content: item.content,
      date: item.date,
      tagsText: item.tags.join(", "),
      stage: item.stage,
      goal: item.goal ?? "",
      design: item.design ?? "",
      issue: item.issue ?? "",
      solution: item.solution ?? "",
      nextPlan: item.nextPlan ?? "",
      commitHash: item.commitHash ?? "",
      progress: String(item.progress ?? 0),
    });
  }

  function closeFormModal() {
    setIsCreateOpen(false);
    setEditingTarget(null);

    setForm({
      ...emptyForm,
      date: todayYmd(),
    });
  }

  async function handleSubmit() {
    if (
      !workspaceId ||
      !form.projectId ||
      !form.title.trim() ||
      !form.summary.trim() ||
      !form.content.trim()
    ) {
      alert("프로젝트, 제목, 요약, 상세 내용은 필수입니다.");
      return;
    }

    try {
      if (editingTarget) {
        await updateDevlog(editingTarget.id, workspaceId, form);
      } else {
        await createDevlog(workspaceId, form);
      }

      await loadWorkspace();
      closeFormModal();
    } catch (error) {
      console.error("handleSubmit error:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  }

  async function handleDelete(id: number, projectId: number) {
    const ok = window.confirm("이 개발일지를 삭제할까요?");
    if (!ok) return;

    try {
      await deleteDevlog(id, workspaceId, projectId);

      if (detailTarget?.id === id) {
        setDetailTarget(null);
      }

      await loadWorkspace();
      alert("개발일지가 삭제되었습니다.");
    } catch (error) {
      console.error("delete error:", error);
      alert("개발일지 삭제에 실패했습니다.");
    }
  }

  function resetFilters() {
    setSearch("");
    setSelectedStage("all");
    setSelectedTag("all");
    setSelectedProjectId("all");
    setSort("latest");
  }

  return (
    <div className="space-y-6">
      <DevlogHeader
        workspaceName={workspaceName}
        workspaceModeLabel={workspaceModeLabel}
        search={search}
        setSearch={setSearch}
        selectedStage={selectedStage}
        setSelectedStage={setSelectedStage}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        allTags={allTags}
        projects={projects}
        sort={sort}
        setSort={setSort}
        resetFilters={resetFilters}
        onCreate={() => openCreateModal()}
      />

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          데이터를 불러오는 중...
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
          {/* 왼쪽: 일정관리 읽기 전용 캘린더 */}
          <DevlogScheduleReadonlyPanel
            workspaceId={workspaceId}
            mode={scheduleMode}
          />

          {/* 오른쪽: 기존 개발일지 단계 보드 */}
          <DevlogStageBoard
            logsByStage={logsByStage}
            onOpenDetail={setDetailTarget}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onCreate={openCreateModal}
          />
        </div>
      )}

      {detailTarget && (
        <DevlogDetailModal
          item={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      )}

      {(isCreateOpen || editingTarget) && (
        <DevlogFormModal
          editingTarget={editingTarget}
          projects={projects}
          form={form}
          setForm={setForm}
          onClose={closeFormModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
