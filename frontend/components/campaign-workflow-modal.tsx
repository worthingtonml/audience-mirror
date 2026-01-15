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
    crossSellContext?: {
      newService: string;
      currentService: string;
    };
  };
  analysisData?: {
    patient_segments?: {
      one_and_done?: { potential_recovery?: number };
      lapsed_regulars?: { revenue_at_risk?: number };
      high_frequency?: { avg_ltv?: number; count?: number };
      referral_champions?: { count?: number };
    };
  };
  runId?: string | null;
  onClose: () => void;
  onExportCSV: (patients: Array<Patient | string>, segmentName: string) => void;
}

// Template variations for each segment/step
const smsTemplates: Record<string, string[]> = {
  'one-and-done-day1': [
    "Hi {name}, it's [Clinic]. I was reviewing your file and wanted to check in — how did everything go after your visit? Any questions I can help with?",
    "Hey {name}! It's [Clinic]. Just wanted to see how you're feeling after your treatment. Everything healing up okay?",
    "Hi {name}, [Clinic] here. I noticed you came in a while back and wanted to make sure we took good care of you. How's everything going?",
    "Hey {name}! Quick check-in from [Clinic] — did your treatment meet your expectations? We'd love to hear how it went."
  ],
  'one-and-done-day10': [
    "Hi {name}, it's [Clinic] again. No pressure at all — just wondering if there's anything holding you back from coming in? Happy to answer any questions.",
    "Hey {name}! Just following up. If timing or budget is tricky right now, totally understand. We're here whenever works for you.",
    "{name}, I know life gets busy. If you've been meaning to come back but haven't had time, I'd be happy to find a slot that works with your schedule.",
    "Hi {name}! If something about your first visit didn't feel right, I'd genuinely love to know. Your feedback helps us get better."
  ],
  'lapsed-day3': [
    "Hey {name}, it's [Clinic]. We miss seeing you! No pressure — just wanted to check in and see how you're doing.",
    "Hi {name}! I noticed it's been a bit since your last visit. Everything okay? We're here whenever you're ready.",
    "{name}, it's [Clinic]. Life gets busy — totally get it. Just wanted you to know we're thinking of you and here when the timing works.",
    "Hey {name}! Just a friendly hello from [Clinic]. We've missed your visits but understand schedules change. Hope you're doing well!"
  ],
  'lapsed-day7': [
    "Hi {name}, following up from my voicemail. We'd love to help you get back on track whenever you're ready — no rush at all.",
    "{name}, I know things come up. If cost or timing has been tricky, let me know — we might be able to work something out.",
    "Hey {name}! Just wanted to say we value you and would love to see you again. If anything made you hesitant, I'm all ears.",
    "Hi {name}, checking in one more time. Whether it's been busy life or something else, we're here when the time is right."
  ],
  'high-freq-birthday': [
    "Happy birthday {name}! 🎂 Thank you for being such a wonderful part of our community. We have a little something waiting for you!",
    "It's your day, {name}! 🎉 We're so grateful to have you. Stop by anytime — there's a birthday surprise with your name on it.",
    "Happy birthday {name}! 🎁 You're one of our favorite people. Can't wait to celebrate with you at your next visit!",
    "{name}! 🎂 Wishing you the happiest birthday. Thank you for trusting us — we appreciate you more than you know."
  ],
  'high-freq-checkin': [
    "Hi {name}! Just wanted to personally thank you for being such a loyal patient. Anything I can help you with? You always get priority here.",
    "Hey {name}! Quick note to say we appreciate you. If you ever need anything — booking, questions, early access — just text me.",
    "{name}, I was thinking of you! As one of our VIPs, I wanted to make sure you know I'm here for anything you need. How's everything going?",
    "Hi {name}! You're one of our most valued patients. Just checking in to see if there's anything we can do for you."
  ],
  'referral-day7': [
    "Hey {name}! I just wanted to say thank you — your friends have had such great things to say about you. We're grateful you trust us with them.",
    "Hi {name}! People keep coming in and mentioning your name. 😊 Thank you for spreading the word — it means so much to us.",
    "{name}, you've sent us some wonderful patients. Thank you! If you ever want to share your link, it's here: [LINK] — $50 for you each time.",
    "Hey {name}! Your referrals have been amazing. We really appreciate you. Here's your link if you want to share: [LINK]"
  ],
  'referral-conversion': [
    "Amazing news, {name}! {friend_name} just booked. Thank you for trusting us with another friend — $50 is on its way to your account!",
    "You're the best, {name}! {friend_name} just scheduled. We've added $50 to your account as a thank you. 🙌",
    "🎉 {friend_name} booked! Thanks to you, {name}. $50 credit coming your way. We appreciate you!",
    "{friend_name} is officially on the books! Thanks for the referral, {name}. $50 added to your account."
  ],
  'cross-sell-day1': [
    "Hi {name}! I was looking at your file and thought you might be interested in {new_service}. It pairs really well with your {current_service}. Want to learn more?",
    "Hey {name}! Quick thought — many of our {current_service} patients love adding {new_service}. It can help extend your results. Curious?",
    "{name}, I noticed you've been doing {current_service} — have you ever considered {new_service}? A lot of patients find it complements their routine beautifully.",
    "Hi {name}! Just an idea: {new_service} works great with {current_service}. Happy to explain how if you're interested!"
  ],
  'cross-sell-day5': [
    "Hey {name}! Following up on {new_service} — if you're curious but not sure, we could do a quick consult to see if it's right for you. No pressure!",
    "Hi {name}! Last thought on {new_service}: if budget is a factor, we have an intro offer that might help. Want details?",
    "{name}, just checking if you had any questions about {new_service}. Happy to chat whenever — totally understand if the timing isn't right.",
    "Hey {name}! If you've been thinking about {new_service}, I'm here to answer any questions. No rush at all."
  ]
};

const emailTemplates: Record<string, { subject: string; body: string }[]> = {
  'one-and-done-day4': [
    {
      subject: "How did everything go, {name}?",
      body: "Hi {name},\n\nI was reviewing your file and realized we never followed up after your visit. I wanted to personally check in — how did everything go?\n\nIf there's anything we could have done better, I'd genuinely love to hear it. And if you've been thinking about coming back but something's been holding you back, I'm happy to help figure it out.\n\nNo pressure at all. We're here whenever the timing is right.\n\nWarmly,\n[Your Name]\n[Clinic]"
    },
    {
      subject: "Just checking in, {name}",
      body: "Hi {name},\n\nIt's been a little while since your visit, and I wanted to reach out personally.\n\nI hope your experience was everything you hoped for. If it wasn't — or if something felt off — please let me know. Your feedback helps us get better.\n\nWhenever you're ready to come back, we'd love to see you. And if timing or budget is tricky, I'm happy to work with you.\n\nTake care,\n[Your Name]"
    },
    {
      subject: "We'd love your feedback, {name}",
      body: "Hi {name},\n\nI noticed it's been a while since your visit and wanted to check in.\n\nDid we meet your expectations? Was there anything about your experience that didn't feel right?\n\nYour honest feedback means a lot to us. And if you've been meaning to come back but life got in the way, totally understand — we're here when you're ready.\n\nWarmly,\n[Clinic]"
    }
  ],
  'lapsed-day7': [
    {
      subject: "We've missed you, {name}",
      body: "Hi {name},\n\nI was looking at your history and realized it's been a while since we've seen you. I wanted to reach out personally.\n\nI know life gets busy — schedules change, priorities shift, budgets get tight. All totally normal.\n\nIf you've been thinking about getting back on track with your routine, I'd love to help. And if something about your experience made you hesitant to return, I really want to know.\n\nWe value you as a patient. No pressure — just wanted you to know we're here.\n\nWarmly,\n[Your Name]"
    },
    {
      subject: "Checking in, {name}",
      body: "Hi {name},\n\nI noticed it's been a bit since your last visit and wanted to personally reach out.\n\nYou had such a great routine going, and I wanted to make sure everything was okay. If anything has changed — whether it's time, budget, or something we did — I'd love to hear about it.\n\nWhenever you're ready, we'd be happy to help you pick back up where you left off.\n\nTake care,\n[Your Name]"
    },
    {
      subject: "Life gets busy — we understand",
      body: "Hi {name},\n\nJust a quick note to say we've been thinking of you.\n\nWe know things come up — work gets crazy, priorities shift, schedules fill up. It happens to everyone.\n\nWhenever you're ready to get back on your routine, we're here. No judgment, no pressure. Just happy to help when the timing works for you.\n\nHope you're doing well!\n\n[Clinic]"
    }
  ],
  'high-freq-vip': [
    {
      subject: "A personal thank you, {name}",
      body: "Hi {name},\n\nI just wanted to take a moment to say thank you.\n\nYou've been one of our most loyal patients, and we genuinely appreciate the trust you've placed in us. It means everything.\n\nAs a small token of gratitude, I wanted to give you first access to [new treatment/booking slots/special event] before we open it to everyone else.\n\nIf you're interested, just reply and I'll make sure you're taken care of.\n\nWith gratitude,\n[Your Name]"
    },
    {
      subject: "VIP access for you, {name}",
      body: "Hi {name},\n\nBecause you're one of our top patients, I wanted to personally reach out with something special.\n\nWe're offering early access to [new offering] to a small group of our most valued patients before the general announcement. I immediately thought of you.\n\nNo pressure — just wanted you to have the first opportunity if you're interested.\n\nThank you for being such an important part of our community.\n\n[Your Name]"
    },
    {
      subject: "You're one of our favorites, {name}",
      body: "Hi {name},\n\nQuick personal note: you're one of our most valued patients and I wanted to make sure you know that.\n\nIf you ever need anything — priority scheduling, questions answered, early access to new treatments — just reach out directly to me. You get the VIP treatment here.\n\nThank you for your loyalty. We're grateful.\n\n[Your Name]"
    }
  ],
  'referral-day1': [
    {
      subject: "Thank you for spreading the word, {name}",
      body: "Hi {name},\n\nI wanted to personally thank you for referring your friends and family to us. It means so much.\n\nWhen someone trusts us with the people they care about, it's the highest compliment we can receive.\n\nIf you ever want to share your personal referral link, here it is:\n[REFERRAL_LINK]\n\nFor every friend who books, you'll receive $50 toward your next treatment. But honestly, just knowing you trust us is reward enough.\n\nThank you again.\n\nWarmly,\n[Your Name]"
    },
    {
      subject: "Your referrals mean the world to us",
      body: "Hi {name},\n\nI was looking at our records and noticed how many wonderful patients have come to us through you. I wanted to say thank you.\n\nYour trust and recommendations are the reason we're able to do what we love. We're genuinely grateful.\n\nIf there's ever anything we can do better — for you or for the friends you send our way — please let me know. Your feedback matters.\n\nThank you for being such an amazing advocate.\n\n[Your Name]"
    },
    {
      subject: "We're grateful for you, {name}",
      body: "Hi {name},\n\nQuick note to say thank you.\n\nYou've sent us some incredible patients, and we don't take that for granted. Every referral is a reflection of your trust in us.\n\nYour personal link is here if you'd like to share it: [REFERRAL_LINK]\n($50 credit for you whenever someone books)\n\nBut more than anything, we just wanted you to know how much we appreciate you.\n\n[Clinic]"
    }
  ],
  'cross-sell-day1': [
    {
      subject: "Something that might complement your routine, {name}",
      body: "Hi {name},\n\nI was thinking about your treatments and wanted to share something you might find interesting.\n\nMany of our patients who do {current_service} have been adding {new_service} to their routine. The two work really well together — {new_service} helps extend and enhance the results you're already getting.\n\nNo pressure at all — just thought it might be worth mentioning since you've had such great results so far.\n\nIf you're curious, I'm happy to explain more or set up a quick consult.\n\nWarmly,\n[Your Name]"
    },
    {
      subject: "Have you considered {new_service}?",
      body: "Hi {name},\n\nQuick thought: have you ever considered adding {new_service} to your routine?\n\nI've noticed that patients who pair it with {current_service} often see longer-lasting, more enhanced results. It's become one of our most popular combinations.\n\nIf you're interested, I'd be happy to tell you more. And if the timing or budget isn't right, no worries at all.\n\nJust wanted to plant the seed!\n\n[Your Name]"
    },
    {
      subject: "A perfect pairing for your {current_service}",
      body: "Hi {name},\n\nI was reviewing your file and had a thought I wanted to share.\n\nGiven the great results you've been getting with {current_service}, you might love {new_service}. The two complement each other beautifully — most patients who try the combination don't go back.\n\nNo pressure — just an idea. If you're curious, we have an intro offer that makes it easy to try.\n\nLet me know if you'd like to learn more!\n\n[Clinic]"
    }
  ]
};

const phoneScripts: Record<string, { opener: string; keyPoints: string[]; closer: string }[]> = {
  'one-and-done': [
    {
      opener: "Hi {name}, this is [Your Name] from [Clinic]. I was looking at your file and realized we never followed up after your visit — I wanted to personally check in. How did everything go?",
      keyPoints: [
        "Listen first — ask how their experience was",
        "If bad experience → apologize sincerely, ask what happened",
        "If life got busy → empathize, offer flexible scheduling",
        "If cost concern → acknowledge, mention payment options",
        "If switched providers → thank them, ask for feedback"
      ],
      closer: "Thank you for chatting with me. We'd genuinely love to see you again whenever the time is right. Is there anything else I can help with?"
    }
  ],
  'lapsed-regulars': [
    {
      opener: "Hi {name}, this is [Your Name] from [Clinic]. I was thinking about you and noticed it's been a while — I just wanted to check in and see how you're doing.",
      keyPoints: [
        "Acknowledge the relationship — mention their history",
        "Normalize gaps — 'life gets busy, schedules change'",
        "If bad experience → apologize, ask to make it right",
        "If budget tight → discuss spacing out treatments",
        "If switched providers → thank them, ask what they liked"
      ],
      closer: "We really value you and would love to see you again whenever the timing is right. Take care!"
    },
    {
      opener: "Hi {name}, it's [Your Name] at [Clinic]. I was thinking about you and wanted to reach out personally — how have you been?",
      keyPoints: [
        "Make it personal — reference their past visits",
        "Ask open-ended questions, let them talk",
        "If hesitant → ask what would make them comfortable",
        "If competitor → ask what they liked, take notes",
        "No pressure — accept 'not right now' gracefully"
      ],
      closer: "Thanks for talking with me. We're here whenever you're ready — no rush at all."
    }
  ],
  'cross-sell-visit': [
    {
      opener: "Hey {name}, while you're here — I noticed you've been doing {current_service} with great results. Have you ever thought about adding {new_service}?",
      keyPoints: [
        "Keep it natural and brief — not a hard pitch",
        "Connect {new_service} to their existing goals",
        "If interested → explain benefits, mention intro offer",
        "If hesitant → offer info to take home, no pressure",
        "If not interested → 'No problem! Just wanted to mention it.'"
      ],
      closer: "No pressure at all — just wanted to plant the seed. Let me know if you ever get curious!"
    }
  ]
};

const segmentConfigs: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  label: string;
  brief: string;
  steps: {
    day: string;
    channel: string;
    icon: typeof MessageSquare;
    iconBg: string;
    iconColor: string;
    badge: string | null;
    badgeColor?: string;
    why: string;
    templateKey?: string;
    type: 'sms' | 'email' | 'phone' | 'mail';
  }[];
  alternativeChannels: {
    day: string;
    channel: string;
    icon: typeof MessageSquare;
    iconBg: string;
    iconColor: string;
    badge: string | null;
    badgeColor?: string;
    why: string;
    templateKey?: string;
    type: 'sms' | 'email' | 'phone' | 'mail';
  }[];
}> = {
  'one-and-done': {
    color: 'rose',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    textColor: 'text-amber-900',
    label: 'Act first',
    brief: "These patients were curious enough to book once, but didn't return. The win-back window is 30-60 days — after that, they've moved on mentally. A 3-touch sequence recovers 12-18%, vs ~5% for a single message.",
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
        templateKey: 'one-and-done-day1',
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
        templateKey: 'one-and-done-day4',
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
        templateKey: 'one-and-done-day10',
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
        templateKey: 'one-and-done',
        type: 'phone'
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
        templateKey: 'lapsed-regulars',
        type: 'phone'
      },
      {
        day: 'Day 3',
        channel: 'Follow-up text',
        icon: MessageSquare,
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        badge: 'If no answer',
        badgeColor: 'bg-gray-100 text-gray-600',
        why: "If they didn't pick up, a text feels less intrusive.",
        templateKey: 'lapsed-day3',
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
        templateKey: 'lapsed-day7',
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
        templateKey: 'high-freq-vip',
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
        templateKey: 'high-freq-birthday',
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
        templateKey: 'referral-day1',
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
        templateKey: 'referral-day7',
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
        templateKey: 'referral-conversion',
        type: 'sms'
      }
    ],
    alternativeChannels: []
  },
  'cross-sell': {
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
    textColor: 'text-purple-900',
    label: 'Revenue',
    brief: "These patients already trust you with one service. Introducing complementary services is easier than acquiring new patients — they just need awareness and a reason to try.",
    steps: [
      {
        day: 'Day 1',
        channel: 'Email with intro offer',
        icon: Mail,
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        badge: 'Educational',
        badgeColor: 'bg-purple-100 text-purple-700',
        why: 'Introduce the service with education first, then a first-time offer.',
        templateKey: 'cross-sell-day1',
        type: 'email'
      },
      {
        day: 'Day 5',
        channel: 'Text with offer',
        icon: MessageSquare,
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        badge: 'Limited time',
        badgeColor: 'bg-amber-100 text-amber-700',
        why: 'Follow up with urgency. A deadline drives action.',
        templateKey: 'cross-sell-day5',
        type: 'sms'
      },
      {
        day: 'Next visit',
        channel: 'In-person mention',
        icon: Phone,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        badge: 'High conversion',
        badgeColor: 'bg-emerald-100 text-emerald-700',
        why: 'Staff mentions the offer at checkout. Converts 3x better than digital alone.',
        templateKey: 'cross-sell-visit',
        type: 'phone'
      }
    ],
    alternativeChannels: []
  }
};

const replacePlaceholders = (text: string, context?: { newService: string; currentService: string }) => {
  if (!context) return text;
  return text
    .replace(/{new_service}/g, context.newService)
    .replace(/{current_service}/g, context.currentService);
};

export function CampaignWorkflowModal({
  actionModalData,
  runId,
  onClose,
  onExportCSV,
}: CampaignWorkflowModalProps) {
  const [expandedStep, setExpandedStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});
  const [calledPatients, setCalledPatients] = useState<string[]>([]);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'good' | 'bad' | null>>({});
  const [copyIndex, setCopyIndex] = useState<Record<string, number>>({});
  const [selectedPatients, setSelectedPatients] = useState<string[]>(
    actionModalData.patients.map(p => typeof p === 'object' ? p.patient_id : p)
  );
  const [showSendList, setShowSendList] = useState<number | null>(null);

  const config = segmentConfigs[actionModalData.segment] || segmentConfigs['one-and-done'];

  const patients: Patient[] = actionModalData.patients.map(p => {
    if (typeof p === 'object') return p;
    return { patient_id: p };
  });

  const markPatientsContacted = async (segment: string) => {
    if (!runId || selectedPatients.length === 0) return;

    try {
      const formData = new FormData();
      selectedPatients.forEach(id => formData.append('patient_ids', id));
      formData.append('segment', segment);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://audience-mirror-api.onrender.com'}/api/v1/runs/${runId}/outreach/mark-contacted`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        alert(`Marked ${selectedPatients.length} patients as contacted!`);
      }
    } catch (error) {
      console.error('Failed to mark contacted:', error);
    }
  };

  const handleFeedback = (key: string, type: 'good' | 'bad') => {
    setFeedbackGiven({...feedbackGiven, [key]: type});
  };

  const handleRegenerate = (key: string, maxTemplates: number) => {
    const current = copyIndex[key] || 0;
    const next = (current + 1) % maxTemplates;
    setCopyIndex({...copyIndex, [key]: next});
    setFeedbackGiven({...feedbackGiven, [key]: null});
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

  const renderFeedbackButtons = (key: string, maxTemplates: number) => (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">How's this copy?</span>
      <button 
        onClick={() => handleFeedback(key, 'good')}
        className={`p-1.5 rounded-md transition-colors ${
          feedbackGiven[key] === 'good' 
            ? 'bg-green-100 text-green-600' 
            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
        }`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={() => handleFeedback(key, 'bad')}
        className={`p-1.5 rounded-md transition-colors ${
          feedbackGiven[key] === 'bad' 
            ? 'bg-red-100 text-red-600' 
            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={() => handleRegenerate(key, maxTemplates)}
        className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Try different copy
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
                
                {config.steps.map((step, index) => {
                  const stepId = index + 1;
                  const templateKey = step.templateKey || '';
                  const currentIndex = copyIndex[templateKey] || 0;
                  
                  const smsOptions = smsTemplates[templateKey] || [];
                  const emailOptions = emailTemplates[templateKey] || [];
                  const phoneOptions = phoneScripts[templateKey] || [];
                  
                  const currentSms = smsOptions[currentIndex % Math.max(smsOptions.length, 1)];
                  const currentEmail = emailOptions[currentIndex % Math.max(emailOptions.length, 1)];
                  const currentPhone = phoneOptions[currentIndex % Math.max(phoneOptions.length, 1)];

                  return (
                    <div key={stepId} className={`border rounded-xl overflow-hidden transition-all ${
                      completedSteps.includes(stepId) ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                    }`}>
                      <button
                        onClick={() => toggleStep(stepId)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${step.iconBg} flex items-center justify-center`}>
                            {completedSteps.includes(stepId) ? (
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
                          expandedStep === stepId ? 'rotate-180' : ''
                        }`} />
                      </button>

                      {expandedStep === stepId && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <div className="pt-4">
                            {step.type === 'sms' && currentSms && (
                              <>
                                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Message</p>
                                    <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Edit</button>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed">{replacePlaceholders(currentSms, actionModalData.crossSellContext)}</p>
                                  {renderFeedbackButtons(templateKey, smsOptions.length)}
                                </div>
                                {renderPatientSelection(stepId, 'phone')}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      markPatientsContacted(actionModalData.segment);
                                      setShowSendList(showSendList === stepId ? null : stepId);
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <Send className="w-4 h-4" />
                                    {showSendList === stepId
                                      ? `Send to ${selectedPatients.length} patients`
                                      : `Send to ${patients.length} patients`}
                                  </button>
                                  <button 
                                    onClick={() => markComplete(stepId)}
                                    className={`px-4 py-2.5 border text-sm font-medium rounded-lg transition-colors ${
                                      completedSteps.includes(stepId)
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                  >
                                    {completedSteps.includes(stepId) ? 'Done ✓' : 'Mark done'}
                                  </button>
                                </div>
                              </>
                            )}

                            {step.type === 'email' && currentEmail && (
                              <>
                                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                                  <div className="flex justify-between items-center mb-3">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Email</p>
                                    <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Edit</button>
                                  </div>
                                  <div className="mb-3 pb-3 border-b border-gray-200">
                                    <p className="text-[10px] text-gray-400 uppercase mb-1">Subject</p>
                                    <p className="text-sm font-medium text-gray-900">{replacePlaceholders(currentEmail.subject, actionModalData.crossSellContext)}</p>
                                  </div>
                                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{replacePlaceholders(currentEmail.body, actionModalData.crossSellContext)}</p>
                                  {renderFeedbackButtons(templateKey, emailOptions.length)}
                                </div>
                                {renderPatientSelection(stepId, 'email')}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      markPatientsContacted(actionModalData.segment);
                                      setShowSendList(showSendList === stepId ? null : stepId);
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <Send className="w-4 h-4" />
                                    {showSendList === stepId
                                      ? `Send to ${selectedPatients.length} patients`
                                      : `Send to ${patients.length} patients`}
                                  </button>
                                  <button 
                                    onClick={() => markComplete(stepId)}
                                    className={`px-4 py-2.5 border text-sm font-medium rounded-lg transition-colors ${
                                      completedSteps.includes(stepId)
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                  >
                                    {completedSteps.includes(stepId) ? 'Done ✓' : 'Mark done'}
                                  </button>
                                </div>
                              </>
                            )}

                            {step.type === 'phone' && currentPhone && (
                              <>
                                <div className="bg-emerald-50 rounded-lg p-4 mb-4">
                                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Opening</p>
                                  <p className="text-sm text-emerald-900 mb-4">"{replacePlaceholders(currentPhone.opener, actionModalData.crossSellContext)}"</p>
                                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Respond based on what you hear</p>
                                  <ul className="space-y-1.5 mb-4">
                                    {currentPhone.keyPoints.map((point, i) => (
                                      <li key={i} className="text-sm text-emerald-800 flex items-start gap-2">
                                        <span className="text-emerald-400 mt-1">•</span>
                                        {replacePlaceholders(point, actionModalData.crossSellContext)}
                                      </li>
                                    ))}
                                  </ul>
                                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Close with</p>
                                  <p className="text-sm text-emerald-900">"{replacePlaceholders(currentPhone.closer, actionModalData.crossSellContext)}"</p>
                                  {renderFeedbackButtons(templateKey, phoneOptions.length)}
                                </div>
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
                                    onClick={() => markComplete(stepId)}
                                    className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                                  >
                                    Done ({calledPatients.length}/{patients.length})
                                  </button>
                                </div>
                              </>
                            )}

                            {step.type === 'mail' && (
                              <>
                                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                                  <p className="text-sm text-gray-700">Export addresses and write a short personal note: "Thank you for trusting us with your care. We appreciate you!"</p>
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
                  );
                })}

                {config.alternativeChannels.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Additional channels</p>
                    {config.alternativeChannels.map((step, index) => {
                      const stepId = config.steps.length + index + 1;
                      const templateKey = step.templateKey || '';
                      const currentIndex = copyIndex[templateKey] || 0;
                      const phoneOptions = phoneScripts[templateKey] || [];
                      const currentPhone = phoneOptions[currentIndex % Math.max(phoneOptions.length, 1)];

                      return (
                        <div key={stepId} className="border border-dashed border-gray-200 rounded-xl overflow-hidden mb-3 last:mb-0">
                          <button
                            onClick={() => toggleStep(stepId)}
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
                              expandedStep === stepId ? 'rotate-180' : ''
                            }`} />
                          </button>

                          {expandedStep === stepId && step.type === 'phone' && currentPhone && (
                            <div className="px-4 pb-4 border-t border-gray-100">
                              <div className="pt-4">
                                <div className="bg-emerald-50 rounded-lg p-4 mb-4">
                                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Opening</p>
                                  <p className="text-sm text-emerald-900 mb-4">"{replacePlaceholders(currentPhone.opener, actionModalData.crossSellContext)}"</p>
                                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Key points</p>
                                  <ul className="space-y-1.5 mb-4">
                                    {currentPhone.keyPoints.map((point, i) => (
                                      <li key={i} className="text-sm text-emerald-800 flex items-start gap-2">
                                        <span className="text-emerald-400 mt-1">•</span>
                                        {replacePlaceholders(point, actionModalData.crossSellContext)}
                                      </li>
                                    ))}
                                  </ul>
                                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Close with</p>
                                  <p className="text-sm text-emerald-900">"{replacePlaceholders(currentPhone.closer, actionModalData.crossSellContext)}"</p>
                                  {renderFeedbackButtons(templateKey, phoneOptions.length)}
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
                                    onClick={() => markComplete(stepId)}
                                    className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                                  >
                                    Mark complete
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
