# /backend/services/campaign_generator.py
from anthropic import Anthropic
import os
import json

# Shared cohort psychology used across all channels
COHORT_PSYCHOLOGY = {
    "Budget Conscious": {
        "concerns": "cost, value, hidden fees, payment options",
        "motivators": "affordability, transparency, payment plans, honest pricing",
        "tone": "straightforward, honest, reassuring about cost"
    },
    "Comfort Spenders": {
        "concerns": "quality, reliability, time investment, results consistency",
        "motivators": "proven results, professional service, efficiency, trustworthiness",
        "tone": "professional, confident, reliability-focused"
    },
    "Luxury Clients": {
        "concerns": "exclusivity, cutting-edge options, personalized service, privacy",
        "motivators": "premium experience, latest technology, concierge service, prestige",
        "tone": "sophisticated, exclusive, premium positioning"
    },
    "Professional Maintainer": {
        "concerns": "time efficiency, consistent results, minimal downtime",
        "motivators": "convenience, reliability, looking polished for work",
        "tone": "professional, efficient, results-focused"
    }
}

def _get_client():
    return Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def _get_cohort_info(cohort: str):
    return COHORT_PSYCHOLOGY.get(cohort, COHORT_PSYCHOLOGY["Comfort Spenders"])

def _call_llm(prompt: str, context: str):
    """Shared LLM call with error handling"""
    try:
        client = _get_client()
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        response_text = message.content[0].text
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        return json.loads(response_text)
    except Exception as e:
        print(f"[LLM ERROR] {context} failed: {e}")
        return None


def generate_campaign_content(cohort: str, zip_code: str, competitors: int, reasons: list, match_score: float, procedure: str = None):
    """Generate Facebook/Instagram ad content"""
    
    cohort_info = _get_cohort_info(cohort)
    procedure_text = procedure if procedure and procedure != "all" else "aesthetic treatments"
    
    prompt = f"""Create Facebook ad content for a medspa targeting {cohort} customers in ZIP {zip_code}.

COHORT PSYCHOLOGY:
- Primary concerns: {cohort_info['concerns']}
- Key motivators: {cohort_info['motivators']}
- Tone: {cohort_info['tone']}

MARKET CONTEXT:
- {competitors} competitors in area
- Match score: {match_score:.1%}
- Key advantages: {', '.join(reasons) if reasons else 'Quality service, experienced staff'}
- Procedure focus: {procedure_text}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{{
  "adCopy": [
    {{"headline": "5-8 word headline", "description": "2-3 sentence description"}},
    {{"headline": "5-8 word headline", "description": "2-3 sentence description"}},
    {{"headline": "5-8 word headline", "description": "2-3 sentence description"}}
  ],
  "creativeSuggestions": {{
    "images": ["image idea 1", "image idea 2", "image idea 3"],
    "videos": ["video idea 1", "video idea 2", "video idea 3"],
    "hooks": ["hook 1", "hook 2", "hook 3"]
  }},
  "creativeDirection": {{
    "photography": "photography style recommendation",
    "video": "video style recommendation"
  }}
}}"""

    print(f"[LLM] Generating ad campaign for {cohort} in {zip_code}...")
    result = _call_llm(prompt, "Ad campaign generation")
    
    if result:
        print(f"[LLM] Ad campaign generated successfully for {cohort}")
        return result
    
    return {
        "adCopy": [
            {"headline": f"Expert {procedure_text} in Your Area", "description": f"Professional {procedure_text} from experienced specialists. Book your free consultation today."},
            {"headline": "Transform Your Look Today", "description": f"Discover why {cohort} patients choose us for {procedure_text}. Limited appointments available."},
            {"headline": "Your Best Self Awaits", "description": f"Premium {procedure_text} with personalized care. See the difference quality makes."}
        ],
        "creativeSuggestions": {
            "images": ["Before/after transformations", "Clean clinical environment", "Happy patient testimonials"],
            "videos": ["Treatment process walkthrough", "Patient testimonial", "Facility tour"],
            "hooks": ["See real results", "Limited time offer", "Book your free consult"]
        },
        "creativeDirection": {
            "photography": "Clean, bright, professional imagery showcasing results",
            "video": "Short testimonials and treatment previews under 30 seconds"
        }
    }


def generate_email_sequence(cohort: str, procedure: str = None, sequence_type: str = "nurture"):
    """Generate email sequence for patient nurturing or re-engagement"""
    
    cohort_info = _get_cohort_info(cohort)
    procedure_text = procedure if procedure and procedure != "all" else "aesthetic treatments"
    
    sequence_context = {
        "nurture": "new lead who hasn't booked yet - goal is to build trust and get first appointment",
        "reactivation": "lapsed patient who hasn't visited in 6+ months - goal is to bring them back",
        "upsell": "existing patient - goal is to introduce them to complementary treatments",
        "post_visit": "patient who just completed a treatment - goal is to ensure satisfaction and encourage rebooking"
    }
    
    context_description = sequence_context.get(sequence_type, sequence_context['nurture'])
    
    prompt = f"""Create a 3-email sequence for a medspa targeting {cohort} patients.

SEQUENCE TYPE: {sequence_type}
CONTEXT: {context_description}

COHORT PSYCHOLOGY:
- Primary concerns: {cohort_info['concerns']}
- Key motivators: {cohort_info['motivators']}
- Tone: {cohort_info['tone']}

PROCEDURE FOCUS: {procedure_text}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{{
  "sequence": [
    {{
      "email_number": 1,
      "send_delay": "immediately",
      "subject_line": "compelling subject line under 50 chars",
      "preview_text": "preview text under 90 chars",
      "body": "email body - 3-4 short paragraphs, conversational tone",
      "cta_text": "call to action button text",
      "cta_type": "book_consultation"
    }},
    {{
      "email_number": 2,
      "send_delay": "3 days",
      "subject_line": "compelling subject line under 50 chars",
      "preview_text": "preview text under 90 chars",
      "body": "email body - 3-4 short paragraphs",
      "cta_text": "call to action button text",
      "cta_type": "learn_more"
    }},
    {{
      "email_number": 3,
      "send_delay": "7 days",
      "subject_line": "compelling subject line under 50 chars",
      "preview_text": "preview text under 90 chars",
      "body": "email body - 3-4 short paragraphs, create urgency",
      "cta_text": "call to action button text",
      "cta_type": "claim_offer"
    }}
  ],
  "sequence_strategy": "1-2 sentence explanation of the psychological progression across emails"
}}"""

    print(f"[LLM] Generating {sequence_type} email sequence for {cohort}...")
    result = _call_llm(prompt, f"Email sequence ({sequence_type})")
    
    if result:
        print("[LLM] Email sequence generated successfully")
        return result
    
    return {
        "sequence": [
            {
                "email_number": 1,
                "send_delay": "immediately",
                "subject_line": f"Your {procedure_text} consultation awaits",
                "preview_text": "See what personalized treatment could do for you",
                "body": f"Hi there,\n\nThank you for your interest in {procedure_text}. We'd love to help you achieve your goals.\n\nOur team specializes in creating personalized treatment plans that deliver real results.\n\nBook a free consultation to discuss your options.",
                "cta_text": "Book Free Consultation",
                "cta_type": "book_consultation"
            },
            {
                "email_number": 2,
                "send_delay": "3 days",
                "subject_line": "Questions about your treatment options?",
                "preview_text": "We're here to help you decide",
                "body": f"Hi,\n\nStill considering {procedure_text}? We understand it's a big decision.\n\nMany of our patients had the same questions before their first visit. That's why we offer no-pressure consultations.\n\nLet us answer your questions and help you feel confident about your choice.",
                "cta_text": "Get Your Questions Answered",
                "cta_type": "book_consultation"
            },
            {
                "email_number": 3,
                "send_delay": "7 days",
                "subject_line": "Limited availability this month",
                "preview_text": "Appointments filling up fast",
                "body": f"Hi,\n\nWe wanted to let you know that our calendar is filling up quickly this month.\n\nIf you've been thinking about {procedure_text}, now is a great time to book your consultation.\n\nDon't wait - secure your preferred time slot today.",
                "cta_text": "Claim Your Spot",
                "cta_type": "book_consultation"
            }
        ],
        "sequence_strategy": "Build trust, address concerns, create urgency - moving from education to action."
    }


def generate_sms_campaign(cohort: str, procedure: str = None, campaign_type: str = "appointment_reminder"):
    """Generate SMS messages for various campaign types"""
    
    cohort_info = _get_cohort_info(cohort)
    procedure_text = procedure if procedure and procedure != "all" else "your treatment"
    
    campaign_context = {
        "appointment_reminder": "remind patient of upcoming appointment",
        "reactivation": "re-engage lapsed patient who hasn't visited in 6+ months", 
        "flash_offer": "limited-time promotional offer",
        "post_visit": "follow up after treatment to check satisfaction",
        "waitlist": "notify patient that a popular time slot opened up"
    }
    
    context_description = campaign_context.get(campaign_type, campaign_context['appointment_reminder'])
    
    prompt = f"""Create SMS messages for a medspa targeting {cohort} patients.

CAMPAIGN TYPE: {campaign_type}
CONTEXT: {context_description}

COHORT PSYCHOLOGY:
- Primary concerns: {cohort_info['concerns']}
- Key motivators: {cohort_info['motivators']}
- Tone: {cohort_info['tone']}

PROCEDURE FOCUS: {procedure_text}

SMS RULES:
- Max 160 characters per message
- Include clear CTA
- Sound human, not robotic
- Include business name placeholder as [Business Name]

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{{
  "messages": [
    {{
      "variant": "A",
      "text": "SMS message under 160 chars with CTA",
      "character_count": 0
    }},
    {{
      "variant": "B", 
      "text": "alternate SMS message under 160 chars with CTA",
      "character_count": 0
    }},
    {{
      "variant": "C",
      "text": "third SMS variant under 160 chars with CTA",
      "character_count": 0
    }}
  ],
  "recommended_send_time": "best time to send this type of message",
  "compliance_note": "any compliance considerations for this message type"
}}"""

    print(f"[LLM] Generating {campaign_type} SMS campaign for {cohort}...")
    result = _call_llm(prompt, f"SMS campaign ({campaign_type})")
    
    if result:
        for msg in result.get("messages", []):
            msg["character_count"] = len(msg.get("text", ""))
        print("[LLM] SMS campaign generated successfully")
        return result
    
    return {
        "messages": [
            {
                "variant": "A",
                "text": f"[Business Name]: Ready to book {procedure_text}? Reply YES for times or call us. We'd love to see you!",
                "character_count": 98
            },
            {
                "variant": "B",
                "text": f"Hi from [Business Name]! Thinking about {procedure_text}? Text back for the perfect appointment time.",
                "character_count": 99
            },
            {
                "variant": "C",
                "text": f"[Business Name] here - spots open for {procedure_text} this week. Want one? Reply to book!",
                "character_count": 89
            }
        ],
        "recommended_send_time": "Tuesday-Thursday, 10am-2pm local time",
        "compliance_note": "Ensure patient has opted in to SMS marketing. Include opt-out instructions in first message to new contacts."
    }