// src/components/DeclarationDIStatusManagement.tsx

import React, { useState, useMemo } from 'react';
import type { ImportProcess, DIChannel } from '../types';
import { Link } from 'react-router-dom';
import { FileBadge, Search, Filter, X } from 'lucide-react';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const DI_CHANNELS: DIChannel[] = ['Green', 'Yellow', 'Red', 'Gray'];

const getDiChannelChip = (channel?: string) => {
    const baseClasses = "p-1.5 border rounded-md text-xs w-full appearance-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed";
    switch(channel) {
        case 'Green': return `${baseClasses} bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800/50`;
        case 'Yellow': return `${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800/50`;
        case 'Red': return `${baseClasses} bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800/50`;
        case 'Gray': return `${baseClasses} bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600/50`;
        default: return `${baseClasses} bg-white dark:bg-brand-primary border-gray-300 dark:border-brand-accent`;
    }
};

const DeclarationDIStatusManagement: React.FC = () => {
    const { imports } = useAppData();
    const { updateImport } = useAppActions();
    const { currentUser } = useUI();

    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const canEdit = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Logistics');

    const filteredImports = useMemo(() => {
        return imports.filter(imp => {
            const searchMatch = 
                imp.importNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                imp.blNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (imp.diNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

            const startDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00Z') : null;
            const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59Z') : null;
            
            const registrationDate = imp.diRegistrationDate ? new Date(imp.diRegistrationDate + 'T00:00:00Z') : null;
            const dateMatch = !registrationDate || (!startDate || registrationDate >= startDate) && (!endDate || registrationDate <= endDate);
            
            return searchMatch && dateMatch;
        });
    }, [imports, searchTerm, dateRange]);

    const handleUpdate = (importId: string, field: keyof ImportProcess, value: any) => {
        if (!canEdit) return;
        const targetImport = imports.find(imp => imp.id === importId);
        if (targetImport) {
            updateImport({ ...targetImport, [field]: value });
        }
    };

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2">
                        <FileBadge /> Declaration DI Status Management
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor and update the status of Import Declarations.</p>
                </div>
                 <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                    <input
                        type="text"
                        placeholder="Search by Import#, BL#, DI#..."
                        className="w-full md:w-72 pl-10 pr-4 py-2 border dark:border-brand-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent bg-transparent text-gray-900 dark:text-gray-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 dark:bg-brand-primary/50 rounded-lg flex items-center gap-2 w-full sm:w-auto">
                <Filter size={16} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Registration between:</span>
                 <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="p-1 border dark:border-brand-accent rounded-md text-sm bg-transparent dark:text-gray-200" />
                 <span>and</span>
                 <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="p-1 border dark:border-brand-accent rounded-md text-sm bg-transparent dark:text-gray-200" />
                 <button onClick={() => setDateRange({start: '', end: ''})} className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" title="Clear dates">
                    <X size={16} />
                </button>
             </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Import #</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">DI #</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">DI Registration Date</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Customs Channel</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">DI Status Text</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredImports.map(imp => (
                            <tr key={imp.id} className="hover:bg-gray-50 dark:hover:bg-brand-primary">
                                <td className="p-3 font-medium">
                                    <Link to={`/imports/${imp.id}`} className="hover:underline text-sky-600 dark:text-sky-400">{imp.importNumber}</Link>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">BL: {imp.blNumber}</p>
                                </td>
                                <td className="p-3">
                                    <input
                                        type="text"
                                        name="diNumber"
                                        value={imp.diNumber || ''}
                                        onChange={(e) => handleUpdate(imp.id, 'diNumber', e.target.value)}
                                        disabled={!canEdit}
                                        className="w-full p-1 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-xs disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                    />
                                </td>
                                <td className="p-3">
                                    <input
                                        type="date"
                                        name="diRegistrationDate"
                                        value={(imp.diRegistrationDate || '').split('T')[0]}
                                        onChange={(e) => handleUpdate(imp.id, 'diRegistrationDate', e.target.value)}
                                        disabled={!canEdit}
                                        className="w-full p-1 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-xs disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                    />
                                </td>
                                <td className="p-3">
                                    <select
                                        name="diChannel"
                                        value={imp.diChannel || ''}
                                        onChange={(e) => handleUpdate(imp.id, 'diChannel', e.target.value)}
                                        disabled={!canEdit}
                                        className={getDiChannelChip(imp.diChannel)}
                                    >
                                        <option value="" className="bg-white dark:bg-brand-primary">-- Select --</option>
                                        {DI_CHANNELS.map(c => <option key={c} value={c} className="bg-white dark:bg-brand-primary">{c}</option>)}
                                    </select>
                                </td>
                                 <td className="p-3">
                                     <input
                                        type="text"
                                        name="diStatusText"
                                        value={imp.diStatusText || ''}
                                        onChange={(e) => handleUpdate(imp.id, 'diStatusText', e.target.value)}
                                        disabled={!canEdit}
                                        className="w-full p-1 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-xs disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DeclarationDIStatusManagement;
