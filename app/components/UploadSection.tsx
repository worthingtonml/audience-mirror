import React from 'react';
import { BRAND_GRADIENT } from '../lib/constants';
import { FocusType } from '../lib/types';

interface UploadSectionProps {
  patientsFile: File | null;
  competitorsFile: File | null;
  practiceZip: string;
  focus: FocusType;
  error: string | null;
  loading: boolean;
  onPatientsFileChange: (file: File | null) => void;
  onCompetitorsFileChange: (file: File | null) => void;
  onPracticeZipChange: (zip: string) => void;
  onFocusChange: (focus: FocusType) => void;
  onAnalyze: () => void;
  onDownloadTemplate: () => void;
}

export default function UploadSection({
  patientsFile,
  competitorsFile,
  practiceZip,
  focus,
  error,
  loading,
  onPatientsFileChange,
  onCompetitorsFileChange,
  onPracticeZipChange,
  onFocusChange,
  onAnalyze,
  onDownloadTemplate
}: UploadSectionProps) {
  return (
    <section className="mx-auto max-w-4xl rounded-3xl bg-gray-100/70 dark:bg-white/[0.05] p-10 border border-gray-200 dark:border-white/10 shadow-inner backdrop-blur-2xl mb-16">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Upload Your Patient Data</h2>
      
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm backdrop-blur-xl">
          <label htmlFor="patients" className="font-medium text-gray-700 dark:text-white">
            Patient Data (CSV)
          </label>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
            Upload your patient list with ZIP code, procedure type, and revenue so we can analyze trends.
          </p>
          <input
            id="patients"
            type="file"
            accept=".csv"
            onChange={(e) => onPatientsFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          <div className="mt-3 flex gap-3">
            <label 
              htmlFor="patients" 
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition border-blue-500/60 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 cursor-pointer text-center"
            >
              Upload CSV
            </label>
            <button 
              onClick={onDownloadTemplate}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-600 dark:text-white/70 text-center"
            >
              Download Template
            </button>
          </div>
          {patientsFile && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center text-green-700 dark:text-green-300 text-sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {patientsFile.name} uploaded successfully
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm backdrop-blur-xl">
          <label htmlFor="competitors" className="font-medium text-gray-700 dark:text-white">
            Competitors (Optional)
          </label>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
            Upload a competitor list to see how your practice stacks up in the local market.
          </p>
          <input
            id="competitors"
            type="file"
            accept=".csv"
            onChange={(e) => onCompetitorsFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          <div className="mt-3">
            <label 
              htmlFor="competitors" 
              className="block w-full rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition border-blue-500/60 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 cursor-pointer text-center"
            >
              Upload CSV
            </label>
          </div>
          {competitorsFile && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center text-green-700 dark:text-green-300 text-sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {competitorsFile.name} uploaded successfully
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm backdrop-blur-xl">
          <label htmlFor="practice-zip" className="font-medium text-gray-700 dark:text-white">
            Practice ZIP Code
          </label>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
            We'll anchor all analysis around your practice location so insights are personalized to you.
          </p>
          <input 
            id="practice-zip"
            type="text" 
            placeholder="10021" 
            value={practiceZip}
            onChange={(e) => onPracticeZipChange(e.target.value)}
            maxLength={5}
            className="mt-3 block w-full rounded-md border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm backdrop-blur-xl">
          <label className="font-medium text-gray-700 dark:text-white">Campaign Focus</label>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
            Pick the types of patients or procedures you want to prioritize in your growth plan.
          </p>
          <div className="mt-3 flex gap-4">
            <button 
              onClick={() => onFocusChange('non_inv')}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition ${
                focus === 'non_inv'
                  ? 'border-blue-500/60 bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-600 dark:text-white/70'
              }`}
            >
              Non-Invasive
            </button>
            <button 
              onClick={() => onFocusChange('surgical')}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition ${
                focus === 'surgical'
                  ? 'border-blue-500/60 bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-600 dark:text-white/70'
              }`}
            >
              Surgical
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-10 text-center">
        <button 
          onClick={onAnalyze}
          disabled={loading || !patientsFile || !practiceZip}
          aria-busy={loading}
          className="rounded-lg px-8 py-3 text-lg font-semibold text-white shadow-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: BRAND_GRADIENT }}
        >
          {loading ? 'Analyzing...' : 'Analyze My Data'}
        </button>
      </div>
    </section>
  );
}