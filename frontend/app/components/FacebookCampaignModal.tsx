import React, { useState, useEffect } from 'react';

interface FacebookCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  zipCode: string;
  cohort: string;
  reasons: string[];
  competitors: number;
  matchScore: number;
  procedure?: string | null;
}

const cohortDemographics: Record<string, string> = {
  'Budget Conscious': 'Ages 30-65, cost-conscious, value-seeking, interested in affordable aesthetics.',
  'Comfort Spenders': 'Ages 35-60, middle-income, quality-focused, interested in reliable wellness services.',
  'Luxury Clients': 'Ages 30-65, high income, premium-seeking, interested in exclusive aesthetics and wellness.',
};

function getBudget(competitors: number) {
  if (competitors >= 8) return '$150/day suggested';
  if (competitors >= 4) return '$100/day suggested';
  return '$75/day suggested';
}

function getConsultationAdCopy(cohort: string): { headline: string; description: string }[] {
  if (cohort === 'Budget Conscious') {
    return [
      {
        headline: "Free Consultation - No Hidden Costs",
        description: "Wondering about pricing? Get honest, upfront answers with a free consultation. No pressure, no surprise fees. Learn about payment plans and affordable options that work for your budget.",
      },
      {
        headline: "Quality Care That Won't Break the Bank",
        description: "You deserve to look and feel great without overspending. Book a free consultation to explore our most cost-effective treatments and flexible payment options.",
      },
      {
        headline: "Smart Beauty Investments Start Here",
        description: "Why guess when you can know? Our free consultation gives you real pricing, realistic timelines, and practical options. Make informed decisions about your wellness journey.",
      },
    ];
  }
  
  if (cohort === 'Comfort Spenders') {
    return [
      {
        headline: "Quality Results You Can Trust",
        description: "You value quality over quick fixes. Book a consultation with our experienced team to discuss proven treatments that deliver consistent, natural-looking results.",
      },
      {
        headline: "Professional Care for Busy Lives",
        description: "Fit wellness into your schedule without compromising on quality. Our consultation will show you efficient treatments that work with your lifestyle and budget.",
      },
      {
        headline: "Reliable Results, Honest Pricing",
        description: "Skip the guesswork. Our free consultation provides clear information about treatments, realistic expectations, and transparent pricing for reliable results.",
      },
    ];
  }
  
  if (cohort === 'Luxury Clients') {
    return [
      {
        headline: "Premium Care, Personalized Experience",
        description: "Experience the difference of truly personalized aesthetic care. Book your exclusive consultation to discuss advanced treatments and bespoke wellness plans.",
      },
      {
        headline: "Cutting-Edge Treatments, Exceptional Service",
        description: "You expect excellence in every detail. Our consultation introduces you to the latest innovations and our white-glove approach to aesthetic care.",
      },
      {
        headline: "Exclusive Access to Advanced Aesthetics",
        description: "Discover treatments reserved for our most discerning clients. Schedule your private consultation to explore our premium services and concierge-level care.",
      },
    ];
  }
  
  // Default fallback (shouldn't be needed with proper cohort mapping)
  return [
    {
      headline: "Just Book the Consult—No Pressure",
      description: "You've been thinking about this for months—what if you just scheduled a free consultation to see what's possible? No pressure, no commitment. Sometimes just talking to an expert makes everything clearer.",
    },
    {
      headline: "You Deserve to Feel Good About Yourself",
      description: "It's easy to put this off, but a consult is a simple, low-risk way to explore your options. You might be surprised how affordable and modern things are now.",
    },
    {
      headline: "Worried About Cost or Results? Just Ask",
      description: "The consultation is free, and you'll get real answers about pricing and what's possible. No pressure—just information. Sometimes a conversation is all it takes.",
    },
  ];
}

const creativeSuggestions: Record<string, { images: string[]; videos: string[]; hooks: string[] }> = {
  'Budget Conscious': {
    images: [
      'Real people in everyday settings showing subtle improvements',
      'Simple, clean clinic interior emphasizing affordability',
      'Before/after showcasing natural, achievable results',
    ],
    videos: [
      'Patient testimonial: "Affordable care that actually works"',
      'Quick explainer: "Payment plans made simple"',
      'Real results: "What $X actually gets you"',
    ],
    hooks: [
      '"Great results don\'t have to cost a fortune."',
      '"Quality care, honest pricing."',
      '"Smart spending, beautiful results."',
    ],
  },
  'Comfort Spenders': {
    images: [
      'Professional setting with friendly, qualified staff',
      'Mid-range luxury clinic environment',
      'Satisfied patients in business casual attire',
    ],
    videos: [
      'Treatment explanation: "What to expect, step by step"',
      'Professional testimonial: "Reliable results I can count on"',
      'Behind-the-scenes: "Why quality matters"',
    ],
    hooks: [
      '"Consistent results, every time."',
      '"Professional care you can trust."',
      '"Quality without the premium price tag."',
    ],
  },
  'Luxury Clients': {
    images: [
      'Elegant, high-end clinic with premium amenities',
      'Sophisticated clientele in upscale settings',
      'Advanced technology and exclusive treatment rooms',
    ],
    videos: [
      'VIP experience tour: "Your exclusive wellness journey"',
      'Advanced treatment showcase: "The latest in aesthetic innovation"',
      'Client testimonial: "Why I chose premium care"',
    ],
    hooks: [
      '"Exclusive care for discerning clients."',
      '"Where luxury meets innovation."',
      '"Premium results, personalized service."',
    ],
  },
};

type CreativeDirection = {
  photography: string;
  video: string;
};

const creativeDirection: Record<string, CreativeDirection> = {
  'Budget Conscious': {
    photography:
      `Shoot in clean, simple settings - home, casual workplace, or straightforward clinic. Use natural lighting and minimal retouching. Feature real people in everyday clothing looking happy and confident. Avoid luxury cues. Messaging: "Accessible, honest, and effective." Focus on genuine smiles and authentic moments.`,
    video:
      `Film testimonials in natural settings with handheld cameras for authenticity. Feature real patients discussing value and affordability. Use casual wardrobe and straightforward messaging. Avoid high-end production values that might alienate budget-conscious viewers.`,
  },
  'Comfort Spenders': {
    photography:
      `Photograph in professional, well-lit clinic settings. Use quality lighting that's polished but not overly glamorous. Feature subjects in business casual attire looking confident and satisfied. Messaging: "Professional, reliable, and trustworthy." Balance quality with approachability.`,
    video:
      `Create polished but not luxury-level production. Show the consultation process, qualified staff, and satisfied patients. Use professional lighting and steady shots. Messaging focuses on consistency, expertise, and reliable results.`,
  },
  'Luxury Clients': {
    photography:
      `Shoot in upscale clinic environments with premium lighting and professional retouching. Feature sophisticated subjects in high-quality clothing. Include luxury details like premium amenities and advanced equipment. Messaging: "Exclusive, innovative, and personalized."`,
    video:
      `Produce high-end content with cinematic quality, premium locations, and sophisticated subjects. Showcase advanced treatments and VIP experience. Use professional lighting, multiple camera angles, and luxury visual cues throughout.`,
  },
};

const FacebookCampaignModal: React.FC<FacebookCampaignModalProps> = ({
  isOpen,
  onClose,
  zipCode,
  cohort,
  reasons,
  competitors,
  matchScore,
  procedure,
}) => {
  const [campaignContent, setCampaignContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCampaignContent = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:8000/api/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohort,
          zip_code: zipCode,
          competitors,
          reasons,
          match_score: matchScore,
          procedure: procedure
        })
      });
      
      const content = await response.json();
      setCampaignContent(content);
    } catch (error) {
      console.error('Failed to generate campaign:', error);
      // Fallback to hardcoded content
      setCampaignContent(null);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen && !campaignContent) {
      generateCampaignContent();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  
  const demographics = cohortDemographics[cohort] || 'Ages 30-65, interested in aesthetics and wellness.';
  const adTemplates = campaignContent?.adCopy || getConsultationAdCopy(cohort);
  const creative = campaignContent?.creativeSuggestions || creativeSuggestions[cohort] || { images: [], videos: [], hooks: [] };
  const budget = getBudget(competitors);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl">×</button>
        <h2 className="text-2xl font-bold mb-2">Facebook Campaign for ZIP {zipCode}</h2>
        <div className="mb-4 text-gray-600">
          Cohort: <span className="font-semibold text-gray-900">{cohort}</span> | 
          Match Score: <span className="font-semibold text-blue-600">{(matchScore * 100).toFixed(1)}%</span>
        </div>
        
        {isGenerating && (
          <div className="mb-4 text-center">
            <div className="text-blue-600">Generating personalized campaign content...</div>
          </div>
        )}

        <section className="mb-6">
          <h3 className="font-semibold text-lg mb-1">Geographic Targeting</h3>
          <div className="bg-gray-50 rounded p-3 flex items-center justify-between">
            <span>{zipCode} + 10 mile radius</span>
            <button onClick={() => copyToClipboard(`${zipCode} + 10 mile radius`)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Copy Targeting</button>
          </div>
        </section>
        <section className="mb-6">
          <h3 className="font-semibold text-lg mb-1">Demographics</h3>
          <div className="bg-gray-50 rounded p-3 flex items-center justify-between">
            <span>{demographics}</span>
            <button onClick={() => copyToClipboard(demographics)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Copy Demographics</button>
          </div>
        </section>
        <section className="mb-6">
          <h3 className="font-semibold text-lg mb-2">Ad Copy Variations</h3>
          <div className="space-y-4">
            {adTemplates.map((ad, i) => (
              <div key={i} className="bg-gray-50 rounded p-3">
                <div className="font-semibold text-blue-700 mb-1">{ad.headline}</div>
                <div className="mb-2 text-gray-700">{ad.description}</div>
                <button onClick={() => copyToClipboard(`${ad.headline}\n${ad.description}`)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Copy Ad Copy</button>
              </div>
            ))}
          </div>
        </section>
        <section className="mb-6">
          <h3 className="font-semibold text-lg mb-2">Creative Suggestions</h3>
          <div className="mb-2">
            <span className="font-semibold">Images:</span>
            <ul className="list-disc ml-6 text-gray-700">
              {creative.images.map((img, i) => <li key={i}>{img}</li>)}
            </ul>
          </div>
          <div className="mb-2">
            <span className="font-semibold">Videos:</span>
            <ul className="list-disc ml-6 text-gray-700">
              {creative.videos.map((vid, i) => <li key={i}>{vid}</li>)}
            </ul>
          </div>
          <div>
            <span className="font-semibold">Hooks/Visuals:</span>
            <ul className="list-disc ml-6 text-gray-700">
              {creative.hooks.map((hook, i) => <li key={i}>{hook}</li>)}
            </ul>
          </div>
        </section>
        <section className="mb-6">
          <h3 className="font-semibold text-lg mb-2">Creative Direction</h3>
          <div className="mb-2">
            <span className="font-semibold">Photography Brief:</span>
            <div className="bg-gray-50 rounded p-3 text-gray-700 whitespace-pre-line">
              {(campaignContent?.creativeDirection?.photography) || creativeDirection[cohort]?.photography || creativeDirection['Comfort Spenders'].photography}
            </div>
          </div>
          <div>
            <span className="font-semibold">Video Concept:</span>
            <div className="bg-gray-50 rounded p-3 text-gray-700 whitespace-pre-line">
              {(campaignContent?.creativeDirection?.video) || creativeDirection[cohort]?.video || creativeDirection['Comfort Spenders'].video}
            </div>
          </div>
        </section>
        <section>
          <h3 className="font-semibold text-lg mb-1">Suggested Daily Budget</h3>
          <div className="bg-gray-50 rounded p-3 flex items-center justify-between">
            <span>{budget}</span>
            <button onClick={() => copyToClipboard(budget)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Copy Budget</button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FacebookCampaignModal;