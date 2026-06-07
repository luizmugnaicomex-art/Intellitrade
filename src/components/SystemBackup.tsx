import React, { useState, useRef } from 'react';
import type { User, Backup, BackupLog, BackupData } from '../types';
import { ArchiveRestore, Trash2, History, AlertTriangle, Download, Upload } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAppData, useUI } from '../context/AppContext';

const SystemBackup: React.FC = () => {
    const { currentUser, companyLogo } = useUI();
    const { isLoadingData, ...appData } = useAppData();
    const dataToBackup: BackupData = { ...appData, companyLogo };

    const [backups, setBackups] = useLocalStorage<Backup[]>('intellitrade_backups', []);
    const [logs, setLogs] = useLocalStorage<BackupLog[]>('intellitrade_backup_logs', []);
    const [modal, setModal] = useState<null | { type: 'create' | 'restore' | 'delete', data?: any }>(null);
    const [description, setDescription] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const restoreInputRef = useRef<HTMLInputElement>(null);

    if (!currentUser) {
        return null; // or a loading/error state if currentUser is essential
    }

    const addLog = (action: BackupLog['action'], backupId: string, description: string) => {
        const newLog: BackupLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action,
            backupId,
            description,
            userId: currentUser.id,
        };
        setLogs(prev => [newLog, ...prev.slice(0, 99)]);
    };

    const handleCreateBackup = () => {
        if (!description) {
            alert('Please provide a description for the backup.');
            return;
        }

        const newBackup: Backup = {
            id: `backup-${Date.now()}`,
            timestamp: new Date().toISOString(),
            description,
            createdById: currentUser.id,
            data: dataToBackup,
        };

        setBackups(prev => [newBackup, ...prev]);
        addLog('CREATE', newBackup.id, `Created local record: ${description}`);
        
        // Trigger download
        const blob = new Blob([JSON.stringify(newBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `intellitrade_backup_${newBackup.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setModal(null);
        setDescription('');
    };

    const handleRestoreFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error('File could not be read as text.');
                
                const backupData = JSON.parse(text) as Backup;

                if (!backupData.id || !backupData.timestamp || !backupData.data) {
                    throw new Error('Invalid backup file format.');
                }
                
                if (window.confirm(`Are you sure you want to restore from file "${file.name}"? This will overwrite all current data and reload the application.`)) {
                     // Directly write to localStorage for each key used in App.tsx
                    Object.keys(backupData.data).forEach(key => {
                        const value = (backupData.data as any)[key];
                        window.localStorage.setItem(key, JSON.stringify(value));
                    });

                    addLog('RESTORE', backupData.id, `Restored from file: ${file.name} (${backupData.description})`);
                    alert('System has been restored. The application will now reload.');
                    window.location.reload();
                }
            } catch (error) {
                 console.error("Error restoring backup from file:", error);
                 alert(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        if (restoreInputRef.current) {
            restoreInputRef.current.value = "";
        }
    }


    const handleDeleteBackup = (backupId: string) => {
        const backupToDelete = backups.find(b => b.id === backupId);
        if (backupToDelete) {
             addLog('DELETE', backupId, `Deleted local record: ${backupToDelete.description}`);
             setBackups(prev => prev.filter(b => b.id !== backupId));
             setModal(null);
             setConfirmText('');
        }
    };

    const renderModal = () => {
        if (!modal) return null;

        const closeModal = () => {
            setModal(null);
            setConfirmText('');
            setDescription('');
        };
        
        if (modal.type === 'create') {
            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-white dark:bg-brand-secondary rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-brand-primary dark:text-white">Create & Download Backup</h3>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Backup Description</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-200"
                                placeholder="e.g., Pre-deployment state, End of Q3"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">This will create a local record and download a JSON file of the current application state.</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3">
                            <button onClick={closeModal} type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent">Cancel</button>
                            <button onClick={handleCreateBackup} type="button" className="px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center gap-2 hover:bg-brand-accent">
                                <Download size={16} /> Create & Download
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (modal.type === 'delete') {
            const backup = modal.data as Backup;

            return (
                 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-white dark:bg-brand-secondary rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                         <div className="p-6 border-b border-amber-500">
                            <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">Confirm Deletion</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                You are about to delete the local record of the backup created on <span className="font-semibold">{new Date(backup.timestamp).toLocaleString()}</span> with description:
                            </p>
                            <p className="mt-2 p-3 bg-gray-100 dark:bg-brand-primary rounded-md text-center font-medium italic">"{backup.description}"</p>
                            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
                                <p className="font-bold flex items-center gap-2"><AlertTriangle size={20}/> This action is irreversible.</p>
                                <p className="mt-1 text-sm">This will only remove the record from this list. It will not delete any downloaded JSON files.</p>
                            </div>
                            <p className="mt-4 font-semibold">To confirm, please type "DELETE" in the box below.</p>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                className="block w-full mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-brand-primary"
                            />
                        </div>
                         <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3">
                            <button onClick={closeModal} type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent">Cancel</button>
                            <button
                                onClick={() => handleDeleteBackup(backup.id)}
                                disabled={confirmText !== 'DELETE'}
                                className="px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-800"
                            >
                                <Trash2 size={18}/> I understand, Delete Record
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    }


    return (
        <div className="space-y-8">
            <input type="file" ref={restoreInputRef} onChange={handleRestoreFromFile} className="hidden" accept="application/json" />
            {renderModal()}
            <div className="bg-white dark:bg-brand-secondary p-6 rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-brand-primary dark:text-white">System Backup & Restore</h2>
                    <div className="flex items-center gap-2">
                         <button onClick={() => restoreInputRef.current?.click()} className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-sky-700">
                            <Upload size={18} /> Restore from File
                        </button>
                        <button onClick={() => setModal({ type: 'create' })} className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-accent">
                            <Download size={18} /> Create New Backup
                        </button>
                    </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Create downloadable backup files of the entire system's data. You can restore the system to a previous state by uploading one of these files.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {backups.map(backup => (
                        <div key={backup.id} className="border dark:border-brand-accent rounded-lg p-4 flex flex-col justify-between bg-gray-50 dark:bg-brand-primary">
                            <div>
                                <p className="font-semibold text-brand-primary dark:text-white">{backup.description}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Created: {new Date(backup.timestamp).toLocaleString()}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">By: {dataToBackup.users.find(u => u.id === backup.createdById)?.name || 'Unknown'}</p>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => setModal({type: 'delete', data: backup})} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg font-semibold text-sm hover:bg-red-700">
                                    <Trash2 size={16}/> Delete Record
                                </button>
                            </div>
                        </div>
                    ))}
                    {backups.length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400 md:col-span-3 text-center p-8">No local backup records found. Create a backup to get started.</p>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-brand-secondary p-6 rounded-xl shadow-md">
                 <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2"><History/> Activity Log</h2>
                 <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-brand-accent/20 sticky top-0">
                            <tr>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Action</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">User</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {logs.map(log => {
                                const user = dataToBackup.users.find(u => u.id === log.userId);
                                return (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-brand-primary">
                                    <td className="p-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="p-2">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                            log.action === 'CREATE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' : 
                                            log.action === 'RESTORE' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                        }`}>{log.action}</span>
                                    </td>
                                    <td className="p-2 text-gray-800 dark:text-gray-300">{user?.name || 'Unknown'}</td>
                                    <td className="p-2 text-gray-800 dark:text-gray-300">{log.description}</td>
                                </tr>
                            )})}
                              {logs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center p-8 text-gray-500 dark:text-gray-400">No backup activities recorded.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

export default SystemBackup;