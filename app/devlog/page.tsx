import { DevlogWorkspaceList } from "@/components/devlog/devlogWorkspaceList";

export default function DevlogPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="mt-1 text-3xl font-extrabold text-gray-900">
              개발일지
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              솔루션(개인/팀)별 프로젝트 개발일지를 확인할 수 있습니다
            </p>
          </div>
        </div>

        <DevlogWorkspaceList />
      </div>
    </main>
  );
}
