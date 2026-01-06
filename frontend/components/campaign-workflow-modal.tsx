'use client';

import {
  X,
  MessageSquare,
  Mail,
  Phone,
  Send,
  ChevronDown,
  Check,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Download,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

interface Patient {
  patient_id: string;
  name?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  lastVisit?: string;
  spent?: string;
  treatment?: string;
}

interface CampaignWorkflowModalProps {
  actionModalData: {
    title: string;
    count: number;
    patients: Array<Patient | string>;
    segment: string;
    action: string;
    cta: string;
  };
  analysisData?: {
    patient_segments?: {
      one_and_done?: { potential_recovery?: number };
      lapsed_regulars?: { revenue_at_risk?: number };
      high_frequency?: { avg_ltv?: number; count?: number };
      referral_champions?: { count?: number };
    };
  };
  currentRunId: string | null;
  onClose: () => void;
  onExportCSV: (patients: Array<Patient | string>, segmentName: string) => void;
}

interface Step {
  id: number;
  day: string;
  channel: string;
  icon: typeof MessageSquare;
  iconBg: string;
  iconColor: string;
  badge: string | null;
  badgeColor?: string;
  why: string;
  template?: string | { subject: string; body: string };
  type: 'sms' | 'email' | 'phone' | 'social' | 'mail';
  script?: {
    opener: string;
    keyPoints: string[];
    closer: string;
  };
  isOptional?: boolean;
}

const segmentConfigs: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  label: string;
  brief: string;
  recoveryKey: string;
  steps: Omit<Step, 'id'>[];
  alternativeChannels: Omit<Step, 'id'>[];
}> = {
  'one-and-done': {
    color: 'rose',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    textColor: 'text-amber-900',
    label: 'Act first',
    brief: "These patients were curious enough to book once, but didn't return. The win-back window is 30-60 days — after that, they've moved on mentally. A 3-touch sequence recovers 12-18%, vs ~5% for a single message.",
    recoveryKey: 'potential_recovery',
    steps: [
      {
        day: 'Day 1',
        channel: 'Text message',
        icon: MessageSquare,
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        badge: '98% open rate',
        badgeColor: 'bg-green-100 text-green-700',
        why: 'Highest open rate. Start soft — a human check-in, not a sales pitch.',
        template: "Hey {name}, it's [Your Clinic]! We noticed it's been a while and just wanted to check in — everything okay? We'd love to see you again.",
        type: 'sms'
      },
      {
        day: 'Day 4',
        channel: 'Email with offer',
        icon: Mail,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        badge: null,
        why: "More space to explain value. Include a reason to return.",
        template: {
          subject: "We miss you! Here's 20% off your next visit",
          body: "Hi {name},\n\nWe noticed it's been a while since your last visit. We'd love to see you again!\n\nAs a thank you for being part of our community, enjoy 20% off your next treatment.\n\nBook now and we'll also include a complimentary consultation to discuss your goals.\n\nWarmly,\n[Your Clinic Name]"
        },
        type: 'email'
      },
      {
        day: 'Day 10',
        channel: 'Final text',
        icon: MessageSquare,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        badge: 'Last chance',
        badgeColor: 'bg-amber-100 text-amber-700',
        why: 'Create gentle urgency. Make it easy to say yes.',
        template: "Hi {name}! Just wanted to let you know your 20% off expires this week. Want me to hold a spot for you? Reply YES and I'll send options.",
        type: 'sms'
      }
    ],
    alternativeChannels: [
      {
        day: 'Anytime',
        channel: 'Phone call',
        icon: Phone,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        badge: 'For non-responders',
        badgeColor: 'bg-gray-100 text-gray-600',
        why: "Personal call cuts through when digital doesn't.",
        type: 'phone',
        isOptional: true,
        script: {
          opener: "Hey {name}, this is [Your Name] from [Clinic]. I noticed it's been a while since your last visit and just wanted to check in — everything okay?",
          keyPoints: [
            "Listen first — don't pitch",
            "If bad experience → apologize sincerely",
            "If life got busy → empathize, offer to book",
            "If switched providers → thank them, note it"
          ],
          closer: "We'd love to see you again whenever you're ready. Can I help you find a time that works?"
        }
      }
    ]
  },
  'lapsed-regulars': {
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-100',
    textColor: 'text-orange-900',
    label: 'At risk',
    brief: "These patients had a rhythm — then stopped. Something changed. A life event, a bad experience, or a competitor got their attention. Digital outreach feels impersonal for someone who was loyal. Start with a phone call to find out what happened.",
    recoveryKey: 'revenue_at_risk',
    steps: [
      {
        day: 'Day 1',
        channel: 'Phone call',
        icon: Phone,
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        badge: 'Highest conversion',
        badgeColor: 'bg-orange-100 text-orange-700',
        why: 'They were loyal — a personal call shows you noticed.',
        type: 'phone',
        script: {
          opener: "Hey {name}, this is [Your Name] from [Clinic]. We noticed it's been a while and I just wanted to personally reach out — is everything okay?",
          keyPoints: [
            "Listen first — don't pitch",
            "If bad experience → apologize and offer to make it right",
            "If life got busy → empathize and offer to book",
            "If switched providers → thank them and note it"
          ],
          closer: "We'd love to see you again whenever you're ready. Can I help you find a time that works?"
        }
      },
      {
        day: 'Day 3',
        channel: 'Follow-up text',
        icon: MessageSquare,
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        badge: 'If no answer',
        badgeColor: 'bg-gray-100 text-gray-600',
        why: 'If they didn\'t pick up, a text feels less intrusive.',
        template: "Hey {name}, tried to reach you earlier — we miss having you! Reply if you'd like to book your next visit.",
        type: 'sms'
      },
      {
        day: 'Day 7',
        channel: 'Email with personal note',
        icon: Mail,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        badge: null,
        why: 'More space to reconnect. Personalize based on their history.',
        template: {
          subject: "We miss you, {name}",
          body: "Hi {name},\n\nIt's been a while since your last visit and I wanted to personally reach out.\n\nI hope everything is going well! If there's anything we could have done better, I'd love to hear about it.\n\nWhen you're ready to come back, we'd love to see you. Just reply to this email or give us a call.\n\nWarmly,\n[Your Name]"
        },
        type: 'email'
      }
    ],
    alternativeChannels: []
  },
  'high-frequency': {
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    textColor: 'text-emerald-900',
    label: 'Protect',
    brief: "These are your best patients — they visit regularly and spend more. They don't need discounts. They want to feel valued. VIPs don't complain when they're unhappy; they just quietly leave. Proactive recognition keeps them loyal.",
    recoveryKey: 'avg_ltv',
    steps: [
      {
        day: 'This week',
        channel: 'VIP email',
        icon: Mail,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        badge: 'Exclusive access',
        badgeColor: 'bg-emerald-100 text-emerald-700',
        why: 'Exclusivity is the reward. No discount needed.',
        template: {
          subject: "You're one of our VIPs, {name}",
          body: "Hi {name},\n\nI wanted to personally reach out because you're one of our most valued patients.\n\nAs a thank you for your loyalty, I'd like to offer you first access to [new treatment/booking slots/event] before we open it to everyone else.\n\nJust reply to this email if you'd like me to hold a spot for you.\n\nThank you for trusting us with your care.\n\nWarmly,\n[Your Name]"
        },
        type: 'email'
      },
      {
        day: 'Ongoing',
        channel: 'Personal text',
        icon: MessageSquare,
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        badge: 'Birthdays & anniversaries',
        badgeColor: 'bg-gray-100 text-gray-600',
        why: 'Small personal touches build deep loyalty.',
        template: "Happy birthday {name}! 🎂 We're so grateful to have you. A little surprise is waiting for you at your next visit!",
        type: 'sms'
      },
      {
        day: 'Quarterly',
        channel: 'Handwritten note',
        icon: Send,
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-600',
        badge: 'High impact',
        badgeColor: 'bg-purple-100 text-purple-700',
        why: 'Physical mail stands out. Takes 2 minutes, remembered for months.',
        template: "Export addresses and write a short personal note: 'Thank you for trusting us with your care. We appreciate you!'",
        type: 'mail'
      }
    ],
    alternativeChannels: []
  },
  'referrers': {
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
    textColor: 'text-blue-900',
    label: 'Growth',
    brief: "These patients have already referred — they're your advocates. Most referral programs fail because of friction: people intend to refer but forget or it's too hard. Make it effortless with a shareable link and a reward they actually want.",
    recoveryKey: 'count',
    steps: [
      {
        day: 'Day 1',
        channel: 'Email with referral link',
        icon: Mail,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        badge: 'Trackable',
        badgeColor: 'bg-blue-100 text-blue-700',
        why: 'Make it effortless. One link they can share anywhere.',
        template: {
          subject: "You've earned rewards, {name}!",
          body: "Hi {name},\n\nYou've sent us some amazing patients — thank you!\n\nI wanted to make it even easier for you. Here's your personal referral link:\n[REFERRAL_LINK]\n\nFor every friend who books, you'll get $50 credit toward your next treatment.\n\nThank you for spreading the word!\n\nWarmly,\n[Your Name]"
        },
        type: 'email'
      },
      {
        day: 'Day 7',
        channel: 'Text reminder',
        icon: MessageSquare,
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        badge: 'Social proof',
        badgeColor: 'bg-gray-100 text-gray-600',
        why: 'Remind them with social proof. Show that others are earning.',
        template: "Hey {name}! Your friends keep asking about your skin 😊 Share your link and earn $50 for each friend who books: [LINK]",
        type: 'sms'
      },
      {
        day: 'On conversion',
        channel: 'Thank you text',
        icon: MessageSquare,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        badge: 'Instant',
        badgeColor: 'bg-emerald-100 text-emerald-700',
        why: 'Instant gratification reinforces the loop.',
        template: "{friend_name} just booked! $50 credit added to your account. Thank you for the referral! 🙌",
        type: 'sms'
      }
    ],
    alternativeChannels: []
  }
};

export function CampaignWorkflowModal({
  actionModalData,
  analysisData,
  currentRunId,
  onClose,
  onExportCSV,
}: CampaignWorkflowModalProps) {
  const [expandedStep, setExpandedStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});
  const [calledPatients, setCalledPatients] = useState<string[]>([]);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, 'good' | 'bad' | null>>({});
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<string[]>(
    actionModalData.patients.map(p => typeof p === 'object' ? p.patient_id : p)
  );
  const [showSendList, setShowSendList] = useState<number | null>(null);

  // Get config for current segment
  const config = segmentConfigs[actionModalData.segment] || segmentConfigs['one-and-done'];
  
  // Convert patients to consistent format
  const patients: Patient[] = actionModalData.patients.map(p => {
    if (typeof p === 'object') return p;
    return { patient_id: p };
  });

  const patientsWithSocial = patients.filter(p => p.instagram);

  // Add IDs to steps
  const steps: Step[] = config.steps.map((step, index) => ({ ...step, id: index + 1 }));
  const alternativeChannels: Step[] = config.alternativeChannels.map((step, index) => ({ 
    ...step, 
    id: steps.length + index + 1 
  }));

  const handleFeedback = (stepId: number, type: 'good' | 'bad') => {
    setFeedbackGiven({...feedbackGiven, [stepId]: type});
  };

  const handleRegenerate = async (stepId: number) => {
    setRegenerating(stepId);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRegenerating(null);
    setFeedbackGiven({...feedbackGiven, [stepId]: null});
  };

  const toggleStep = (stepId: number) => {
    setExpandedStep(expandedStep === stepId ? 0 : stepId);
  };

  const markComplete = (stepId: number) => {
    if (completedSteps.includes(stepId)) {
      setCompletedSteps(completedSteps.filter(id => id !== stepId));
    } else {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const togglePatientSelection = (patientId: string) => {
    if (selectedPatients.includes(patientId)) {
      setSelectedPatients(selectedPatients.filter(id => id !== patientId));
    } else {
      setSelectedPatients([...selectedPatients, patientId]);
    }
  };

  const toggleCalledPatient = (patientId: string) => {
    if (calledPatients.includes(patientId)) {
      setCalledPatients(calledPatients.filter(id => id !== patientId));
    } else {
      setCalledPatients([...calledPatients, patientId]);
    }
  };

  const renderFeedbackButtons = (stepId: number) => (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">How's this copy?</span>
      <button 
        onClick={() => handleFeedback(stepId, 'good')}
        className={`p-1.5 rounded-md transition-colors ${
          feedbackGiven[stepId] === 'good' 
            ? 'bg-green-100 text-green-600' 
            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
        }`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={() => handleFeedback(stepId, 'bad')}
        className={`p-1.5 rounded-md transition-colors ${
          feedbackGiven[stepId] === 'bad' 
            ? 'bg-red-100 text-red-600' 
            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={() => handleRegenerate(stepId)}
        disabled={regenerating === stepId}
        className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${regenerating === stepId ? 'animate-spin' : ''}`} />
        {regenerating === stepId ? 'Regenerating...' : 'Try different copy'}
      </button>
    </div>
  );

  const renderPatientSelection = (stepId: number, showField: 'phone' | 'email') => {
    if (showSendList !== stepId) return null;
    
    return (
      <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            {selectedPatients.length} of {patients.length} selected
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setSelectedPatients(patients.map(p => p.patient_id))}
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              Select all
            </button>
            <span className="text-gray-300">·</span>
            <button 
              onClick={() => setSelectedPatients([])}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
          {patients.map((patient) => (
            <label key={patient.patient_id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedPatients.includes(patient.patient_id)}
                onChange={() => togglePatientSelection(patient.patient_id)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">{patient.name || patient.patient_id}</span>
                <span className="text-sm text-gray-500 ml-2">
                  {showField === 'phone' ? patient.phone : patient.email}
                </span>
              </div>
              {patient.lastVisit && (
                <span className="text-xs text-gray-400">{patient.lastVisit}</span>
              )}
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-2xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wide text-${config.color}-600`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-500">{actionModalData.count} patients</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{actionModalData.title}</h2>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1 -mr-1 -mt-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Strategy Brief */}
              <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 mb-6`}>
                <div className="flex items-start gap-2">
                  <Sparkles className={`w-4 h-4 ${config.textColor} flex-shrink-0 mt-0.5`} />
                  <p className={`text-sm ${config.textColor} leading-relaxed`}>
                    <span className="font-semibold">Strategy:</span> {config.brief}
                  </p>
                </div>
              </div>

              {/* Campaign Steps */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recommended sequence</p>
                
                {steps.map((step) => (
                  <div key={step.id} className={`border rounded-xl overflow-hidden transition-all ${
                    completedSteps.includes(step.id) ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                  }`}>
                    {/* Step Header */}
                    <button
                      onClick={() => toggleStep(step.id)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${step.iconBg} flex items-center justify-center`}>
                          {completedSteps.includes(step.id) ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <step.icon className={`w-4 h-4 ${step.iconColor}`} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{step.day}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-sm text-gray-600">{step.channel}</span>
                            {step.badge && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${step.badgeColor}`}>
                                {step.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{step.why}</p>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                        expandedStep === step.id ? 'rotate-180' : ''
                      }`} />
                    </button>

                    {/* Expanded Content */}
                    {expandedStep === step.id && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="pt-4">
                          {/* SMS Template */}
                          {step.type === 'sms' && typeof step.template === 'string' && (
                            <>
                              <div className="bg-gray-50 rounded-lg p-4 mb-3">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Message</p>
                                  <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Edit</button>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{step.template}</p>
                                {renderFeedbackButtons(step.id)}
                              </div>
                              
                              {renderPatientSelection(step.id, 'phone')}
                              
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setShowSendList(showSendList === step.id ? null : step.id)}
                                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Send className="w-4 h-4" />
                                  {showSendList === step.id 
                                    ? `Send to ${selectedPatients.length} patients` 
                                    : `Send to ${patients.length} patients`}
                                </button>
                                <button 
                                  onClick={() => markComplete(step.id)}
                                  className={`px-4 py-2.5 border text-sm font-medium rounded-lg transition-colors ${
                                    completedSteps.includes(step.id)
                                      ? 'bg-green-50 border-green-200 text-green-700'
                                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {completedSteps.includes(step.id) ? 'Done ✓' : 'Mark done'}
                                </button>
                              </div>
                            </>
                          )}

                          {/* Email Template */}
                          {step.type === 'email' && typeof step.template === 'object' && (
                            <>
                              <div className="bg-gray-50 rounded-lg p-4 mb-3">
                                <div className="flex justify-between items-center mb-3">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Email</p>
                                  <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Edit</button>
                                </div>
                                <div className="mb-3 pb-3 border-b border-gray-200">
                                  <p className="text-[10px] text-gray-400 uppercase mb-1">Subject</p>
                                  <p className="text-sm font-medium text-gray-900">{step.template.subject}</p>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{step.template.body}</p>
                                {renderFeedbackButtons(step.id)}
                              </div>
                              
                              {renderPatientSelection(step.id, 'email')}
                              
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setShowSendList(showSendList === step.id ? null : step.id)}
                                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Send className="w-4 h-4" />
                                  {showSendList === step.id 
                                    ? `Send to ${selectedPatients.length} patients` 
                                    : `Send to ${patients.length} patients`}
                                </button>
                                <button 
                                  onClick={() => markComplete(step.id)}
                                  className={`px-4 py-2.5 border text-sm font-medium rounded-lg transition-colors ${
                                    completedSteps.includes(step.id)
                                      ? 'bg-green-50 border-green-200 text-green-700'
                                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {completedSteps.includes(step.id) ? 'Done ✓' : 'Mark done'}
                                </button>
                              </div>
                            </>
                          )}

                          {/* Phone Script */}
                          {step.type === 'phone' && step.script && (
                            <>
                              <div className="bg-emerald-50 rounded-lg p-4 mb-4">
                                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Opening</p>
                                <p className="text-sm text-emerald-900 mb-4">"{step.script.opener}"</p>
                                
                                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Respond based on what you hear</p>
                                <ul className="space-y-1.5 mb-4">
                                  {step.script.keyPoints.map((point, i) => (
                                    <li key={i} className="text-sm text-emerald-800 flex items-start gap-2">
                                      <span className="text-emerald-400 mt-1">•</span>
                                      {point}
                                    </li>
                                  ))}
                                </ul>
                                
                                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Close with</p>
                                <p className="text-sm text-emerald-900">"{step.script.closer}"</p>
                                {renderFeedbackButtons(step.id)}
                              </div>

                              {/* Call List */}
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Call list</p>
                              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                                {patients.slice(0, 10).map((patient) => (
                                  <div key={patient.patient_id} className={`border rounded-lg p-3 transition-colors ${
                                    calledPatients.includes(patient.patient_id) ? 'bg-green-50 border-green-200' : 'border-gray-200 hover:border-gray-300'
                                  }`}>
                                    <div className="flex items-start gap-3">
                                      <input 
                                        type="checkbox" 
                                        checked={calledPatients.includes(patient.patient_id)}
                                        onChange={() => toggleCalledPatient(patient.patient_id)}
                                        className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium text-gray-900">{patient.name || patient.patient_id}</span>
                                          {patient.lastVisit && (
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {patient.lastVisit}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                          {patient.phone && (
                                            <a href={`tel:${patient.phone}`} className="text-indigo-600 hover:text-indigo-700 font-medium">
                                              {patient.phone}
                                            </a>
                                          )}
                                          {patient.treatment && (
                                            <>
                                              <span className="text-gray-300">·</span>
                                              <span className="text-gray-500">{patient.treatment}</span>
                                            </>
                                          )}
                                          {patient.spent && (
                                            <>
                                              <span className="text-gray-300">·</span>
                                              <span className="text-gray-900 font-medium">{patient.spent}</span>
                                            </>
                                          )}
                                        </div>
                                        <input
                                          type="text"
                                          placeholder="Add note after call..."
                                          value={callNotes[patient.patient_id] || ''}
                                          onChange={(e) => setCallNotes({...callNotes, [patient.patient_id]: e.target.value})}
                                          className="mt-2 w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="flex gap-2">
                                <button 
                                  onClick={() => onExportCSV(actionModalData.patients, `${actionModalData.title} - Call List`)}
                                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Download className="w-4 h-4" />
                                  Export call sheet
                                </button>
                                <button 
                                  onClick={() => markComplete(step.id)}
                                  className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                  Done ({calledPatients.length}/{patients.length})
                                </button>
                              </div>
                            </>
                          )}

                          {/* Direct Mail */}
                          {step.type === 'mail' && typeof step.template === 'string' && (
                            <>
                              <div className="bg-gray-50 rounded-lg p-4 mb-3">
                                <p className="text-sm text-gray-700">{step.template}</p>
                              </div>
                              <button
                                onClick={() => onExportCSV(actionModalData.patients, `${actionModalData.title} - Direct Mail`)}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Export addresses for direct mail
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Alternative Channels */}
                {alternativeChannels.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Additional channels</p>
                    
                    {alternativeChannels.map((step) => (
                      <div key={step.id} className="border border-dashed border-gray-200 rounded-xl overflow-hidden mb-3 last:mb-0">
                        <button
                          onClick={() => toggleStep(step.id)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg ${step.iconBg} flex items-center justify-center`}>
                              <step.icon className={`w-4 h-4 ${step.iconColor}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">{step.channel}</span>
                                {step.badge && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${step.badgeColor}`}>
                                    {step.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{step.why}</p>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedStep === step.id ? 'rotate-180' : ''
                          }`} />
                        </button>

                        {/* Phone Call Expanded */}
                        {expandedStep === step.id && step.type === 'phone' && step.script && (
                          <div className="px-4 pb-4 border-t border-gray-100">
                            <div className="pt-4">
                              <div className="bg-emerald-50 rounded-lg p-4 mb-4">
                                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Opening</p>
                                <p className="text-sm text-emerald-900 mb-4">"{step.script.opener}"</p>
                                
                                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Key points</p>
                                <ul className="space-y-1.5 mb-4">
                                  {step.script.keyPoints.map((point, i) => (
                                    <li key={i} className="text-sm text-emerald-800 flex items-start gap-2">
                                      <span className="text-emerald-400 mt-1">•</span>
                                      {point}
                                    </li>
                                  ))}
                                </ul>
                                
                                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Close with</p>
                                <p className="text-sm text-emerald-900">"{step.script.closer}"</p>
                                {renderFeedbackButtons(step.id)}
                              </div>

                              <div className="flex gap-2">
                                <button 
                                  onClick={() => onExportCSV(actionModalData.patients, `${actionModalData.title} - Call List`)}
                                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Download className="w-4 h-4" />
                                  Export call sheet
                                </button>
                                <button 
                                  onClick={() => markComplete(step.id)}
                                  className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                  Mark complete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex justify-end">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
