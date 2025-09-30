'use client';

import { useSearchParams } from 'next/navigation';
import PrescriptiveCampaignFlow from './PrescriptiveCampaignFlow';

export default function PrescriptiveCampaignPage() {
  const searchParams = useSearchParams();
  const zip = searchParams.get('zip');

  return <PrescriptiveCampaignFlow initialZip={zip} />;
}