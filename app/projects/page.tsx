// app/projects/page.tsx
import { ProjectManagerList } from "@/components/projects/ProjectManagerList";
import { Plus } from "lucide-react";
export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] ">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">AIVS</h1>
            <p className="mt-1 text-sm text-gray-500">
              프로젝트를 생성하고 진입할 수 있습니다.
            </p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 bg-[#5873F9] hover:bg-[#4863E8] transition-colors text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm">
            <Plus />새 프로젝트 생성
          </button>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <ProjectManagerList />
        </section>
      </div>
    </main>
  );
}
