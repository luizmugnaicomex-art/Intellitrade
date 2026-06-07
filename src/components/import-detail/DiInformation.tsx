// src/components/import-detail/DiInformation.tsx

import React from 'react';
import { FileBadge, Edit } from 'lucide-react';
import { format } from 'date-fns';
import type { ImportProcess } from '../../types';

interface DiInformationProps {
    importProcess: ImportProcess;
    onUpdateClick: () => void;
}

const DiInformation: React.FC<DiInformationProps> = ({ importProcess, onUpdateClick }) => (
    <div className="bg-gray-50 dark:bg-brand-primary/50 p-4 rounded-lg shadow-inner space-y-2">
        <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-2 flex items-center gap-2"><FileBadge size={20} /> DI Information</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">DI Number:</span> {importProcess.diNumber || 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Registration Date:</span> {importProcess.diRegistrationDate ? format(new Date(importProcess.diRegistrationDate), 'PPP') : 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Channel:</span> {importProcess.diChannel || 'N/A'}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Green Channel Date:</span> {importProcess.greenChannelDate ? format(new Date(importProcess.greenChannelDate), 'PPP') : 'N/A'}</p>
        <button onClick={onUpdateClick} className="text-sm text-brand-accent hover:underline flex items-center gap-1 mt-2">
            <Edit size={14} /> Update DI Info
        </button>
    </div>
);

export default DiInformation;
