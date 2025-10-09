"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ANALYSIS_ROUTE = "/insights"; // <-- change to your analysis route

const api = {
  uploadDataset: async (file: File) => {
    await new Promise((r) => setTimeout(r, 600));
    return `dataset_${Date.now()}`;
  },
  createRun: async (datasetId: string, type: string) => {
    await new Promise((r) => setTimeout(r, 900));
    return `run_${Date.now()}`;
  },
  getRunResults: async (runId: string) => {
    await new Promise((r) => setTimeout(r, 300));
    return { campaigns: [{ id: 1, name: "Sample Campaign" }] };
  },
  createSampleRun: async () => {
    await new Promise((r) => setTimeout(r, 600));
    return `sample_run_${Date.now()}`;
  },
};

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

  const goToAnalysis = (runId: string, extra?: Record<string, string | number | boolean>) => {
    const params = new URLSearchParams({ runId, ...(extra ?? {}) } as Record<string, string>);
    router.push(`${ANALYSIS_ROUTE}?${params.toString()}`);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const datasetId = await api.uploadDataset(file);
      const runId = await api.createRun(datasetId, "non_inv");
      const res = await api.getRunResults(runId);
      if (!res?.campaigns?.length) { setError("No results found. Please check your data."); return; }
      goToAnalysis(runId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleSample = async () => {
    setLoading(true); setError(null);
    try {
      const runId = await api.createSampleRun();
      goToAnalysis(runId, { sample: 1 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load sample data.");
    } finally { setLoading(false); }
  };

  const dropClasses =
    `min-w-0 rounded-xl ring-1 ring-inset transition ` +
    (drag ? "ring-indigo-300 bg-indigo-50/60" : "ring-gray-200 bg-gray-50 hover:ring-indigo-200");

  return (
    <div className="isolate min-h-dvh w-[100svw] overflow-x-clip bg-white text-gray-950 antialiased">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="frame py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded bg-gray-900">
              <div className="h-4 w-4 rounded-sm bg-white" />
            </div>
            <span className="text-base font-semibold">Audience Mirror</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="frame py-12 md:py-16 lg:py-20">
        {/* Hero (larger base so it never wakes up tiny) */}
        <section className="mb-10 text-center md:mb-14">
          <h1 className="text-balance font-semibold leading-[1.08] tracking-tight text-4xl md:text-6xl lg:text-7xl">
            Know your best patients.
            <span className="block text-indigo-600">Find more like them.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-gray-600 md:text-lg md:leading-8">
            Upload a simple patient list (ZIP, visits, revenue). We highlight your highest-value guests and the
            neighborhoods they come from—so you can target look-alikes, fill schedules, and grow memberships.
          </p>
        </section>

        {/* Upload */}
        <section className="mx-auto w-full max-w-3xl md:max-w-4xl">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/5">
            <div className="p-6 sm:p-8 lg:p-10">
              <div
                className={dropClasses}
                onDragEnter={(e) => { e.preventDefault(); setDrag(true); if (error) setError(null); }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
                onDrop={onDrop}
                role="button"
                tabIndex={0}
                aria-label="File upload area"
                onKeyDown={(e) => {
                  if (!file && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); fileRef.current?.click(); }
                }}
                onClick={() => !file && fileRef.current?.click()}
              >
                <div className="px-6 sm:px-8 py-10">
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => onPick(e.target.files?.[0] ?? undefined)}
                  />

                  {/* Idle */}
                  {!file && (
                    <div className="text-center">
                      <svg className="mx-auto mb-4 h-10 w-10 text-indigo-500 md:h-12 md:w-12" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div className="text-base font-semibold md:text-lg">Drop your patient file</div>
                      <div className="mt-1 text-xs text-gray-500 md:text-sm">CSV or Excel · Max 10MB</div>

                      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={loading}
                          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Select file
                        </button>
                        <button
                          type="button"
                          onClick={handleSample}
                          disabled={loading}
                          className="text-sm font-medium text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Use sample data
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Selected file – compact card */}
                  {file && (
                    <div className="flex flex-col items-center gap-6">
                      <div className="flex max-w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-100 text-indigo-700">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                            <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-900">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB · <span className="text-green-700">Ready to analyze</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setFile(null); setError(null); }}
                          disabled={loading}
                          className="ml-auto text-sm font-medium text-indigo-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Change
                        </button>
                      </div>

                      <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={handleAnalyze}
                          disabled={loading}
                          className="w-full sm:w-auto rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loading ? "Analyzing…" : "Analyze data"}
                        </button>
                        <button
                          type="button"
                          onClick={handleSample}
                          disabled={loading}
                          className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Try with sample data
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* How it works */}
        {/* How it works — stack on narrow, 3-up on wide */}
       <section className="mx-auto mt-12 max-w-5xl lg:mt-16">
        <h2 className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 md:text-sm">
          How it works
        </h2>

        {/* 1 col by default; 3 cols at ≥1024px */}
        <div className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-3 lg:items-stretch">
          <div className="h-full"><Step n="1" t="Upload data" d="Import a CSV/XLSX with ZIP, visits, revenue." /></div>
          <div className="h-full"><Step n="2" t="Find patterns" d="We surface high-value segments and repeat-visit drivers." /></div>
          <div className="h-full"><Step n="3" t="Get insights" d="See look-alike ZIP codes and specific actions to grow bookings." /></div>
        </div>
      </section>

      </main>

      {/* One frame governs width/padding so header & main never misalign */}
      <style jsx>{`
        .frame {
          max-width: 1400px;
          margin: 0 auto;
          padding-left: clamp(16px, 4vw, 32px);
          padding-right: clamp(16px, 4vw, 32px);
          width: 100%;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
          {n}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-base font-semibold">{t}</div>
          <p className="text-pretty text-sm leading-6 text-gray-600">{d}</p>
        </div>
      </div>
    </div>
  );
}
