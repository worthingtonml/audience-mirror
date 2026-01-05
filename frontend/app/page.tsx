'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ExternalLink, Shield, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const EHR_SYSTEMS = {
  boulevard: {
    name: 'Boulevard',
    docsUrl: 'https://support.joinblvd.com/hc/en-us/articles/4415825683351-Exporting-Client-Data',
    columns: ['Client ID', 'ZIP/Postal Code', 'Birthdate', 'Appointment Date', 'Service Name', 'Total Paid'],
    steps: [
      'Go to Clients → All Clients',
      'Click "Export" in the top right',
      'Select the columns listed below',
      'Export as CSV and upload here'
    ]
  },
  zenoti: {
    name: 'Zenoti',
    docsUrl: 'https://help.zenoti.com/en/articles/exporting-guest-data',
    columns: ['Guest ID', 'Postal Code', 'Date of Birth', 'Appointment Date', 'Service', 'Amount'],
    steps: [
      'Navigate to Guests → Guest List',
      'Click "Export" button',
      'Choose columns listed below',
      'Download CSV and upload here'
    ]
  },
  vagaro: {
    name: 'Vagaro',
    docsUrl: 'https://support.vagaro.com/hc/en-us/articles/360005904954-Export-Customer-List',
    columns: ['Customer ID', 'Zip Code', 'Birthday', 'Service Date', 'Service Name', 'Amount Paid'],
    steps: [
      'Go to Customers → Customer List',
      'Click "Export to Excel"',
      'Include columns listed below',
      'Save as CSV and upload here'
    ]
  },
  nextech: {
    name: 'Nextech',
    docsUrl: 'https://www.nextech.com/support',
    columns: ['Patient ID', 'ZIP', 'DOB', 'Visit Date', 'Procedure', 'Payment'],
    steps: [
      'Open Reports → Patient Reports',
      'Select "Patient List with Visits"',
      'Choose columns listed below',
      'Export to CSV and upload here'
    ]
  },
  patientnow: {
    name: 'PatientNow',
    docsUrl: 'https://www.patientnow.com/support',
    columns: ['Patient #', 'Zip Code', 'Birth Date', 'Appointment Date', 'Procedure', 'Amount'],
    steps: [
      'Go to Reports → Patient Reports',
      'Run "Patient Demographics + Visits"',
      'Export with columns below',
      'Upload the CSV here'
    ]
  },
  other: {
    name: 'Other / Not Listed',
    docsUrl: null,
    columns: ['Patient ID', 'ZIP Code', 'Date of Birth', 'Visit Date', 'Treatment/Service', 'Amount Paid'],
    steps: [
      'Export your patient list from your system',
      'Include the columns listed below',
      'Save as CSV or Excel',
      'Upload here'
    ]
  }
};

type EHRSystemKey = keyof typeof EHR_SYSTEMS;

export default function HomePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEHR, setSelectedEHR] = useState<EHRSystemKey | null>(null);

  const ehrData = selectedEHR ? EHR_SYSTEMS[selectedEHR] : null;

  const onPick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError('File must be less than 10MB');
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/sample-patients.csv');
      const blob = await response.blob();
      const sampleFile = new File([blob], 'sample-patients.csv', { type: 'text/csv' });
      setFile(sampleFile);
      await uploadAndAnalyze(sampleFile);
    } catch (e: any) {
      setError(e.message || 'Failed to load sample data');
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      await uploadAndAnalyze(file);
    } catch (e: any) {
      setError(e.message || 'Analysis failed');
      setLoading(false);
    }
  };

  const uploadAndAnalyze = async (fileToUpload: File) => {
    try {
      const practiceZip = localStorage.getItem('practiceZip');
      if (!practiceZip) {
        throw new Error('Please set your practice ZIP code in Settings first');
      }

      const formData = new FormData();
      formData.append('patients', fileToUpload);
      formData.append('practice_zip', practiceZip);
      formData.append('vertical', 'medspa');

      const uploadResponse = await fetch(`${API_URL}/api/v1/datasets`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload dataset');
      }

      const { dataset_id } = await uploadResponse.json();
      sessionStorage.setItem('datasetId', dataset_id);

      const runResponse = await fetch(`${API_URL}/api/v1/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: dataset_id,
          focus: 'non_inv',
        }),
      });

      if (!runResponse.ok) {
        throw new Error('Failed to start analysis');
      }

      const { run_id } = await runResponse.json();
      sessionStorage.setItem('runId', run_id);
      router.push('/patient-insights');
    } catch (e: any) {
      throw e;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto px-5 py-12 md:py-16">
        
        {/* Hero */}
        <section className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Stop losing your best patients.
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            See who needs attention before they're gone.
          </h2>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            Connect your patient data and we'll show you who's slipping, what revenue is at risk, and what usually brings them back.
          </p>
        </section>

        {/* Upload */}
        <section className="mb-14">
          <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
            
            {!file ? (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-violet-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-violet-600" viewBox="0 0 24 24" fill="none">
                      <path d="M12 15V3M12 3L8 7M12 3L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 17L2 19C2 20.1046 2.89543 21 4 21L20 21C21.1046 21 22 20.1046 22 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => onPick(e.target.files?.[0] ?? undefined)}
                  />

                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Drop your patient file</h3>
                  <p className="text-sm text-gray-500 mb-5">CSV or Excel · Takes ~5seconds</p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={loading}
                      className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Upload patient file
                    </button>
                    <button
                      type="button"
                      onClick={handleSample}
                      disabled={loading}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline disabled:opacity-50"
                    >
                      View example output
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-gray-50 px-3 text-xs text-gray-400 uppercase tracking-wide">Not sure how to export?</span>
                  </div>
                </div>

                {/* EHR Selector */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedEHR(selectedEHR ? null : 'other')}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-900">View export instructions</span>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${selectedEHR ? 'rotate-180' : ''}`} />
                  </button>

                  {selectedEHR && ehrData && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                      <div className="mb-4">
                        <select
                          value={selectedEHR}
                          onChange={(e) => setSelectedEHR(e.target.value as EHRSystemKey)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {Object.entries(EHR_SYSTEMS).map(([key, system]) => (
                            <option key={key} value={key}>{system.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Steps</span>
                          {ehrData.docsUrl && (
                            <a
                              href={ehrData.docsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              Official docs
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        <ol className="space-y-2">
                          {ehrData.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold flex items-center justify-center">
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>

                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Required Columns</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ehrData.columns.map((col, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-xs text-gray-600 bg-white rounded border border-gray-200"
                              >
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="mt-5 text-center text-xs text-gray-400">
                  <Shield className="inline h-3 w-3 mr-1" />
                  We only use hashed IDs. No names or contact details are stored.
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-5">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{file.name}</div>
                    <div className="text-sm text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · <span className="text-green-700">Ready</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFile(null); setError(null); }}
                    disabled={loading}
                    className="ml-4 text-sm font-medium text-indigo-700 hover:underline disabled:opacity-50"
                  >
                    Change
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? "Analyzing…" : "Analyze data"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSample}
                    disabled={loading}
                    className="px-6 py-2.5 border border-gray-300 bg-white text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Try sample data
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </section>

        {/* What you'll see */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-1">What you'll see</h2>
          <p className="text-sm text-gray-500 text-center mb-6">A short list of who needs attention right now</p>

          <div className="space-y-3">
            
            {/* 1. One-and-done - Highest priority */}
            <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:bg-gray-50/50 transition-all cursor-pointer">
              <div className="flex">
                <div className="w-1 bg-rose-400"></div>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wide">Act first</span>
                      <h3 className="font-semibold text-gray-900 mt-1 mb-1">One-and-done patients</h3>
                      <p className="text-sm text-gray-500 mb-2">Visited once, then disappeared.</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900">$726K recoverable</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-400">62 patients</span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-medium text-gray-400 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                      Send check-in
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Lapsed regulars */}
            <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:bg-gray-50/50 transition-all cursor-pointer">
              <div className="flex">
                <div className="w-1 bg-orange-400"></div>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-[11px] font-semibold text-orange-500 uppercase tracking-wide">At risk</span>
                      <h3 className="font-semibold text-gray-900 mt-1 mb-1">Lapsed regulars</h3>
                      <p className="text-sm text-gray-500 mb-2">Had a rhythm, then went quiet.</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900">$174K at risk</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-400">20 patients</span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-medium text-gray-400 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                      Reopen conversation
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. High-frequency patients */}
            <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:bg-gray-50/50 transition-all cursor-pointer">
              <div className="flex">
                <div className="w-1 bg-emerald-400"></div>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wide">Protect</span>
                      <h3 className="font-semibold text-gray-900 mt-1 mb-1">High-frequency patients</h3>
                      <p className="text-sm text-gray-500 mb-2">Your VIPs. They don't complain — they just leave.</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900">$17,919 avg LTV</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-400">37 patients</span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-medium text-gray-400 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                      Add VIP touchpoint
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Referral champions */}
            <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:bg-gray-50/50 transition-all cursor-pointer">
              <div className="flex">
                <div className="w-1 bg-blue-400"></div>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide">Growth</span>
                      <h3 className="font-semibold text-gray-900 mt-1 mb-1">Referral champions</h3>
                      <p className="text-sm text-gray-500 mb-2">They send friends who actually show up.</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900">85% conversion</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-400">55 patients</span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-medium text-gray-400 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                      Launch referral program
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Click a row to see patients and next steps
          </p>
        </section>

        {/* Final CTA */}
        <section className="bg-indigo-600 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            See which patients are slipping
          </h2>
          <p className="text-sm text-indigo-100 mb-6">
            Upload your patient data and see who needs attention in minutes.
          </p>
          <button 
            onClick={() => router.push('/patient-insights')}
            className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 inline-flex items-center gap-2"
          >
            See your revenue at risk
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>

      </main>
    </div>
  );
}