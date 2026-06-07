// src/components/import-detail/GeneralDetails.tsx

import React from 'react';
import { Info } from 'lucide-react';
import type { ImportProcess, User } from '../../types';

interface GeneralDetailsProps {
    importProcess: ImportProcess;
    createdByUser?: User;
}

const GeneralDetails: React.FC<GeneralDetailsProps> = ({ importProcess, createdByUser }) => (
    <div className="bg-gray-50 dark:bg-brand-primary/50 p-4 rounded-lg shadow-inner space-y-2">
        <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-2 flex items-center gap-2"><Info size={20} /> General Details</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">PO Numbers:</span> {importProcess.poNumbers || 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Supplier:</span> {importProcess.supplier}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Responsible Broker:</span> {importProcess.responsibleBroker}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Incoterm:</span> {importProcess.incoterm}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Type of Cargo:</span> {importProcess.typeOfCargo || 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Created By:</span> {createdByUser?.name || 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Overall Status:</span> {importProcess.overallStatus}</p>
    </div>
);

export default GeneralDetails;
