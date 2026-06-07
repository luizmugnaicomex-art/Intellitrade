// src/components/Claims.tsx

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import type { Claim, ImportProcess, User, Document } from '../types';
import { PlusCircle, Edit, Save, X, FileWarning, UploadCloud, FileText, Trash2, Printer, ChevronDown, AlertTriangle } from 'lucide-react';
import BulkClaimModal from './BulkClaimModal';
import { useAppData, useAppActions, useUI } from '../context/AppContext';
import { createRoot } from 'react-dom/client';

const getStatusChip = (status: Claim['status']) => {
    switch (status) {
        case 'Open': return 'bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300';
        case 'In Progress': return 'bg-amber-100 text-amber-700 dark:bg-amber-800/50 dark:text-amber-300';
        case 'Resolved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300';
        case 'Rejected': return 'bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300';
        default: return 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300';
    }
};

const AccordionSection: React.FC<{ title: string; children: React.ReactNode; isOpen: boolean; onToggle: () => void; }> = ({ title, children, isOpen, onToggle }) => (
    <div className="border dark:border-brand-accent rounded-lg">
        <button type="button" onClick={onToggle} className="w-full flex justify-between items-center p-3 bg-gray-50 dark:bg-brand-primary/50 rounded-t-lg">
            <h4 className="font-semibold text-brand-primary dark:text-gray-200">{title}</h4>
            <ChevronDown size={20} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
            <div className="p-4 bg-white dark:bg-brand-secondary/50 rounded-b-lg animate-fade-in-down">
                {children}
            </div>
        )}
    </div>
);

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input {...props} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-200" />
    </div>
);

const TextAreaField: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <textarea {...props} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-200" />
    </div>
);


const Claims: React.FC = () => {
    const { claims, imports } = useAppData();
    const { addClaim: onAddClaim, updateClaim: onUpdateClaim, deleteClaim: onDelete, addMultipleClaims } = useAppActions();
    const { currentUser, showNotification } = useUI();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClaim, setEditingClaim] = useState<Partial<Claim> | null>(null);
    const docFileInputRef = useRef<HTMLInputElement>(null);
    const bulkFileInputRef = useRef<HTMLInputElement>(null);
    const [csvContent, setCsvContent] = useState<string | null>(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [openAccordion, setOpenAccordion] = useState<string>('general');

    const canEdit = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Logistics' || currentUser.role === 'Finance');
    
    const monthlyClaimTotalBRL = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        return claims
            .filter(claim => {
                const claimDate = new Date(claim.claimDate);
                return claimDate.getMonth() === currentMonth && claimDate.getFullYear() === currentYear;
            })
            .reduce((total, claim) => total + (claim.claimedAmountBRL || 0), 0);
    }, [claims]);

    const monthlyLimit = 10_000_000;
    const showMonthlyAlert = monthlyClaimTotalBRL >= monthlyLimit;

    const handleOpenForm = (claim?: Claim) => {
        setEditingClaim(claim ? { ...claim } : { 
            claimDate: new Date().toISOString().split('T')[0], 
            status: 'Open',
            importId: '',
            documents: []
        });
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setEditingClaim(null);
        setIsFormOpen(false);
        setOpenAccordion('general');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        setEditingClaim(prev => {
            if (!prev) return null;
            
            const newEditingClaim = { ...prev };
            const numberFields: (keyof Claim)[] = ['claimedAmountUSD', 'claimedAmountBRL', 'receivedAmountUSD', 'receivedAmountBRL', 'approxDamageValue', 'damagePaidByInsurance', 'reimbursedValue', 'totalDamageVolumeM3', 'damagedVolumeM3', 'totalDamageTons', 'reparableDamageTons', 'irreparableDamageTons'];

            if (name === 'importId') {
                const selectedImport = imports.find(imp => imp.id === value);
                newEditingClaim.importId = value;
                newEditingClaim.blNumber = selectedImport ? selectedImport.blNumber : '';
            } else if (numberFields.includes(name as keyof Claim)) {
                const numValue = parseFloat(value);
                (newEditingClaim as any)[name] = isNaN(numValue) ? undefined : numValue;
            } else {
                 (newEditingClaim as any)[name] = value;
            }

            return newEditingClaim;
        });
    };
    
    const handleSave = async () => {
        if (!editingClaim || !editingClaim.importId || !editingClaim.description || !editingClaim.claimDate || !editingClaim.status) {
            alert('Please fill all required fields: Import Process, Claim Date, and Description.');
            return;
        }

        const { id, ...claimData } = editingClaim;

        try {
            if (id) {
                await onUpdateClaim({ id, ...claimData } as Claim);
            } else {
                await onAddClaim(claimData as Omit<Claim, 'id'>);
            }
            handleCloseForm();
        } catch (error) {
            showNotification(`Failed to save claim: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
    };

    const handleDelete = async (claimId: string) => {
        if (window.confirm("Are you sure you want to delete this claim?")) {
            try {
                await onDelete(claimId);
                handleCloseForm();
            } catch (error) {
                showNotification(`Failed to delete claim: ${error instanceof Error ? error.message : String(error)}`, 'error');
            }
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editingClaim) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const newDoc: Document = {
                id: `claim-doc-${Date.now()}`,
                name: file.name,
                type: 'Other',
                uploadDate: new Date().toISOString(),
                fileUrl: event.target?.result as string,
            };
            setEditingClaim(prev => ({
                ...prev,
                documents: [...(prev?.documents || []), newDoc]
            }));
        };
    };
    
    const handleBulkImportClick = () => {
        bulkFileInputRef.current?.click();
    };

    const handleFileChangeForBulk = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setCsvContent(content);
            setIsBulkModalOpen(true);
        };
        reader.readAsText(file);
        
        e.target.value = ''; // Reset file input
    };

    const handleRemoveDocument = (docId: string) => {
        if (!editingClaim) return;
        setEditingClaim(prev => ({
            ...prev,
            documents: prev?.documents?.filter(d => d.id !== docId)
        }));
    };
    
    const handlePrint = () => {
        window.print();
    }


    const FormModal: React.FC = () => {
        if (!isFormOpen || !editingClaim) return null;

        const toggleAccordion = (section: string) => {
            setOpenAccordion(prev => prev === section ? '' : section);
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-start pt-10 pb-10 print:hidden" onClick={handleCloseForm}>
                <div className="bg-white dark:bg-brand-secondary rounded-lg shadow-xl w-full max-w-4xl transform transition-all flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-brand-primary dark:text-white">{editingClaim.id ? 'Edit Claim' : 'Add New Claim'}</h3>
                         {editingClaim.id && (
                            <button onClick={() => handleDelete(editingClaim.id!)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md"><Trash2 size={18} /></button>
                        )}
                    </div>
                    <div className="p-6 space-y-3 overflow-y-auto">
                        
                        <AccordionSection title="General Information" isOpen={openAccordion === 'general'} onToggle={() => toggleAccordion('general')}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Import Process (BL #)</label>
                                    <select name="importId" value={editingClaim.importId || ''} onChange={handleChange} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md" required>
                                        <option value="" disabled>Select an import</option>
                                        {imports.map(imp => <option key={imp.id} value={imp.id}>{imp.importNumber} / {imp.blNumber}</option>)}
                                    </select>
                                </div>
                                <InputField label="Claim Number (Nº SINISTRO)" name="claimNumber" value={editingClaim.claimNumber || ''} onChange={handleChange} />
                                <InputField label="Incident Date" name="incidentDate" type="date" value={editingClaim.incidentDate || ''} onChange={handleChange} />
                                <InputField label="Claim Registration Date" name="claimDate" type="date" value={editingClaim.claimDate || ''} onChange={handleChange} required />
                                <InputField label="Nature of Claim" name="claimNature" value={editingClaim.claimNature || ''} onChange={handleChange} placeholder="e.g., Container Damage, Missing Goods"/>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                    <select name="status" value={editingClaim.status || 'Open'} onChange={handleChange} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md">
                                        <option>Open</option> <option>In Progress</option> <option>Resolved</option> <option>Rejected</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-4"><TextAreaField label="Description / Observation" name="description" value={editingClaim.description || ''} onChange={handleChange} rows={3} required /></div>
                        </AccordionSection>
                        
                        <AccordionSection title="Financial Details" isOpen={openAccordion === 'financial'} onToggle={() => toggleAccordion('financial')}>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Claimed Amount (USD)" name="claimedAmountUSD" type="number" value={editingClaim.claimedAmountUSD ?? ''} onChange={handleChange} />
                                <InputField label="Claimed Amount (BRL)" name="claimedAmountBRL" type="number" value={editingClaim.claimedAmountBRL ?? ''} onChange={handleChange} />
                                <InputField label="Estimated Receipt Date" name="estimatedReceiptDate" type="date" value={editingClaim.estimatedReceiptDate || ''} onChange={handleChange} />
                                <InputField label="Actual Receipt Date" name="actualReceiptDate" type="date" value={editingClaim.actualReceiptDate || ''} onChange={handleChange} />
                                <InputField label="Received Amount (USD)" name="receivedAmountUSD" type="number" value={editingClaim.receivedAmountUSD ?? ''} onChange={handleChange} />
                                <InputField label="Received Amount (BRL)" name="receivedAmountBRL" type="number" value={editingClaim.receivedAmountBRL ?? ''} onChange={handleChange} />
                                <InputField label="Approx. Value of Damage" name="approxDamageValue" type="number" value={editingClaim.approxDamageValue ?? ''} onChange={handleChange} />
                                <InputField label="Damage Paid by Insurance" name="damagePaidByInsurance" type="number" value={editingClaim.damagePaidByInsurance ?? ''} onChange={handleChange} />
                                <InputField label="Reimbursed Value" name="reimbursedValue" type="number" value={editingClaim.reimbursedValue ?? ''} onChange={handleChange} />
                                <InputField label="Form of Reimbursement" name="reimbursementMethod" value={editingClaim.reimbursementMethod || ''} onChange={handleChange} />
                            </div>
                        </AccordionSection>

                        <AccordionSection title="Cargo & Damage Details" isOpen={openAccordion === 'cargo'} onToggle={() => toggleAccordion('cargo')}>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Part Number" name="partNumber" value={editingClaim.partNumber || ''} onChange={handleChange} />
                                <InputField label="SAP Number" name="sapNumber" value={editingClaim.sapNumber || ''} onChange={handleChange} />
                                <InputField label="Type of Damage" name="damageType" value={editingClaim.damageType || ''} onChange={handleChange} />
                                <div className="md:col-span-2"><TextAreaField label="Total Damaged Cargo" name="totalDamageDescription" value={editingClaim.totalDamageDescription || ''} onChange={handleChange} rows={2} /></div>
                                <div className="md:col-span-2"><TextAreaField label="Reparable Damaged Cargo" name="reparableDamageDescription" value={editingClaim.reparableDamageDescription || ''} onChange={handleChange} rows={2} /></div>
                                <div className="md:col-span-2"><TextAreaField label="Irreparable Damaged Cargo" name="irreparableDamageDescription" value={editingClaim.irreparableDamageDescription || ''} onChange={handleChange} rows={2} /></div>
                                <InputField label="Total Damage Volume (m³)" name="totalDamageVolumeM3" type="number" value={editingClaim.totalDamageVolumeM3 ?? ''} onChange={handleChange} />
                                <InputField label="Damaged Volume (m³)" name="damagedVolumeM3" type="number" value={editingClaim.damagedVolumeM3 ?? ''} onChange={handleChange} />
                                <InputField label="Total Damage (Tons)" name="totalDamageTons" type="number" value={editingClaim.totalDamageTons ?? ''} onChange={handleChange} />
                                <InputField label="Reparable Damage (Tons)" name="reparableDamageTons" type="number" value={editingClaim.reparableDamageTons ?? ''} onChange={handleChange} />
                                <InputField label="Irreparable Damage (Tons)" name="irreparableDamageTons" type="number" value={editingClaim.irreparableDamageTons ?? ''} onChange={handleChange} />
                            </div>
                        </AccordionSection>

                        <AccordionSection title="Logistics & Case Details" isOpen={openAccordion === 'logistics'} onToggle={() => toggleAccordion('logistics')}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Vessel Name" name="vesselName" value={editingClaim.vesselName || ''} onChange={handleChange} />
                                <InputField label="Origin" name="origin" value={editingClaim.origin || ''} onChange={handleChange} />
                                <InputField label="Destination" name="destination" value={editingClaim.destination || ''} onChange={handleChange} />
                                <InputField label="ATA (Actual Time of Arrival)" name="ata" value={editingClaim.ata || ''} onChange={handleChange} />
                                <InputField label="Project" name="project" value={editingClaim.project || ''} onChange={handleChange} />
                                <InputField label="Case Nº" name="caseNumber" value={editingClaim.caseNumber || ''} onChange={handleChange} />
                                <InputField label="HY Code" name="hyCode" value={editingClaim.hyCode || ''} onChange={handleChange} />
                                <InputField label="Replacement Case Nº" name="replacementCaseNumber" value={editingClaim.replacementCaseNumber || ''} onChange={handleChange} />
                                <InputField label="Replacement BL #" name="replacementBlNumber" value={editingClaim.replacementBlNumber || ''} onChange={handleChange} />
                            </div>
                        </AccordionSection>
                        
                        <AccordionSection title="Insurance Details" isOpen={openAccordion === 'insurance'} onToggle={() => toggleAccordion('insurance')}>
                            <div className="space-y-4">
                                <TextAreaField label="Vessel Insurance" name="vesselInsurance" value={editingClaim.vesselInsurance || ''} onChange={handleChange} rows={2}/>
                                <TextAreaField label="Logistic Insurance" name="logisticInsurance" value={editingClaim.logisticInsurance || ''} onChange={handleChange} rows={2}/>
                                <TextAreaField label="BYD's Insurance" name="bydsInsurance" value={editingClaim.bydsInsurance || ''} onChange={handleChange} rows={2}/>
                            </div>
                        </AccordionSection>
                        
                        <AccordionSection title="Resolution & Documents" isOpen={openAccordion === 'resolution'} onToggle={() => toggleAccordion('resolution')}>
                            <div className="space-y-4">
                                <TextAreaField label="Current Situation" name="currentSituation" value={editingClaim.currentSituation || ''} onChange={handleChange} rows={2}/>
                                <TextAreaField label="Solution & Observations" name="solutionNotes" value={editingClaim.solutionNotes || ''} onChange={handleChange} rows={3}/>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supporting Documents</label>
                                    <div className="mt-2 space-y-2">
                                        {editingClaim.documents?.map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-brand-primary rounded-md">
                                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sky-700 dark:text-sky-400 hover:underline text-sm"><FileText size={16} />{doc.name}</a>
                                                <button onClick={() => handleRemoveDocument(doc.id)}><Trash2 size={16} className="text-red-500 hover:text-red-700"/></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => docFileInputRef.current?.click()} className="mt-2 flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400 font-medium hover:underline"><UploadCloud size={16} /> Upload Document</button>
                                    <input type="file" ref={docFileInputRef} onChange={handleFileUpload} className="hidden" />
                                </div>
                            </div>
                        </AccordionSection>

                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3">
                        <button onClick={handleCloseForm} type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent">Cancel</button>
                        <button onClick={handleSave} type="button" className="px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center gap-2 hover:bg-brand-accent">
                            <Save size={16} /> Save Claim
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <style>
            {`
                @media print {
                    body * { visibility: hidden; }
                    .printable-area, .printable-area * { visibility: visible; }
                    .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none; }
                }
            `}
            </style>
            <input type="file" ref={bulkFileInputRef} onChange={handleFileChangeForBulk} className="hidden" accept=".csv" />
            <BulkClaimModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} onConfirm={addMultipleClaims} fileContent={csvContent} imports={imports} />
            <FormModal />
            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md printable-area">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4 no-print">
                    <h2 className="text-xl font-semibold text-brand-primary dark:text-white">Claim Management</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-200 dark:bg-brand-primary text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-80"><Printer size={16}/> Print Report</button>
                        {canEdit && <button onClick={handleBulkImportClick} className="flex items-center gap-2 bg-brand-highlight text-brand-primary px-3 py-2 rounded-lg font-semibold text-sm hover:opacity-90"><UploadCloud size={18} /> Fast Update Input</button>}
                        {canEdit && <button onClick={() => handleOpenForm()} className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-accent"><PlusCircle size={20} /> Add New Claim</button>}
                    </div>
                </div>
                {showMonthlyAlert && (
                    <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 border border-red-300 dark:border-red-800 no-print" role="alert">
                        <div className="flex items-center">
                            <AlertTriangle className="flex-shrink-0 inline w-5 h-5 mr-3"/>
                            <span className="sr-only">Danger</span>
                            <div>
                                <span className="font-medium">Monthly Claim Limit Exceeded!</span> Total claimed value for this month is R$ {monthlyClaimTotalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, which exceeds the R$ {monthlyLimit.toLocaleString('pt-BR')} limit.
                            </div>
                        </div>
                    </div>
                )}
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400">BL Number</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400 hidden md:table-cell">Claim Nature</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400 w-1/3">Description</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Amount (USD)</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                {canEdit && <th className="p-3 text-sm font-semibold text-gray-600 dark:text-gray-400 text-center no-print">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {claims.length > 0 ? claims.map(claim => (
                                <tr key={claim.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-brand-primary">
                                    <td className="p-3 font-medium text-brand-secondary dark:text-gray-200">{claim.blNumber}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300 hidden md:table-cell">{claim.claimNature || 'N/A'}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{claim.description}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{claim.claimedAmountUSD ? `$${claim.claimedAmountUSD?.toFixed(2)}` : 'N/A'}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusChip(claim.status)}`}>{claim.status}</span>
                                    </td>
                                    {canEdit && (
                                        <td className="p-3 text-center no-print">
                                            <button onClick={() => handleOpenForm(claim)} className="p-2 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-brand-accent rounded-md">
                                                <Edit size={18} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={canEdit ? 6 : 5} className="text-center p-8 text-gray-500 dark:text-gray-400">
                                        <FileWarning className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                                        No claims have been registered yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default Claims;