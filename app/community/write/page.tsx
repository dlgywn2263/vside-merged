import PostEditor from "@/components/community/PostEditor";

export default function CommunityWritePage() {
  return (
    <main className="min-h-screen bg-zinc-50 from-blue-50 via-white to-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            글 작성
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            질문, 코드 고민, 개발 기록을 자유롭게 공유해보세요.
          </p>
        </div>

        <PostEditor />
      </div>
    </main>
  );
}