'use client';

import { ArrowRight, Check, MapPin, Target, DollarSign, Clock, TrendingUp, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function PatientInsights() {
  const router = useRouter();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZips, setSelectedZips] = useState<Record<string, boolean>>({});
  const [showZipEditor, setShowZipEditor] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  
  // Multi-select procedure filter
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>(['all']);
  const [availableProcedures, setAvailableProcedures] = useState<string[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProcedureDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const runId = sessionStorage.getItem('runId');

    if (!runId) {
      setError('No analysis found. Please upload patient data first.');
      setLoading(false);
      return;
    }

    const pollResults = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/runs/${runId}/results`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch results`);
        }

        const data = await response.json();

        if (data.status === 'done') {
          setAnalysisData(data);
          const initialSelection: Record<string, boolean> = {};
          (data.top_segments || []).forEach((seg: any) => {
            initialSelection[seg.zip] = true;
          });
          setSelectedZips(initialSelection);
          
          if (data.available_procedures && data.available_procedures.length > 0) {
            setAvailableProcedures(data.available_procedures);
          }
          
          setLoading(false);
        } else if (data.status === 'processing') {
          setTimeout(pollResults, 2000);
        } else if (data.status === 'error') {
          throw new Error(data.error || 'Analysis failed');
        } else {
          throw new Error(`Unknown status: ${data.status}`);
        }
      } catch (e: any) {
        console.error('[FRONTEND] Error:', e);
        setError(e.message);
        setLoading(false);
      }
    };

    pollResults();
  }, []);

  const toggleZip = (zip: string) => {
    setSelectedZips(prev => ({ ...prev, [zip]: !prev[zip] }));
  };

  const toggleProcedure = (procedure: string) => {
    if (procedure === 'all') {
      setSelectedProcedures(['all']);
    } else {
      setSelectedProcedures(prev => {
        const withoutAll = prev.filter(p => p !== 'all');
        
        if (withoutAll.includes(procedure)) {
          const newSelection = withoutAll.filter(p => p !== procedure);
          return newSelection.length === 0 ? ['all'] : newSelection;
        } else {
          return [...withoutAll, procedure];
        }
      });
    }
  };

  const applyProcedureFilter = async () => {
    setIsFiltering(true);
    setShowProcedureDropdown(false);
    
    try {
      const datasetId = sessionStorage.getItem('datasetId');
      if (!datasetId) {
        throw new Error('No dataset found');
      }

      const procedureParam = selectedProcedures.includes('all') 
        ? 'all' 
        : selectedProcedures.join(',');

      const response = await fetch(`${API_URL}/api/v1/runs?procedure=${procedureParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: datasetId,
          focus: 'non_inv'  // ← CHANGED
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create filtered run');
      }

      const { run_id } = await response.json();
      sessionStorage.setItem('runId', run_id);

      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        const resultResponse = await fetch(`${API_URL}/api/v1/runs/${run_id}/results`);
        const resultData = await resultResponse.json();

        if (resultData.status === 'done') {
          setAnalysisData(resultData);
          const initialSelection: Record<string, boolean> = {};
          (resultData.top_segments || []).forEach((seg: any) => {
            initialSelection[seg.zip] = true;
          });
          setSelectedZips(initialSelection);
          setIsFiltering(false);
          return;
        } else if (resultData.status === 'error') {
          throw new Error(resultData.error || 'Analysis failed');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }

      throw new Error('Analysis timed out');
    } catch (e: any) {
      console.error('[FILTER] Error:', e);
      setError(e.message);
      setIsFiltering(false);
    }
  };

  const generateCampaign = () => {
    const selected = Object.keys(selectedZips).filter(zip => selectedZips[zip]);
    if (selected.length === 0) return;
    const procedureParam = selectedProcedures.includes('all') ? 'all' : selectedProcedures.join(',');
    router.push(`/campaign-generator?zip=${selected.join(',')}&procedure=${procedureParam}`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Analysis Error</h2>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <button
            onClick={() => (window.location.href = '/')}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Upload New Data
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
          <div className="text-sm font-medium text-slate-900 mb-1">Analyzing your patients</div>
          <div className="text-xs text-slate-500">This takes about 30 seconds</div>
        </div>
      </div>
    );
  }

  if (!analysisData) return null;

  const {
    dominant_profile,
    profile_characteristics,
    behavior_patterns,
    geographic_summary,
    top_segments,
    campaign_metrics,
  } = analysisData;

  const selectedCount = Object.values(selectedZips).filter(Boolean).length;

  // Use ACTUAL historical revenue from backend, not predictions
  const totalRevenue = analysisData.actual_total_revenue || 0;

  const totalBookings = (top_segments || [])
    .filter((s: any) => selectedZips[s.zip])
    .reduce((sum: number, s: any) => sum + (s.expected_bookings || 0), 0);
  
  const budgetPercentage = campaign_metrics?.budget_percentage || 0.20;
  const recommendedBudget = totalBookings > 0 ? Math.round((totalRevenue * budgetPercentage) / 100) * 100 : 0;
  const costPerBooking = totalBookings > 0 ? Math.round(recommendedBudget / totalBookings) : 0;
  const roas = costPerBooking > 0 ? (totalRevenue / totalBookings / costPerBooking).toFixed(1) : '0';
  const profitPerPatient = totalBookings > 0 ? Math.round((totalRevenue - recommendedBudget) / totalBookings) : 0;
  
  const localZips = (top_segments || []).filter((s: any) => s.distance_miles <= 2);
  const extendedZips = (top_segments || []).filter((s: any) => s.distance_miles > 2);

  const bestPlatform = campaign_metrics?.best_platform || 'Facebook';
  const platformSuccessRate = campaign_metrics?.platform_success_rate || 85;
  
  const timelineMin = campaign_metrics?.timeline_weeks_min || 2;
  const timelineMax = campaign_metrics?.timeline_weeks_max || 4;
  const timelineText = timelineMin === timelineMax ? `${timelineMin} weeks` : `${timelineMin}-${timelineMax} weeks`;
  
  const successRate = campaign_metrics?.success_rate || 85;
  
  const variationsPerZip = campaign_metrics?.variations_per_zip || 3;
  const totalVariations = selectedCount * variationsPerZip;

  const procedureDisplayText = selectedProcedures.includes('all') 
    ? 'All Procedures'
    : selectedProcedures.length === 1
    ? selectedProcedures[0].charAt(0).toUpperCase() + selectedProcedures[0].slice(1)
    : `${selectedProcedures.length} procedures`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Header with Multi-Select Procedure Filter */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Your Patient Growth Plan</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-slate-600">
              Based on your last {analysisData.patient_count || 79} patients
              {selectedProcedures.length > 0 && !selectedProcedures.includes('all') && (
                <span className="text-slate-500"> • Filtered to {selectedProcedures.join(', ')}</span>
              )}
            </p>
            
            {availableProcedures.length > 0 && (
              <>
                <span className="text-slate-400">•</span>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowProcedureDropdown(!showProcedureDropdown)}
                    disabled={isFiltering}
                    className="flex items-center gap-2 text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="text-slate-600">Filter:</span>
                    <span className="font-medium">{procedureDisplayText}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showProcedureDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showProcedureDropdown && (
                    <div className="absolute top-full mt-2 left-0 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[200px] z-50">
                      <label className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-md cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedProcedures.includes('all')}
                          onChange={() => toggleProcedure('all')}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700 font-medium">All Procedures</span>
                      </label>

                      <div className="border-t border-slate-200 my-2"></div>

                      {availableProcedures.map(proc => (
                        <label key={proc} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-md cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedProcedures.includes(proc)}
                            onChange={() => toggleProcedure(proc)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-slate-700">
                            {proc.charAt(0).toUpperCase() + proc.slice(1)}
                          </span>
                        </label>
                      ))}

                      <div className="border-t border-slate-200 mt-2 pt-2">
                        <button
                          onClick={applyProcedureFilter}
                          disabled={isFiltering}
                          className="w-full bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          {isFiltering ? 'Applying...' : 'Apply Filter'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isFiltering && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-900"></div>
                    <span>Updating results...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* THE OPPORTUNITY */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/60 transition-shadow duration-300">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">What This Means for Your Business</h2>
            <p className="text-slate-700 leading-relaxed">
              We analyzed your patient records and found you can attract <strong>{totalBookings} new high-value patients per month</strong> by targeting specific neighborhoods where your best patients already live.
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-6 mb-6 border border-slate-200/50 shadow-sm">
            <div className="flex items-center justify-center gap-8 mb-4">
              <div className="text-center">
                <div className="text-sm text-slate-600 mb-1">Monthly Investment</div>
                <div className="text-3xl font-bold text-slate-900">
                  ${(recommendedBudget / 1000).toFixed(1)}K
                </div>
              </div>
              
              <ArrowRight className="h-6 w-6 text-slate-400" />
              
              <div className="text-center">
                <div className="text-sm text-slate-600 mb-1">Monthly Revenue</div>
                <div className="text-3xl font-bold text-emerald-600">
                  ${(totalRevenue / 1000).toFixed(0)}K
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-slate-600">
                That's <strong className="text-slate-900">{totalBookings} new patients</strong> per month • <strong className="text-slate-900">{roas}× return</strong> on investment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="h-4 w-4" />
            <span>First bookings typically within <strong className="text-slate-900">{timelineText}</strong></span>
          </div>
        </div>

        {/* WHO YOUR BEST PATIENTS ARE */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Who Your Best Patients Are</h2>
          
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg mb-3 hover:bg-indigo-100 transition-colors">
              <Target className="h-5 w-5 text-indigo-600" />
              <span className="font-semibold text-indigo-900">{dominant_profile?.combined || 'Loading...'}</span>
            </div>
          </div>

          <p className="text-slate-700 mb-4">
            Your most valuable patients share specific characteristics. Here's what makes them special:
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-start gap-3 group">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-emerald-200 transition-colors">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Worth ${((behavior_patterns?.avg_lifetime_value || 0) / 1000).toFixed(1)}K each</div>
                <div className="text-xs text-slate-600">Total they'll spend with you over time</div>
              </div>
            </div>

            <div className="flex items-start gap-3 group">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-emerald-200 transition-colors">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Visit {behavior_patterns?.avg_visits_per_year || 0}× per year</div>
                <div className="text-xs text-slate-600">More frequent than typical patients</div>
              </div>
            </div>

            <div className="flex items-start gap-3 group">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-emerald-200 transition-colors">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Prefer {behavior_patterns?.top_treatments?.[0] || 'treatments'}</div>
                <div className="text-xs text-slate-600">Their most common procedure</div>
              </div>
            </div>

            <div className="flex items-start gap-3 group">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-emerald-200 transition-colors">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Live in {selectedCount} specific areas</div>
                <div className="text-xs text-slate-600">Predictable neighborhoods near you</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowProfileDetails(!showProfileDetails)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
          >
            {showProfileDetails ? 'Hide' : 'View'} demographic details
            {showProfileDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showProfileDetails && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase mb-3">Demographics</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Median Income</span>
                      <span className="font-medium">${((profile_characteristics?.median_income || 0) / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">College Educated</span>
                      <span className="font-medium">{profile_characteristics?.college_educated_pct || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Homeownership</span>
                      <span className="font-medium">{profile_characteristics?.homeowner_pct || 0}%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase mb-3">Market Size</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Addressable Market</span>
                      <span className="font-medium">{((geographic_summary?.total_addressable_households || 0) / 1000).toFixed(1)}K households</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">High-Match Areas</span>
                      <span className="font-medium">{geographic_summary?.total_zips || 0} ZIPs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* WHERE TO TARGET */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Where to Find Them</h2>
              <p className="text-sm text-slate-600">{selectedCount} neighborhoods selected</p>
            </div>
            <button
              onClick={() => setShowZipEditor(!showZipEditor)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {showZipEditor ? 'Done' : 'Change areas'}
            </button>
          </div>

          {!showZipEditor && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-700">
                We'll show {bestPlatform} ads only to people in these {selectedCount} ZIP codes who match your best patient profile.
              </p>
            </div>
          )}

          {showZipEditor && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> Start with areas closest to your practice (better show-up rates). We recommend keeping at least 3-5 areas selected.
                  </p>
                </div>
              </div>

              {localZips.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-3">Close to you (0-2 miles) • Best conversion</div>
                  <div className="flex flex-wrap gap-2">
                    {localZips.map((segment: any) => (
                      <button
                        key={segment.zip}
                        onClick={() => toggleZip(segment.zip)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedZips[segment.zip]
                            ? 'bg-slate-900 text-white shadow-md hover:shadow-lg hover:scale-105'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-105'
                        }`}
                      >
                        {segment.zip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {extendedZips.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-3">Extended reach (2-10 miles)</div>
                  <div className="flex flex-wrap gap-2">
                    {extendedZips.map((segment: any) => (
                      <button
                        key={segment.zip}
                        onClick={() => toggleZip(segment.zip)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedZips[segment.zip]
                            ? 'bg-slate-900 text-white shadow-md hover:shadow-lg hover:scale-105'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-105'
                        }`}
                      >
                        {segment.zip}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* WHAT YOU'RE COMMITTING TO */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">What You're Committing To</h2>
          
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200/50 hover:shadow-sm transition-shadow">
              <div className="text-2xl font-bold text-slate-900 mb-1">{successRate}%</div>
              <div className="text-xs text-slate-600 mb-1">Success Rate</div>
              <div className="text-xs text-emerald-600 font-medium">
                {successRate} out of 100 practices like yours get bookings
              </div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200/50 hover:shadow-sm transition-shadow">
              <div className="text-2xl font-bold text-slate-900 mb-1">${costPerBooking}</div>
              <div className="text-xs text-slate-600 mb-1">Cost to Acquire</div>
              <div className="text-xs text-slate-600">
                Per patient (you'll profit ${profitPerPatient.toLocaleString()})
              </div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200/50 hover:shadow-sm transition-shadow">
              <div className="text-2xl font-bold text-slate-900 mb-1">{timelineText}</div>
              <div className="text-xs text-slate-600 mb-1">Time to Results</div>
              <div className="text-xs text-slate-600">
                First bookings expected
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 group">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-700"><strong>No contracts</strong> — cancel anytime if it's not working</span>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-700"><strong>Takes 15 minutes</strong> to review ads and launch</span>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-700"><strong>We'll guide you</strong> through setup with step-by-step instructions</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-lg shadow-slate-200/50">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Ready to Grow?</h2>
          <p className="text-sm text-slate-600 mb-6">
            When you click below, we'll create {totalVariations} different ad variations optimized for your patient profile. You'll review them, copy them into {bestPlatform} Ads Manager, and launch.
          </p>

          <button
            onClick={generateCampaign}
            disabled={selectedCount === 0}
            className={`w-full py-4 rounded-lg font-semibold text-base transition-all duration-200 mb-3 ${
              selectedCount === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {selectedCount === 0 ? 'Select at least 1 area to continue' : `Generate My Campaign →`}
          </button>

          <div className="text-center text-xs text-slate-500">
            No credit card required • Takes 2 minutes • Get {totalVariations} ad variations
          </div>
        </div>

      </div>
    </div>
  );
}