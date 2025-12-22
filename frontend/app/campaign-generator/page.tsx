'use client';

import { Suspense } from 'react';
import { CampaignGeneratorContent } from './CampaignGeneratorContent';

export default function CampaignGeneratorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <CampaignGeneratorContent />
    </Suspense>
  );
}
