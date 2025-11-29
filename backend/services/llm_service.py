import os
import json
from anthropic import Anthropic
from typing import Dict
from .llm_prompts import PromptLibrary

class LLMService:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-sonnet-4-20250514"
        
    def _call(self, prompt: str, expect_json: bool = False) -> str:
        """Base call to Claude API with error handling"""
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response = message.content[0].text
            
            if expect_json:
                # Strip markdown code blocks if present
                response = response.replace("```json", "").replace("```", "").strip()
                return json.loads(response)
            
            return response
            
        except Exception as e:
            print(f"[LLM ERROR] {str(e)}")
            
            # Fallback to safe defaults
            if expect_json:
                if "facebook" in prompt.lower():
                    return {
                        "primary_text": "Transform your look with proven aesthetic treatments.",
                        "headline": "Book Your Consultation",
                        "description": "Premium results you'll love",
                        "cta": "Book Consult"
                    }
                elif "instagram" in prompt.lower():
                    return {
                        "caption": "✨ Discover your best self with treatments designed for you",
                        "hashtags": ["aesthetics", "beauty", "selfcare"]
                    }
            
            return "High-value segment showing strong engagement and revenue contribution. Focus on retention strategies and personalized campaigns to maximize lifetime value."
    
    def generate_segment_strategy(self, context) -> str:
        prompt = PromptLibrary.segment_strategy(context)
        return self._call(prompt, expect_json=False)
    
    def generate_facebook_ad(self, context) -> Dict:
        prompt = PromptLibrary.facebook_ad_copy(context)
        return self._call(prompt, expect_json=True)
    
    def generate_instagram_ad(self, context) -> Dict:
        prompt = PromptLibrary.instagram_ad_copy(context)
        return self._call(prompt, expect_json=True)
    
    def generate_google_ad(self, context) -> Dict:
        prompt = PromptLibrary.google_ad_copy(context)
        return self._call(prompt, expect_json=True)

# Singleton instance
llm_service = LLMService()

