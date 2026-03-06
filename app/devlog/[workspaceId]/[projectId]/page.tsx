import Link from "next/link";
// import { DevlogPostList } from "@/components/devlog/devlogPostList";
import { DevlogListHeader } from "@/components/devlog/devlogHeader";

export default async function DevlogProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="mt-1 text-3xl font-extrabold text-gray-900">
              프로젝트 개발일지
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              프로젝트 개발 과정을 기록하고 관리합니다
            </p>
          </div>

          <Link
            href={`/devlog/${projectId}/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <span className="text-base leading-none">＋</span>새 일지 작성
          </Link>
        </div>
        <div className="mx-auto w-full max-w-[960px] space-y-5">
          {/* 검색 */}
          <DevlogListHeader />
          {/* 리스트 */}
          {/* <DevlogPostList projectId={projectId} /> */}
        </div>
      </div>
    </main>
  );
}
