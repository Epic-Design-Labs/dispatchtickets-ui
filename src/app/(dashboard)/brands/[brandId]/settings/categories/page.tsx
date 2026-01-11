'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CategoriesRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;

  useEffect(() => {
    router.replace(`/brands/${brandId}/settings/fields`);
  }, [brandId, router]);

  return null;
}
