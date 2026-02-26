// app/projects/page.tsx
import { ProjectManagerList } from "@/components/projects/ProjectManagerList";

export default function ProjectsPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            프로젝트 관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            내가 만든/참여 중인 프로젝트 목록과 설정을 관리합니다.
          </p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <ProjectManagerList />
        </section>
      </div>
    </main>
  );
}
