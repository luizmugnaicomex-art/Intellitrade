// components/ImportForm.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, UploadCloud, Loader2, AlertCircle, BrainCircuit, FileUp, Save, Ship, Package, Container as ContainerIcon, Calendar as CalendarIcon, DollarSign, User, MapPin, Truck, Anchor, Factory, PlusCircle as PlusCircleIcon, FileText, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ImportStatus, PaymentStatus, ContainerStatus } from '../types';
import type { ImportProcess, User as UserType, Product, CostItem, Currency, CostCategory, Container as ContainerType, TrackingEvent, Warehouse, ExtractedImportData } from '../types';
import { useTranslation } from '../translations';
import { extractInvoiceOrPackingListData, extractBLDataFromDocument } from '../services/documentExtractorService';
import { readFileAsText, extractDataFromExcel, extractTextFromPdf } from '../utils/fileReaders';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const ALL_COST_CATEGORIES: CostCategory[] = [ 'FOB', 'International Freight', 'Insurance', 'II', 'IPI', 'PIS/COFINS', 'ICMS', 'Broker Fees', 'Stevedoring', 'Warehousing', 'Port Fees', 'Domestic Transport', 'Bonded Warehouse', 'Demurrage', 'Other' ];
const CURRENCIES: Currency[] = ['USD', 'BRL', 'EUR', 'CNY'];

const emptyForm: Omit<ImportProcess, 'id' | 'createdById' | 'trackingHistory' | 'documents' | 'brokerNumerario' | 'observationNotes' | 'notificationEmails' | 'pendingBrazilianNF' | 'overallStatus' | 'totalMeasurementCBM' | 'diNumber' | 'importLicenseNumber' | 'dangerousGoods' | 'freightForwarder' | 'shipowner' | 'additionalImportReference' | 'portOfLoading' | 'portOfDischarge' | 'voyageNumber' | 'diRegistrationDate' | 'diChannel' | 'greenChannelDate' | 'cargoPresenceDate' | 'storageDeadline' | 'docApprovalDate' | 'nfIssueDate' | 'docsReceivedDate' | 'actualETD' | 'actualETA' | 'firstTruckDelivery' | 'lastTruckDelivery' | 'technicianResponsibleChina' | 'technicianResponsibleBrazil' | 'kpiDocs' | 'kpiPoSap' | 'kpiCustomsClearance' | 'kpiCiLastDelivery' | 'kpiCiFirstDelivery' | 'kpiOperation2024' | 'kpiOperation2025' | 'kpiNf2' | 'goalClearance' | 'goalDelivery' | 'goalOperation' | 'goalNf'> = {
    importNumber: '',
    poNumbers: '',
    blNumber: '',
    supplier: '',
    responsibleBroker: '',
    typeOfCargo: '',
    incoterm: 'FOB',
    exTariff: 0,
    totalContainers: 0,
    demurrageFreeTimeDays: 45,
    products: [],
    containers: [],
    dates: {},
    costs: [],
};

const ImportForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    
    const { imports, warehouses } = useAppData();
    const { addImport, updateImport } = useAppActions();
    const { currentUser, showNotification } = useUI();

    const invoiceFileInputRef = useRef<HTMLInputElement>(null);
    const blFileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<Partial<ImportProcess>>(emptyForm);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionError, setExtractionError] = useState<string | null>(null);

    useEffect(() => {
        if (id && imports) {
            const existingImport = imports.find(imp => imp.id === id);
            if (existingImport) {
                setFormData(existingImport);
            }
        } else {
            setFormData(emptyForm);
        }
    }, [id, imports]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (name.startsWith('dates.')) {
            const dateField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                dates: {
                    ...prev.dates,
                    [dateField]: value,
                },
            }));
        } else if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    }, []);

    const handleProductChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isNumber = ['quantity', 'unitValue', 'netWeight', 'grossWeight', 'cbm'].includes(name);
        const updatedProducts = [...(formData.products || [])];
        updatedProducts[index] = {
            ...updatedProducts[index],
            [name]: isNumber ? (value === '' ? undefined : parseFloat(value)) : value,
        };
        setFormData(prev => ({ ...prev, products: updatedProducts }));
    }, [formData.products]);

    const handleAddProduct = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            products: [...(prev.products || []), { id: uuidv4(), name: '', ncm: '', quantity: 0, unitValue: 0 }],
        }));
    }, []);

    const handleRemoveProduct = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            products: (prev.products || []).filter((_, i) => i !== index),
        }));
    }, []);

    const handleCostChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isNumber = ['value', 'monthlyProvision'].includes(name);
        const updatedCosts = [...(formData.costs || [])];
        updatedCosts[index] = {
            ...updatedCosts[index],
            [name]: isNumber ? (value === '' ? undefined : parseFloat(value)) : value,
        };
        setFormData(prev => ({ ...prev, costs: updatedCosts }));
    }, [formData.costs]);

    const handleAddCost = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            costs: [...(prev.costs || []), { id: uuidv4(), category: 'Other', description: '', value: 0, currency: 'USD', status: PaymentStatus.PendingApproval }],
        }));
    }, []);

    const handleRemoveCost = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            costs: (prev.costs || []).filter((_, i) => i !== index),
        }));
    }, []);

    const handleContainerChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const updatedContainers = [...(formData.containers || [])];
        updatedContainers[index] = {
            ...updatedContainers[index],
            [name]: value,
        };
        setFormData(prev => ({ ...prev, containers: updatedContainers }));
    }, [formData.containers]);

    const handleAddContainer = useCallback(() => {
        if (!currentUser) return;
        setFormData(prev => ({
            ...prev,
            containers: [...(prev.containers || []), { 
                id: uuidv4(), 
                containerNumber: '', 
                currentStatus: ContainerStatus.OnVessel,
                demurrageFreeDays: prev.demurrageFreeTimeDays || 0,
                log: [{ timestamp: new Date().toISOString(), status: ContainerStatus.OnVessel, notes: 'Container added to import', recordedByUserId: currentUser.id }],
                etaFactory: ''
            }],
        }));
    }, [currentUser, formData.demurrageFreeTimeDays]);

    const handleRemoveContainer = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            containers: (prev.containers || []).filter((_, i) => i !== index),
        }));
    }, []);

    const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>, documentType: 'invoice' | 'bl') => {
        const file = event.target.files?.[0];
        if (!file || !currentUser) return;

        setIsExtracting(true);
        setExtractionError(null);

        let fileContent: string = '';
        let base64Image: string = '';
        let fileMimeType = file.type;

        try {
            if (file.type === 'application/pdf') {
                fileContent = await extractTextFromPdf(file);
            } else if (file.type.includes('spreadsheetml') || file.type.includes('excel') || file.name.endsWith('.xlsx')) {
                fileContent = await extractDataFromExcel(file);
            } else if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.type.startsWith('text/')) {
                fileContent = await readFileAsText(file);
            } else if (file.type.startsWith('image/')) {
                 base64Image = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            } else {
                throw new Error("Unsupported file type. Please upload PDF, Excel (.xlsx), CSV/Text or Image files.");
            }
            
            let extractedData: ExtractedImportData | null = null;
            if (documentType === 'invoice') {
                extractedData = await extractInvoiceOrPackingListData(base64Image || fileContent, base64Image ? fileMimeType : 'text/plain');
            } else { // 'bl'
                extractedData = await extractBLDataFromDocument(base64Image || fileContent, base64Image ? fileMimeType : 'text/plain');
            }

            if (extractedData) {
                setFormData(prev => {
                    const mergedData = { ...prev };
                    mergedData.poNumbers = extractedData.poNumber || prev.poNumbers;
                    mergedData.supplier = extractedData.exporterName || prev.supplier;
                    mergedData.vesselName = extractedData.vesselName || prev.vesselName;
                    mergedData.portOfLoading = extractedData.portOfLoading || prev.portOfLoading;
                    mergedData.portOfDischarge = extractedData.portOfDischarge || prev.portOfDischarge;
                    mergedData.totalMeasurementCBM = extractedData.totalMeasurementCBM || prev.totalMeasurementCBM;

                    if (documentType === 'invoice') {
                        mergedData.importNumber = extractedData.invoiceNumber || prev.importNumber;
                        if (extractedData.invoiceDate) {
                            mergedData.dates = { ...prev.dates, orderPlaced: extractedData.invoiceDate };
                        }
                        const newProducts: Product[] = (extractedData.products || []).map(p => ({
                            id: uuidv4(),
                            name: p.description,
                            ncm: p.ncmCode || '',
                            quantity: p.quantity,
                            unitValue: p.unitValueCNY || 0,
                            itemNumber: p.itemNumber,
                            sapNo: p.sapNo,
                            netWeight: p.netWeightKgs,
                            grossWeight: p.grossWeightKgs,
                            vin: p.vin, model: p.model, color: p.color, batterySerialNo: p.batterySerialNo,
                            cbm: 0
                        }));
                        if (newProducts.length > 0) mergedData.products = newProducts;
                    } else { // 'bl'
                        mergedData.blNumber = extractedData.blNumber || prev.blNumber;
                        mergedData.importNumber = prev.importNumber || extractedData.blNumber;
                        if (extractedData.estimatedArrivalDate) {
                             mergedData.dates = { ...prev.dates, estimatedArrival: extractedData.estimatedArrivalDate };
                        }
                        const newContainers: ContainerType[] = (extractedData.containers || []).map(c => ({
                            id: uuidv4(),
                            containerNumber: c.containerNumber,
                            sealNumber: c.sealNumber,
                            currentStatus: ContainerStatus.OnVessel,
                            demurrageFreeDays: prev.demurrageFreeTimeDays || 0,
                            log: [{ timestamp: new Date().toISOString(), status: ContainerStatus.OnVessel, notes: 'Extracted from BL', recordedByUserId: currentUser.id }],
                            etaFactory: '',
                            typeOfInspection: c.type,
                        } as unknown as ContainerType));
                        if (newContainers.length > 0) {
                            mergedData.containers = newContainers;
                            mergedData.totalContainers = newContainers.length;
                        }
                    }
                    
                    const existingCosts = prev.costs || [];
                    const updatedCosts = [...existingCosts];
                    if (extractedData.totalFOBValueCNY && !existingCosts.some(c => c.category === 'FOB')) {
                        updatedCosts.push({
                            id: uuidv4(), category: 'FOB', description: 'Extracted FOB Value', value: extractedData.totalFOBValueCNY, currency: 'CNY', status: PaymentStatus.PendingApproval
                        } as CostItem);
                    }
                    if (extractedData.totalOceanFreightUSD && !existingCosts.some(c => c.category === 'International Freight')) {
                         updatedCosts.push({
                            id: uuidv4(), category: 'International Freight', description: 'Extracted Ocean Freight', value: extractedData.totalOceanFreightUSD, currency: 'USD', status: PaymentStatus.PendingApproval
                        } as CostItem);
                    }
                    mergedData.costs = updatedCosts;

                    return mergedData;
                });
                showNotification(`Data from ${documentType.toUpperCase()} extracted successfully!`, 'success');
            } else {
                setExtractionError(`No relevant data could be extracted from the ${documentType.toUpperCase()}. Please check the document format or try another file.`);
            }
        } catch (err) {
            console.error("Error during document extraction:", err);
            setExtractionError(`Failed to extract data: ${err instanceof Error ? err.message : String(err)}. Please try again or enter manually.`);
        } finally {
            setIsExtracting(false);
            if (documentType === 'invoice' && invoiceFileInputRef.current) {
                invoiceFileInputRef.current.value = '';
            }
            if (documentType === 'bl' && blFileInputRef.current) {
                blFileInputRef.current.value = '';
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!currentUser) {
            setFormError('No user is logged in.');
            return;
        }

        if (!formData.importNumber || !formData.blNumber || !formData.supplier || !formData.responsibleBroker || !formData.incoterm) {
            setFormError('Please fill in all required fields (Import Number, BL Number, Supplier, Broker, Incoterm).');
            return;
        }
        if (!formData.products || formData.products.length === 0) {
            setFormError('At least one product is required.');
            return;
        }
        if (!formData.containers || formData.containers.length === 0) {
            setFormError('At least one container is required.');
            return;
        }

        setIsSubmitting(true);
        try {
            const defaultData: Omit<ImportProcess, 'id' | 'createdById'> = {
                importNumber: '', poNumbers: '', blNumber: '', supplier: '', responsibleBroker: '', incoterm: 'FOB', exTariff: 0, totalContainers: 0,
                demurrageFreeTimeDays: 0, products: [], containers: [], dates: {}, costs: [], trackingHistory: [{ stage: ImportStatus.OrderPlaced, date: new Date().toISOString() }],
                documents: [], observationNotes: '', notificationEmails: [], pendingBrazilianNF: false, overallStatus: ImportStatus.OrderPlaced
            };

            const finalImportData: ImportProcess = {
                ...defaultData, ...formData, id: formData.id || uuidv4(), createdById: formData.createdById || currentUser.id, totalContainers: formData.containers?.length || formData.totalContainers || 0,
            };
            
            finalImportData.products = finalImportData.products.map(p => ({ ...p, id: p.id || uuidv4() }));
            finalImportData.containers = finalImportData.containers.map(c => ({ 
                ...c, id: c.id || uuidv4(),
                log: c.log || [{ timestamp: new Date().toISOString(), status: c.currentStatus || ContainerStatus.OnVessel, notes: 'Initial entry', recordedByUserId: currentUser.id }]
            }));
            finalImportData.costs = finalImportData.costs.map(c => ({ ...c, id: c.id || uuidv4() }));

            let savedImport;
            if (id) {
                savedImport = await updateImport(finalImportData);
            } else {
                const { id: _newId, ...newImportData } = finalImportData;
                savedImport = await addImport(newImportData);
            }

            navigate(`/imports/${savedImport.id}`);
        } catch (error) {
            console.error("Failed to save import:", error);
            setFormError(`Failed to save import: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                <FileText /> {id ? 'Edit Import Process' : 'New Import Process'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {id ? 'Update the details of this import process.' : 'Enter details for a new import process. You can upload documents to auto-fill information.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                {formError && (
                    <div className="bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 p-3 rounded-lg flex items-center gap-2">
                        <AlertCircle size={18} /> {formError}
                    </div>
                )}

                <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-brand-primary/30 text-center space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Start by uploading an invoice to auto-fill information:
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <label htmlFor="invoice-upload" className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors duration-200 cursor-pointer">
                            <UploadCloud size={18} /> Upload Invoice
                        </label>
                        <input
                            id="invoice-upload"
                            ref={invoiceFileInputRef}
                            type="file"
                            accept=".pdf,.csv,.xlsx,image/*"
                            onChange={(e) => handleDocumentUpload(e, 'invoice')}
                            className="hidden"
                        />
                    </div>
                    {isExtracting && (
                        <div className="flex items-center justify-center gap-2 text-blue-500 dark:text-blue-400 mt-2">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Extracting data... Please wait.</span>
                        </div>
                    )}
                    {extractionError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{extractionError}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input type="text" name="importNumber" value={formData.importNumber || ''} onChange={handleChange} placeholder="Import Number *" className="w-full p-2 border rounded-md" />
                    <input type="text" name="poNumbers" value={formData.poNumbers || ''} onChange={handleChange} placeholder="PO Numbers" className="w-full p-2 border rounded-md" />
                    <input type="text" name="blNumber" value={formData.blNumber || ''} onChange={handleChange} placeholder="BL Number *" className="w-full p-2 border rounded-md" />
                    <input type="text" name="supplier" value={formData.supplier || ''} onChange={handleChange} placeholder="Supplier *" className="w-full p-2 border rounded-md" />
                    <input type="text" name="responsibleBroker" value={formData.responsibleBroker || ''} onChange={handleChange} placeholder="Responsible Broker *" className="w-full p-2 border rounded-md" />
                     <select name="incoterm" value={formData.incoterm || 'FOB'} onChange={handleChange} className="w-full p-2 border rounded-md">
                        <option>FOB</option>
                        <option>CIF</option>
                        <option>EXW</option>
                        <option>DDP</option>
                    </select>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-2">Products</h3>
                    {formData.products?.map((product, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 p-2 border rounded-md">
                            <input type="text" name="name" value={product.name} onChange={(e) => handleProductChange(index, e)} placeholder="Product Name" className="w-full p-1 border rounded-md md:col-span-2" />
                            <input type="text" name="ncm" value={product.ncm} onChange={(e) => handleProductChange(index, e)} placeholder="NCM" className="w-full p-1 border rounded-md" />
                            <input type="number" name="quantity" value={product.quantity} onChange={(e) => handleProductChange(index, e)} placeholder="Quantity" className="w-full p-1 border rounded-md" />
                            <div className="flex items-center gap-2">
                                <input type="number" name="unitValue" value={product.unitValue} onChange={(e) => handleProductChange(index, e)} placeholder="Unit Value" className="w-full p-1 border rounded-md" />
                                <button type="button" onClick={() => handleRemoveProduct(index)} className="text-red-500"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddProduct} className="text-sm text-blue-600">+ Add Product</button>
                </div>

                 <div>
                    <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-2">Containers</h3>
                    {formData.containers?.map((container, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 p-2 border rounded-md">
                            <input type="text" name="containerNumber" value={container.containerNumber} onChange={(e) => handleContainerChange(index, e)} placeholder="Container Number" className="w-full p-1 border rounded-md" />
                             <input type="text" name="sealNumber" value={container.sealNumber || ''} onChange={(e) => handleContainerChange(index, e)} placeholder="Seal Number" className="w-full p-1 border rounded-md" />
                            <div className="flex items-center gap-2">
                                <select name="currentStatus" value={container.currentStatus} onChange={(e) => handleContainerChange(index, e)} className="w-full p-1 border rounded-md">
                                    {Object.values(ContainerStatus).map(s => <option key={s}>{s}</option>)}
                                </select>
                                <button type="button" onClick={() => handleRemoveContainer(index)} className="text-red-500"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddContainer} className="text-sm text-blue-600">+ Add Container</button>
                </div>

                 <div>
                    <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-2">Costs</h3>
                    {formData.costs?.map((cost, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 p-2 border rounded-md">
                            <select name="category" value={cost.category} onChange={(e) => handleCostChange(index, e)} className="w-full p-1 border rounded-md md:col-span-1">
                                {ALL_COST_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                            <input type="text" name="description" value={cost.description} onChange={(e) => handleCostChange(index, e)} placeholder="Description" className="w-full p-1 border rounded-md md:col-span-2" />
                            <input type="number" name="value" value={cost.value} onChange={(e) => handleCostChange(index, e)} placeholder="Value" className="w-full p-1 border rounded-md" />
                            <div className="flex items-center gap-2">
                                <select name="currency" value={cost.currency} onChange={(e) => handleCostChange(index, e)} className="w-full p-1 border rounded-md">
                                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                                <button type="button" onClick={() => handleRemoveCost(index)} className="text-red-500"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddCost} className="text-sm text-blue-600">+ Add Cost</button>
                </div>


                <div className="flex justify-end gap-4">
                    <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded-md">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-brand-accent text-white rounded-md disabled:opacity-50">
                        {isSubmitting ? 'Saving...' : (id ? 'Update Import' : 'Create Import')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ImportForm;
