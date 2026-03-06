"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Pencil,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { DevlogListHeader } from "@/components/devlog/devlogHeader";

type Post = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  summary: string;
  content: string;
  tags: string[];
};

type Project = {
  id: string;
  title: string;
  tech: string;
  lastUpdated: string; // YYYY.MM.DD
  posts: Post[];
};

type SolutionDetail = {
  id: string;
  name: string;
  projects: Project[];
};

type PostFormValue = {
  projectId: string;
  title: string;
  summary: string;
  content: string;
  tagsText: string;
};

const MOCK_DETAIL: Record<string, SolutionDetail> = {
  s1: {
    id: "s1",
    name: "My Personal Solution",
    projects: [
      {
        id: "p1",
        title: "Portfolio Website",
        tech: "TypeScript",
        lastUpdated: "2026.01.05",
        posts: [
          {
            id: "d1",
            title: "프로젝트 초기 설정 및 환경 구성",
            date: "2025-01-16",
            summary: "개발 환경 설정 완료, React + TypeScript + Vite 스택 구성",
            content:
              "프로젝트 초기 설정 작업을 완료했습니다.\n\n주요 작업 내용:\n- React 18과 TypeScript 5.0 환경 구성\n- Vite 빌드 도구 설정\n- ESLint 및 Prettier 설정\n- Git 저장소 초기화\n\n이슈: TypeScript 설정 관련 경로 이슈가 있었으나 tsconfig.json의 paths 설정으로 해결했습니다.",
            tags: ["Setup", "Configuration"],
          },
          {
            id: "d2",
            title: "API 엔드포인트 설계 및 문서화",
            date: "2025-01-15",
            summary: "RESTful API 구조 설계, 주요 엔드포인트 4개 정의",
            content:
              "RESTful API 구조를 설계했습니다.\n\n- 사용자/프로젝트/개발일지 기준 엔드포인트 설계\n- 상태 코드와 예외 응답 형식 정리\n- 프론트에서 테스트 가능한 구조로 문서화 진행",
            tags: ["API", "Design"],
          },
        ],
      },
      {
        id: "p2",
        title: "VSIDE UI",
        tech: "React",
        lastUpdated: "2026.02.03",
        posts: [
          {
            id: "d3",
            title: "UI/UX 디자인 시스템 구축",
            date: "2025-01-13",
            summary: "컬러 팔레트, 타이포그래피, 컴포넌트 라이브러리 정의",
            content:
              "디자인 시스템 구축을 진행했습니다.\n\n- 메인/서브 컬러 팔레트 정의\n- 타이포 스케일 정리\n- 버튼, 입력창, 모달 컴포넌트 규격 정리",
            tags: ["Design", "UI/UX"],
          },
        ],
      },
    ],
  },

  s2: {
    id: "s2",
    name: "Team Alpha Solution",
    projects: [
      {
        id: "p3",
        title: "Web IDE",
        tech: "Next.js",
        lastUpdated: "2026.02.06",
        posts: [],
      },
      {
        id: "p4",
        title: "Sync Engine",
        tech: "Yjs",
        lastUpdated: "2026.02.05",
        posts: [],
      },
      {
        id: "p5",
        title: "Docs",
        tech: "MDX",
        lastUpdated: "2026.02.04",
        posts: [],
      },
    ],
  },
};

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function uid(prefix = "d") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function parseTags(text: string) {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatTags(tags: string[]) {
  return tags.join(", ");
}

export function DevlogWorkspaceView({ workspaceId }: { workspaceId: string }) {
  const initial = MOCK_DETAIL[workspaceId];
  const [detail, setDetail] = useState<SolutionDetail | null>(initial ?? null);

  const [openProjectIds, setOpenProjectIds] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      (initial?.projects ?? []).forEach((p) => {
        init[p.id] = true;
      });
      return init;
    },
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedPostId, setSelectedPostId] = useState<string>("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const projects = useMemo(() => detail?.projects ?? [], [detail]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const selectedPost = useMemo(() => {
    if (!selectedProject) return null;
    return (
      selectedProject.posts.find((post) => post.id === selectedPostId) ?? null
    );
  }, [selectedProject, selectedPostId]);

  if (!detail) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
        존재하지 않는 솔루션입니다.
      </div>
    );
  }

  const openCreateModal = () => {
    setSelectedProjectId(detail.projects[0]?.id ?? "");
    setIsCreateOpen(true);
  };

  const openDetailModal = (projectId: string, postId: string) => {
    setSelectedProjectId(projectId);
    setSelectedPostId(postId);
    setIsDetailOpen(true);
  };

  const openEditModal = () => {
    setIsDetailOpen(false);
    setIsEditOpen(true);
  };

  const handleCreate = (value: PostFormValue) => {
    const newPost: Post = {
      id: uid(),
      title: value.title.trim(),
      summary: value.summary.trim(),
      content: value.content.trim(),
      date: todayYmd(),
      tags: parseTags(value.tagsText),
    };

    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        projects: prev.projects.map((project) =>
          project.id === value.projectId
            ? {
                ...project,
                posts: [newPost, ...project.posts],
              }
            : project,
        ),
      };
    });

    setOpenProjectIds((prev) => ({
      ...prev,
      [value.projectId]: true,
    }));

    setIsCreateOpen(false);
  };

  const handleEdit = (value: PostFormValue) => {
    if (!selectedPost) return;

    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        projects: prev.projects.map((project) => {
          if (project.id !== selectedProjectId) return project;

          return {
            ...project,
            posts: project.posts.map((post) =>
              post.id === selectedPost.id
                ? {
                    ...post,
                    title: value.title.trim(),
                    summary: value.summary.trim(),
                    content: value.content.trim(),
                    tags: parseTags(value.tagsText),
                  }
                : post,
            ),
          };
        }),
      };
    });

    setIsEditOpen(false);
  };

  const handleDelete = () => {
    if (!selectedPost) return;
    if (!confirm("이 개발일지를 삭제할까요?")) return;

    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        projects: prev.projects.map((project) => {
          if (project.id !== selectedProjectId) return project;
          return {
            ...project,
            posts: project.posts.filter((post) => post.id !== selectedPost.id),
          };
        }),
      };
    });

    setIsDetailOpen(false);
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold text-gray-900">
            개발일지
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{detail.name}</span> ·
            프로젝트별 개발일지를 확인합니다
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} />새 일지 작성
        </button>
      </div>

      <DevlogListHeader />

      <section className="space-y-4">
        {projects.map((project) => {
          const isOpen = openProjectIds[project.id] ?? true;

          return (
            <div
              key={project.id}
              className="rounded-2xl border border-gray-200 bg-white"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenProjectIds((prev) => ({
                    ...prev,
                    [project.id]: !isOpen,
                  }))
                }
                className="w-full rounded-2xl px-5 py-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-sm font-bold text-gray-900">
                        {project.title}
                      </div>
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                        {project.tech}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      최근 수정 날짜:{" "}
                      <span className="font-semibold text-gray-800">
                        {project.lastUpdated}
                      </span>
                      <span className="mx-2 text-gray-300">·</span>
                      개발일지 {project.posts.length}개
                    </div>
                  </div>

                  {isOpen ? (
                    <ChevronDown size={20} className="text-gray-700" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-700" />
                  )}
                </div>
              </button>

              {isOpen ? (
                <div className="px-5 pb-5 pt-1">
                  {project.posts.length === 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                      개발일지가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {project.posts.map((post) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => openDetailModal(project.id, post.id)}
                          className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-gray-300 hover:shadow-sm"
                        >
                          <div className="space-y-2">
                            <div className="text-xs text-gray-500">
                              {post.date}
                            </div>

                            <div className="font-extrabold text-gray-900">
                              {post.title}
                            </div>

                            <div className="text-sm text-gray-600">
                              {post.summary}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {post.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      {isCreateOpen ? (
        <PostFormModal
          title="새 개발일지 작성"
          subtitle="오늘의 개발 내용을 기록하세요"
          projects={projects.map((project) => ({
            id: project.id,
            title: project.title,
          }))}
          initialValue={{
            projectId: selectedProjectId || projects[0]?.id || "",
            title: "",
            summary: "",
            content: "",
            tagsText: "",
          }}
          submitLabel="저장"
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
        />
      ) : null}

      {isDetailOpen && selectedPost ? (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setIsDetailOpen(false)}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      ) : null}

      {isEditOpen && selectedPost ? (
        <PostFormModal
          title="개발일지 수정"
          subtitle="일지 내용을 수정하세요"
          projects={projects.map((project) => ({
            id: project.id,
            title: project.title,
          }))}
          initialValue={{
            projectId: selectedProjectId,
            title: selectedPost.title,
            summary: selectedPost.summary,
            content: selectedPost.content,
            tagsText: formatTags(selectedPost.tags),
          }}
          submitLabel="저장"
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEdit}
        />
      ) : null}
    </>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  footer,
  onClose,
  maxWidth = "max-w-[680px]",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/35">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div
          className={[
            "w-full",
            maxWidth,
            "max-h-[85vh]",
            "flex flex-col",
            "overflow-hidden",
            "rounded-[18px] border border-[#E5E7EB] bg-white",
            "shadow-[0_18px_48px_rgba(15,23,42,0.16)]",
          ].join(" ")}
        >
          {/* header */}
          <div className="shrink-0 flex items-start justify-between border-b border-[#ECEEF2] px-5 py-4">
            <div>
              <h2 className="text-[24px] font-extrabold leading-none tracking-[-0.02em] text-[#111827]">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-2 text-[14px] leading-5 text-[#6B7280]">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
            >
              <X size={17} />
            </button>
          </div>

          {/* body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {children}
          </div>

          {/* footer */}
          {footer ? (
            <div className="shrink-0 flex justify-end gap-2 border-t border-[#ECEEF2] bg-white px-5 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
function PostDetailModal({
  post,
  onClose,
  onEdit,
  onDelete,
}: {
  post: Post;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <ModalShell
      title="개발일지 상세"
      onClose={onClose}
      maxWidth="max-w-[760px]"
      footer={
        <>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F9FAFB]"
          >
            수정
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#F3D1D1] bg-white px-4 text-sm font-semibold text-[#EF4444] transition hover:bg-[#FEF2F2]"
          >
            삭제
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <div className="text-sm font-medium text-[#9CA3AF]">제목</div>
          <div className="mt-2 text-[20px] font-extrabold leading-7 tracking-[-0.01em] text-[#111827]">
            {post.title}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 border-b border-[#ECEEF2] pb-5 sm:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-[#9CA3AF]">작성일</div>
            <div className="mt-2 flex items-center gap-2 text-[15px] font-medium text-[#111827]">
              <CalendarDays size={16} className="text-[#6B7280]" />
              <span>{post.date}</span>
            </div>
          </div>
        </section>

        <section>
          <div className="text-sm font-medium text-[#9CA3AF]">요약</div>
          <div className="mt-2 text-[15px] leading-7 text-[#374151]">
            {post.summary}
          </div>
        </section>

        <section>
          <div className="text-sm font-medium text-[#9CA3AF]">내용</div>
          <div className="mt-3 rounded-2xl bg-[#FAFAFB] px-4 py-4 text-[15px] leading-7 text-[#111827]">
            <pre className="whitespace-pre-wrap font-sans">
              {post.content || "-"}
            </pre>
          </div>
        </section>

        {post.tags.length > 0 ? (
          <section>
            <div className="mb-3 text-sm font-medium text-[#9CA3AF]">태그</div>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-[11px] font-semibold text-[#374151]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </ModalShell>
  );
}

function PostFormModal({
  title,
  subtitle,
  projects,
  initialValue,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  subtitle?: string;
  projects: Array<{ id: string; title: string }>;
  initialValue: PostFormValue;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (value: PostFormValue) => void;
}) {
  const [value, setValue] = useState<PostFormValue>(initialValue);

  const canSave =
    value.projectId.trim() &&
    value.title.trim() &&
    value.summary.trim() &&
    value.content.trim();

  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      maxWidth="max-w-[640px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F9FAFB]"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSubmit(value)}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#0B1220] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
          >
            저장
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <FieldLabel required>프로젝트</FieldLabel>
          <select
            value={value.projectId}
            onChange={(e) =>
              setValue((prev) => ({ ...prev, projectId: e.target.value }))
            }
            className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7FA] px-4 text-sm text-[#111827] outline-none transition focus:border-[#D1D5DB] focus:bg-white focus:ring-2 focus:ring-[#E5E7EB]"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel required>제목</FieldLabel>
          <input
            value={value.title}
            onChange={(e) =>
              setValue((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="예: 사용자 인증 기능 구현"
            className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7FA] px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#D1D5DB] focus:bg-white focus:ring-2 focus:ring-[#E5E7EB]"
          />
        </div>

        <div>
          <FieldLabel required>요약</FieldLabel>
          <input
            value={value.summary}
            onChange={(e) =>
              setValue((prev) => ({ ...prev, summary: e.target.value }))
            }
            placeholder="한 줄로 요약해주세요"
            className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7FA] px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#D1D5DB] focus:bg-white focus:ring-2 focus:ring-[#E5E7EB]"
          />
        </div>

        <div>
          <FieldLabel>상세 내용</FieldLabel>
          <textarea
            value={value.content}
            onChange={(e) =>
              setValue((prev) => ({ ...prev, content: e.target.value }))
            }
            placeholder="작업 내용, 주요 변경사항, 이슈 및 해결방법, 다음 단계 등을 작성하세요..."
            className="min-h-[120px] w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7FA] px-4 py-3 text-sm leading-6 text-[#111827] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#D1D5DB] focus:bg-white focus:ring-2 focus:ring-[#E5E7EB]"
          />
          <div className="mt-2 text-xs text-[#9CA3AF]">
            {value.content.length} / 5000자
          </div>
        </div>

        <div>
          <FieldLabel>태그</FieldLabel>
          <input
            value={value.tagsText}
            onChange={(e) =>
              setValue((prev) => ({ ...prev, tagsText: e.target.value }))
            }
            placeholder="예: API, Design, UI/UX"
            className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7FA] px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#D1D5DB] focus:bg-white focus:ring-2 focus:ring-[#E5E7EB]"
          />
        </div>
      </div>
    </ModalShell>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-semibold text-[#111827]">
      {children}
      {required ? <span className="ml-1 text-[#111827]">*</span> : null}
    </label>
  );
}
