// src/components/ProceduresManagement.tsx

import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { RefreshCw, PlusCircle, Edit, Trash2, Search, X, FileText, Download, AlertCircle, CheckCircle, UploadCloud, Layers, FileBadge, Container, DollarSign, ListChecks } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Procedure, Document, User } from '../types';
import { useTranslation } from '../translations';
import { createRoot } from 'react-dom/client'; // Import createRoot for custom modal rendering
import { useAppData, useAppActions, useUI } from '../context/AppContext';


const ProceduresManagement: React.FC = () => {
    const { procedures } = useAppData();
    const { addProcedure: onAddProcedure, updateProcedure: onUpdateProcedure, deleteProcedure: onDeleteProcedure } = useAppActions();
    const { showNotification } = useUI();
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'All' | 'broker' | 'logistics' | 'financial'>('All');

    // Form state for new/editing procedure
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<'broker' | 'logistics' | 'financial'>('broker');
    const [summary, setSummary] = useState('');
    const [steps, setSteps] = useState<{ id: string; text: string }[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]); // For uploaded POPs
    const [formError, setFormError] = useState('');
    const [isUploading, setIsUploading] = useState(false);


    // Filtered and sorted procedures for display
    const filteredProcedures = useMemo(() => {
        let filtered = procedures;

        if (filterCategory !== 'All') {
            filtered = filtered.filter(proc => proc.category === filterCategory);
        }

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(proc =>
                proc.title.toLowerCase().includes(lowerCaseSearchTerm) ||
                proc.summary.toLowerCase().includes(lowerCaseSearchTerm) ||
                proc.steps.some(step => step.text.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        // Sort alphabetically by title
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
    }, [procedures, filterCategory, searchTerm]);

    // Reset form fields when modal opens/closes or editing item changes
    const resetForm = useCallback(() => {
        setTitle('');
        setCategory('broker');
        setSummary('');
        setSteps([{ id: uuidv4(), text: '' }]); // Start with one empty step
        setDocuments([]);
        setFormError('');
        setIsUploading(false);
    }, []);

    // Load item data into form when editing
    useEffect(() => {
        if (editingProcedure) {
            setTitle(editingProcedure.title);
            setCategory(editingProcedure.category);
            setSummary(editingProcedure.summary);
            setSteps(editingProcedure.steps.length > 0 ? editingProcedure.steps : [{ id: uuidv4(), text: '' }]);
            setDocuments(editingProcedure.documents || []);
        } else {
            resetForm();
        }
    }, [editingProcedure, resetForm]);

    const handleOpenModal = (procedure: Procedure | null = null) => {
        setEditingProcedure(procedure);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProcedure(null);
        resetForm();
    };

    const handleStepChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newSteps = [...steps];
        if (newSteps[index]) { // Ensure step exists before updating
            newSteps[index].text = e.target.value;
            setSteps(newSteps);
        }
    }, [steps]);

    const handleAddStep = useCallback(() => {
        setSteps(prev => [...prev, { id: uuidv4(), text: '' }]);
    }, []);

    const handleRemoveStep = useCallback((index: number) => {
        setSteps(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setFormError('');

        // For local storage, read file as Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
            const newDocument: Document = {
                id: uuidv4(),
                name: file.name,
                type: file.type.startsWith('image/') ? 'Other' : (file.type === 'application/pdf' ? 'POP' : 'Other'), // Categorize as POP if PDF
                uploadDate: new Date().toISOString(),
                fileUrl: reader.result as string, // Data URL
            };
            setDocuments(prev => [...prev, newDocument]);
            showNotification(`Document '${file.name}' uploaded!`, 'success');
            setIsUploading(false);
            if (event.target) event.target.value = ''; // Clear file input
        };
        reader.onerror = (e) => {
            console.error("File reading error:", e);
            setFormError(`Failed to read file: ${file.name}`);
            setIsUploading(false);
        };
        reader.readAsDataURL(file); // Read as Data URL for local storage
    };

    const handleRemoveDocument = useCallback((docId: string) => {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
        showNotification('Document removed.', 'error');
    }, [showNotification]);

    const handleDownloadDocument = useCallback((fileUrl: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification(`Downloading '${fileName}'...`);
    }, [showNotification]);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this procedure?')) {
            try {
                await onDeleteProcedure(id);
                showNotification('Procedure deleted successfully!', 'error');
            } catch (error) {
                console.error("Failed to delete procedure:", error);
                showNotification(`Failed to delete procedure: ${error instanceof Error ? error.message : String(error)}`, 'error');
            }
        }
    };

    const handleSubmit = async () => {
        if (!title || !summary || steps.some(s => !s.text.trim()) || steps.length === 0) {
            setFormError('Title, Summary, and at least one non-empty Step are required.');
            return;
        }
        setFormError('');

        const newOrUpdatedProcedure: Omit<Procedure, 'id'> = {
            title,
            category,
            summary,
            steps: steps.filter(s => s.text.trim() !== ''), // Filter out empty steps
            documents,
        };

        try {
            if (editingProcedure) {
                await onUpdateProcedure({ ...newOrUpdatedProcedure, id: editingProcedure.id } as Procedure);
                showNotification('Procedure updated successfully!', 'success');
            } else {
                await onAddProcedure(newOrUpdatedProcedure);
                showNotification('Procedure added successfully!', 'success');
            }
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save procedure:", error);
            showNotification(`Failed to save procedure: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
    };

    const getCategoryIcon = (cat: 'broker' | 'logistics' | 'financial') => {
        switch(cat) {
            case 'broker': return <FileBadge size={16} />;
            case 'logistics': return <Container size={16} />;
            case 'financial': return <DollarSign size={16} />;
            default: return <Layers size={16} />;
        }
    };

    const ProcedureFormModal: React.FC = () => (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in-down" onClick={handleCloseModal}>
            <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-3xl transform transition-all animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-bold text-brand-primary dark:text-white">{editingProcedure ? 'Edit Procedure' : 'New Procedure'}</h3>
                    <button onClick={handleCloseModal} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    {formError && <div className="bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 flex items-center gap-2"><AlertCircle size={18} /> {formError}</div>}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="procedure-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title <span className="text-red-500">*</span></label>
                            <input
                                id="procedure-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            />
                        </div>
                        <div>
                            <label htmlFor="procedure-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                            <select
                                id="procedure-category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value as 'broker' | 'logistics' | 'financial')}
                                className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            >
                                <option value="broker">Broker</option>
                                <option value="logistics">Logistics</option>
                                <option value="financial">Financial</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="procedure-summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary <span className="text-red-500">*</span></label>
                        <textarea
                            id="procedure-summary"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                        ></textarea>
                    </div>

                    {/* Steps Section */}
                    <h4 className="text-md font-semibold text-brand-primary dark:text-white mb-2 flex items-center gap-2"><ListChecks size={18}/> Steps <span className="text-red-500">*</span></h4>
                    <div className="space-y-3 mb-4">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center gap-2">
                                <span className="text-gray-700 dark:text-gray-300">{index + 1}.</span>
                                <input
                                    type="text"
                                    value={step.text}
                                    onChange={(e) => handleStepChange(index, e)}
                                    placeholder={`Step ${index + 1} description`}
                                    className="flex-grow p-2 border border-gray-300 dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                                />
                                {steps.length > 1 && ( // Allow removing only if more than one step
                                    <button type="button" onClick={() => handleRemoveStep(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={handleAddStep} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg flex items-center gap-1 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 text-sm">
                            <PlusCircle size={16} /> Add Step
                        </button>
                    </div>

                    {/* Documents (POP) Section */}
                    <h4 className="text-md font-semibold text-brand-primary dark:text-white mb-2 mt-6 flex items-center gap-2"><FileText size={18}/> Attached Documents (POP)</h4>
                    <div className="space-y-3 mb-4">
                        {documents.length > 0 ? (
                            documents.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-brand-primary/30">
                                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-grow truncate">{doc.name}</span>
                                    <div className="flex gap-2 ml-2">
                                        <button onClick={() => handleDownloadDocument(doc.fileUrl, doc.name)} className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full" title="Download">
                                            <Download size={18} />
                                        </button>
                                        <button type="button" onClick={() => handleRemoveDocument(doc.id)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" title="Remove">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No documents attached.</p>
                        )}
                        <label htmlFor="document-upload-input" className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg flex items-center gap-1 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 text-sm cursor-pointer">
                            <UploadCloud size={16} /> {isUploading ? 'Uploading...' : 'Upload Document'}
                            <input
                                id="document-upload-input"
                                type="file"
                                accept="application/pdf,image/*" // Accept PDFs and images
                                onChange={handleDocumentUpload}
                                className="hidden"
                                disabled={isUploading}
                            />
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Accepted formats: PDF, Images. (Max size: for local demo purposes)</p>
                    </div>

                </div>
                <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3 rounded-b-xl">
                    <button onClick={handleCloseModal} type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent transition-colors duration-200">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} type="button" className="px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center gap-2 hover:bg-brand-accent transition-colors duration-200">
                        {editingProcedure ? 'Save Changes' : 'Add Procedure'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                <RefreshCw /> Procedures Management
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Manage and access standard operating procedures (SOPs) for various departments.
            </p>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <div className="relative w-full sm:w-1/3">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search procedures..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-brand-accent rounded-lg bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                </div>
                <div className="w-full sm:w-1/4">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as 'All' | 'broker' | 'logistics' | 'financial')}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-brand-accent rounded-lg bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                        <option value="All">All Categories</option>
                        <option value="broker">Broker</option>
                        <option value="logistics">Logistics</option>
                        <option value="financial">Financial</option>
                    </select>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center justify-center gap-2 hover:bg-brand-accent transition-colors duration-200 shadow-md"
                >
                    <PlusCircle size={20} /> Add New Procedure
                </button>
            </div>

            <div className="overflow-x-auto">
                {filteredProcedures.length > 0 ? (
                    <table className="min-w-full bg-white dark:bg-brand-secondary rounded-lg shadow-sm">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Title</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Category</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Summary</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Steps Count</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Documents</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredProcedures.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-brand-primary transition-colors duration-200">
                                    <td className="p-3 text-gray-800 dark:text-gray-200 font-medium">{item.title}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                        {getCategoryIcon(item.category)} {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                    </td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{item.summary}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{item.steps.length}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                        {item.documents && item.documents.length > 0 ? (
                                            <div className="flex items-center gap-1">
                                                <FileText size={16} className="text-gray-500 dark:text-gray-400" />
                                                <span>{item.documents.length}</span>
                                                {item.documents.some(doc => doc.type === 'POP') && (
                                                    <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full dark:bg-blue-800/50 dark:text-blue-300">POP</span>
                                                )}
                                            </div>
                                        ) : 'None'}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center items-center space-x-2">
                                            <button onClick={() => handleOpenModal(item)} className="p-2 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-200" title="Edit">
                                                <Edit size={18} />
                                            </button>
                                            {item.documents && item.documents.length > 0 && (
                                                <button onClick={() => handleDownloadDocument(item.documents[0].fileUrl, item.documents[0].name)} className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors duration-200" title="Download POP">
                                                    <Download size={18} />
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(item.id)} className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors duration-200" title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center p-8 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                        <Layers size={48} className="mb-4 text-gray-400 dark:text-gray-500" />
                        <h3 className="text-lg font-semibold">No procedures found.</h3>
                        <p className="text-sm mt-2">Start by adding a new standard operating procedure!</p>
                    </div>
                )}
            </div>

            {isModalOpen && <ProcedureFormModal />}
        </div>
    );
};

export default ProceduresManagement;