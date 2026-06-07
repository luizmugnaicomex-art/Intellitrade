// src/components/PDCA.tsx

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { RefreshCw, PlusCircle, Edit, Trash2, Eye, Search, X, CheckCircle, AlertCircle, CalendarIcon, User as UserIcon, FileText, Container, DollarSign, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import type { PDCAItem, ImportProcess, User } from '../types'; // Import necessary types
import { useTranslation } from '../translations'; // Assuming useTranslation is exported from App.tsx
import { Link } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const PDCA: React.FC = () => {
    const { pdcaItems, imports, users } = useAppData();
    const { addPdcaItem: onAddPdcaItem, updatePdcaItem: onUpdatePdcaItem, deletePdcaItem: onDeletePdcaItem } = useAppActions();
    const { showNotification } = useUI();
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PDCAItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'All' | 'Plan' | 'Do' | 'Check' | 'Act'>('All');

    // Form state for new/editing PDCA item
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState<'Plan' | 'Do' | 'Check' | 'Act'>('Plan');
    const [plan, setPlan] = useState('');
    const [doPhase, setDoPhase] = useState('');
    const [check, setCheck] = useState('');
    const [act, setAct] = useState('');
    const [ownerId, setOwnerId] = useState<string>('');
    const [relatedImportId, setRelatedImportId] = useState<string>('');
    const [formError, setFormError] = useState('');

    // Memoized list of imports for dropdown
    const importOptions = useMemo(() => {
        return imports.map(imp => ({
            value: imp.id,
            label: `${imp.importNumber} (BL: ${imp.blNumber})`
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, [imports]);

    // Memoized list of users for owner dropdown
    const userOptions = useMemo(() => {
        return users.map(user => ({
            value: user.id,
            label: user.name
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, [users]);

    // Filtered and sorted PDCA items for display
    const filteredPdcaItems = useMemo(() => {
        let filtered = pdcaItems;

        if (filterStatus !== 'All') {
            filtered = filtered.filter(item => item.status === filterStatus);
        }

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(lowerCaseSearchTerm) ||
                item.plan.toLowerCase().includes(lowerCaseSearchTerm) ||
                item.do.toLowerCase().includes(lowerCaseSearchTerm) ||
                item.check.toLowerCase().includes(lowerCaseSearchTerm) ||
                item.act.toLowerCase().includes(lowerCaseSearchTerm) ||
                (item.relatedImportNumber && item.relatedImportNumber.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (item.relatedImportBL && item.relatedImportBL.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (users.find(u => u.id === item.ownerId)?.name.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        // Sort by creation date, newest first
        return filtered.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    }, [pdcaItems, filterStatus, searchTerm, users]);

    // Reset form fields
    const resetForm = useCallback(() => {
        setTitle('');
        setStatus('Plan');
        setPlan('');
        setDoPhase('');
        setCheck('');
        setAct('');
        setOwnerId('');
        setRelatedImportId('');
        setFormError('');
    }, []);

    // Load item data into form when editing
    useEffect(() => {
        if (editingItem) {
            setTitle(editingItem.title);
            setStatus(editingItem.status);
            setPlan(editingItem.plan);
            setDoPhase(editingItem.do);
            setCheck(editingItem.check);
            setAct(editingItem.act);
            setOwnerId(editingItem.ownerId || '');
            setRelatedImportId(editingItem.relatedImportId || '');
        } else {
            resetForm();
        }
    }, [editingItem, resetForm]);

    const handleOpenModal = (item: PDCAItem | null = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        resetForm();
    };

    const handleSubmit = async () => {
        if (!title || !plan || !ownerId) { // Basic validation
            setFormError('Title, Plan, and Owner are required.');
            return;
        }

        const owner = users.find(u => u.id === ownerId);
        const relatedImport = imports.find(imp => imp.id === relatedImportId);

        const newOrUpdatedItem: Omit<PDCAItem, 'id'> = {
            title,
            status,
            plan,
            do: doPhase,
            check,
            act,
            ownerId,
            createdDate: editingItem ? editingItem.createdDate : new Date().toISOString(),
            relatedImportId: relatedImport?.id,
            relatedImportBL: relatedImport?.blNumber,
            relatedImportNumber: relatedImport?.importNumber,
        };

        try {
            if (editingItem) {
                await onUpdatePdcaItem({ ...newOrUpdatedItem, id: editingItem.id } as PDCAItem);
                showNotification('PDCA item updated successfully!');
            } else {
                await onAddPdcaItem(newOrUpdatedItem);
                showNotification('PDCA item added successfully!');
            }
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save PDCA item:", error);
            showNotification(`Failed to save PDCA item: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this PDCA item?')) { // Replace with custom modal later
            try {
                await onDeletePdcaItem(id);
                showNotification('PDCA item deleted successfully!', 'error');
            } catch (error) {
                console.error("Failed to delete PDCA item:", error);
                showNotification(`Failed to delete PDCA item: ${error instanceof Error ? error.message : String(error)}`, 'error');
            }
        }
    };

    const getStatusStyle = (itemStatus: 'Plan' | 'Do' | 'Check' | 'Act') => {
        switch (itemStatus) {
            case 'Plan': return 'bg-blue-100 text-blue-800 dark:bg-blue-800/50 dark:text-blue-300';
            case 'Do': return 'bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-300';
            case 'Check': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-300';
            case 'Act': return 'bg-purple-100 text-purple-800 dark:bg-purple-800/50 dark:text-purple-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
        }
    };

    const PDCAFormModal: React.FC = () => (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in-down" onClick={handleCloseModal}>
            <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-2xl transform transition-all animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-bold text-brand-primary dark:text-white">{editingItem ? 'Edit PDCA Item' : 'New PDCA Item'}</h3>
                    <button onClick={handleCloseModal} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[80vh]"> {/* Added max-h and overflow for scrollable content */}
                    {formError && <div className="bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 flex items-center gap-2"><AlertCircle size={18} /> {formError}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="pdca-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title <span className="text-red-500">*</span></label>
                            <input
                                id="pdca-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            />
                        </div>
                        <div>
                            <label htmlFor="pdca-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                            <select
                                id="pdca-status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as 'Plan' | 'Do' | 'Check' | 'Act')}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            >
                                <option value="Plan">Plan</option>
                                <option value="Do">Do</option>
                                <option value="Check">Check</option>
                                <option value="Act">Act</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="pdca-owner" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner <span className="text-red-500">*</span></label>
                        <select
                            id="pdca-owner"
                            value={ownerId}
                            onChange={(e) => setOwnerId(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                        >
                            <option value="">Select Owner</option>
                            {userOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="pdca-related-import" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Related Import (Optional)</label>
                        <select
                            id="pdca-related-import"
                            value={relatedImportId}
                            onChange={(e) => setRelatedImportId(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                        >
                            <option value="">No Related Import</option>
                            {importOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="pdca-plan" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan <span className="text-red-500">*</span></label>
                            <textarea
                                id="pdca-plan"
                                value={plan}
                                onChange={(e) => setPlan(e.target.value)}
                                rows={3}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="pdca-do" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Do</label>
                            <textarea
                                id="pdca-do"
                                value={doPhase}
                                onChange={(e) => setDoPhase(e.target.value)}
                                rows={3}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="pdca-check" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Check</label>
                            <textarea
                                id="pdca-check"
                                value={check}
                                onChange={(e) => setCheck(e.target.value)}
                                rows={3}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="pdca-act" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Act</label>
                            <textarea
                                id="pdca-act"
                                value={act}
                                onChange={(e) => setAct(e.target.value)}
                                rows={3}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            ></textarea>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3 rounded-b-xl">
                    <button onClick={handleCloseModal} type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent transition-colors duration-200">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} type="button" className="px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center gap-2 hover:bg-brand-accent transition-colors duration-200">
                        {editingItem ? 'Save Changes' : 'Add PDCA Item'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                <RefreshCw /> PDCA Cycle Management
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This module facilitates the Plan-Do-Check-Act continuous improvement cycle for operational processes. Relate ideas from shipment to container return, linked to existing import processes or added manually.
            </p>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <div className="relative w-full sm:w-1/3">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search PDCA items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-brand-accent rounded-lg bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                </div>
                <div className="w-full sm:w-1/4">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'All' | 'Plan' | 'Do' | 'Check' | 'Act')}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-brand-accent rounded-lg bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Plan">Plan</option>
                        <option value="Do">Do</option>
                        <option value="Check">Check</option>
                        <option value="Act">Act</option>
                    </select>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center justify-center gap-2 hover:bg-brand-accent transition-colors duration-200 shadow-md"
                >
                    <PlusCircle size={20} /> Add New PDCA
                </button>
            </div>

            <div className="overflow-x-auto">
                {filteredPdcaItems.length > 0 ? (
                    <table className="min-w-full bg-white dark:bg-brand-secondary rounded-lg shadow-sm">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Title</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Status</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Owner</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Related Import</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Created Date</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredPdcaItems.map((item) => {
                                const owner = users.find(u => u.id === item.ownerId);
                                const relatedImport = imports.find(imp => imp.id === item.relatedImportId);
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-brand-primary transition-colors duration-200">
                                        <td className="p-3 text-gray-800 dark:text-gray-200 font-medium">{item.title}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusStyle(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{owner?.name || 'N/A'}</td>
                                        <td className="p-3">
                                            {relatedImport ? (
                                                <Link to={`/imports/${relatedImport.id}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                                                    {relatedImport.importNumber} (BL: {relatedImport.blNumber})
                                                </Link>
                                            ) : (
                                                <span className="text-gray-500 dark:text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{format(new Date(item.createdDate), 'PPP')}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center items-center space-x-2">
                                                <button onClick={() => handleOpenModal(item)} className="p-2 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-200" title="Edit">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors duration-200" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                                {/* Optional: View details button in a separate modal/page */}
                                                {/* <button onClick={() => alert('View details for: ' + item.title)} className="p-2 rounded-full text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors duration-200" title="View Details">
                                                    <Eye size={18} />
                                                </button> */}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center p-8 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                        <CheckCircle size={48} className="mb-4 text-green-500" />
                        <h3 className="text-lg font-semibold">No PDCA items found.</h3>
                        <p className="text-sm mt-2">Start by adding a new continuous improvement cycle!</p>
                    </div>
                )}
            </div>

            {isModalOpen && <PDCAFormModal />}
        </div>
    );
};

export default PDCA;