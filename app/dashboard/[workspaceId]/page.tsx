import MainDashboard from "@/components/dashboard/MainDashboard";

type Props = {
  params: Promise<{
    workspaceId?: string;
    id?: string;
  }>;
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function ProjectDashboardDetailPage({
  params,
  searchParams,
}: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const workspaceId = resolvedParams.workspaceId ?? resolvedParams.id ?? "";

  const mode =
    resolvedSearchParams.mode === "team" ||
    resolvedSearchParams.mode === "personal"
      ? resolvedSearchParams.mode
      : "personal";

  return <MainDashboard workspaceId={workspaceId} mode={mode} />;
}
