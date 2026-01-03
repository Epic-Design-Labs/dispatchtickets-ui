import { redirect } from 'next/navigation';

export default async function BrandPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  redirect(`/brands/${workspaceId}/tickets`);
}
