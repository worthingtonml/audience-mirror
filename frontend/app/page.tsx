"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const validate = (f: File) => {
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) return "Please upload a CSV or Excel file";
    if (f.size > 10 * 1024 * 1024) return "File too large. Max 10MB";
    return null;
  };

  const onPick = (f?: File) => {
    if (!f) return;
    const v = validate(f);
    if (v) { setError(v); return; }
    setError(null);
    setFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setDrag(false);
    onPick(e.dataTransfer.files?.[0]);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const row: any = {};
      headers.forEach((header, i) => {
        row[header] = values[i]?.trim();
      });
      return row;
    });
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Upload dataset to backend
      const formData = new FormData();
      formData.append('patients', file);
      formData.append('practice_zip', '19103');
      formData.append('vertical', 'medspa');
      
      const datasetRes = await fetch('http://127.0.0.1:8000/api/v1/datasets', {
        method: 'POST',
        body: formData,
      });
      
      if (!datasetRes.ok) throw new Error('Dataset upload failed');
      const { dataset_id } = await datasetRes.json();
      
      // Step 2: Start analysis run
      const runRes = await fetch('http://127.0.0.1:8000/api/v1/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id, focus: 'non_inv' }),
      });
      
      if (!runRes.ok) throw new Error('Analysis failed to start');
      const { run_id } = await runRes.json();
      
      // Step 3: Store run_id and navigate
      sessionStorage.setItem('runId', run_id);
      router.push('/patient-insights');
      
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze data");
      setLoading(false);
    }
  };

  const handleSample = () => {
    sessionStorage.removeItem('patientData');
    router.push('/patient-insights?source=sample');
  };

  return (
    <div className="min-h-screen w-full bg-white antialiased">
      {/* Main */}
      <main className="frame py-12 md:py-16 lg:py-20">
        {/* Hero */}
        <section className="mb-16 text-center md:mb-20 lg:mb-24">
          <h1 className="text-balance text-[32px] font-bold leading-[1.1] tracking-tight md:text-[48px] lg:text-[64px]">
            Know your best patients.
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Find more like them.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-balance text-[16px] font-normal leading-[1.5] text-gray-600 md:mt-6 md:text-[18px] lg:text-[20px]">
            We show you WHO your VIPs are—not just where they live. Upload your patient list and we identify behavioral patterns and psychographic profiles, then show you how to find thousands more like them.
          </p>
        </section>

        {/* Upload */}
        <section className="mx-auto mb-20 w-full max-w-5xl md:mb-24 lg:mb-32">
          <div className="rounded-[20px] bg-gray-50 px-8 py-16 md:px-12 md:py-20 lg:px-16 lg:py-24">
            <div className="mx-auto max-w-xl">
              {!file ? (
                <div className="text-center">
                  <div className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-full bg-violet-100">
                    <svg className="h-8 w-8 text-violet-600" viewBox="0 0 24 24" fill="none" aria-hidden>
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

                  <h3 className="mb-3 text-[20px] font-semibold leading-[1.3] text-gray-900 md:text-[22px] lg:text-[24px]">Drop your patient file</h3>
                  <p className="mb-8 text-[14px] font-normal leading-[1.4] text-gray-500 lg:text-[16px]">CSV or Excel · Max 10MB</p>

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
          <h2 className="mb-12 text-center text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.15em] text-gray-500 md:mb-16 md:text-[13px] lg:text-[14px]">
            How it works
          </h2>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10 lg:gap-16">
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