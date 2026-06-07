// src/components/import-detail/DocumentSection.tsx

import React from 'react';
import { FileText, Download } from 'lucide-react';
import type { Document } from '../../types';

interface DocumentSectionProps {
    documents: Document[];
}

const DocumentSection: React.FC<DocumentSectionProps> = ({ documents }) => (
    <div className="lg:col-span-2">
        <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-3 flex items-center gap-2"><FileText size={20} /> Documents</h3>
        {documents && documents.length > 0 ? (
            <div className="space-y-2">
                {documents.map(doc => (
                    <div key={doc.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-brand-primary/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <FileText className="text-brand-accent" />
                            <div>
                                <p className="font-medium text-brand-secondary dark:text-gray-200">{doc.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Type: {doc.type}</p>
                            </div>
                        </div>
                        <a href={doc.fileUrl} download={doc.name} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-brand-accent">
                            <Download size={18} />
                        </a>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400 border border-dashed dark:border-gray-600 rounded-lg">
                No documents have been uploaded for this import.
            </div>
        )}
    </div>
);

export default DocumentSection;
