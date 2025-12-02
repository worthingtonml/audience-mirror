'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check, FileText, Sparkles } from 'lucide-react';

export default function LandingPageBuilder() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [designStyle, setDesignStyle] = useState<'luxury' | 'approachable'>('approachable');
  const [prompt, setPrompt] = useState('');
  const [campaignData, setCampaignData] = useState<any>(null);

  const generatePrompt = useCallback((data: any, style: 'luxury' | 'approachable') => {
    if (!data) return;
    
    const isLuxury = style === 'luxury';
    const styleDescription = isLuxury 
      ? 'luxury and minimalist with lots of white space, serif headings, and subtle animations'
      : 'modern and approachable with sans-serif fonts, friendly colors, and clear call-to-action buttons';
    
    const primaryColor = isLuxury 
      ? 'navy blue (#1e3a8a)'
      : 'emerald green (#059669)';

    const brandVoice = isLuxury 
      ? 'Sophisticated, understated, and professional'
      : 'Friendly, confident, and approachable';

    const promptText = `Create a high-converting landing page for a medical spa. Here are the specifications:

**Page Purpose:** Convert ${data.overview?.procedure || 'treatment'} consultation bookings

**Target Audience:** ${data.overview?.profileType || 'patients'}
- Average age: ${Math.round(data.dataQuality?.age?.value || 35)}
- Lifetime value: $${((data.dataQuality?.ltv?.value || 2500) / 1000).toFixed(1)}K
- Visit frequency: ${(data.dataQuality?.frequency?.value || 2.5).toFixed(1)}× per year

**Design Style:** ${styleDescription}

**Primary Brand Color:** ${primaryColor}

**Content Structure:**

1. **Hero Section:**
   - Headline: "${data.landing?.headline || 'Transform Your Look'}"
   - Subheadline: "${data.landing?.subheadline || 'Professional treatments'}"
   - Primary CTA button: "${data.landing?.cta?.primary || 'Book Consultation'}" (prominent, above the fold)
   - Secondary CTA: "${data.landing?.cta?.secondary || 'Call Now'}"
   - Hero image: Placeholder for professional medical spa interior or treatment room

2. **Trust Indicators Bar:**
   ${(data.landing?.trustBuilders || []).map((t: string) => `- ${t}`).join('\n   ')}
   
3. **Booking Form (Sticky Sidebar or Modal):**
   Form fields in order:
   ${(data.landing?.formFields || ['Name', 'Phone', 'Email']).map((f: string) => `- ${f}`).join('\n   ')}

4. **Social Proof Section:**
   - Before/after image gallery placeholder (3-4 images in a grid)
   - Patient testimonial cards (3 testimonials with star ratings)
   - "Join ${data.dataQuality?.patientCount?.value || 50}+ satisfied patients" badge

5. **Procedure Benefits:**
   - 3-column grid highlighting key benefits of ${data.overview?.procedure || 'treatments'}
   - Icons for each benefit
   - Keep copy concise (2-3 sentences max per benefit)

6. **Practitioner Credentials:**
   - Headshot placeholder
   - Board certifications
   - Years of experience
   - "Why choose us" differentiator: ${data.strategy?.differentiator || 'Experienced team'}

7. **FAQ Section (Accordion):**
   Common questions about ${data.overview?.procedure || 'treatments'}:
   - How long does treatment take?
   - Is there downtime?
   - How long do results last?
   - What's the cost?
   - Is it safe?

8. **Final CTA Section:**
   - Repeat headline and CTA
   - Urgency element: "Limited same-week appointments available"
   - Phone number (clickable on mobile)
   - Address and map embed placeholder

**Technical Requirements:**
- Mobile-responsive (mobile-first design)
- Fast loading (<3 seconds)
- Form submits to webhook (provide placeholder endpoint)
- Google Analytics tracking placeholder
- Facebook Pixel placeholder
- Accessible (WCAG 2.1 AA compliant)
- Include meta tags for SEO

**Conversion Optimization:**
- CTA appears 3 times minimum (hero, sidebar, footer)
- No navigation menu (single-purpose page)
- Phone number clickable on mobile
- Form should be visible without scrolling (sticky or modal)
${isLuxury ? '- Emphasize luxury, discretion, and personalized care over pricing' : '- Show pricing transparency or "Starting at $X" to set expectations'}

**Brand Voice:** ${brandVoice}

Please generate clean, production-ready code (HTML/CSS/JS or React) with placeholder images and realistic sample content where needed.`;

    setPrompt(promptText);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const storedData = localStorage.getItem('audienceMirrorCampaign');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setCampaignData(data);
        generatePrompt(data, designStyle);
      } catch (error) {
        console.error('Failed to parse campaign data:', error);
      }
    }
  }, [generatePrompt, designStyle]);

  useEffect(() => {
    if (campaignData) {
      generatePrompt(campaignData, designStyle);
    }
  }, [campaignData, designStyle, generatePrompt]);

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!campaignData) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/campaign-generator')}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaign
          </button>
          
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Campaign Data Found</h2>
            <p className="text-slate-600 mb-6">
              Please generate a campaign first to create a landing page.
            </p>
            <button
              onClick={() => router.push('/campaign-generator')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
            >
              Go to Campaign Generator
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push('/campaign-generator')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaign
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Landing Page Builder</h1>
          <p className="text-slate-600">
            Copy this AI prompt and paste it into v0.dev, Claude, or ChatGPT to generate your landing page
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Design Style</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setDesignStyle('approachable')}
              className={`p-4 rounded-lg border-2 transition-all ${
                designStyle === 'approachable'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded ${designStyle === 'approachable' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-900 mb-1">Approachable & Friendly</div>
                  <div className="text-xs text-slate-600">
                    Modern sans-serif fonts, emerald green accents, clear CTAs. Best for value-conscious patients.
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setDesignStyle('luxury')}
              className={`p-4 rounded-lg border-2 transition-all ${
                designStyle === 'luxury'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded ${designStyle === 'luxury' ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                  <div className="w-4 h-4 bg-indigo-900 rounded"></div>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-900 mb-1">Luxury & Premium</div>
                  <div className="text-xs text-slate-600">
                    Minimalist with serif fonts, navy blue accents, subtle animations. Best for high-LTV patients.
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-900">AI Prompt</h2>
              </div>
              <button
                onClick={copyPrompt}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                {copied ? (
                  <><Check className="h-4 w-4" />Copied!</>
                ) : (
                  <><Copy className="h-4 w-4" />Copy prompt</>
                )}
              </button>
            </div>
          </div>

          <div className="p-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-96 p-4 text-sm font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your AI prompt will appear here..."
            />
            <p className="text-xs text-slate-500 mt-2">
              You can edit this prompt before copying. Changes will not affect your saved campaign.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-indigo-50 border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-3">How to use this prompt</h3>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <div className="font-medium text-slate-900 mb-1">Copy the prompt above</div>
                <div className="text-sm text-slate-600">
                  Click the &quot;Copy prompt&quot; button. You can edit it first if you want to customize anything.
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <div className="font-medium text-slate-900 mb-1">Choose your AI tool</div>
                <div className="text-sm text-slate-600 mb-2">
                  We recommend these tools (ranked by ease of use):
                </div>
                <div className="space-y-2">
                  <a 
                    href="https://v0.dev" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors"
                  >
                    <div className="font-medium text-slate-900 text-sm">v0.dev by Vercel</div>
                    <div className="text-xs text-slate-600">Best option - generates React code instantly with live preview</div>
                  </a>
                  <a 
                    href="https://claude.ai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors"
                  >
                    <div className="font-medium text-slate-900 text-sm">Claude.ai</div>
                    <div className="text-xs text-slate-600">Great for HTML/CSS/JS - ask for &quot;single file&quot; code</div>
                  </a>
                  <a 
                    href="https://chatgpt.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors"
                  >
                    <div className="font-medium text-slate-900 text-sm">ChatGPT</div>
                    <div className="text-xs text-slate-600">Good alternative - request &quot;production-ready single page&quot;</div>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <div className="font-medium text-slate-900 mb-1">Paste and generate</div>
                <div className="text-sm text-slate-600">
                  Paste the prompt into your chosen tool and hit enter. The AI will generate a complete landing page in 30-60 seconds.
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <div>
                <div className="font-medium text-slate-900 mb-1">Deploy or download</div>
                <div className="text-sm text-slate-600">
                  Most tools let you download the code or deploy directly. Add your real images, phone number, and form integration.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}