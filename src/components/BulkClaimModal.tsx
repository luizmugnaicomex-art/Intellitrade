import React, { useState, useEffect, useMemo } from 'react';
import type { ImportProcess, Claim } from '../types';
import { FileUp, CheckCircle, AlertCircle, X, Loader, ShieldCheck } from 'lucide-react';

interface BulkClaimModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (claims: Claim[]) => void;
    fileContent: string | null;
    imports: ImportProcess[];
}

type ValidatedClaimRecord = {
    importId?: string;
    blNumber?: string;
    claim: Partial<Omit<Claim, 'id' | 'importId' | 'blNumber'>>;
    originalRow: Record<string, string>;
    errors: string[];
    isValid: boolean;
};

// Robust CSV parser
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
        obj[header.replace(/"/g, '').trim()] = values[index];
      });
      result.push(obj);
    }
  }
  return result;
};

// Header mapping based on FUP
const CLAIM_HEADER_MAPPING: Record<string, keyof Claim | 'blNumber'> = {
    'bl number': 'blNumber', 'bl': 'blNumber', 'bl involved in the claim': 'blNumber',
    'nº sinistro': 'claimNumber',
    'incident date': 'incidentDate',
    'data registro sinistro': 'claimDate',
    'natureza do sinistro': 'claimNature',
    'valor sinistro usd': 'claimedAmountUSD',
    'valor sinistro brl': 'claimedAmountBRL',
    'status': 'status',
    'data previsto recebimento': 'estimatedReceiptDate',
    'data recebimento': 'actualReceiptDate',
    'valor recebido usd': 'receivedAmountUSD',
    'valor recebido brl': 'receivedAmountBRL',
    'observacao': 'description',
    'vessel': 'vesselName',
    'project': 'project',
    'case nº': 'caseNumber',
    'hy': 'hyCode',
    'part number': 'partNumber',
    'sap number': 'sapNumber',
    'reparable damaged cargo': 'reparableDamageDescription',
    'irreparable damaged cargo': 'irreparableDamageDescription',
    'origin': 'origin',
    'destination': 'destination',
    'ata': 'ata',
    'end date': 'endDate',
    'total damaged cargo': 'totalDamageDescription',
    'total cargo volume m³': 'totalDamageVolumeM3',
    'type of damage': 'damageType',
    'volume damaged cargo m³': 'damagedVolumeM3',
    'total damaged cargo tons': 'totalDamageTons',
    'reparable damaged cargo tons': 'reparableDamageTons',
    'irreparable damaged cargo tons': 'irreparableDamageTons',
    'evidences': 'evidences',
    'vessel insurance': 'vesselInsurance',
    'logistic insurance': 'logisticInsurance',
    'byd\'s insurance': 'bydsInsurance',
    'approx value of damage': 'approxDamageValue',
    'damage paying insurance': 'damagePaidByInsurance',
    'case number replacement': 'replacementCaseNumber',
    'bl replacement': 'replacementBlNumber',
    'forma de ressarcimento': 'reimbursementMethod',
    'valor ressarcido': 'reimbursedValue',
    'situação atual': 'currentSituation',
    'solução - observações': 'solutionNotes',
};

const BulkClaimModal: React.FC<BulkClaimModalProps> = ({ isOpen, onClose, onConfirm, fileContent, imports }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidatedClaimRecord[]>([]);

    useEffect(() => {
        if (!isOpen || !fileContent) {
            setValidationResult([]);
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            const parsed = parseCSV(fileContent);
            const validated = parsed.map((row): ValidatedClaimRecord => {
                const claim: Partial<Claim> = {};
                const errors: string[] = [];
                let blNumber: string | undefined;
                let importId: string | undefined;

                for (const rawHeader in row) {
                    const key = rawHeader.toLowerCase().trim();
                    const mappedKey = CLAIM_HEADER_MAPPING[key];
                    const value = row[rawHeader];

                    if (mappedKey === 'blNumber') {
                        blNumber = value;
                    } else if (mappedKey) {
                        (claim as any)[mappedKey] = value;
                    }
                }

                // --- Validation ---
                if (!blNumber) {
                    errors.push('Row must contain a "BL Number".');
                } else {
                    const foundImport = imports.find(i => i.blNumber === blNumber);
                    if (!foundImport) {
                        errors.push(`Import with BL "${blNumber}" not found.`);
                    } else {
                        importId = foundImport.id;
                    }
                }
                
                if (!claim.description) errors.push('Description (OBSERVACAO) is required.');
                if (!claim.claimDate) claim.claimDate = new Date().toISOString().split('T')[0];
                
                const numberFields: (keyof Claim)[] = ['claimedAmountUSD', 'claimedAmountBRL', 'receivedAmountUSD', 'receivedAmountBRL'];
                numberFields.forEach(field => {
                    if ((claim as any)[field]) {
                        const numValue = parseFloat((claim as any)[field]);
                        if (isNaN(numValue)) {
                            errors.push(`Field "${field}" has an invalid number.`);
                        } else {
                             (claim as any)[field] = numValue;
                        }
                    }
                });

                if (!claim.status) claim.status = 'Open';

                return { importId, blNumber, claim, originalRow: row, errors, isValid: errors.length === 0 };
            });

            setValidationResult(validated);
            setIsLoading(false);
        }, 500);

    }, [isOpen, fileContent, imports]);

    const handleConfirm = () => {
        const validClaims = validationResult
            .filter(r => r.isValid)
            .map(r => ({
                id: `claim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                importId: r.importId!,
                blNumber: r.blNumber!,
                ...r.claim,
            } as Claim));
        
        onConfirm(validClaims);
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
                    <h2 className="text-lg font-bold text-brand-primary dark:text-white flex items-center gap-3"><FileUp size={24}/> Bulk Claim Review</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader size={40} className="animate-spin text-brand-accent"/>
                            <p className="mt-4 text-gray-600 dark:text-gray-300">Parsing and validating claims...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap gap-4 items-center mb-4 p-4 rounded-lg bg-gray-50 dark:bg-brand-primary/50">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircle size={20}/> <span className="font-semibold">{validCount} Valid Claims</span></div>
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400"><AlertCircle size={20}/> <span className="font-semibold">{invalidCount} Invalid Claims</span></div>
                                <div className="flex-grow text-right text-sm text-gray-500 dark:text-gray-400">Total records found: {validationResult.length}</div>
                            </div>
                            <div className="overflow-x-auto border dark:border-brand-accent rounded-lg">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 dark:bg-brand-accent/20">
                                        <tr>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">#</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">BL #</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Claim Date</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Amount (USD)</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {validationResult.map((record, index) => (
                                            <tr key={index} className={record.isValid ? '' : 'bg-red-50 dark:bg-red-900/20'}>
                                                <td className="p-2 text-gray-500 dark:text-gray-400">{index + 1}</td>
                                                <td className="p-2 font-medium text-brand-secondary dark:text-gray-200">{record.blNumber || '-'}</td>
                                                <td className="p-2 text-gray-700 dark:text-gray-300">{record.claim.claimDate || '-'}</td>
                                                <td className="p-2 text-gray-700 dark:text-gray-300">{record.claim.claimedAmountUSD?.toFixed(2) || '-'}</td>
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
                        <ShieldCheck size={18} /> Confirm and Add {validCount} Claims
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkClaimModal;