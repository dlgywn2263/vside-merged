"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  CheckCircle2,
  Folder,
  UsersRound,
  UserRound,
  X,
  Plus,
  Loader2,
  Layers3,
  Mail,
} from "lucide-react";

import WizardShell from "@/components/new/WizardShell";
import FolderPickerDialog from "@/components/new/FolderPickerDialog";
import { useWorkspaceWizard } from "@/store/workspaceWizardStore";
import {
  setWorkspaceId,
  setProjectList,
  setWorkspaceTree,
  setActiveProject,
} from "@/store/slices/fileSystemSlice";
import { createWorkspaceApi, inviteWorkspaceMemberApi } from "@/lib/ide/api";

const FIELD_CLASS =
  "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Page() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [memberInput, setMemberInput] = useState("");
  const [memberError, setMemberError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const mode = useWorkspaceWizard((s) => s.mode);
  const setMode = useWorkspaceWizard((s) => s.setMode);
  const projectName = useWorkspaceWizard((s) => s.projectName);
  const setProjectName = useWorkspaceWizard((s) => s.setProjectName);
  const projectDescription = useWorkspaceWizard((s) => s.projectDescription);
  const setProjectDescription = useWorkspaceWizard((s) => s.setProjectDescription);
  const path = useWorkspaceWizard((s) => s.path);
  const setPath = useWorkspaceWizard((s) => s.setPath);
  const teamMembers = useWorkspaceWizard((s) => s.teamMembers);
  const addTeamMember = useWorkspaceWizard((s) => s.addTeamMember);
  const removeTeamMember = useWorkspaceWizard((s) => s.removeTeamMember);

  const canCreate = Boolean(mode && projectName.trim() && path.trim());
  const goBack = () => router.push("/projects");

  const handleAddMember = () => {
    if (isCreating) return;
    const email = memberInput.trim();
    if (!email) {
      setMemberError("이메일을 입력해주세요.");
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setMemberError("올바른 이메일 형식을 입력해주세요.");
      return;
    }
    if (teamMembers.some((existing) => existing.toLowerCase() === email.toLowerCase())) {
      setMemberError("이미 추가한 이메일입니다.");
      return;
    }
    addTeamMember(email);
    setMemberInput("");
    setMemberError("");
  };

  const handleCreateProject = async () => {
    if (!canCreate || isCreating) return;
    const trimmedProjectName = projectName.trim();
    const trimmedDescription = projectDescription.trim();
    const trimmedPath = path.trim();

    try {
      setIsCreating(true);
      const createdWorkspace = await createWorkspaceApi({
        mode,
        name: trimmedProjectName,
        description: trimmedDescription,
        path: trimmedPath,
        teamName: mode === "team" ? trimmedProjectName : null,
      });

      const workspaceId =
        createdWorkspace?.uuid ||
        createdWorkspace?.id ||
        createdWorkspace?.workspaceId;
      if (!workspaceId) {
        throw new Error("생성 응답에 workspaceId(uuid)가 없습니다.");
      }

      if (mode === "team" && teamMembers.length > 0) {
        await Promise.all(
          teamMembers.map((email) => inviteWorkspaceMemberApi({ workspaceId, email })),
        );
      }

      dispatch(setWorkspaceId(workspaceId));
      // 대시보드에서 만든 프로젝트는 하위 프로젝트를 자동 생성하지 않음
      dispatch(setProjectList([]));
      dispatch(setWorkspaceTree(null));
      dispatch(setActiveProject(null));
      router.replace("/projects");
    } catch (error) {
      console.error("프로젝트 생성 실패:", error);
      alert(error instanceof Error ? error.message : "프로젝트 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <WizardShell fill>
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-2 pt-0 sm:px-6 lg:-mt-4">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EDF1FF] text-[#5873F9]">
            <Layers3 size={20} strokeWidth={2.1} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
              새 프로젝트 생성
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              프로젝트 정보를 입력하고 작업을 시작하세요.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-[#F8FAFF] px-5 py-3 sm:px-7">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#5873F9] text-[11px] font-bold text-white">1</span>
              <h2 className="text-sm font-bold text-slate-900">프로젝트 유형</h2>
              <span className="text-xs text-slate-500">작업 방식을 선택하세요</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <ModeCard
                selected={mode === "personal"}
                icon={UserRound}
                title="개인 프로젝트"
                description="혼자 작업하는 프로젝트"
                disabled={isCreating}
                onClick={() => { setMode("personal"); setMemberError(""); }}
              />
              <ModeCard
                selected={mode === "team"}
                icon={UsersRound}
                title="팀 프로젝트"
                description="팀원과 함께 개발하는 프로젝트"
                disabled={isCreating}
                onClick={() => { setMode("team"); setMemberError(""); }}
              />
            </div>
          </div>

          <div className="px-5 py-4 sm:px-7 sm:py-4">
            <div className={`grid gap-5 ${mode === "team" ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(310px,0.8fr)]" : ""}`}>
              <section className={`min-w-0 ${mode !== "team" ? "mx-auto w-full max-w-[720px]" : ""}`} aria-labelledby="project-info-title">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#EDF1FF] text-[11px] font-bold text-[#5873F9]">2</span>
                  <h2 id="project-info-title" className="text-sm font-bold text-slate-900">프로젝트 정보</h2>
                </div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      프로젝트 이름 <span className="text-[#5873F9]">*</span>
                    </span>
                    <input
                      className={FIELD_CLASS}
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="예: 학생 성적 관리 시스템"
                      disabled={isCreating}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      프로젝트 설명 <span className="text-xs font-normal text-slate-400">(선택)</span>
                    </span>
                    <textarea
                      className="min-h-[64px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/15 disabled:bg-slate-50"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="프로젝트의 목적이나 주요 기능을 입력하세요."
                      disabled={isCreating}
                      rows={2}
                    />
                  </label>
                  <div>
                    <label htmlFor="workspace-path" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      저장 위치 <span className="text-[#5873F9]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="workspace-path"
                        className={`${FIELD_CLASS} flex-1`}
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        placeholder="C:\\"
                        disabled={isCreating}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsPickerOpen(true)}
                        disabled={isCreating}
                        aria-label="저장 폴더 선택"
                        title="저장 폴더 선택"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[#B7C4FF] hover:bg-[#F8FAFF] disabled:opacity-50"
                      >
                        <Folder size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {mode === "team" && (
                <section aria-labelledby="team-members-title" className="min-w-0 rounded-xl border border-[#DCE4FF] bg-[#F5F7FF] p-4">
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E4EAFF] text-[#5873F9]">
                        <UsersRound size={18} />
                      </div>
                      <div>
                        <h2 id="team-members-title" className="text-sm font-bold text-slate-900">팀원 초대</h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          함께할 팀원을 추가하세요. 나중에 초대해도 됩니다.
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#5873F9]">
                      {teamMembers.length}명
                    </span>
                  </div>
                  <label htmlFor="invite-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
                    초대할 이메일
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="invite-email"
                      type="email"
                      className={`${FIELD_CLASS} flex-1 ${memberError ? "border-red-400" : ""}`}
                      placeholder="team@email.com"
                      value={memberInput}
                      disabled={isCreating}
                      aria-invalid={Boolean(memberError)}
                      onChange={(e) => { setMemberInput(e.target.value); setMemberError(""); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleAddMember(); }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddMember}
                      disabled={isCreating}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#5873F9] text-white transition-colors hover:bg-[#4965E8] disabled:opacity-50"
                      aria-label="팀원 이메일 추가"
                      title="팀원 추가"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  {memberError && <p className="mt-1.5 text-xs text-red-600" role="alert">{memberError}</p>}
                  <div className="mt-3 rounded-lg border border-[#E0E7FA] bg-white/90 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">초대 예정 팀원</span>
                      <span className="text-xs font-semibold text-[#5873F9]">{teamMembers.length}명</span>
                    </div>
                    {teamMembers.length === 0 ? (
                      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
                        <Mail size={15} className="shrink-0" />
                        이메일을 추가하면 여기에 표시됩니다.
                      </div>
                    ) : (
                      <div className="mt-3 flex max-h-36 flex-col gap-1.5 overflow-y-auto border-t border-slate-100 pt-3">
                        {teamMembers.map((email) => (
                          <div key={email} className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-[#E9F9F2] px-2.5 py-2">
                            <span className="min-w-0 truncate text-xs font-medium text-slate-700">{email}</span>
                            <button
                              type="button"
                              aria-label={`${email} 초대 목록에서 제거`}
                              disabled={isCreating}
                              onClick={() => removeTeamMember(email)}
                              className="shrink-0 text-slate-400 hover:text-red-500 disabled:opacity-50"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-[#FAFBFF] px-5 py-2.5 sm:px-7">
            <button
              type="button"
              onClick={goBack}
              disabled={isCreating}
              className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={!canCreate || isCreating}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#5873F9] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4965E8] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isCreating && <Loader2 size={15} className="animate-spin" />}
              {isCreating ? "생성 중..." : "프로젝트 생성"}
            </button>
          </div>
        </div>
      </div>

      <FolderPickerDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        initialPath={path}
        onSelect={setPath}
      />
    </WizardShell>
  );
}

function ModeCard({ selected, icon: Icon, title, description, disabled = false, onClick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[66px] w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? "border-[#5873F9] bg-[#EDF1FF]"
          : "border-slate-200 bg-white hover:border-[#B8C5FF] hover:bg-white/80"
      }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-[#5873F9] text-white" : "bg-slate-100 text-slate-500"}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{description}</div>
      </div>
      {selected && <CheckCircle2 size={17} className="shrink-0 text-[#5873F9]" />}
    </button>
  );
}
