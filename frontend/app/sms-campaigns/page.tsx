'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MessageSquare, 
  Users, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Plus,
  Minus
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface SMSCampaign {
  id: string;
  name: string;
  segment: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  conversions: number;
  sent_at: string | null;
}

export default function SMSCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sms/campaigns?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const recordConversion = async (campaignId: string, delta: number) => {
    setUpdating(campaignId);
    try {
      const res = await fetch(`${API_URL}/api/sms/campaigns/${campaignId}/conversion?count=${delta}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId ? { ...c, conversions: data.conversions } : c
        ));
      }
    } catch (err) {
      console.error('Failed to record conversion:', err);
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not sent';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getConversionRate = (campaign: SMSCampaign) => {
    if (campaign.sent_count === 0) return 0;
    return ((campaign.conversions || 0) / campaign.sent_count * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">SMS Campaigns</h1>
          <p className="text-gray-600 mt-1">Track delivery and conversions from your outreach</p>
        </div>

        {campaigns.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{campaigns.length}</div>
              <div className="text-sm text-gray-500">Campaigns</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{campaigns.reduce((sum, c) => sum + c.sent_count, 0)}</div>
              <div className="text-sm text-gray-500">Messages Sent</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-2xl font-bold text-green-600">{campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0)}</div>
              <div className="text-sm text-gray-500">Total Bookings</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-2xl font-bold text-indigo-600">
                {campaigns.reduce((sum, c) => sum + c.sent_count, 0) > 0 
                  ? (campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0) / campaigns.reduce((sum, c) => sum + c.sent_count, 0) * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="text-sm text-gray-500">Avg Conversion</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
            <p className="text-gray-500">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-4">Send your first SMS campaign from Patient Insights</p>
            <button onClick={() => router.push('/patient-intelligence')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Go to Patient Insights
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-500">{formatDate(campaign.sent_at)}</p>
                  </div>
                  {campaign.segment && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{campaign.segment}</span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{campaign.sent_count}</div>
                      <div className="text-xs text-gray-500">Sent</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{campaign.delivered_count || '—'}</div>
                      <div className="text-xs text-gray-500">Delivered</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{campaign.failed_count}</div>
                      <div className="text-xs text-gray-500">Failed</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                    <div>
                      <div className="text-sm font-medium text-indigo-600">{getConversionRate(campaign)}%</div>
                      <div className="text-xs text-gray-500">Converted</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-green-600">{campaign.conversions || 0}</span> bookings logged
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Log bookings:</span>
                    <button
                      onClick={() => recordConversion(campaign.id, -1)}
                      disabled={updating === campaign.id || (campaign.conversions || 0) <= 0}
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="h-4 w-4 text-gray-600" />
                    </button>
                    <span className="w-8 text-center font-medium text-gray-900">{campaign.conversions || 0}</span>
                    <button
                      onClick={() => recordConversion(campaign.id, 1)}
                      disabled={updating === campaign.id}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="h-4 w-4 text-green-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
