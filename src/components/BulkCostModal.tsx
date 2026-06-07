import React, { useState, useEffect, useMemo } from 'react';
import type { ImportProcess, CostItem, Currency, CostCategory } from '../types';
import { PaymentStatus } from '../types';
import { FileUp, CheckCircle, AlertCircle, X, Loader, ShieldCheck } from 'lucide-react';

interface BulkCostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (costUpdates: { importId: string, cost: Omit<CostItem, 'id'> }[]) => void;
    fileContent: string | null;
    imports: ImportProcess[];
}

type ValidatedCostRecord = {
    importId?: string;
    cost: Partial<Omit<CostItem, 'id'>>;
    originalRow: Record<string, string>;
    errors: string[];
    isValid: boolean;
};

const parseCSV = (csvText: string): Record<string, string>[] => {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
        if (char === '"' && !inQuotes) {
            inQuotes = true;
        } else if (char === '"' && inQuotes) {
            inQuotes = false;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    return values.map(v => v.trim().replace(/^"|"$/g, ''));
  };
  
  const headers = parseLine(lines[0]);
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length >= headers.length) { // Use >= for robustness
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header.replace(/"/g, '')] = values[index];
      });
      result.push(obj);
    }
  }
  return result;
};


const COST_HEADER_MAPPING: Record<string, keyof CostItem | 'importNumber' | 'blNumber'> = {
    'import number': 'importNumber', 'invoice number': 'importNumber', 'processo': 'importNumber',
    'bl number': 'blNumber', 'bill of lading': 'blNumber', 'bl': 'blNumber',
    'category': 'category', 'cost category': 'category',
    'description': 'description', 'cost description': 'description',
    'value': 'value', 'amount': 'value',
    'currency': 'currency',
    'due date': 'dueDate',
    'payment date': 'paymentDate',
    'status': 'status', 'payment status': 'status',
    'oa system number': 'oaSystemNumber', 'oa number': 'oaSystemNumber',
    'cost center': 'costCenter',
};

const ALL_COST_CATEGORIES: CostCategory[] = [ 'FOB', 'International Freight', 'Insurance', 'II', 'IPI', 'PIS/COFINS', 'ICMS', 'Broker Fees', 'Stevedoring', 'Warehousing', 'Port Fees', 'Domestic Transport', 'Bonded Warehouse', 'Demurrage', 'Other' ];
const ALL_CURRENCIES: Currency[] = ['USD', 'BRL', 'EUR', 'CNY'];
const ALL_PAYMENT_STATUSES: PaymentStatus[] = Object.values(PaymentStatus);

const BulkCostModal: React.FC<BulkCostModalProps> = ({ isOpen, onClose, onConfirm, fileContent, imports }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidatedCostRecord[]>([]);

    useEffect(() => {
        if (!isOpen || !fileContent) {
            setValidationResult([]);
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            const parsed = parseCSV(fileContent);
            const validated = parsed.map((row): ValidatedCostRecord => {
                const cost: Partial<Omit<CostItem, 'id'>> = {};
                let importId: string | undefined;
                const errors: string[] = [];

                let importIdentifier: string | null = null;
                let identifierType: 'importNumber' | 'blNumber' | null = null;

                for (const rawHeader in row) {
                    const key = rawHeader.toLowerCase().trim();
                    const mappedKey = COST_HEADER_MAPPING[key];
                    const value = row[rawHeader];

                    if (mappedKey === 'importNumber' || mappedKey === 'blNumber') {
                        if (value) {
                            importIdentifier = value;
                            identifierType = mappedKey;
                        }
                    } else if (mappedKey) {
                        (cost as any)[mappedKey] = value;
                    }
                }

                // --- Validation ---
                if (!importIdentifier || !identifierType) {
                    errors.push('Row must contain "Import Number" or "BL Number".');
                } else {
                    const foundImport = imports.find(i => i[identifierType!] === importIdentifier);
                    if (!foundImport) {
                        errors.push(`Import with ${identifierType} "${importIdentifier}" not found.`);
                    } else {
                        importId = foundImport.id;
                    }
                }
                
                if (!cost.category) {
                    errors.push('Cost Category is required.');
                } else if (!ALL_COST_CATEGORIES.includes(cost.category as CostCategory)) {
                    errors.push(`Invalid Cost Category: "${cost.category}".`);
                }

                const valueNum = parseFloat(cost.value as any);
                if (isNaN(valueNum)) {
                    errors.push('Value must be a valid number.');
                } else {
                    cost.value = valueNum;
                }
                
                if (!cost.currency) {
                    cost.currency = 'USD'; // Default currency
                } else if (!ALL_CURRENCIES.includes(cost.currency as Currency)) {
                    errors.push(`Invalid Currency: "${cost.currency}".`);
                }
                
                if (cost.status && !ALL_PAYMENT_STATUSES.includes(cost.status as PaymentStatus)) {
                    errors.push(`Invalid Status: "${cost.status}".`);
                } else if (!cost.status) {
                    cost.status = PaymentStatus.PendingApproval;
                }

                return { importId, cost, originalRow: row, errors, isValid: errors.length === 0 };
            });

            setValidationResult(validated);
            setIsLoading(false);
        }, 500);

    }, [isOpen, fileContent, imports]);

    const handleConfirm = () => {
        const validCostUpdates = validationResult
            .filter(r => r.isValid)
            .map(r => ({
                importId: r.importId!,
                cost: r.cost as Omit<CostItem, 'id'>,
            }));
        
        onConfirm(validCostUpdates);
        onClose();
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in-down" onClick={onClose}>
            <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-bold text-brand-primary dark:text-white flex items-center gap-3"><FileUp size={24}/> Bulk Cost Review</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader size={40} className="animate-spin text-brand-accent"/>
                            <p className="mt-4 text-gray-600 dark:text-gray-300">Parsing and validating costs...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap gap-4 items-center mb-4 p-4 rounded-lg bg-gray-50 dark:bg-brand-primary/50">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircle size={20}/> <span className="font-semibold">{validCount} Valid Records</span></div>
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400"><AlertCircle size={20}/> <span className="font-semibold">{invalidCount} Invalid Records</span></div>
                                <div className="flex-grow text-right text-sm text-gray-500 dark:text-gray-400">Total records found: {validationResult.length}</div>
                            </div>
                            <div className="overflow-x-auto border dark:border-brand-accent rounded-lg">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 dark:bg-brand-accent/20">
                                        <tr>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">#</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Import #/BL #</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Category</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Value</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {validationResult.map((record, index) => (
                                            <tr key={index} className={record.isValid ? '' : 'bg-red-50 dark:bg-red-900/20'}>
                                                <td className="p-2 text-gray-500 dark:text-gray-400">{index + 1}</td>
                                                <td className="p-2 font-medium text-brand-secondary dark:text-gray-200">{record.originalRow['Import Number'] || record.originalRow['BL Number'] || '-'}</td>
                                                <td className="p-2 text-gray-700 dark:text-gray-300">{record.cost.category || '-'}</td>
                                                <td className="p-2 text-gray-700 dark:text-gray-300">{record.cost.value?.toFixed(2) || '-'} {record.cost.currency}</td>
                                                <td className="p-2">
                                                    {record.isValid ? (
                                                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle size={14}/> Ready</span>
                                                    ) : (
                                                        <div className="text-xs text-red-600 dark:text-red-400" title={record.errors.join(', ')}>
                                                            <div className="flex items-center gap-1 font-bold"><AlertCircle size={14}/> Errors</div>
                                                            <ul className="list-disc list-inside">
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
                        </>
                    )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 border-t dark:border-gray-700 mt-auto flex justify-end items-center gap-4">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent">Cancel</button>
                    <button onClick={handleConfirm} disabled={isLoading || validCount === 0} className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        <ShieldCheck size={18} /> Confirm and Add {validCount} Costs
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkCostModal;