cat > services/campaign_generator.py << 'EOF'
# /backend/services/campaign_generator.py
from anthropic import Anthropic
import os
import json

def generate_campaign_content(cohort: str, zip_code: str, competitors: int, reasons: list, match_score: float, procedure: str = None):
    """Generate campaign content using Claude API"""
    
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    cohort_psychology = {
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
    
    cohort_info = cohort_psychology.get(cohort, cohort_psychology["Comfort Spenders"])
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

    try:
        print(f"[LLM] Generating campaign for {cohort} in {zip_code}...")
        
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = message.content[0].text
        # Strip markdown code blocks if present
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        
        result = json.loads(response_text)
        print(f"[LLM] Campaign generated successfully for {cohort}")
        return result
        
    except Exception as e:
        print(f"[LLM ERROR] Campaign generation failed: {e}")
        # Return fallback content
        return {
            "adCopy": [
                {"headline": f"Expert {procedure_text} in Your Area", "description": f"Professional {procedure_text} from experienced specialists. Book your free consultation today."},
                {"headline": f"Transform Your Look Today", "description": f"Discover why {cohort} patients choose us for {procedure_text}. Limited appointments available."},
                {"headline": f"Your Best Self Awaits", "description": f"Premium {procedure_text} with personalized care. See the difference quality makes."}
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
EOF