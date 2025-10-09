'use client';

import { useSearchParams } from 'next/navigation';
import PrescriptiveCampaignFlow from './PrescriptiveCampaignFlow';

export default function Page({
  searchParams,
}: {
  searchParams: { zip?: string | null };
}) {
  return <PrescriptiveCampaignFlow initialZip={searchParams?.zip ?? null} />;
}
