// components/VesselSchedule.tsx
import React, { useState, useRef, useMemo, useCallback } from 'react';
import type { VesselScheduleEntry } from '../types';
import { Anchor, UploadCloud, AlertCircle, Loader2, Search, Calendar, X, CheckCircle } from 'lucide-react';
import { processVesselScheduleFile } from '../services/vesselScheduleService';
import { readFileAsText, extractDataFromExcel } from '../utils/fileReaders';
import { format } from 'date-fns';
import { useUI, useAppData, useAppActions } from '../context/AppContext';

const VesselSchedule: React.FC = () => {
    const { theme, globalDate, showNotification } = useUI();
    const { vesselSchedule } = useAppData();
    const { updateVesselSchedule: onUpdateVesselSchedule } = useAppActions();

    const [previewSchedule, setPreviewSchedule] = useState<VesselScheduleEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        try {
            let fileContent: string;
            if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
                fileContent = await readFileAsText(file);
            } else if (file.name.endsWith('.xlsx')) {
                fileContent = await extractDataFromExcel(file);
            } else {
                throw new Error("Unsupported file type. Please upload a CSV or XLSX file.");
            }

            const entries = await processVesselScheduleFile(fileContent);
            setPreviewSchedule(entries);
            showNotification(`Successfully parsed ${entries.length} entries. Please confirm to save.`, 'success');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during file processing.';
            setError(errorMessage);
            showNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [showNotification]);

    const handleConfirmSchedule = useCallback(async () => {
        if (previewSchedule.length === 0) {
            showNotification('No new schedule to confirm.', 'error');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await onUpdateVesselSchedule(previewSchedule);
            setPreviewSchedule([]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while saving.';
            setError(errorMessage);
            showNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [previewSchedule, onUpdateVesselSchedule, showNotification]);
    
    const displaySchedule = useMemo(() => {
        const source = previewSchedule.length > 0 ? previewSchedule : vesselSchedule;
        return source.filter(entry => {
            const lowerSearch = searchTerm.toLowerCase();
            const searchMatch = (
                entry.vesselName.toLowerCase().includes(lowerSearch) ||
                entry.voyage.toLowerCase().includes(lowerSearch) ||
                entry.agency.toLowerCase().includes(lowerSearch) ||
                entry.berth.toLowerCase().includes(lowerSearch)
            );
            
            const dateMatch = !dateFilter || (entry.eta && entry.eta.startsWith(dateFilter));
            
            return searchMatch && dateMatch;
        });
    }, [vesselSchedule, previewSchedule, searchTerm, dateFilter]);
    
    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2">
                    <Anchor /> Vessel Schedule
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-accent disabled:opacity-50"
                    >
                        <UploadCloud size={18} /> Upload Schedule
                    </button>
                    {previewSchedule.length > 0 && (
                        <button
                            onClick={handleConfirmSchedule}
                            disabled={isLoading}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <CheckCircle size={18} /> Confirm Update
                        </button>
                    )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv, .xlsx, .txt" />
            </div>
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm mb-4">{error}</div>}
            
            <div className="mb-4 p-3 bg-gray-50 dark:bg-brand-primary/50 rounded-lg flex flex-wrap items-center gap-4">
                <div className="relative flex-grow">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search vessel, voyage, agency..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border dark:border-brand-accent rounded-lg bg-transparent dark:text-gray-200"
                    />
                </div>
                 <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500 dark:text-gray-400" />
                    <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="p-1 border dark:border-brand-accent rounded-md text-sm bg-transparent dark:text-gray-200" />
                    <button onClick={() => setDateFilter('')} className="p-1 text-gray-500 hover:text-red-500" title="Clear date"><X size={16}/></button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-brand-accent" />
                </div>
            ) : displaySchedule.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                         <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Vessel / Voyage</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Agency</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">ETA</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">ETB</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">ETS</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Berth</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {displaySchedule.map((entry, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-brand-primary">
                                    <td className="p-3 font-medium text-brand-secondary dark:text-gray-200">{entry.vesselName} <span className="text-gray-500">/ {entry.voyage}</span></td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{entry.agency}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{entry.eta ? format(new Date(entry.eta), 'dd/MM/yy HH:mm') : 'N/A'}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{entry.etb ? format(new Date(entry.etb), 'dd/MM/yy HH:mm') : 'N/A'}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{entry.ets ? format(new Date(entry.ets), 'dd/MM/yy HH:mm') : 'N/A'}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{entry.berth}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${entry.status === 'Berthed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-800/50 dark:text-sky-300'}`}>{entry.status}</span>
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center p-12 border-2 border-dashed dark:border-gray-600 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Upload a vessel schedule file to see the data here.</p>
                </div>
            )}
        </div>
    );
};

export default VesselSchedule;