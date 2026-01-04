import { redirect } from 'next/navigation';

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  redirect(`/brands/${brandId}/tickets`);
}
