export const BRAND_GRADIENT = "linear-gradient(135deg, #6366F1 0%, #3B82F6 50%, #8B5CF6 100%)";

export const DEFAULT_ARPV = 400;

export const COHORT_COLORS: Record<string, string> = {
  'Budget Conscious': '#64748b',
  'Luxury Clients': '#7c3aed',
  'Comfort Spenders': '#059669'
};

export const COHORT_TAGS: Record<string, Array<{ label: string; color: string }>> = {
  'Budget Conscious': [
    { label: 'High online research', color: 'purple' },
    { label: 'Price-sensitive', color: 'orange' }
  ],
  'Luxury Clients': [
    { label: 'Premium aesthetic focus', color: 'purple' },
    { label: 'Social proof driven', color: 'orange' }
  ],
  'Comfort Spenders': [
    { label: 'Strong referral network', color: 'purple' },
    { label: 'Value-conscious', color: 'orange' }
  ]
};

export const PATIENT_TEMPLATE_CSV = `zip_code,procedure_type,revenue
10001,botox,450
10011,filler,650
10021,laser,350
10028,chemical_peel,200`;