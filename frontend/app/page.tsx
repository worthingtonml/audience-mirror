'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ExternalLink, Shield } from 'lucide-react';

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
      <main className="frame py-12 md:py-16 lg:py-20">
        {/* Hero */}
        <section className="mx-auto mb-8 max-w-4xl text-center md:mb-10 lg:mb-12">
          <h1 className="mb-3 text-[28px] font-bold leading-[1.2] text-gray-900 md:mb-4 md:text-[36px] lg:text-[44px]">
            Know your best patients.
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Find more like them.
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-[15px] font-normal leading-[1.5] text-gray-600 md:text-[17px] lg:text-[18px]">
            We show you WHO your VIPs are—not just where they live. Upload your patient list and we identify behavioral patterns and psychographic profiles, then show you how to find thousands more like them.
          </p>
        </section>

        {/* Upload */}
        <section className="mx-auto mb-12 w-full max-w-5xl md:mb-16 lg:mb-20">
          <div className="rounded-[20px] bg-gray-50 px-8 py-10 md:px-12 md:py-12 lg:px-16 lg:py-14">
            <div className="mx-auto max-w-xl">
              
              {!file ? (
                <>
                  {/* Upload Area First */}
                  <div className="text-center mb-8">
                    <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-violet-100">
                      <svg className="h-7 w-7 text-violet-600" viewBox="0 0 24 24" fill="none" aria-hidden>
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

                    <h3 className="mb-2 text-[18px] font-semibold leading-[1.3] text-gray-900 md:text-[20px] lg:text-[22px]">Drop your patient file</h3>
                    <p className="mb-6 text-[14px] font-normal leading-[1.4] text-gray-500 lg:text-[15px]">CSV or Excel · Max 10MB</p>

                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={loading}
                        className="rounded-[10px] bg-indigo-600 px-8 py-3 text-[15px] font-semibold leading-[1.2] text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-[16px]"
                      >
                        Select file
                      </button>
                      <button
                        type="button"
                        onClick={handleSample}
                        disabled={loading}
                        className="px-6 py-3 text-[15px] font-semibold leading-[1.2] text-indigo-600 transition-colors hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 md:text-[16px]"
                      >
                        Use sample data
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-gray-50 px-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Need help exporting?</span>
                    </div>
                  </div>

                  {/* EHR Selector - Collapsed by default */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setSelectedEHR(selectedEHR ? null : 'other')}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900">View export instructions for your system</span>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${selectedEHR ? 'rotate-180' : ''}`} />
                    </button>

                    {selectedEHR && ehrData && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                        {/* System Dropdown */}
                        <div className="mb-4">
                          <select
                            value={selectedEHR}
                            onChange={(e) => setSelectedEHR(e.target.value as EHRSystemKey)}
                            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          >
                            {Object.entries(EHR_SYSTEMS).map(([key, system]) => (
                              <option key={key} value={key}>{system.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Instructions */}
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
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200"
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

                  {/* Privacy - Subtle footer */}
                  <p className="mt-6 text-center text-xs text-gray-400">
                    <Shield className="inline h-3 w-3 mr-1" />
                    We hash patient IDs and convert birthdates to ages. No names or contact info stored.
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="flex max-w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-100 text-indigo-700">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                        <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold leading-[1.4] text-gray-900">{file.name}</div>
                      <div className="text-[14px] leading-[1.4] text-gray-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB · <span className="text-green-700">Ready to analyze</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setFile(null); setError(null); }}
                      disabled={loading}
                      className="ml-auto text-[14px] font-medium leading-[1.4] text-indigo-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>

                  <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="w-full rounded-[10px] bg-indigo-600 px-8 py-3 text-[15px] font-semibold leading-[1.2] text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto md:text-[16px]"
                    >
                      {loading ? "Analyzing…" : "Analyze data"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSample}
                      disabled={loading}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-8 py-3 text-[15px] font-semibold leading-[1.2] text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto md:text-[16px]"
                    >
                      Try with sample data
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-[14px] leading-[1.4] text-red-700" role="alert">
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-center text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.15em] text-gray-500 md:mb-10 md:text-[13px] lg:text-[14px]">
            How it works
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8 lg:gap-12">
            <Step n="1" t="Upload data" d="Import a CSV or Excel file containing your patient ZIP codes, visit history, and revenue data to get started." />
            <Step n="2" t="See your top patients" d="We identify spending habits, visit frequency, and lifestyle traits to create clear profiles of your best patients." />
            <Step n="3" t="Find more like them" d="We show you where these high-value profiles live, with growth opportunities and expected bookings." />
          </div>
        </section>
      </main>

      <style jsx>{`
        .frame {
          max-width: 1280px;
          margin: 0 auto;
          padding-left: clamp(20px, 4vw, 32px);
          padding-right: clamp(20px, 4vw, 32px);
          width: 100%;
        }
      `}</style>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="text-left">
      <div className="mb-5 grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-[18px] font-bold leading-[1.2] text-white">
        {n}
      </div>
      <h3 className="mb-3 text-[18px] font-semibold leading-[1.3] text-gray-900 md:text-[20px] lg:text-[22px]">{t}</h3>
      <p className="text-pretty text-[15px] font-normal leading-[1.5] text-gray-600 md:text-[16px]">{d}</p>
    </div>
  );
}