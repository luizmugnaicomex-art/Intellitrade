// src/components/import-detail/VesselDetails.tsx

import React from 'react';
import { Ship } from 'lucide-react';
import type { ImportProcess } from '../../types';

interface VesselDetailsProps {
    importProcess: ImportProcess;
    overallCBM?: number;
}

const VesselDetails: React.FC<VesselDetailsProps> = ({ importProcess, overallCBM }) => (
    <div className="bg-gray-50 dark:bg-brand-primary/50 p-4 rounded-lg shadow-inner space-y-2">
        <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-2 flex items-center gap-2"><Ship size={20} /> BL & Vessel Details</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">BL Number:</span> {importProcess.blNumber || 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Vessel Name:</span> {importProcess.vesselName || 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Voyage Number:</span> {importProcess.voyageNumber || 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Port of Loading:</span> {importProcess.portOfLoading || 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Port of Discharge:</span> {importProcess.portOfDischarge || 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Total CBM:</span> {overallCBM?.toFixed(2) || 'N/A'} m³</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Shipowner:</span> {importProcess.shipowner || 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Freight Forwarder:</span> {importProcess.freightForwarder || 'N/A'}</p>
    </div>
);

export default VesselDetails;
