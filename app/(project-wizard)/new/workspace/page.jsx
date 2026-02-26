"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Copy, UsersRound, UserRound, Folder } from "lucide-react";
import WizardShell from "@/components/new/WizardShell";
import { useWorkspaceWizard } from "@/store/workspaceWizardStore";

export default function Page() {
  const router = useRouter();

  // ✅ zustand에서 mode 저장/조회
  const mode = useWorkspaceWizard((s) => s.mode); // null | "personal" | "team"
  const setMode = useWorkspaceWizard((s) => s.setMode);

  const goBack = () => router.push("/");

  // ✅ 다음 단계: 개인/팀 모두 language로 가되, mode는 store에 저장되어 유지됨
  const goNext = () => {
    if (!mode) return; // 아무 것도 선택 안 했으면 막기 (필요하면 toast)
    router.push("/new/language");
  };

  // ✅ 예시 키 (실제론 서버에서 받는 게 맞음)
  const projectKey = useMemo(() => "PROJ-4K9L-M2X7", []);

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(projectKey);
    } catch (e) {}
  };

  return (
    <>
      <WizardShell>
        <div className="max-w-2xl mx-auto ">
          <div className="bg-white rounded-2xl border border-gray-300 p-8">
            {/* 이름/설명 */}
            <label className="block mb-4">
              <div className="text-sm text-gray-600 mb-2">
                워크스페이스 이름(J)
              </div>
              <input
                className="w-full bg-gray-100 rounded-lg px-3 py-2"
                defaultValue="56655"
              />
            </label>

            <label className="block mb-6">
              <div className="text-sm text-gray-600 mb-2">
                워크스페이스 설명
              </div>
              <input
                className="w-full bg-gray-100 rounded-lg px-3 py-2"
                defaultValue="56655"
              />
            </label>

            <label className="block mb-4">
              <div className="text-sm text-gray-600 mb-2">위치(L)</div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-gray-100 rounded-lg px-3 py-2"
                  defaultValue="C:\Users\user\source\repos"
                />
                <button className="px-3 py-2 rounded-lg bg-gray-50">
                  <Folder color="gray" size={18} />
                </button>
              </div>
            </label>

            <label className="flex items-center gap-2 mt-4 text-sm text-gray-700">
              <input type="checkbox" />
              솔루션 및 프로젝트를 같은 디렉터리에 배치(D)
            </label>

            <div className="text-xs text-gray-500 mt-4">
              "C:\Users\user\source\repos\56655\56655"에 프로젝트가
              만들어집니다.
            </div>

            {/* ✅ 모드 선택 */}
            <div className="grid grid-cols-2 gap-4 mb-6 mt-8">
              <button
                type="button"
                onClick={() => setMode("personal")}
                className={`flex flex-col justify-center items-center rounded-2xl border p-6 text-left hover:bg-gray-50 ${
                  mode === "personal"
                    ? "border-gray-400 ring-2 ring-gray-900/10"
                    : "border-gray-300"
                }`}
              >
                <div className="w-15 h-15 rounded-3xl bg-blue-50 mb-4 flex items-center justify-center">
                  <UserRound size="30" color="blue" />
                </div>
                <div className="font-semibold text-gray-900 mb-1">
                  개인 워크스페이스 생성
                </div>
                <div className="text-sm text-gray-600">
                  혼자서 빠르게 프로젝트를 시작해보세요
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("team")}
                className={`flex flex-col justify-center items-center rounded-2xl border p-6 text-left hover:bg-gray-50 ${
                  mode === "team"
                    ? "border-gray-400 ring-2 ring-gray-900/10"
                    : "border-gray-300"
                }`}
              >
                <div className="w-15 h-15 rounded-3xl bg-green-50 mb-4 flex items-center justify-center">
                  <UsersRound size="30" color="green" />
                </div>
                <div className="font-semibold text-gray-900 mb-1">
                  팀 워크스페이스 생성
                </div>
                <div className="text-sm text-gray-600">
                  팀원들과 함께 협업 프로젝트를 시작해보세요
                </div>
              </button>
            </div>

            {/* ✅ 팀 선택 시에만 */}
            {mode === "team" && (
              <>
                <div className=" mb-2">팀원 초대</div>
                <div className="text-sm text-gray-600 mb-3">
                  프로젝트에 초대할 팀원의 이메일을 입력하세요
                </div>

                <div className="flex gap-2 mb-6">
                  <input
                    className="flex-1 bg-gray-100 rounded-lg px-3 py-2"
                    placeholder="팀원의 이메일 주소"
                  />
                  <button className="px-4 py-1 rounded-lg border border-gray-100 hover:bg-gray-50">
                    + 추가
                  </button>
                </div>

                <div className=" mb-2">프로젝트 키</div>
                <div className="text-sm text-gray-600 mb-2">
                  팀원에게 이 키를 공유하면 프로젝트에 참여할 수 있습니다
                </div>

                <div className="flex gap-2 mb-6">
                  <input
                    className="flex-1 rounded-lg px-3 py-2 bg-gray-100"
                    value={projectKey}
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

            {/* ✅ 버튼은 개인/팀 둘 다 항상 보이게 */}
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
    </>
  );
}
