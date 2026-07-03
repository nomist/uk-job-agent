import { JobDetailScreen } from "@/components/job-detail/job-detail-screen";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetailScreen jobId={id} />;
}
