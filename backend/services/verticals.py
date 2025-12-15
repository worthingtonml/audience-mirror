"""
Industry vertical configurations.
"""
VERTICALS = {
    "medspa": {
        "name": "Aesthetics",
        "customer_term": "patient",
        "customer_term_plural": "patients",
        "transaction_term": "treatment",
        "transaction_term_plural": "treatments",
        "typical_cycle_days": 90,
        "tone": "warm, personal, wellness-focused",
        "hooks": ["seasonal refresh", "maintenance reminder", "new treatment", "loyalty reward"],
        "avoid": ["aggressive discounts", "urgency pressure"],
        "sample_offers": ["complimentary consultation", "15% off next visit", "free add-on"],
        "detection_keywords": ["botox", "filler", "laser", "hydrafacial", "coolsculpt", "facial", "injection", "skin", "medspa"]
    },
    
    "mortgage": {
        "name": "Mortgage",
        "customer_term": "borrower",
        "customer_term_plural": "borrowers",
        "transaction_term": "loan",
        "transaction_term_plural": "loans",
        "typical_cycle_days": 365,
        "preapproval_stale_days": 60,
        "tone": "helpful, educational, numbers-focused but approachable",
        "hooks": ["rate check", "pre-approval update", "refi opportunity", "payment comparison"],
        "avoid": ["pressure about rates", "credit mentions", "too much jargon"],
        "sample_offers": ["updated rate quote", "pre-approval refresh", "payment comparison"],
        "detection_keywords": ["loan", "mortgage", "refi", "refinance", "pre-approval", "preapproval", "funded", "borrower", "lender", "fha", "conventional", "jumbo", "va loan"],
        "uses_disc": True
    },
    
    "real_estate_mortgage": {
        "name": "Real Estate / Mortgage",
        "customer_term": "client",
        "customer_term_plural": "clients",
        "transaction_term": "transaction",
        "transaction_term_plural": "transactions",
        "typical_cycle_days": 1095,
        "tone": "professional, educational, consultative",
        "hooks": ["rate check", "equity review", "market update", "home valuation", "refinance opportunity"],
        "avoid": ["salesy language", "pressure tactics", "discount framing"],
        "sample_offers": ["free rate analysis", "home valuation", "market report"],
        "detection_keywords": ["buy", "sell", "listing", "closing", "realtor", "property", "buyer", "seller"]
    }
}

def detect_vertical(df) -> str:
    """Auto-detect industry from data."""
    columns_lower = [c.lower() for c in df.columns]
    
    # Strong mortgage signals (check first - column names are definitive)
    mortgage_columns = ['preapproval_date', 'preapproval_amount', 'loan_amount', 'loan_type', 'disc_type', 'disc']
    if any(c in columns_lower for c in mortgage_columns):
        return "real_estate_mortgage"
    
    # Check for real estate columns
    real_estate_columns = ['listing_date', 'property_address', 'sale_price', 'mls']
    if any(c in columns_lower for c in real_estate_columns):
        return "real_estate_mortgage"
    
    # Fall back to content-based detection
    treatment_col = None
    for col in ["treatment", "transaction_type", "procedure", "type", "service", "status"]:
        if col in df.columns:
            treatment_col = col
            break
    
    if treatment_col:
        values = " ".join(df[treatment_col].dropna().astype(str).str.lower().unique())
        
        # Check mortgage keywords first
        for kw in VERTICALS["mortgage"]["detection_keywords"]:
            if kw in values:
                return "real_estate_mortgage"
        
        # Then real estate
        for kw in VERTICALS["real_estate_mortgage"]["detection_keywords"]:
            if kw in values:
                return "real_estate_mortgage"
    
    # Amount-based detection
    for col in ["amount", "revenue", "commission", "value", "loan_amount"]:
        if col in df.columns:
            median = df[col].median()
            if median and median > 100000:  # Likely mortgage loan amounts
                return "real_estate_mortgage"
            if median and median > 5000:  # Likely real estate commission
                return "real_estate_mortgage"
    
    return "medspa"

def get_vertical(key: str) -> dict:
    """Get config, fallback to medspa."""
    return VERTICALS.get(key, VERTICALS["medspa"])

def get_prompt_context(key: str) -> str:
    """Context string for LLM prompts."""
    v = get_vertical(key)
    return f"""Industry: {v['name']}
Customer term: {v['customer_term']}
Transaction term: {v['transaction_term']}
Typical cycle: {v['typical_cycle_days']} days
Tone: {v['tone']}
Good hooks: {', '.join(v['hooks'])}
Avoid: {', '.join(v['avoid'])}
Example offers: {', '.join(v['sample_offers'])}

CRITICAL TONE RULES:
- Write like a real human texting a friend, not a marketer
- No exclamation points unless absolutely necessary
- No "Hey there!" or "Hope this finds you well" or "Just reaching out"
- No emojis unless the brand uses them
- No urgency tactics like "Act now!" or "Don't miss out!"
- Short sentences. Conversational. Like you'd actually say it.
- Sound like someone who works there, not a marketing agency"""
