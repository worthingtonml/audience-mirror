from schemas.llm_context import SegmentContext, CampaignContext

class PromptLibrary:
    
    @staticmethod
    def segment_strategy(context: SegmentContext) -> str:
        """Generate strategic explanation for a segment"""
        return f"""You are an expert aesthetic practice marketing strategist.

Analyze this patient segment and provide a strategic explanation:

Segment: {context.segment_name}
Patient Count: {context.patient_count}
Average Lifetime Value: ${context.avg_ltv:,.0f}
Annual Visits: {context.avg_visits_per_year:.1f}
Average Ticket: ${context.avg_ticket:,.0f}
Top Procedures: {', '.join(context.top_procedures)}
Retention Rate: {context.retention_rate:.0f}%
Revenue Contribution: {context.revenue_contribution_pct:.0f}%
Risk Level: {context.risk_level}

Write 2-3 sentences covering:
1. Why this segment is valuable (or concerning)
2. What specific actions the practice should take
3. Expected business impact

Be direct, actionable, and data-informed. No fluff."""

    @staticmethod
    def facebook_ad_copy(context: CampaignContext) -> str:
        """Generate Facebook ad copy"""
        return f"""Write Facebook ad copy for an aesthetic medical practice.

Practice: {context.practice_name} in {context.practice_city}
Target Segment: {context.segment_name}
Demographics: {context.target_demographics}
Average Patient Spend: ${context.avg_ticket:,.0f}
Top Procedures: {', '.join(context.top_procedures[:3])}
Competition: {context.competition_level}

Requirements:
- Primary text: 125 characters max, hook-driven
- Headline: 40 characters max
- Description: 30 characters max
- Include one clear call-to-action
- Tone: Premium but approachable, aspirational

Output ONLY valid JSON in this exact format:
{{
  "primary_text": "...",
  "headline": "...",
  "description": "...",
  "cta": "Book Consult"
}}"""

    @staticmethod
    def instagram_ad_copy(context: CampaignContext) -> str:
        """Generate Instagram ad copy optimized for aesthetic practices"""
        procedures_text = ', '.join(context.top_procedures[:3])
        
        return f"""Write Instagram ad copy for an aesthetic medical practice.

PRACTICE CONTEXT:
- Practice: {context.practice_name} in {context.practice_city}
- Target Segment: {context.segment_name}
- Demographics: {context.target_demographics}
- Top Procedures: {procedures_text}
- Average Spend: ${context.avg_ticket:,.0f}
- Competition: {context.competition_level}

INSTAGRAM-SPECIFIC REQUIREMENTS:
- Hook in first 3 words (users scroll fast)
- Visual-first language ("see", "watch", "swipe")
- Emoji usage (1-3 max, tasteful)
- Emphasize transformation/results
- Include social proof element if relevant
- NO prices (Instagram best practice)
- Aspirational yet authentic tone

OUTPUT FORMAT (valid JSON only, no markdown):
{{
  "caption": "Hook-driven caption, 125 chars max",
  "first_comment": "Longer context/CTA for first comment, 150 chars max",
  "hashtags": ["aesthetics", "beauty", "transformation"],
  "story_cta": "Direct CTA for story version"
}}

Write copy that stops the scroll and drives consultation bookings."""
