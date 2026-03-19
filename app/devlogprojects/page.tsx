import DevlogProject from "@/components/devlog/devlogProject";

export default function DevlogPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-extrabold text-gray-900">개발일지</h1>
        <DevlogProject />
      </div>
    </main>
  );
}