import { RunResult, FocusType } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function uploadDataset(
  patientsFile: File,
  practiceZip: string,
  competitorsFile?: File
): Promise<string> {
  const formData = new FormData();
  formData.append('patients', patientsFile);  // was 'patients_file'
formData.append('practice_zip', practiceZip);  // correct
if (competitorsFile) {
  formData.append('competitors', competitorsFile);  // was 'competitors_file'
}

  const response = await fetch(`${API_BASE_URL}/api/v1/datasets`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload dataset');
  }

  const data = await response.json();
  return data.dataset_id;
}

export async function createRun(
  datasetId: string,
  focus: FocusType,
  procedure?: string
): Promise<string> {
  const url = procedure 
    ? `${API_BASE_URL}/api/v1/runs?procedure=${encodeURIComponent(procedure)}`
    : `${API_BASE_URL}/api/v1/runs`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      dataset_id: datasetId,
      focus 
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create run');
  }

  const data = await response.json();
  console.log('🔍 Full backend response:', data);  // ADD THIS
  console.log('🔍 run_id value:', data.run_id);    // ADD THIS
  return data.run_id;
}

export async function getRunResults(runId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/runs/${runId}/results`);
  // NOT: /api/v1/runs/${runId}/campaigns
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch results');
  }

  return response.json();
}

export async function getProcedures(datasetId: string): Promise<{ procedures: any[] }> {
  const response = await fetch(`${API_BASE_URL}/procedures?dataset_id=${datasetId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch procedures');
  }

  return response.json();
}