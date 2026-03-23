// import { DevlogWorkspaceView } from "@/components/devlog/devlogWorkspaceView";

// export default async function DevlogWorkspacePage({
//   params,
// }: {
//   params: Promise<{ workspaceId: string }>;
// }) {
//   const { workspaceId } = await params;

//   return (
//     <main className="bg-[#f6f7fb] min-h-screen">
//       <div className="mx-auto max-w-7xl px-6 py-8">
//         <DevlogWorkspaceView workspaceId={workspaceId} />
//       </div>
//     </main>
//   );
// }
import { redirect } from "next/navigation";

export default function DevlogWorkspaceRedirectPage() {
  redirect("/devlog");
}
