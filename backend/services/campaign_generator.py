# /backend/services/campaign_generator.py
from openai import OpenAI
import os
import json
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def generate_cached_campaign(cohort: str, zip_code: str, competitors: int, reasons_hash: str):
    # Generate content only if not cached
    return generate_campaign_content(cohort, zip_code, competitors, reasons_hash)

def get_campaign_with_cache(cohort, zip_code, competitors, reasons):
    reasons_hash = hashlib.md5(','.join(sorted(reasons)).encode()).hexdigest()
    return generate_cached_campaign(cohort, zip_code, competitors, reasons_hash)

def build_campaign_prompt(cohort: str, zip_code: str, competitors: int, reasons: list, match_score: float):
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
        }
    }
    
    cohort_info = cohort_psychology.get(cohort, cohort_psychology["Comfort Spenders"])
    
    return f"""
Create 3 Facebook ad variations for a medspa targeting {cohort} customers in ZIP {zip_code}.

COHORT PSYCHOLOGY:
- Primary concerns: {cohort_info['concerns']}
- Key motivators: {cohort_info['motivators']}
- Tone: {cohort_info['tone']}

MARKET CONTEXT:
- {competitors} competitors in area
- Match score: {match_score:.1%}
- Key advantages: {', '.join(reasons)}

OUTPUT FORMAT:
Return JSON with this exact structure:
{{
  "adCopy": [
    {{"headline": "...", "description": "..."}},
    {{"headline": "...", "description": "..."}},
    {{"headline": "...", "description": "..."}}
  ],
  "creativeSuggestions": {{
    "images": ["...", "...", "..."],
    "videos": ["...", "...", "..."],
    "hooks": ["...", "...", "..."]
  }},
  "creativeDirection": {{
    "photography": "...",
    "video": "..."
  }}
}}

REQUIREMENTS:
- Headlines: 5-8 words, action-oriented
- Descriptions: 2-3 sentences, address cohort concerns
- Focus on consultation booking, not procedure sales
- Match the cohort's economic psychology
- Use market context to differentiate from competitors
"""

async def generate_campaign_content(cohort: str, zip_code: str, competitors: int, reasons: list, match_score: float):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    prompt = build_campaign_prompt(cohort, zip_code, competitors, reasons, match_score)
    
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )
    
    try:
        content = json.loads(response.choices[0].message.content)
        return content
    except json.JSONDecodeError:
        # Fallback if JSON parsing fails
        return {
            "error": "Failed to parse LLM response",
            "raw_response": response.choices[0].message.content
        }