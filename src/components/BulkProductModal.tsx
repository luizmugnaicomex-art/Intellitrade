import React, { useState, useEffect, useMemo } from 'react';
import type { Product } from '../types';
import { FileUp, CheckCircle, AlertCircle, X, Loader, ShieldCheck } from 'lucide-react';

interface BulkProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (products: Product[]) => void;
    fileContent: string | null;
}

type ValidatedProductRecord = {
    data: Partial<Product>;
    errors: string[];
    isValid: boolean;
    originalRow: Record<string, string>;
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
    if (values.length >= headers.length) {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header.replace(/"/g, '').trim()] = values[index];
      });
      result.push(obj);
    }
  }
  return result;
};

const HEADER_MAPPING: Record<string, keyof Product> = {
    'item': 'name', 'product name': 'name', 'description': 'name', 'descrição de mercadorias': 'name',
    'quantity': 'quantity', 'qty': 'quantity',
    'unit value': 'unitValue', 'price': 'unitValue',
    'ncm': 'ncm',
    'vin no': 'vin',
    'model': 'model',
    'colour': 'color',
    'front enginer no.': 'frontEngineNo',
    'engine displacement': 'engineDisplacement',
    'battery serial number': 'batterySerialNo',
    'sap no.': 'sapNo',
    'net weight': 'netWeight',
    'gross weight': 'grossWeight',
    'cbm': 'cbm',
};

const BulkProductModal: React.FC<BulkProductModalProps> = ({ isOpen, onClose, onConfirm, fileContent }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidatedProductRecord[]>([]);

    useEffect(() => {
        if (!isOpen || !fileContent) {
            setValidationResult([]);
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            const parsed = parseCSV(fileContent);
            const validated = parsed.map((row): ValidatedProductRecord => {
                const product: Partial<Product> = {};
                const errors: string[] = [];
                
                for (const rawHeader in row) {
                    const key = rawHeader.toLowerCase().trim();
                    const mappedKey = HEADER_MAPPING[key];
                    let value: any = row[rawHeader];

                    if (mappedKey && value) {
                        if (['quantity', 'unitValue', 'netWeight', 'grossWeight', 'cbm'].includes(mappedKey)) {
                            value = parseFloat(value.replace(',', '.'));
                            if (isNaN(value)) value = undefined;
                        }
                        (product as any)[mappedKey] = value;
                    }
                }

                if (!product.name) errors.push('Product Name is required.');
                if (product.quantity === undefined) errors.push('Quantity is required and must be a number.');
                if (product.unitValue === undefined) errors.push('Unit Value is required and must be a number.');

                return { data: product, errors, isValid: errors.length === 0, originalRow: row };
            });

            setValidationResult(validated);
            setIsLoading(false);
        }, 500);

    }, [isOpen, fileContent]);

    const handleConfirm = () => {
        const validProducts: Product[] = validationResult
            .filter(r => r.isValid)
            .map((r, index) => ({
                id: `prod-${Date.now()}-${index}`,
                itemNumber: String(index + 1).padStart(2, '0'),
                ...r.data,
                name: r.data.name!,
                quantity: r.data.quantity!,
                unitValue: r.data.unitValue!,
                ncm: r.data.ncm || '',
            }));

        onConfirm(validProducts);
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
            <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-bold text-brand-primary dark:text-white flex items-center gap-3"><FileUp size={24}/> Bulk Product Upload</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader size={40} className="animate-spin text-brand-accent"/>
                            <p className="mt-4 text-gray-600 dark:text-gray-300">Parsing and validating products...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap gap-4 items-center mb-4 p-4 rounded-lg bg-gray-50 dark:bg-brand-primary/50">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircle size={20}/> <span className="font-semibold">{validCount} Valid Products</span></div>
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400"><AlertCircle size={20}/> <span className="font-semibold">{invalidCount} Invalid Products</span></div>
                                <div className="flex-grow text-right text-sm text-gray-500 dark:text-gray-400">Total records found: {validationResult.length}</div>
                            </div>
                            <div className="overflow-x-auto border dark:border-brand-accent rounded-lg">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 dark:bg-brand-accent/20">
                                        <tr>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">#</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Product Name</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Quantity</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Unit Value</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {validationResult.map((record, index) => (
                                            <tr key={index} className={record.isValid ? '' : 'bg-red-50 dark:bg-red-900/20'}>
                                                <td className="p-2 text-gray-500 dark:text-gray-400">{index + 1}</td>
                                                <td className="p-2 font-medium text-brand-secondary dark:text-gray-200">{record.data.name || '-'}</td>
                                                <td className="p-2 text-gray-700 dark:text-gray-300">{record.data.quantity || '-'}</td>
                                                <td className="p-2 text-gray-700 dark:text-gray-300">{record.data.unitValue?.toFixed(2) || '-'}</td>
                                                <td className="p-2">
                                                    {record.isValid ? (
                                                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle size={14}/> Ready</span>
                                                    ) : (
                                                        <span className="text-xs text-red-600 dark:text-red-400" title={record.errors.join(', ')}>
                                                            <span className="flex items-center gap-1 font-bold"><AlertCircle size={14}/> Errors</span>
                                                        </span>
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
                        <ShieldCheck size={18} /> Confirm and Add {validCount} Products
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkProductModal;