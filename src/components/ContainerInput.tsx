
// src/components/ContainerInput.tsx

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Container as ContainerIcon, UploadCloud, Loader2, AlertCircle, Save, PlusCircle, Trash2, Edit, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { ImportProcess, Container as ContainerType, Warehouse } from '../types';
import { ContainerStatus } from '../types';
import { extractBLDataFromDocument } from '../services/documentExtractorService';
import { readFileAsText, extractTextFromPdf, extractDataFromExcel } from '../utils/fileReaders';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & {label: string}> = ({label, ...props}) => (
    <div>
        <label className="block text-sm font-medium text-brand-gray-500 dark:text-gray-300 mb-1">{label}</label>
        <input {...props} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm text-brand-gray-500 dark:text-gray-200" />
    </div>
);


const ContainerEditModal: React.FC<{
    container: ContainerType;
    onClose: () => void;
    onSave: (container: ContainerType) => void;
    onRemove: (id: string) => void;
    warehouses: Warehouse[];
}> = ({ container, onClose, onSave, onRemove, warehouses }) => {
    const [formData, setFormData] = useState<ContainerType>(container);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumber = ['demurrageFreeDays', 'cbm', 'grossWeightKgs', 'valueForInsurance'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isNumber ? (value === '' ? undefined : parseFloat(value) || 0) : value }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-brand-secondary rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-brand-primary dark:text-white">Edit Container {formData.containerNumber}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-brand-accent"><X size={20}/></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Container Number" name="containerNumber" value={formData.containerNumber} onChange={handleChange} />
                    <Input label="Seal Number" name="sealNumber" value={formData.sealNumber || ''} onChange={handleChange} />
                    <Input label="Type (e.g. 40HC)" name="typeOfInspection" value={formData.typeOfInspection || ''} onChange={handleChange} />
                    <Input label="CBM (m³)" name="cbm" type="number" step="0.01" value={String(formData.cbm || '')} onChange={handleChange} />
                    <Input label="Gross Weight (kg)" name="grossWeightKgs" type="number" step="0.01" value={String(formData.grossWeightKgs || '')} onChange={handleChange} />
                    <Input label="ETA at Factory" name="etaFactory" type="date" value={formData.etaFactory || ''} onChange={handleChange} />
                    <Input label="Demurrage Free Days" name="demurrageFreeDays" type="number" value={String(formData.demurrageFreeDays || '')} onChange={handleChange} />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bonded Warehouse</label>
                        <select name="bondedWarehouseId" value={formData.bondedWarehouseId || ''} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary">
                            <option value="">-- Unassigned --</option>
                            {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-between items-center">
                    <button onClick={() => { onRemove(formData.id); onClose(); }} className="text-red-600 font-semibold hover:underline">Remove Container</button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
                        <button onClick={() => onSave(formData)} className="px-4 py-2 bg-brand-accent text-white rounded">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    )
}


const ContainerInput: React.FC = () => {
    const { imports, warehouses } = useAppData();
    const { updateImport: onUpdateImport } = useAppActions();
    const { currentUser, showNotification } = useUI();

    const [selectedImportId, setSelectedImportId] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionError, setExtractionError] = useState<string | null>(null);
    const blFileInputRef = useRef<HTMLInputElement>(null);
    const [containersFormData, setContainersFormData] = useState<ContainerType[]>([]);
    const [formError, setFormError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingContainer, setEditingContainer] = useState<ContainerType | null>(null);

    const selectedImport = useMemo(() => imports.find(imp => imp.id === selectedImportId), [imports, selectedImportId]);

    useEffect(() => {
        if (selectedImport) {
            setContainersFormData(JSON.parse(JSON.stringify(selectedImport.containers || [])));
        } else {
            setContainersFormData([]);
        }
    }, [selectedImport]);

    const handleBLUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedImport || !currentUser) {
            showNotification('Please select an import process first.', 'error');
            return;
        }

        setIsExtracting(true);
        setExtractionError(null);

        let fileContent: string | undefined;
        let base64Image: string | undefined;
        let fileMimeType = file.type;

        try {
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                fileContent = await extractTextFromPdf(file);
            } else if (file.type.includes('spreadsheetml') || file.name.endsWith('.xlsx')) {
                fileContent = await extractDataFromExcel(file);
            } else if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.type.startsWith('text/')) {
                fileContent = await readFileAsText(file);
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                const promise = new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                base64Image = (await promise).split(',')[1];
            } else {
                throw new Error("Unsupported file type. Please upload PDF, Excel (.xlsx), CSV/Text, or Image files.");
            }

            const extractedData = await extractBLDataFromDocument(base64Image || fileContent || '', base64Image ? fileMimeType : 'text/plain');

            if (extractedData && extractedData.containers && extractedData.containers.length > 0) {
                const newContainers: ContainerType[] = extractedData.containers.map(c => ({
                    id: uuidv4(),
                    containerNumber: c.containerNumber || '',
                    sealNumber: c.sealNumber || '',
                    currentStatus: ContainerStatus.OnVessel,
                    demurrageFreeDays: selectedImport?.demurrageFreeTimeDays || 0,
                    log: [{ timestamp: new Date().toISOString(), status: ContainerStatus.OnVessel, notes: 'Extracted from BL', recordedByUserId: currentUser.id }],
                    etaFactory: extractedData.estimatedArrivalDate || selectedImport?.dates?.estimatedArrival || '',
                    typeOfInspection: c.type,
                    cbm: c.cbm,
                    grossWeightKgs: c.grossWeightKgs,
                    bondedWarehouseId: '',
                } as ContainerType));
                setContainersFormData(newContainers);
                showNotification(`Successfully extracted ${newContainers.length} containers from BL! Please review and save.`, 'success');
            } else {
                setExtractionError("No container data could be extracted from the BL. Please check the document or enter manually.");
                showNotification("BL extraction failed: No container data found.", 'error');
            }
        } catch (err) {
            console.error("Error during BL extraction:", err);
            setExtractionError(`Failed to extract BL data: ${err instanceof Error ? err.message : String(err)}. Please try again.`);
            showNotification(`BL extraction failed: ${err instanceof Error ? err.message : 'Unknown error.'}`, 'error');
        } finally {
            setIsExtracting(false);
            if (event.target) event.target.value = '';
        }
    };
    
    const handleAddContainer = useCallback(() => {
        if (!currentUser) return;
        setContainersFormData(prev => [...prev, {
            id: uuidv4(),
            containerNumber: '', sealNumber: '', currentStatus: ContainerStatus.OnVessel,
            etaFactory: selectedImport?.dates?.estimatedArrival || '',
            demurrageFreeDays: selectedImport?.demurrageFreeTimeDays || 0,
            log: [{ timestamp: new Date().toISOString(), status: ContainerStatus.OnVessel, notes: 'Manual entry', recordedByUserId: currentUser.id }],
            bondedWarehouseId: '',
        } as ContainerType]);
    }, [selectedImport, currentUser]);

    const handleRemoveContainer = useCallback((idToRemove: string) => {
        setContainersFormData(prev => prev.filter(c => c.id !== idToRemove));
    }, []);

    const handleOpenEditModal = (container: ContainerType) => {
        setEditingContainer(container);
        setIsEditModalOpen(true);
    };

    const handleUpdateContainerInForm = (updatedContainer: ContainerType) => {
        setContainersFormData(prev => prev.map(c => c.id === updatedContainer.id ? updatedContainer : c));
        setIsEditModalOpen(false);
        setEditingContainer(null);
    };
    
    const handleSaveContainers = async () => {
        if (!selectedImport) {
            setFormError("Please select an Import Process first.");
            return;
        }
        setFormError(null);
        setIsExtracting(true); // Re-use extracting state for saving UI feedback

        try {
            const updatedImport: ImportProcess = {
                ...selectedImport,
                containers: containersFormData.map(c => ({ ...c, id: c.id || uuidv4() })),
                totalContainers: containersFormData.length,
            };
            await onUpdateImport(updatedImport);
            showNotification('Containers updated successfully for import ' + selectedImport.importNumber, 'success');
        } catch (error) {
            console.error("Failed to save containers:", error);
            showNotification(`Failed to save containers: ${error instanceof Error ? error.message : String(error)}`, 'error');
        } finally {
            setIsExtracting(false);
        }
    };
    
    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                <ContainerIcon /> Container Input & Management
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select an import process to manage its containers. You can auto-fill container details by uploading a Bill of Lading (BL), or add them manually.
            </p>

            <div className="mb-6 p-4 border border-dashed dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-brand-primary/30">
                <label htmlFor="import-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Import Process:</label>
                <select
                    id="import-select"
                    value={selectedImportId}
                    onChange={e => setSelectedImportId(e.target.value)}
                    className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                >
                    <option value="">-- Select an Import --</option>
                    {imports.map(imp => (
                        <option key={imp.id} value={imp.id}>
                            {imp.importNumber} (BL: {imp.blNumber})
                        </option>
                    ))}
                </select>
            </div>

            {selectedImport && (
                <div className="animate-fade-in-down">
                    {formError && <p className="text-red-500 dark:text-red-400 text-sm mb-4 flex items-center gap-1"><AlertCircle size={16} className="inline mr-1" />{formError}</p>}

                    <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-brand-primary/30 text-center space-y-3 mb-6">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Upload a Bill of Lading (BL) to auto-fill container details:
                        </p>
                        <label htmlFor="bl-upload-container-input" className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors duration-200 cursor-pointer disabled:opacity-50" aria-disabled={isExtracting}>
                            <UploadCloud size={18} /> Upload BL
                        </label>
                        <input
                            id="bl-upload-container-input"
                            type="file"
                            ref={blFileInputRef}
                            accept=".pdf,.csv,.xlsx,image/*"
                            onChange={handleBLUpload}
                            className="hidden"
                            disabled={isExtracting}
                        />
                        {isExtracting && (
                            <div className="flex items-center justify-center gap-2 text-blue-500 dark:text-blue-400 mt-2">
                                <Loader2 size={16} className="animate-spin" />
                                <span>Extracting data... Please wait.</span>
                            </div>
                        )}
                        {extractionError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{extractionError}</p>}
                    </div>

                    <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2"><ContainerIcon /> Containers for {selectedImport.importNumber} ({containersFormData.length})</h3>
                    <div className="space-y-4 mb-6">
                        {containersFormData.length > 0 ? containersFormData.map((container) => (
                            <div key={container.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border dark:border-brand-accent rounded-lg relative">
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <button type="button" onClick={() => handleOpenEditModal(container)} className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full" title="Edit Container">
                                        <Edit size={18} />
                                    </button>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Container Number</label><p className="text-gray-900 dark:text-gray-200 font-medium">{container.containerNumber || 'N/A'}</p></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seal Number</label><p className="text-gray-900 dark:text-gray-200">{container.sealNumber || 'N/A'}</p></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label><p className="text-gray-900 dark:text-gray-200">{container.typeOfInspection || 'N/A'}</p></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CBM</label><p className="text-gray-900 dark:text-gray-200">{container.cbm?.toFixed(2) || 'N/A'} m³</p></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gross Weight (kg)</label><p className="text-gray-900 dark:text-gray-200">{container.grossWeightKgs?.toFixed(2) || 'N/A'} kg</p></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ETA Factory</label><p className="text-gray-900 dark:text-gray-200">{container.etaFactory ? format(new Date(container.etaFactory), 'PPP') : 'N/A'}</p></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Demurrage Free Days</label><p className="text-gray-900 dark:text-gray-200">{container.demurrageFreeDays || 'N/A'}</p></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bonded Warehouse</label><p className="text-gray-900 dark:text-gray-200">{warehouses.find(wh => wh.id === container.bondedWarehouseId)?.name || 'Unassigned'}</p></div>
                            </div>
                        )) : (
                            <div className="text-center p-8 text-gray-500 dark:text-gray-400 border border-dashed dark:border-gray-600 rounded-lg">
                                No containers associated with this import. Upload a BL or add manually.
                            </div>
                        )}
                        <button type="button" onClick={handleAddContainer} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
                            <PlusCircle size={20} /> Add Container Manually
                        </button>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={handleSaveContainers} className="px-6 py-2 bg-brand-secondary text-white rounded-lg flex items-center gap-2 hover:bg-brand-accent transition-colors duration-200 disabled:opacity-50" disabled={isExtracting}>
                            <Save size={18} /> Save Containers
                        </button>
                    </div>
                </div>
            )}

            {isEditModalOpen && editingContainer && 
                <ContainerEditModal 
                    container={editingContainer} 
                    onClose={() => setIsEditModalOpen(false)} 
                    onSave={handleUpdateContainerInForm}
                    onRemove={handleRemoveContainer}
                    warehouses={warehouses}
                />
            }
        </div>
    );
};

export default ContainerInput;
