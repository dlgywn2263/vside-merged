"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WizardShell from "@/components/new/WizardShell";
import { useWorkspaceWizard } from "@/store/workspaceWizardStore";
import {
  createWorkspaceApi,
  inviteWorkspaceMemberApi,
  createProjectApi,
} from "@/lib/ide/api";

export default function Page() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [path, setPath] = useState("C:\\WebIDE\\workspaces");
  const [gitUrl, setGitUrl] = useState("");

  const mode = useWorkspaceWizard((s) => s.mode);
  const language = useWorkspaceWizard((s) => s.language);

  const name = useWorkspaceWizard((s) => s.name);
  const description = useWorkspaceWizard((s) => s.description);
  const teamMembers = useWorkspaceWizard((s) => s.teamMembers);

  const setName = useWorkspaceWizard((s) => s.setName);
  const setDescription = useWorkspaceWizard((s) => s.setDescription);
  const reset = useWorkspaceWizard((s) => s.reset);

  useEffect(() => {
    if (!mode) {
      router.replace("/new/workspace");
      return;
    }

    if (!language) {
      router.replace("/new/language");
    }
  }, [mode, language, router]);

  const goBack = () => router.push("/new/language");

  const goCreate = async () => {
    if (!mode || !language || !name.trim() || !path.trim()) return;
    if (isCreating) return;

    try {
      setIsCreating(true);

      const createdWorkspace = await createWorkspaceApi({
        mode,
        name,
        description,
        path,
        teamName: mode === "team" ? name : null,
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
          teamMembers.map((email) =>
            inviteWorkspaceMemberApi({ workspaceId, email }),
          ),
        );
      }

      await createProjectApi({
        workspaceId,
        projectName: name,
        description,
        language,
        gitUrl,
      });

      // reset() 여기서 하지 말 것
      if (mode === "personal") {
        router.push(`/ide/personal/${workspaceId}`);
      } else {
        router.push(`/ide/team/${workspaceId}`);
      }
    } catch (error) {
      console.error("생성 실패:", error);
      alert(
        error instanceof Error
          ? error.message
          : "프로젝트 생성에 실패했습니다.",
      );
    } finally {
      setIsCreating(false);
    }
  };
  if (!mode || !language) return null;

  return (
    <WizardShell>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-300 p-8">
          <div className="inline-block px-3 py-1 rounded-md bg-blue-100 text-blue-700 text-sm mb-6">
            {language}
          </div>

          <label className="block mb-4">
            <div className="text-sm text-gray-600 mb-2">프로젝트 이름(J)</div>
            <input
              className="w-full bg-gray-100 rounded-lg px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트 이름을 입력하세요"
            />
          </label>

          <label className="block mb-4">
            <div className="text-sm text-gray-600 mb-2">프로젝트 설명</div>
            <input
              className="w-full bg-gray-100 rounded-lg px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 설명을 입력하세요"
            />
          </label>

          <label className="block mb-4">
            <div className="text-sm text-gray-600 mb-2">워크스페이스 경로</div>
            <input
              className="w-full bg-gray-100 rounded-lg px-3 py-2"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="C:\\WebIDE\\workspaces"
            />
          </label>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="font-semibold mb-2">GitHub 저장소 (선택사항)</div>
            <div className="text-sm text-gray-600 mb-3">
              첫 프로젝트 생성 시 remote로 연결됩니다
            </div>
            <input
              className="w-full bg-gray-100 rounded-lg px-3 py-2"
              placeholder="https://github.com/username/repository"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={goBack}
              disabled={isCreating}
              className="px-5 py-2 rounded-lg border border-gray-300"
            >
              뒤로(B)
            </button>

            <button
              onClick={goCreate}
              disabled={isCreating || !name.trim() || !path.trim()}
              className={`px-5 py-2 rounded-lg bg-gray-300 text-gray-700 hover:bg-black hover:text-white ${
                isCreating || !name.trim() || !path.trim()
                  ? "opacity-50 cursor-not-allowed hover:bg-gray-300 hover:text-gray-700"
                  : ""
              }`}
            >
              {isCreating ? "생성 중..." : "만들기(C)"}
            </button>
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
