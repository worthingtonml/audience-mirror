import React, { useState } from 'react';
import { Upload, CheckCircle2, Download, FileText, ChevronDown, ExternalLink, Shield } from 'lucide-react';
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
  const [selectedEHR, setSelectedEHR] = useState<EHRSystemKey | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const ehrData = selectedEHR ? EHR_SYSTEMS[selectedEHR] : null;

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

          {/* EHR System Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              What system do you use?
            </label>
            <div className="relative">
              <select
                value={selectedEHR || ''}
                onChange={(e) => {
                  setSelectedEHR(e.target.value as EHRSystemKey || null);
                  setShowInstructions(!!e.target.value);
                }}
                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none bg-white pr-10"
              >
                <option value="">Select your EHR/PMS system...</option>
                {Object.entries(EHR_SYSTEMS).map(([key, system]) => (
                  <option key={key} value={key}>{system.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Export Instructions */}
          {ehrData && showInstructions && (
            <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-sm font-semibold text-indigo-900">
                  Exporting from {ehrData.name}
                </h4>
                {ehrData.docsUrl && (
                  
                    <a href={ehrData.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Official docs
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Steps */}
              <ol className="space-y-2 mb-4">
                {ehrData.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-indigo-800">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-indigo-200 text-indigo-700 text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              {/* Required Columns */}
              <div className="pt-4 border-t border-indigo-200">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">
                  Required Columns
                </p>
                <div className="flex flex-wrap gap-2">
                  {ehrData.columns.map((col, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 bg-white rounded border border-indigo-200"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-slate-50 p-4">
            <Shield className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-700">Your data stays private</p>
              <p className="text-xs text-slate-500 mt-0.5">
                We convert birthdates to ages and hash patient IDs on upload. Names, emails, and phone numbers are never stored.
              </p>
            </div>
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