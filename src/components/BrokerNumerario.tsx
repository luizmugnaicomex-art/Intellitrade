// src/components/BrokerNumerario.tsx

import React, { useState, useMemo, useCallback } from 'react';
import { Receipt, Search, Edit, Save, AlertCircle, CheckCircle, DollarSign, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import type { ImportProcess, NumerarioApprovalStatus } from '../types';
import { useTranslation } from '../translations';
import { Link } from 'react-router-dom';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const BrokerNumerario: React.FC = () => {
    const { t } = useTranslation();
    const { imports } = useAppData();
    const { updateImport } = useAppActions();
    const { showNotification } = useUI();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'All' | NumerarioApprovalStatus>('All');
    const [editingImportId, setEditingImportId] = useState<string | null>(null);

    // Form states for editing
    const [estimatedValue, setEstimatedValue] = useState<number | ''>('');
    const [informedValue, setInformedValue] = useState<number | ''>('');
    const [approvalStatus, setApprovalStatus] = useState<NumerarioApprovalStatus>('Pending Approval');
    const [transferConfirmedDate, setTransferConfirmedDate] = useState('');
    const [reconciliationDate, setReconciliationDate] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const filteredImports = useMemo(() => {
        let filtered = imports.filter(imp => imp.brokerNumerario); // Only show imports with broker numerario data

        if (filterStatus !== 'All') {
            filtered = filtered.filter(imp => imp.brokerNumerario?.approvalStatus === filterStatus);
        }

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(imp =>
                imp.importNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
                imp.blNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
                imp.supplier.toLowerCase().includes(lowerCaseSearchTerm) ||
                imp.responsibleBroker?.toLowerCase().includes(lowerCaseSearchTerm) ||
                imp.brokerNumerario?.approvalStatus.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }

        // Sort by approval status (Pending first) then by import number
        return filtered.sort((a, b) => {
            if (a.brokerNumerario?.approvalStatus === 'Pending Approval' && b.brokerNumerario?.approvalStatus !== 'Pending Approval') return -1;
            if (a.brokerNumerario?.approvalStatus !== 'Pending Approval' && b.brokerNumerario?.approvalStatus === 'Pending Approval') return 1;
            return a.importNumber.localeCompare(b.importNumber);
        });
    }, [imports, filterStatus, searchTerm]);

    const handleEditClick = useCallback((imp: ImportProcess) => {
        setEditingImportId(imp.id);
        const bn = imp.brokerNumerario;
        if (bn) {
            setEstimatedValue(bn.estimatedValue);
            setInformedValue(bn.informedValue || '');
            setApprovalStatus(bn.approvalStatus);
            setTransferConfirmedDate(bn.transferConfirmedDate || '');
            setReconciliationDate(bn.reconciliationDate || '');
            setIsPaid(bn.isPaid || false);
        }
        setFormError(null);
    }, []);

    const handleSaveNumerario = useCallback(async () => {
        if (!editingImportId) return;

        const currentImport = imports.find(imp => imp.id === editingImportId);
        if (!currentImport) return;

        if (estimatedValue === '' || Number(estimatedValue) <= 0) {
            setFormError('Estimated Value is required and must be greater than zero.');
            return;
        }
        if (informedValue !== '' && isNaN(Number(informedValue))) {
            setFormError('Informed Value must be a valid number.');
            return;
        }
        setFormError(null);

        const updatedNumerario = {
            estimatedValue: Number(estimatedValue),
            informedValue: informedValue === '' ? undefined : Number(informedValue),
            approvalStatus,
            transferConfirmedDate: transferConfirmedDate || undefined,
            reconciliationDate: reconciliationDate || undefined,
            isPaid,
        };

        const updatedImportProcess = {
            ...currentImport,
            brokerNumerario: updatedNumerario,
        };

        try {
            await updateImport(updatedImportProcess);
            showNotification('Broker Numerário updated successfully!', 'success');
            setEditingImportId(null); // Exit edit mode
        } catch (error) {
            console.error("Failed to save Broker Numerário:", error);
            showNotification(`Failed to save Broker Numerário: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
    }, [editingImportId, imports, estimatedValue, informedValue, approvalStatus, transferConfirmedDate, reconciliationDate, isPaid, updateImport, showNotification]);

    const handleCancelEdit = useCallback(() => {
        setEditingImportId(null);
        setFormError(null);
    }, []);

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                <Receipt /> Broker Numerário Management
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Manage and track advance payments made to customs brokers for import taxes and fees.
            </p>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <div className="relative w-full sm:w-1/3">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search Import #, BL #..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-brand-accent rounded-lg bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                </div>
                <div className="w-full sm:w-1/4">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'All' | NumerarioApprovalStatus)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-brand-accent rounded-lg bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
                {/* No 'Add New' button for Numerario as it's tied to existing imports */}
            </div>

            <div className="overflow-x-auto">
                {filteredImports.length > 0 ? (
                    <table className="min-w-full bg-white dark:bg-brand-secondary rounded-lg shadow-sm">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Import #</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">BL #</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Estimated Value</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Informed Value</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Status</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Transfer Date</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Reconciliation Date</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Paid</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredImports.map((imp) => (
                                <React.Fragment key={imp.id}>
                                    <tr className="hover:bg-gray-50 dark:hover:bg-brand-primary transition-colors duration-200">
                                        <td className="p-3 text-gray-800 dark:text-gray-200 font-medium">
                                            <Link to={`/imports/${imp.id}`} className="text-brand-accent hover:underline">{imp.importNumber}</Link>
                                        </td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{imp.blNumber}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">R$ {imp.brokerNumerario?.estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{imp.brokerNumerario?.informedValue ? `R$ ${imp.brokerNumerario.informedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${imp.brokerNumerario?.approvalStatus === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-300' : imp.brokerNumerario?.approvalStatus === 'Pending Approval' ? 'bg-amber-100 text-amber-800 dark:bg-amber-800/50 dark:text-amber-300' : 'bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-300'}`}>
                                                {imp.brokerNumerario?.approvalStatus || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{imp.brokerNumerario?.transferConfirmedDate ? format(new Date(imp.brokerNumerario.transferConfirmedDate), 'PPP') : 'N/A'}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{imp.brokerNumerario?.reconciliationDate ? format(new Date(imp.brokerNumerario.reconciliationDate), 'PPP') : 'N/A'}</td>
                                        <td className="p-3 text-center">
                                            {imp.brokerNumerario?.isPaid ? <CheckCircle size={20} className="text-green-500 mx-auto" /> : <X size={20} className="text-red-500 mx-auto" />}
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center items-center space-x-2">
                                                <button onClick={() => handleEditClick(imp)} className="p-2 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-200" title="Edit">
                                                    <Edit size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {editingImportId === imp.id && (
                                        <tr>
                                            <td colSpan={9} className="p-4 bg-gray-50 dark:bg-brand-primary/50 border-t dark:border-gray-700">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    <div>
                                                        <label htmlFor="edit-estimated-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Value (R$)</label>
                                                        <input type="number" step="0.01" id="edit-estimated-value" value={estimatedValue} onChange={e => setEstimatedValue(parseFloat(e.target.value) || '')} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="edit-informed-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Informed Value (R$)</label>
                                                        <input type="number" step="0.01" id="edit-informed-value" value={informedValue} onChange={e => setInformedValue(parseFloat(e.target.value) || '')} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="edit-approval-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Approval Status</label>
                                                        <select id="edit-approval-status" value={approvalStatus} onChange={e => setApprovalStatus(e.target.value as NumerarioApprovalStatus)} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200">
                                                            <option value="Pending Approval">Pending Approval</option>
                                                            <option value="Approved">Approved</option>
                                                            <option value="Rejected">Rejected</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="edit-transfer-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transfer Confirmed Date</label>
                                                        <input type="date" id="edit-transfer-date" value={transferConfirmedDate} onChange={e => setTransferConfirmedDate(e.target.value)} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="edit-reconciliation-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reconciliation Date</label>
                                                        <input type="date" id="edit-reconciliation-date" value={reconciliationDate} onChange={e => setReconciliationDate(e.target.value)} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" />
                                                    </div>
                                                    <div className="flex items-center">
                                                        <input type="checkbox" id="edit-is-paid" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} className="h-4 w-4 text-brand-accent border-gray-300 dark:border-brand-accent rounded focus:ring-brand-accent" />
                                                        <label htmlFor="edit-is-paid" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Is Paid</label>
                                                    </div>
                                                </div>
                                                {formError && <p className="text-red-500 dark:text-red-400 text-sm mt-4">{formError}</p>}
                                                <div className="flex justify-end gap-3 mt-4">
                                                    <button onClick={handleCancelEdit} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent">Cancel</button>
                                                    <button onClick={handleSaveNumerario} className="px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-brand-accent">Save</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center p-8 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                        <FileText size={48} className="mb-4 text-gray-400 dark:text-gray-500" />
                        <h3 className="text-lg font-semibold">No Broker Numerário entries found.</h3>
                        <p className="text-sm mt-2">Imports with broker numerário data will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BrokerNumerario;
