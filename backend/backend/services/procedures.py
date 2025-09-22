import re
from typing import Dict

CANON_MAP: Dict[str, str] = {
  "btx": "Botox",
  "botox®": "Botox",
  "botox cosmetic": "Botox",
  "botulinum toxin": "Botox",
  "ha filler": "Filler",
  "dermal filler": "Filler",
  "hyluronan filler": "Filler",
}

def normalize_procedure(raw: str, tenant_map: Dict[str,str] | None=None) -> str:
    if not isinstance(raw, str): return ""
    s = re.sub(r"\s+"," ", raw.strip().lower())
    if tenant_map and s in tenant_map: return tenant_map[s]
    return CANON_MAP.get(s, s.title())
