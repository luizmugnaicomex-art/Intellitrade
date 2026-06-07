import React, { useState } from 'react';
import type { NCMEntry, NCMTaxRates } from '../types';
import { PlusCircle, Edit, Save, X, Trash2, BookCopy } from 'lucide-react';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const emptyNCM: Omit<NCMEntry, 'id'> = { 
    code: '', 
    description: '', 
    taxes: { ii: 0, ipi: 0, pis: 0, cofins: 0, icms: 0 } 
};

const NCMManagement: React.FC = () => {
    const { ncms } = useAppData();
    const { addNcm: onAddNcm, updateNcm: onUpdateNcm, deleteNcm: onDeleteNcm } = useAppActions();
    const { currentUser } = useUI();

    const [editingNcm, setEditingNcm] = useState<Partial<NCMEntry> | null>(null);

    const canEdit = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Logistics');

    const handleOpenForm = (ncm?: NCMEntry) => {
        setEditingNcm(ncm ? { ...ncm, taxes: {...ncm.taxes} } : { ...emptyNCM, taxes: {...emptyNCM.taxes} });
    };

    const handleCloseForm = () => {
        setEditingNcm(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!editingNcm) return;
        const { name, value } = e.target;
        setEditingNcm(prev => ({ ...prev, [name]: value }));
    };
    
    const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingNcm) return;
        const { name, value } = e.target;
        setEditingNcm(prev => ({
            ...prev,
            taxes: { ...prev!.taxes, [name]: parseFloat(value) || 0 } as NCMTaxRates
        }));
    };

    const handleSave = () => {
        if (!editingNcm || !editingNcm.code || !editingNcm.description) {
            alert('Please fill all required fields: NCM Code and Description.');
            return;
        }

        const { id, ...newNcmData } = editingNcm;

        if (id) {
            onUpdateNcm({id, ...newNcmData} as NCMEntry);
        } else {
            onAddNcm(newNcmData as Omit<NCMEntry, 'id'>);
        }
        handleCloseForm();
    };
    
    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this NCM code?")) {
            onDeleteNcm(id);
        }
    }

    const FormModal: React.FC = () => {
        if (!editingNcm) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={handleCloseForm}>
                <div className="bg-white dark:bg-brand-secondary rounded-lg shadow-xl w-full max-w-4xl transform transition-all" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-brand-primary dark:text-white">{editingNcm.id ? 'Edit NCM' : 'Add New NCM'}</h3>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NCM Code</label>
                                <input type="text" name="code" value={editingNcm.code || ''} onChange={handleChange} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md shadow-sm focus:outline-none focus:ring-brand-accent sm:text-sm text-gray-900 dark:text-gray-200" required placeholder="e.g. 8542.31.90"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea name="description" value={editingNcm.description || ''} onChange={handleChange} rows={3} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md shadow-sm focus:outline-none focus:ring-brand-accent sm:text-sm text-gray-900 dark:text-gray-200" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Associated Tax Rates (%)</label>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2 p-4 border dark:border-brand-accent rounded-lg">
                                {Object.keys(emptyNCM.taxes).map(taxKey => (
                                     <div key={taxKey}>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{taxKey.toUpperCase()}</label>
                                        <input type="number" step="0.01" name={taxKey} value={editingNcm.taxes?.[taxKey as keyof NCMTaxRates] || 0} onChange={handleTaxChange} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md shadow-sm focus:outline-none focus:ring-brand-accent sm:text-sm text-gray-900 dark:text-gray-200" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3">
                        <button onClick={handleCloseForm} type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent">Cancel</button>
                        <button onClick={handleSave} type="button" className="px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center gap-2 hover:bg-brand-accent">
                            <Save size={16} /> Save NCM
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <FormModal />
            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2"><BookCopy/> NCM Management</h2>
                    {canEdit && (
                        <button 
                            onClick={() => handleOpenForm()}
                            className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-accent disabled:opacity-50 self-start sm:self-center"
                        >
                            <PlusCircle size={20} /> Add New NCM
                        </button>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Central database for NCM codes and their associated tax rates.</p>

                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400">NCM Code</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400 w-1/3">Description</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400 text-center">II (%)</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400 text-center">IPI (%)</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400 text-center">PIS (%)</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400 text-center">COFINS (%)</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400 text-center">ICMS (%)</th>
                                {canEdit && <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {ncms.map(ncm => (
                                <tr key={ncm.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-brand-primary">
                                    <td className="p-3 font-mono font-medium text-brand-secondary dark:text-gray-200">{ncm.code}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300 text-xs">{ncm.description}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300 text-center">{ncm.taxes.ii}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300 text-center">{ncm.taxes.ipi}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300 text-center">{ncm.taxes.pis}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300 text-center">{ncm.taxes.cofins}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300 text-center">{ncm.taxes.icms}</td>
                                    {canEdit && (
                                        <td className="p-3 text-center flex items-center justify-center gap-2">
                                            <button onClick={() => handleOpenForm(ncm)} className="p-2 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-brand-accent rounded-md">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(ncm.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default NCMManagement;