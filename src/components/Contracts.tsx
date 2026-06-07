// src/components/Contracts.tsx

import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { ClipboardCheck, PlusCircle, Edit, Trash2, Search, X, AlertCircle, CheckCircle, CalendarIcon, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import type { Contract, ImportProcess, Supplier, Currency, ContractStatus, ContractType } from '../types'; // Import necessary types
import { useTranslation } from '../translations';
import { createRoot } from 'react-dom/client'; // Import createRoot for custom modal rendering
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const Contracts: React.FC = () => {
    const { contracts, imports, suppliers } = useAppData();
    const { addContract: onAddContract, updateContract: onUpdateContract, deleteContract: onDeleteContract } = useAppActions();
    const { showNotification } = useUI();
    
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'All' | ContractStatus>('All');
    const [filterType, setFilterType] = useState<'All' | ContractType>('All');

    // Form state for new/editing Contract item
    const [contractNumber, setContractNumber] = useState('');
    const [title, setTitle] = useState('');
    const [supplierId, setSupplierId] = useState<string>(''); // Store supplier ID
    const [type, setType] = useState<ContractType>('Service');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState<ContractStatus>('Draft');
    const [value, setValue] = useState<string>(''); // Use string to handle empty input and 0 correctly
    const [currency, setCurrency] = useState<Currency>('BRL');
    const [renewalTerms, setRenewalTerms] = useState('');
    const [relatedImportIds, setRelatedImportIds] = useState<string[]>([]); // Array for multiple related imports
    const [formError, setFormError] = useState('');

    // Memoized lists for dropdowns
    const supplierOptions = useMemo(() => {
        return suppliers.map(sup => ({
            value: sup.id,
            label: sup.name
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, [suppliers]);

    const importOptions = useMemo(() => {
        return imports.map(imp => ({
            value: imp.id,
            label: `${imp.importNumber} (BL: ${imp.blNumber})`
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, [imports]);

    // Filtered and sorted Contracts for display
    const filteredContracts = useMemo(() => {
        let filtered = contracts;

        if (filterStatus !== 'All') {
            filtered = filtered.filter(contract => contract.status === filterStatus);
        }
        if (filterType !== 'All') {
            filtered = filtered.filter(contract => contract.type === filterType);
        }

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(contract =>
                contract.contractNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
                contract.title.toLowerCase().includes(lowerCaseSearchTerm) ||
                (suppliers.find(s => s.id === contract.supplier)?.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
                contract.renewalTerms?.toLowerCase().includes(lowerCaseSearchTerm) ||
                (contract.relatedImportIds?.some(impId => imports.find(i => i.id === impId)?.importNumber.toLowerCase().includes(lowerCaseSearchTerm)))
            );
        }

        // Sort by end date, ascending (contracts expiring soonest first)
        return filtered.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    }, [contracts, filterStatus, filterType, searchTerm, suppliers, imports]);

    // Reset form fields
    const resetForm = useCallback(() => {
        setContractNumber('');
        setTitle('');
        setSupplierId('');
        setType('Service');
        setStartDate('');
        setEndDate('');
        setStatus('Draft');
        setValue('');
        setCurrency('BRL');
        setRenewalTerms('');
        setRelatedImportIds([]);
        setFormError('');
    }, []);

    // Load item data into form when editing
    useEffect(() => {
        if (editingContract) {
            setContractNumber(editingContract.contractNumber);
            setTitle(editingContract.title);
            setSupplierId(editingContract.supplier || ''); // Assuming supplier is stored as ID in Contract
            setType(editingContract.type);
            setStartDate(editingContract.startDate);
            setEndDate(editingContract.endDate);
            setStatus(editingContract.status);
            setValue(editingContract.value != null ? String(editingContract.value) : ''); // Correctly handle 0
            setCurrency(editingContract.currency || 'BRL');
            setRenewalTerms(editingContract.renewalTerms || '');
            setRelatedImportIds(editingContract.relatedImportIds || []);
        } else {
            resetForm();
        }
    }, [editingContract, resetForm]);

    const handleOpenModal = (contract: Contract | null = null) => {
        setEditingContract(contract);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingContract(null);
        resetForm();
    };

    const handleSubmit = async () => {
        if (!contractNumber || !title || !supplierId || !startDate || !endDate) {
            setFormError('Contract Number, Title, Supplier, Start Date, and End Date are required.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setFormError('End Date cannot be before Start Date.');
            return;
        }

        const selectedSupplier = suppliers.find(s => s.id === supplierId);
        if (!selectedSupplier) {
            setFormError('Selected supplier is invalid.');
            return;
        }

        const newOrUpdatedContract: Omit<Contract, 'id'> = {
            contractNumber,
            title,
            supplier: selectedSupplier.id, // Store supplier ID
            type,
            startDate,
            endDate,
            status,
            value: value === '' ? undefined : Number(value),
            currency,
            renewalTerms,
            relatedImportIds,
        };

        try {
            if (editingContract) {
                await onUpdateContract({ ...newOrUpdatedContract, id: editingContract.id } as Contract);
                showNotification('Contract updated successfully!');
            } else {
                await onAddContract(newOrUpdatedContract);
                showNotification('Contract added successfully!');
            }
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save contract:", error);
            showNotification(`Failed to save contract: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
    };

    const handleDelete = async (id: string) => {
        // Using a custom confirmation modal for better UX than window.confirm
        const confirmed = await new Promise(resolve => {
            const CustomConfirmModal: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in-down">
                    <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-sm transform transition-all animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b dark:border-gray-700">
                            <h3 className="text-lg font-bold text-brand-primary dark:text-white">Confirm Deletion</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 dark:text-gray-300">Are you sure you want to delete this contract?</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={onCancel} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent transition-colors duration-200">Cancel</button>
                            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200">Delete</button>
                        </div>
                    </div>
                </div>
            );
            // Render the custom modal
            const modalRoot = document.createElement('div');
            document.body.appendChild(modalRoot);
            const root = createRoot(modalRoot); // Using createRoot from react-dom/client
            root.render(<CustomConfirmModal onConfirm={() => { resolve(true); root.unmount(); modalRoot.remove(); }} onCancel={() => { resolve(false); root.unmount(); modalRoot.remove(); }} />);
        });

        if (confirmed) {
            try {
                await onDeleteContract(id);
                showNotification('Contract deleted successfully!', 'error');
            } catch (error) {
                console.error("Failed to delete contract:", error);
                showNotification(`Failed to delete contract: ${error instanceof Error ? error.message : String(error)}`, 'error');
            }
        }
    };

    const getStatusStyle = (contractStatus: ContractStatus) => {
        switch (contractStatus) {
            case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-300';
            case 'Expired': return 'bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-300';
            case 'Draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
            case 'Terminated': return 'bg-purple-100 text-purple-800 dark:bg-purple-800/50 dark:text-purple-300';
            default: return 'bg-blue-100 text-blue-800 dark:bg-blue-800/50 dark:text-blue-300';
        }
    };

    const ContractFormModal: React.FC = memo(() => (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in-down" onClick={handleCloseModal}>
            <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-2xl transform transition-all animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-bold text-brand-primary dark:text-white">{editingContract ? 'Edit Contract' : 'New Contract'}</h3>
                    <button onClick={handleCloseModal} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    {formError && <div className="bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 flex items-center gap-2"><AlertCircle size={18} /> {formError}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="contract-number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contract Number <span className="text-red-500">*</span></label>
                            <input
                                id="contract-number"
                                type="text"
                                value={contractNumber}
                                onChange={(e) => setContractNumber(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            />
                        </div>
                        <div>
                            <label htmlFor="contract-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title <span className="text-red-500">*</span></label>
                            <input
                                id="contract-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            />
                        </div>
                        <div>
                            <label htmlFor="contract-supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier <span className="text-red-500">*</span></label>
                            <select
                                id="contract-supplier"
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            >
                                <option value="">Select Supplier</option>
                                {supplierOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="contract-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                            <select
                                id="contract-type"
                                value={type}
                                onChange={(e) => setType(e.target.value as ContractType)}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            >
                                <option value="Service">Service</option>
                                <option value="Goods">Goods</option>
                                <option value="Framework Agreement">Framework Agreement</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="contract-start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date <span className="text-red-500">*</span></label>
                            <input
                                id="contract-start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            />
                        </div>
                        <div>
                            <label htmlFor="contract-end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date <span className="text-red-500">*</span></label>
                            <input
                                id="contract-end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            />
                        </div>
                        <div>
                            <label htmlFor="contract-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                            <select
                                id="contract-status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as ContractStatus)}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            >
                                <option value="Draft">Draft</option>
                                <option value="Active">Active</option>
                                <option value="Expired">Expired</option>
                                <option value="Terminated">Terminated</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="contract-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value (Optional)</label>
                            <input
                                id="contract-value"
                                type="number"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            />
                        </div>
                        <div>
                            <label htmlFor="contract-currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                            <select
                                id="contract-currency"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value as Currency)}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            >
                                <option value="BRL">BRL</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="CNY">CNY</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="contract-renewal-terms" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Renewal Terms (Optional)</label>
                            <textarea
                                id="contract-renewal-terms"
                                value={renewalTerms}
                                onChange={(e) => setRenewalTerms(e.target.value)}
                                rows={2}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            ></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="contract-related-imports" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Related Imports (Optional)</label>
                            <select
                                id="contract-related-imports"
                                multiple
                                value={relatedImportIds}
                                onChange={(e) => {
                                    const options = Array.from(e.target.selectedOptions) as HTMLOptionElement[];
                                    setRelatedImportIds(options.map(option => option.value));
                                }}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 h-24"
                            >
                                {importOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple imports.</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3 rounded-b-xl">
                    <button onClick={handleCloseModal} type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent transition-colors duration-200">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} type="button" className="px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center gap-2 hover:bg-brand-accent transition-colors duration-200">
                        {editingContract ? 'Save Changes' : 'Add Contract'}
                    </button>
                </div>
            </div>
        </div>
    ));

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                <ClipboardCheck /> Contracts Management
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This module provides a centralized repository for managing supplier contracts, including key terms, expiration dates, and associated documents. Track contract time and receive alerts for expiring contracts.
            </p>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <div className="relative w-full sm:w-1/3">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search contracts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-brand-accent rounded-lg bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                </div>
                <div className="w-full sm:w-1/4">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'All' | ContractStatus)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-brand-accent rounded-lg bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                        <option value="Terminated">Terminated</option>
                    </select>
                </div>
                <div className="w-full sm:w-1/4">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as 'All' | ContractType)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-brand-accent rounded-lg bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                        <option value="All">All Types</option>
                        <option value="Service">Service</option>
                        <option value="Goods">Goods</option>
                        <option value="Framework Agreement">Framework Agreement</option>
                    </select>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center justify-center gap-2 hover:bg-brand-accent transition-colors duration-200 shadow-md"
                >
                    <PlusCircle size={20} /> Add New Contract
                </button>
            </div>

            <div className="overflow-x-auto">
                {filteredContracts.length > 0 ? (
                    <table className="min-w-full bg-white dark:bg-brand-secondary rounded-lg shadow-sm">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Contract No.</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Title</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Supplier</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Type</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Status</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Start Date</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">End Date</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredContracts.map((contract) => {
                                const supplier = suppliers.find(s => s.id === contract.supplier);
                                return (
                                    <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-brand-primary transition-colors duration-200">
                                        <td className="p-3 text-gray-800 dark:text-gray-200 font-medium">{contract.contractNumber}</td>
                                        <td className="p-3 text-gray-800 dark:text-gray-200">{contract.title}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{supplier?.name || 'N/A'}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{contract.type}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusStyle(contract.status)}`}>
                                                {contract.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{format(new Date(contract.startDate), 'PPP')}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{format(new Date(contract.endDate), 'PPP')}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center items-center space-x-2">
                                                <button onClick={() => handleOpenModal(contract)} className="p-2 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-200" title="Edit">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(contract.id)} className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors duration-200" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
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
                        <h3 className="text-lg font-semibold">No contracts found.</h3>
                        <p className="text-sm mt-2">Start by adding a new contract to manage!</p>
                    </div>
                )}
            </div>

            {isModalOpen && <ContractFormModal />}
        </div>
    );
};

export default Contracts;
