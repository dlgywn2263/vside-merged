import MainDashboard from "@/components/dashboard/MainDashboard";

type Props = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function ProjectDashboardDetailPage({ params }: Props) {
  const { workspaceId } = await params;

  return <MainDashboard workspaceId={workspaceId} />;
}
