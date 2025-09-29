import { PATIENT_TEMPLATE_CSV } from './constants';

export function formatK(num: number): string {
  if (num == null) return '';
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1e3) return Math.round(num / 1e3) + 'K';
  return Math.round(num).toString();
}

export function formatZipCode(zip: string | number): string {
  return String(zip).replace(/[^0-9]/g, '').substring(0, 5);
}

export function downloadCSVTemplate(): void {
  const blob = new Blob([PATIENT_TEMPLATE_CSV], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'patient_data_template.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

export function getCohortColor(cohort: string): string {
  const colors: Record<string, string> = {
    'Budget Conscious': '#64748b',
    'Luxury Clients': '#7c3aed',
    'Comfort Spenders': '#059669'
  };
  return colors[cohort] || '#64748b';
}