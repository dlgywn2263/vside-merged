// app/devlog/[solutionId]/page.tsx

import { DevlogWorkspaceView } from "@/components/devlog/devlogWorkspaceView";

export default async function DevlogSolutionPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <DevlogWorkspaceView workspaceId={workspaceId} />
      </div>
    </main>
  );
}
