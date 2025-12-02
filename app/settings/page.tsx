'use client';

import { useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [practiceZip, setPracticeZip] = useState('');
  const [practiceName, setPracticeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved settings on mount
  useEffect(() => {
    const savedZip = localStorage.getItem('practiceZip');
    const savedName = localStorage.getItem('practiceName');
    if (savedZip) setPracticeZip(savedZip);
    if (savedName) setPracticeName(savedName);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    // Validation
    if (!practiceZip || practiceZip.length !== 5) {
      setError('Please enter a valid 5-digit ZIP code');
      setLoading(false);
      return;
    }

    if (!practiceName.trim()) {
      setError('Please enter your practice name');
      setLoading(false);
      return;
    }

    // Save to localStorage
    try {
      localStorage.setItem('practiceZip', practiceZip);
      localStorage.setItem('practiceName', practiceName);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError('Failed to save settings');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your practice information and preferences
          </p>
        </div>

        {/* Settings Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Practice Information</h2>
            <p className="mt-1 text-sm text-gray-600">
              This information is used to analyze your patient data and find opportunities near you.
            </p>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            {/* Practice Name */}
            <div>
              <label htmlFor="practiceName" className="block text-sm font-medium text-gray-900 mb-2">
                Practice Name
              </label>
              <input
                id="practiceName"
                type="text"
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                placeholder="Enter your practice name"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Practice ZIP */}
            <div>
              <label htmlFor="practiceZip" className="block text-sm font-medium text-gray-900 mb-2">
                Practice ZIP Code
              </label>
              <input
                id="practiceZip"
                type="text"
                value={practiceZip}
                onChange={(e) => setPracticeZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="Enter 5-digit ZIP code"
                maxLength={5}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                We use this to calculate distances and identify nearby opportunities.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {saved && (
              <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-700">Settings saved successfully!</p>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}