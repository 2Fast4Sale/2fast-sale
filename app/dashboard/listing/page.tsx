'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Alter einseitiger Flow — weitergeleitet auf den neuen mehrseitigen Flow
export default function ListingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/listing/step1');
  }, [router]);
  return null;
}
