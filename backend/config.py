import os
import re
from typing import Dict

PROCEDURE_FILTER_ENABLED = os.getenv("PROCEDURE_FILTER_ENABLED", "true").lower() == "true"
MIN_SUPPORT = int(os.getenv("MIN_SUPPORT", "25"))
SUPPORT_WINDOW_MONTHS = int(os.getenv("SUPPORT_WINDOW_MONTHS", "12"))
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "900"))
MODEL_VERSION = os.getenv("MODEL_VERSION", "v1")

CANON_MAP = {
    "btx": "Botox",
    "botox®": "Botox", 
    "botox cosmetic": "Botox",
    "botulinum toxin": "Botox",
    "ha filler": "Filler",
    "dermal filler": "Filler",
    "hyluronan filler": "Filler",
}

def normalize_procedure(raw: str, tenant_map: Dict[str,str] = None) -> str:
    if not isinstance(raw, str): 
        return ""
    s = re.sub(r"\s+", " ", raw.strip().lower())
    if tenant_map and s in tenant_map: 
        return tenant_map[s]
    return CANON_MAP.get(s, s.title())