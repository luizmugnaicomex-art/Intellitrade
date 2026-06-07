// src/components/FastInput.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ImportProcess, User, DIChannel, Container, Product, CostItem, Currency } from '../types';
import { ImportStatus, ContainerStatus, PaymentStatus } from '../types';
import { FileUp, CheckCircle, AlertCircle, Loader2, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAppActions, useUI } from '../context/AppContext';

/**
 * Robustly parses a date string into YYYY-MM-DD format.
 * Handles various formats including 'DD/MM/YYYY'.
 * @param dateStr The date string to parse.
 * @returns ISO date string (YYYY-MM-DD) or empty string if invalid.
 */
const robustParseDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim().length < 8) return '';
    try {
        // Try parsing as DD/MM/YYYY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            let year = parseInt(parts[2], 10);
            if (year < 100) year += 2000;

            const d = new Date(Date.UTC(year, month - 1, day));
            if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day) {
                return d.toISOString().split('T')[0];
            }
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return '';
    } catch {
        return '';
    }
};

/**
 * Parses CSV/TSV text into an array of row objects.
 * Automatically detects delimiter (comma or tab).
 * @param csvText The raw CSV/TSV content.
 * @returns An array of row objects, where keys are cleaned headers.
 */
const parseCSV = (csvText: string): Record<string, string>[] => {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    let delimiter = ',';
    if (lines[0].includes('\t')) {
        delimiter = '\t';
    }
    console.log(`[FastInput Debug] Detected delimiter: '${delimiter}'`);

    const parseLine = (line: string, delim: string): string[] => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delim && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        return values.map(v => v.replace(/^"|"$/g, ''));
    };
    
    const headers = parseLine(lines[0], delimiter).map(h => h.toLowerCase().trim());
    console.log("[FastInput Debug] Parsed Headers:", headers);

    const result: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i], delimiter);
        if (values.length >= headers.length) { 
            const obj: Record<string, string> = {};
            headers.forEach((header, index) => {
                if(header) {
                    obj[header] = values[index] || '';
                }
            });
            result.push(obj);
        } else {
            console.warn(`[FastInput Debug] Skipping malformed row ${i + 1}: Expected ${headers.length} values, got ${values.length}. Line: ${lines[i]}`);
        }
    }
    console.log(`[FastInput Debug] Parsed ${result.length} raw rows.`);
    return result;
};

// --- HEADER MAPPING (UPDATED to English headers from FUP sheet) ---
const HEADER_MAPPING: Record<string, keyof ImportProcess | string> = {
    'shipper': 'supplier',
    'invoice': 'additionalImportReference',
    'bl/awb': 'blNumber',
    'description': 'products',
    'type of cargo': 'typeOfCargo',
    'ex tariff': 'exTariff',
    'unique di': 'diNumber',
    'li': 'importLicenseNumber',
    'dg': 'dangerousGoods',
    'technician responsible in china': 'technicianResponsibleChina',
    'technician responsible brazil': 'technicianResponsibleBrazil',
    'cntr qty': 'totalContainers',
    '20 dc/gp': 'containerType_20GP',
    '40dc': 'containerType_40DC',
    '40hc/hq': 'containerType_40HC',
    '40fr': 'containerType_40FR',
    '40ot': 'containerType_40OT',
    'truck': 'containerType_TRUCK',
    'incoterm': 'incoterm',
    'po sap': 'poNumbers',
    'docs received on': 'docsReceivedDate',
    'freight forwader destination': 'freightForwarder',
    'broker': 'responsibleBroker',
    'shipowner': 'shipowner',
    'free time': 'demurrageFreeTimeDays',
    'free time deadline': 'storageDeadline',
    'departure vessel': 'departureVesselDate',
    'arrival vessel': 'arrivalVesselDate',
    'invoice value': 'invoiceValueCNY',
    'invoice value brl': 'invoiceValueBRL',
    'invoice value usd': 'invoiceValueUSD',
    'actual etd': 'actualETD',
    'actual eta': 'actualETA',
    'doc approval date': 'docApprovalDate',
    'cargo presence date': 'cargoPresenceDate',
    'di registration date': 'diRegistrationDate',
    'parametrization': 'diChannel',
    'green channel date': 'greenChannelDate',
    'nf issue date': 'nfIssueDate',
    'status': 'overallStatus',
    'observation': 'observationNotes',
    'kpi docs': 'kpiDocs',
    'kpi po sap': 'kpiPoSap',
    'kpi customs clearance': 'kpiCustomsClearance',
    'kpi ci x last delivery': 'kpiCiLastDelivery',
    'kpi ci x first delivery': 'kpiCiFirstDelivery',
    'kpi operation 2024': 'kpiOperation2024',
    'kpi operation 2025': 'kpiOperation2025',
    'kpi nf2': 'kpiNf2',
    'goal clearance': 'goalClearance',
    'goal delivery': 'goalDelivery',
    'goal operation': 'goalOperation',
    'goal nf': 'goalNf',
};

type ValidatedRecord = {
    data: Partial<ImportProcess>;
    errors: string[];
    isValid: boolean;
    originalRow: Record<string, string>;
};

const FastInput: React.FC = () => {
    const { addMultipleImports: onConfirm } = useAppActions();
    const { currentUser } = useUI();
    
    const [isLoading, setIsLoading] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidatedRecord[]>([]);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setFileContent(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setFileContent(content);
        };
        reader.readAsText(file);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        } else {
            console.error("fileInputRef is null, handleFileChange could not clear the input.");
        }
    };

    useEffect(() => {
        if (!fileContent || !currentUser) {
            setValidationResult([]);
            return;
        }

        setIsLoading(true);
        const parseTimeout = setTimeout(() => {
            const parsedRows = parseCSV(fileContent);
            const importsMap = new Map<string, Partial<ImportProcess>>();

            parsedRows.forEach((row, rowIndex) => {
                const blNumber = (row['bl/awb'] || '').trim();
                const invoiceNumber = (row['invoice'] || '').trim();
                const importKey = blNumber || invoiceNumber;

                if (!importKey) {
                    console.warn(`[FastInput Debug] Row ${rowIndex + 1} skipped due to missing BL/AWB and INVOICE number.`, row);
                    return; 
                }

                if (!importsMap.has(importKey)) {
                    importsMap.set(importKey, {
                        id: uuidv4(),
                        createdById: currentUser.id,
                        products: [],
                        containers: [],
                        costs: [],
                        dates: {},
                        trackingHistory: [{ stage: ImportStatus.OrderPlaced, date: new Date().toISOString() }],
                        importNumber: invoiceNumber || blNumber,
                        blNumber: blNumber,
                        supplier: 'N/A',
                        responsibleBroker: 'N/A',
                        incoterm: 'FOB',
                    });
                }
                
                const currentImport = importsMap.get(importKey)!;

                for (const rawHeader in row) {
                    const key = rawHeader.toLowerCase().trim();
                    const mappedKey = HEADER_MAPPING[key];
                    let value: any = row[rawHeader];

                    if (!mappedKey || value === undefined || value === null || value === '') continue;

                    if (typeof mappedKey === 'string' && mappedKey.startsWith('containerType_')) {
                        const containerType = mappedKey.split('_')[1];
                        const count = parseFloat(value);
                        if (!isNaN(count) && count > 0) {
                            for (let i = 0; i < count; i++) {
                                currentImport.containers!.push({
                                    id: uuidv4(),
                                    containerNumber: `PENDING-${containerType}-${i + 1}`,
                                    currentStatus: ContainerStatus.OnVessel,
                                    demurrageFreeDays: parseFloat(row['free time'] || '0'),
                                    log: [{ timestamp: new Date().toISOString(), status: ContainerStatus.OnVessel, notes: 'Auto-generated from Fast Input', recordedByUserId: currentUser.id }],
                                    etaFactory: '',
                                } as Container);
                            }
                        }
                    } else if (mappedKey === 'products' && value) {
                        currentImport.products!.push({
                            id: uuidv4(),
                            name: value,
                            ncm: row['ncm code'] || '',
                            quantity: parseFloat(row['quantity'] || '1'),
                            unitValue: parseFloat(row['fob unit price (cny)'] || '0'),
                        });
                    } else if (['invoiceValueCNY', 'invoiceValueBRL', 'invoiceValueUSD'].includes(mappedKey as string)) {
                        const numericValue = parseFloat(value.replace(/[^0-9.,]/g, '').replace(',', '.'));
                        if (!isNaN(numericValue)) {
                            const currency: Currency = (mappedKey as string).includes('CNY') ? 'CNY' : (mappedKey as string).includes('BRL') ? 'BRL' : 'USD';
                            currentImport.costs!.push({
                                id: uuidv4(),
                                category: 'FOB',
                                description: `Invoice Value (${currency})`,
                                value: numericValue,
                                currency: currency,
                                status: PaymentStatus.PendingApproval,
                            });
                        }
                    } else if (key.includes('date') || key.includes('deadline')) {
                        const parsedDate = robustParseDate(value);
                        if (parsedDate) {
                            if (['estimatedShipment', 'estimatedArrival'].includes(mappedKey as string)) {
                                currentImport.dates![mappedKey as 'estimatedShipment' | 'estimatedArrival'] = parsedDate;
                            } else {
                                (currentImport as any)[mappedKey] = parsedDate;
                            }
                        }
                    } else if (['exTariff', 'totalContainers', 'demurrageFreeTimeDays', 'kpiDocs', 'kpiPoSap', 'kpiCustomsClearance', 'kpiCiLastDelivery', 'kpiCiFirstDelivery', 'kpiOperation2024', 'kpiOperation2025', 'kpiNf2', 'goalClearance', 'goalDelivery', 'goalOperation', 'goalNf'].includes(mappedKey as string)) {
                        const numericValue = parseFloat(value.replace(/,/g, '.'));
                        if (!isNaN(numericValue)) (currentImport as any)[mappedKey] = numericValue;
                    } else if (mappedKey === 'diChannel') {
                        const chan = value.toLowerCase();
                        if (chan.includes('green')) currentImport.diChannel = 'Green';
                        else if (chan.includes('yellow')) currentImport.diChannel = 'Yellow';
                        else if (chan.includes('red')) currentImport.diChannel = 'Red';
                        else if (chan.includes('gray')) currentImport.diChannel = 'Gray';
                    } else if (mappedKey === 'incoterm') {
                        const upperValue = value.toUpperCase();
                        if (['FOB', 'CIF', 'EXW', 'DDP'].includes(upperValue)) {
                            currentImport.incoterm = upperValue as ImportProcess['incoterm'];
                        }
                    } else {
                        (currentImport as any)[mappedKey] = value;
                    }
                }
            });

            const finalValidationResult: ValidatedRecord[] = Array.from(importsMap.values()).map(imp => {
                const errors: string[] = [];
                imp.importNumber = imp.additionalImportReference || imp.blNumber; // Prioritize invoice number for import number
                if (!imp.importNumber) errors.push('Import Number (from INVOICE or BL/AWB) is required.');
                if (!imp.blNumber) errors.push('BL Number (BL/AWB) is required.');
                if (!imp.supplier || imp.supplier === 'N/A') errors.push('Supplier (SHIPPER) is required.');
                if (!imp.responsibleBroker || imp.responsibleBroker === 'N/A') errors.push('Responsible Broker (BROKER) is required.');

                return {
                    data: imp,
                    errors: errors,
                    isValid: errors.length === 0,
                    originalRow: parsedRows.find(r => r['bl/awb'] === imp.blNumber) || {}
                };
            });
            setValidationResult(finalValidationResult);
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(parseTimeout);
    }, [fileContent, currentUser]);

    const handleConfirm = async () => {
        const validImports = validationResult
            .filter(r => r.isValid)
            .map(r => r.data as Omit<ImportProcess, 'id'>)
            .filter((imp): imp is Omit<ImportProcess, 'id'> => imp !== null);

        if (validImports.length === 0) {
            alert('No valid imports to confirm. Please check the errors.');
            return;
        }
        
        try {
            await onConfirm(validImports);
            setFileContent(null);
            setValidationResult([]);
            alert(`${validImports.length} imports were successfully created!`);
            navigate('/imports');
        } catch (error) {
            console.error("Failed to confirm imports:", error);
            alert(`Failed to save imports: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const { validCount, invalidCount } = useMemo(() => {
        return validationResult.reduce(
            (acc, r) => {
                r.isValid ? acc.validCount++ : acc.invalidCount++;
                return acc;
            },
            { validCount: 0, invalidCount: 0 }
        );
    }, [validationResult]);

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md h-full flex flex-col">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2 mb-2"><UploadCloud /> Fast Input</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Upload a spreadsheet (CSV/XLSX) with FUP data to create multiple import processes at once.</p>

            {!fileContent ? (
                <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed dark:border-gray-600 rounded-lg p-8">
                    <UploadCloud size={48} className="text-gray-400 dark:text-gray-500" />
                    <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Drag and drop your FUP file here</p>
                    <p className="text-gray-500 dark:text-gray-400">or</p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 bg-brand-highlight text-brand-primary px-6 py-2 rounded-lg font-semibold hover:opacity-90"
                    >
                        Browse File
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
                </div>
            ) : isLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 size={40} className="animate-spin text-brand-accent"/>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">Parsing and validating data...</p>
                </div>
            ) : (
                <div className="flex-grow flex flex-col">
                    <div className="flex flex-wrap gap-4 items-center mb-4 p-4 rounded-lg bg-gray-50 dark:bg-brand-primary/50">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircle size={20}/> <span className="font-semibold">{validCount} Valid Records</span></div>
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400"><AlertCircle size={20}/> <span className="font-semibold">{invalidCount} Invalid Records</span></div>
                        <div className="flex-grow text-right text-sm text-gray-500 dark:text-gray-400">Total records found: {validationResult.length}</div>
                    </div>
                    <div className="flex-grow overflow-y-auto border dark:border-brand-accent rounded-lg">
                           <table className="w-full text-left text-sm">
                               <thead className="bg-gray-100 dark:bg-brand-accent/20 sticky top-0">
                                   <tr>
                                       <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">#</th>
                                       <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Import #</th>
                                       <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">BL #</th>
                                       <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                       <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Errors</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                   {validationResult.map((record, index) => (
                                       <tr key={index} className={record.isValid ? '' : 'bg-red-50 dark:bg-red-900/20'}>
                                           <td className="p-2 text-gray-500 dark:text-gray-400">{index + 1}</td>
                                           <td className="p-2 font-medium text-brand-secondary dark:text-gray-200">{record.data.importNumber || '-'}</td>
                                           <td className="p-2 text-gray-700 dark:text-gray-300">{record.data.blNumber || '-'}</td>
                                           <td className="p-2 text-gray-700 dark:text-gray-300">{record.data.overallStatus || '-'}</td>
                                           <td className="p-2">
                                               {record.isValid ? (
                                                   <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle size={14}/> Ready to Import</span>
                                               ) : (
                                                   <div className="text-xs text-red-600 dark:text-red-400">
                                                       <div className="flex items-center gap-1 font-bold"><AlertCircle size={14}/> Errors Found</div>
                                                       <ul className="list-disc list-inside pl-2 mt-1">
                                                           {record.errors.map((e, i) => <li key={i}>{e}</li>)}
                                                       </ul>
                                                   </div>
                                               )}
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                    </div>
                     <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 border-t dark:border-gray-700 mt-4 flex justify-end items-center gap-4">
                        <button onClick={() => setFileContent(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent">
                            Upload New File
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={isLoading || validCount === 0}
                            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ShieldCheck size={18} /> Confirm and Import {validCount} Records
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FastInput;