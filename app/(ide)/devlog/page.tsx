 import Link from "next/link";
import { DevlogListHeader } from "@/components/devlog/devlogHeader";
import { DevlogProjectList } from "@/components/devlog/devlogProjectList";

export default function DevlogListPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
            <div>
                <h1 className="mt-1 text-3xl font-extrabold text-gray-900">
                    개발일지
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    모든 프로젝트의 개발일지를 확인할 수 있습니다
                </p>
            </div>
        </div>

        {/* 정렬 + 검색 */}
        <DevlogListHeader />

        {/* 리스트 */}
        <DevlogProjectList />
      </div>
    </main>
  );
}