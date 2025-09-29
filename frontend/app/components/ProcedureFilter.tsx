import React from 'react';
import { Procedure } from '../lib/types';

interface ProcedureFilterProps {
  selectedProcedure: string;
  availableProcedures: Procedure[];
  onProcedureChange: (procedure: string) => void;
}

export default function ProcedureFilter({ 
  selectedProcedure, 
  availableProcedures, 
  onProcedureChange 
}: ProcedureFilterProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analysis Scope</h3>
          <p className="text-sm text-gray-600 dark:text-white/70">Filter results by specific procedure type</p>
        </div>
        <select 
          value={selectedProcedure}
          onChange={(e) => onProcedureChange(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 px-4 py-2 text-gray-900 dark:text-white"
        >
          <option value="">All Procedures</option>
          {availableProcedures.map((proc) => (
            <option key={proc.name} value={proc.name}>
              {proc.name} ({proc.count} patients)
            </option>
          ))}
        </select>
      </div>
      {selectedProcedure && (
        <div className="mt-3 text-sm text-blue-700 dark:text-blue-300">
          Showing results filtered for {selectedProcedure} patients only
        </div>
      )}
    </div>
  );
}