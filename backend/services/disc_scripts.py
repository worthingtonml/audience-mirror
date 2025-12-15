# backend/services/disc_scripts.py
"""
DISC personality-based script generator for mortgage/real estate.
Generates personalized outreach scripts based on DISC type + segment.
"""

from typing import Dict, Any, Optional

# DISC Type configurations
DISC_TYPES = {
    'D': {
        'name': 'Dominant',
        'tone': 'Direct, bottom-line, no fluff',
        'hooks': [
            'Skip the small talk',
            'Lead with numbers',
            'Give them control',
            'Be decisive'
        ],
        'avoid': [
            'Over-explaining',
            'Emotional appeals',
            'Long preambles',
            'Wishy-washy language'
        ],
        'openers': {
            'phone': "Hi {name}, this is {agent}. I'll be brief—",
            'email': "Quick update on your loan:",
            'sms': "{name}, quick question:"
        },
        'close_style': 'Give them a choice with a deadline'
    },
    'I': {
        'name': 'Influencer',
        'tone': 'Warm, enthusiastic, relationship-first',
        'hooks': [
            'Personal connection first',
            'Show excitement about their goals',
            'Use social proof',
            'Make it fun'
        ],
        'avoid': [
            'Too many details upfront',
            'Being transactional',
            'Rushing the conversation',
            'Dry, formal language'
        ],
        'openers': {
            'phone': "Hey {name}! It's {agent}—how's everything going with the house hunt?",
            'email': "Hey {name}! 🏡",
            'sms': "Hey {name}! Quick thought for you—"
        },
        'close_style': 'Make next step sound fun and collaborative'
    },
    'S': {
        'name': 'Steady',
        'tone': 'Patient, reassuring, step-by-step',
        'hooks': [
            "We'll go at your pace",
            "Here's exactly what happens next",
            "I'm here throughout the process",
            "No pressure, just information"
        ],
        'avoid': [
            'Pressure tactics',
            'Rushing decisions',
            'Ambiguity about process',
            'Sudden changes'
        ],
        'openers': {
            'phone': "Hi {name}, this is {agent}. I wanted to check in and see how you're feeling about everything.",
            'email': "Hi {name}, just checking in—",
            'sms': "Hi {name}, just a gentle check-in:"
        },
        'close_style': 'Offer to answer any questions, no pressure'
    },
    'C': {
        'name': 'Conscientious',
        'tone': 'Detailed, accurate, data-driven',
        'hooks': [
            'Here are the exact numbers',
            'Let me walk you through the comparison',
            'All documentation is ready',
            'Based on the data'
        ],
        'avoid': [
            'Vague answers',
            'Emotional appeals',
            'Skipping details',
            'Unsubstantiated claims'
        ],
        'openers': {
            'phone': "Hi {name}, this is {agent}. I have some specific updates on your application I wanted to review with you.",
            'email': "Hi {name}, here's a detailed update:",
            'sms': "{name}, quick data point:"
        },
        'close_style': 'Provide all information needed to make an informed decision'
    }
}

# Segment-specific context
MORTGAGE_SEGMENTS = {
    'stale_preapproval': {
        'situation': 'Pre-approved but inactive for 60+ days, likely shopping',
        'goal': 'Re-engage before they close with a competitor',
        'key_message': "I know the market's been tough—let me update your numbers",
        'urgency': 'Rates/inventory have changed since we last talked'
    },
    'first_time_buyer': {
        'situation': 'First home purchase, may be overwhelmed',
        'goal': 'Build confidence and trust',
        'key_message': "I'll guide you through every step",
        'urgency': 'None—focus on education and support'
    },
    'repeat_borrower': {
        'situation': 'Has financed before, knows the process',
        'goal': 'Show efficiency and value',
        'key_message': "Let's make this even smoother than last time",
        'urgency': 'Can leverage their experience for faster close'
    },
    'investor': {
        'situation': 'Focused on ROI and numbers',
        'goal': 'Prove the deal makes financial sense',
        'key_message': "Here's how the numbers work",
        'urgency': 'Deal-specific—show time-sensitive opportunity'
    },
    'credit_repair': {
        'situation': 'Working on improving credit to qualify',
        'goal': 'Keep them engaged during wait period',
        'key_message': "You're making progress—let's check in",
        'urgency': 'Celebrate progress, set next milestone'
    },
    'refi_window': {
        'situation': 'Past borrower who may benefit from refinance',
        'goal': 'Show savings opportunity',
        'key_message': "Your home may have options you don't know about",
        'urgency': 'Rate environment, equity position'
    },
    'builder_referral': {
        'situation': 'Referred by a builder partner',
        'goal': 'Leverage the trust from builder relationship',
        'key_message': "{builder} asked me to reach out",
        'urgency': 'Builder timeline, construction schedule'
    },
    'realtor_referral': {
        'situation': 'Referred by a real estate agent',
        'goal': 'Quick qualification to keep deal moving',
        'key_message': "{agent} wanted to make sure you're taken care of",
        'urgency': 'Active home search, agent timeline'
    }
}


def get_disc_script_prompt(
    disc_type: str,
    segment: str,
    channel: str = 'phone',
    context: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate an LLM prompt for a DISC-personalized script.
    
    Args:
        disc_type: D, I, S, or C
        segment: One of MORTGAGE_SEGMENTS keys
        channel: phone, email, or sms
        context: Additional context like days_since_preapproval, loan_amount, name
    
    Returns:
        Prompt string for LLM
    """
    context = context or {}
    disc = DISC_TYPES.get(disc_type.upper(), DISC_TYPES['S'])  # Default to Steady
    seg = MORTGAGE_SEGMENTS.get(segment, MORTGAGE_SEGMENTS['stale_preapproval'])
    
    prompt = f"""You're a top mortgage loan officer writing a {channel} script.

BORROWER PERSONALITY (DISC type: {disc_type} - {disc['name']}):
- Communication style: {disc['tone']}
- What works: {', '.join(disc['hooks'])}
- Avoid: {', '.join(disc['avoid'])}
- Close style: {disc['close_style']}

SEGMENT: {segment.replace('_', ' ').title()}
- Situation: {seg['situation']}
- Your goal: {seg['goal']}
- Key message: {seg['key_message']}
- Urgency angle: {seg['urgency']}

CONTEXT:
- Days since pre-approval: {context.get('days_since_preapproval', 'unknown')}
- Days since last contact: {context.get('days_since_contact', 'unknown')}
- Loan amount: ${context.get('loan_amount', 'unknown'):,} if known
- Borrower name: {context.get('name', '[Name]')}
- Your name: {context.get('agent_name', '[Your Name]')}

CHANNEL: {channel.upper()}
{"- Max 160 characters" if channel == 'sms' else ""}
{"- Subject line + body (keep body under 100 words)" if channel == 'email' else ""}
{"- Opening + 2-3 talking points + close (keep it conversational)" if channel == 'phone' else ""}

Write a script that:
1. Opens in a way that matches their DISC style
2. Acknowledges their situation without judgment
3. Offers clear value for reconnecting
4. Ends with ONE specific next step

Sound human, not scripted. No exclamation points unless you're an I-type talking to an I-type.
"""
    
    return prompt


def generate_disc_aware_scripts(
    borrower: Dict[str, Any],
    agent_name: str = "Your loan officer"
) -> Dict[str, str]:
    """
    Generate scripts for all 3 channels for a single borrower.
    
    Returns:
        {
            'phone': str,
            'email': str,
            'sms': str,
            'disc_coaching': str
        }
    """
    disc_type = borrower.get('disc_type', 'S')  # Default to Steady
    
    # Determine segment based on borrower data
    if borrower.get('days_since_preapproval', 0) > 60:
        segment = 'stale_preapproval'
    elif borrower.get('is_first_time', False):
        segment = 'first_time_buyer'
    elif borrower.get('source', '').lower() in ['builder', 'new construction']:
        segment = 'builder_referral'
    elif borrower.get('source', '').lower() in ['realtor', 'agent']:
        segment = 'realtor_referral'
    else:
        segment = 'stale_preapproval'  # Default
    
    disc = DISC_TYPES.get(disc_type.upper(), DISC_TYPES['S'])
    
    context = {
        'days_since_preapproval': borrower.get('days_since_preapproval', 0),
        'days_since_contact': borrower.get('days_since_contact', 0),
        'loan_amount': borrower.get('loan_amount', 0),
        'name': borrower.get('name', '[Name]'),
        'agent_name': agent_name
    }
    
    # Generate coaching tip
    coaching = f"""**Calling a {disc['name']} ({disc_type})**
    
Before you dial:
- {disc['hooks'][0]}
- {disc['hooks'][1]}

Avoid:
- {disc['avoid'][0]}
- {disc['avoid'][1]}

Close by: {disc['close_style']}
"""
    
    return {
        'phone_prompt': get_disc_script_prompt(disc_type, segment, 'phone', context),
        'email_prompt': get_disc_script_prompt(disc_type, segment, 'email', context),
        'sms_prompt': get_disc_script_prompt(disc_type, segment, 'sms', context),
        'disc_coaching': coaching,
        'disc_type': disc_type,
        'disc_name': disc['name'],
        'segment': segment
    }


def get_disc_coaching_card(disc_type: str) -> Dict[str, Any]:
    """
    Generate a quick coaching card for the UI.
    Shows before making a call.
    """
    disc = DISC_TYPES.get(disc_type.upper(), DISC_TYPES['S'])
    
    return {
        'type': disc_type.upper(),
        'name': disc['name'],
        'tone': disc['tone'],
        'do': disc['hooks'][:3],
        'dont': disc['avoid'][:3],
        'opener': disc['openers']['phone'],
        'close': disc['close_style']
    }
