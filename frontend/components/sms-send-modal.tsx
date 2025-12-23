'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Send, X, Check, AlertCircle, Loader2, Users, Phone } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface SMSRecipient {
  patient_id?: string;
  name?: string;
  phone: string;
}

interface SMSSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: string;  // e.g., "one-and-done", "lapsed"
  segmentLabel: string;  // e.g., "One-and-done patients"
  patientCount: number;
  message: string;  // Pre-filled message from the action modal
  recipients: SMSRecipient[];
  runId?: string;
}

export function SMSSendModal({
  isOpen,
  onClose,
  segment,
  segmentLabel,
  patientCount,
  message: initialMessage,
  recipients,
  runId
}: SMSSendModalProps) {
  const [message, setMessage] = useState(initialMessage);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    total: number;
    sent: number;
    failed: number;
    campaign_id: string;
  } | null>(null);
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null);

  // Check SMS configuration on mount
  useEffect(() => {
    async function checkSMS() {
      try {
        const res = await fetch(`${API_URL}/api/sms/status`);
        const data = await res.json();
        setSmsConfigured(data.configured);
      } catch {
        setSmsConfigured(false);
      }
    }
    if (isOpen) {
      checkSMS();
    }
  }, [isOpen]);

  // Update message when initialMessage changes
  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSent(false);
      setResults(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (recipients.length === 0) {
      setError('No recipients with phone numbers');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: runId,
          segment: segment,
          campaign_name: `${segmentLabel} - SMS Campaign`,
          message: message,
          recipients: recipients
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to send SMS');
      }

      const data = await response.json();
      setResults(data);
      setSent(true);

    } catch (err: any) {
      setError(err.message || 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const charCount = message.length;
  const segmentCount = Math.ceil(charCount / 160);
  const recipientsWithPhone = recipients.filter(r => r.phone);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Send SMS Campaign</h2>
              <p className="text-sm text-gray-500">{segmentLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Not Configured Warning */}
          {smsConfigured === false && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">SMS not configured</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Add your Twilio credentials in Settings to send SMS directly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {sent && results ? (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Messages Sent!
              </h3>
              <p className="text-gray-600 mb-4">
                Successfully sent {results.sent} of {results.total} messages
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 text-left mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{results.total}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{results.sent}</div>
                    <div className="text-xs text-gray-500">Sent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Track delivery and responses in your SMS dashboard.
              </p>

              <button
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Recipients Summary */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <Users className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="font-medium text-gray-900">
                    {recipientsWithPhone.length} recipients
                  </span>
                  {recipientsWithPhone.length < patientCount && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({patientCount - recipientsWithPhone.length} missing phone numbers)
                    </span>
                  )}
                </div>
              </div>

              {/* Message Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="Hi {name}, we'd love to see you again..."
                />
                <div className="flex justify-between mt-1.5 text-xs text-gray-500">
                  <span>Use {'{name}'} for personalization</span>
                  <span className={charCount > 160 ? 'text-amber-600' : ''}>
                    {charCount} chars ({segmentCount} segment{segmentCount > 1 ? 's' : ''})
                  </span>
                </div>
              </div>

              {/* Preview */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="bg-white rounded-lg p-3 shadow-sm text-sm text-gray-700 max-w-[85%]">
                      {message.replace('{name}', 'Sarah') || 'Your message will appear here...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Cost Estimate */}
              <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-indigo-700">Estimated cost</span>
                  <span className="font-medium text-indigo-900">
                    ~${(recipientsWithPhone.length * segmentCount * 0.0079).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-indigo-600 mt-1">
                  {recipientsWithPhone.length} messages × {segmentCount} segment(s) × $0.0079
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !smsConfigured || recipientsWithPhone.length === 0}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send {recipientsWithPhone.length} SMS
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to check SMS status
export function useSMSStatus() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`${API_URL}/api/sms/status`);
        const data = await res.json();
        setConfigured(data.configured);
      } catch {
        setConfigured(false);
      } finally {
        setLoading(false);
      }
    }
    check();
  }, []);

  return { configured, loading };
}
