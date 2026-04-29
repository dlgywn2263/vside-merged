"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, UsersRound, UserRound, Folder } from "lucide-react";
import WizardShell from "@/components/new/WizardShell";
import { useWorkspaceWizard } from "@/store/workspaceWizardStore";

export default function Page() {
  const router = useRouter();

  const mode = useWorkspaceWizard((s) => s.mode);
  const setMode = useWorkspaceWizard((s) => s.setMode);

  // 💡 1단계 바인딩: projectName
  const projectName = useWorkspaceWizard((s) => s.projectName);
  const setProjectName = useWorkspaceWizard((s) => s.setProjectName);

  const projectDescription = useWorkspaceWizard((s) => s.projectDescription);
  const setProjectDescription = useWorkspaceWizard((s) => s.setProjectDescription);

  const path = useWorkspaceWizard((s) => s.path);
  const setPath = useWorkspaceWizard((s) => s.setPath);

  const teamMembers = useWorkspaceWizard((s) => s.teamMembers);
  const addTeamMember = useWorkspaceWizard((s) => s.addTeamMember);
  const removeTeamMember = useWorkspaceWizard((s) => s.removeTeamMember);

  const projectKey = useWorkspaceWizard((s) => s.projectKey);
  const setProjectKey = useWorkspaceWizard((s) => s.setProjectKey);

  const [memberInput, setMemberInput] = useState("");

  const goBack = () => router.push("/");

  const goNext = () => {
    if (!mode) return;
    router.push("/new/language");
  };

  const generatedProjectKey = useMemo(() => {
    if (projectKey) return projectKey;
    return "PROJ-4K9L-M2X7";
  }, [projectKey]);

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(generatedProjectKey);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = () => {
    if (!memberInput.trim()) return;
    addTeamMember(memberInput);
    setMemberInput("");
  };

  const handleSelectMode = (selectedMode) => {
    setMode(selectedMode);

    if (selectedMode === "team" && !projectKey) {
      setProjectKey(generatedProjectKey);
    }
  };

  return (
    <WizardShell>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-300 p-8">
          <label className="block mb-4">
            <div className="text-sm text-gray-600 mb-2">프로젝트 이름(J)</div>
            <input
              className="w-full bg-gray-100 rounded-lg px-3 py-2"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="프로젝트 이름을 입력하세요"
            />
          </label>

          <label className="block mb-6">
            <div className="text-sm text-gray-600 mb-2">프로젝트 설명</div>
            <input
              className="w-full bg-gray-100 rounded-lg px-3 py-2"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="프로젝트 설명을 입력하세요"
            />
          </label>

          <label className="block mb-4">
            <div className="text-sm text-gray-600 mb-2">위치(L)</div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-100 rounded-lg px-3 py-2"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="C:\WebIDE\workspaces"
              />
              <button className="px-3 py-2 rounded-lg bg-gray-50" type="button">
                <Folder color="gray" size={18} />
              </button>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-4 mb-6 mt-8">
            <button
              type="button"
              onClick={() => handleSelectMode("personal")}
              className={`flex flex-col justify-center items-center rounded-2xl border p-6 text-left hover:bg-gray-50 ${
                mode === "personal"
                  ? "border-gray-400 ring-2 ring-gray-900/10"
                  : "border-gray-300"
              }`}
            >
              <div className="w-15 h-15 rounded-3xl bg-blue-50 mb-4 flex items-center justify-center">
                <UserRound size={30} color="blue" />
              </div>
              <div className="font-semibold text-gray-900 mb-1">
                개인 프로젝트 생성
              </div>
              <div className="text-sm text-gray-600">
                혼자서 빠르게 프로젝트를 시작해보세요
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMode("team")}
              className={`flex flex-col justify-center items-center rounded-2xl border p-6 text-left hover:bg-gray-50 ${
                mode === "team"
                  ? "border-gray-400 ring-2 ring-gray-900/10"
                  : "border-gray-300"
              }`}
            >
              <div className="w-15 h-15 rounded-3xl bg-green-50 mb-4 flex items-center justify-center">
                <UsersRound size={30} color="green" />
              </div>
              <div className="font-semibold text-gray-900 mb-1">
                팀 프로젝트 생성
              </div>
              <div className="text-sm text-gray-600">
                팀원들과 함께 협업 프로젝트를 시작해보세요
              </div>
            </button>
          </div>

          {mode === "team" && (
            <>
              <div className="mb-2">팀원 초대</div>
              <div className="text-sm text-gray-600 mb-3">
                프로젝트에 초대할 팀원의 이메일을 입력하세요
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 bg-gray-100 rounded-lg px-3 py-2"
                  placeholder="팀원의 이메일 주소"
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="px-4 py-1 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  + 추가
                </button>
              </div>

              {teamMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {teamMembers.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-sm"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeTeamMember(email)}
                        className="text-gray-500 hover:text-black"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-2">프로젝트 키</div>
              <div className="text-sm text-gray-600 mb-2">
                팀원에게 이 키를 공유하면 프로젝트에 참여할 수 있습니다
              </div>

              <div className="flex gap-2 mb-6">
                <input
                  className="flex-1 rounded-lg px-3 py-2 bg-gray-100"
                  value={generatedProjectKey}
                  readOnly
                />
                <button
                  type="button"
                  onClick={copyKey}
                  className="px-4 py-2 rounded-lg border border-gray-100"
                  aria-label="copy project key"
                >
                  <Copy color="gray" size={20} />
                </button>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={goBack}
              className="px-5 py-2 rounded-lg border-gray-300 border"
            >
              뒤로(B)
            </button>

            <button
              onClick={goNext}
              disabled={!mode}
              className={`px-5 py-2 rounded-lg bg-gray-300 text-gray-700 hover:bg-black hover:text-white ${
                !mode
                  ? "opacity-50 cursor-not-allowed hover:bg-gray-300 hover:text-gray-700"
                  : ""
              }`}
            >
              다음(C)
            </button>
          </div>
        </div>
      </div>
    </WizardShell>
  );
}