import React from 'react';
import { Upload, CheckCircle2, Download, FileText } from 'lucide-react';
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
    <section className="mx-auto max-w-4xl mb-16">
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-xs">!</span>
                </div>
              </div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Patient Data Upload */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Patient Data
              </h3>
              <p className="text-sm text-slate-600">
                Upload your patient list with ZIP codes, procedures, and revenue
              </p>
            </div>
            <button
              onClick={onDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="h-4 w-4" strokeWidth={1.5} />
              Template
            </button>
          </div>

          <input
            id="patients"
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => onPatientsFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />

          {!patientsFile ? (
            <label
              htmlFor="patients"
              className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 transition-all cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30"
            >
              <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                <Upload className="h-6 w-6 text-indigo-600" strokeWidth={1.5} />
              </div>
              <p className="text-base font-medium text-slate-900 mb-1">
                Drop your patient file here
              </p>
              <p className="text-sm text-slate-500">
                CSV or Excel · Max 10MB
              </p>
            </label>
          ) : (
            <div className="flex items-center gap-4 rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900 truncate">
                  {patientsFile.name}
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  {(patientsFile.size / 1024).toFixed(1)} KB · Ready to analyze
                </p>
              </div>
              <button
                onClick={() => onPatientsFileChange(null)}
                className="flex-shrink-0 text-sm font-medium text-green-700 hover:text-green-900"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Configuration Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Practice ZIP */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Practice Location
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              ZIP code for local market analysis
            </p>
            <input
              type="text"
              placeholder="90210"
              value={practiceZip}
              onChange={(e) => onPracticeZipChange(e.target.value)}
              maxLength={5}
              className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Campaign Focus */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Campaign Focus
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Target patient segment priority
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onFocusChange('non_inv')}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                  focus === 'non_inv'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Non-Invasive
              </button>
              <button
                onClick={() => onFocusChange('surgical')}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                  focus === 'surgical'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Surgical
              </button>
            </div>
          </div>
        </div>

        {/* Competitors Upload (Optional) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Competitor Data
                <span className="ml-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Optional
                </span>
              </h3>
              <p className="text-sm text-slate-600">
                Compare your practice to local competitors
              </p>
            </div>
          </div>

          <input
            id="competitors"
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => onCompetitorsFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />

          {!competitorsFile ? (
            <label
              htmlFor="competitors"
              className="group relative flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6 transition-all cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/20"
            >
              <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-indigo-200 transition-colors">
                <FileText className="h-5 w-5 text-slate-400 group-hover:text-indigo-500" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 mb-0.5">
                  Upload competitor list
                </p>
                <p className="text-xs text-slate-500">
                  CSV or Excel · Max 10MB
                </p>
              </div>
            </label>
          ) : (
            <div className="flex items-center gap-4 rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900 truncate">
                  {competitorsFile.name}
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  {(competitorsFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => onCompetitorsFileChange(null)}
                className="flex-shrink-0 text-sm font-medium text-green-700 hover:text-green-900"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Analyze Button */}
        <div className="text-center pt-4">
          <button
            onClick={onAnalyze}
            disabled={loading || !patientsFile || !practiceZip}
            className="px-10 py-4 text-base font-semibold text-white bg-indigo-600 rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Analyzing your data...' : 'Analyze My Data'}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Analysis typically takes 30-60 seconds
          </p>
        </div>
      </div>
    </section>
  );
}