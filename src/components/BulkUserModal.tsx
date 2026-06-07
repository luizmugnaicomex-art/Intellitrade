import React, { useState, useEffect, useMemo } from 'react';
import type { User, Role } from '../types';
import { FileUp, CheckCircle, AlertCircle, X, Loader, ShieldCheck } from 'lucide-react';

interface BulkUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (users: Omit<User, 'id'>[]) => void;
    fileContent: string | null;
}

type ValidatedUserRecord = {
    data: Partial<Omit<User, 'id'>>;
    errors: string[];
    isValid: boolean;
};

const parseCSV = (csvText: string): Record<string, string>[] => {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      result.push(obj);
    }
  }
  return result;
};

const HEADER_MAPPING: Record<string, keyof Omit<User, 'id'>> = {
    'user name': 'name', 'name': 'name',
    'role': 'role',
    'email': 'email',
    'department': 'department',
    'manager': 'manager',
    'start date': 'startDate',
    'password': 'password',
    'habilidades': 'habilidades',
    'melhores pontos fortes': 'melhoresPontosFortes',
    'pontos a aumentar': 'pontosAumentar',
};

const VALID_ROLES: Role[] = ['Admin', 'Finance', 'Logistics', 'View-Only'];

const BulkUserModal: React.FC<BulkUserModalProps> = ({ isOpen, onClose, onConfirm, fileContent }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidatedUserRecord[]>([]);

    useEffect(() => {
        if (!isOpen || !fileContent) {
            setValidationResult([]);
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            const parsed = parseCSV(fileContent);
            const validated = parsed.map((row): ValidatedUserRecord => {
                const user: Partial<Omit<User, 'id'>> = {};
                const errors: string[] = [];
                
                for (const rawHeader in row) {
                    const key = rawHeader.toLowerCase().trim();
                    const mappedKey = HEADER_MAPPING[key];
                    if (mappedKey) {
                        (user as any)[mappedKey] = row[rawHeader];
                    }
                }

                if (!user.name) errors.push('Name is required.');
                if (!user.email) errors.push('Email is required.');
                if (!user.role || !VALID_ROLES.includes(user.role as Role)) {
                    errors.push(`Role must be one of: ${VALID_ROLES.join(', ')}.`);
                }
                if (!user.password) errors.push('Initial Password is required.');

                if (!user.initials && user.name) {
                    user.initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
                }

                return { data: user, errors, isValid: errors.length === 0 };
            });

            setValidationResult(validated);
            setIsLoading(false);
        }, 500);

    }, [isOpen, fileContent]);

    const handleConfirm = () => {
        const validUsers = validationResult
            .filter(r => r.isValid)
            .map(r => r.data as Omit<User, 'id'>);
        
        onConfirm(validUsers);
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
                    <h2 className="text-lg font-bold text-brand-primary dark:text-white flex items-center gap-3"><FileUp size={24}/> Bulk User Import</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader size={40} className="animate-spin text-brand-accent"/>
                            <p className="mt-4 text-gray-600 dark:text-gray-300">Parsing and validating users...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap gap-4 items-center mb-4 p-4 rounded-lg bg-gray-50 dark:bg-brand-primary/50">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircle size={20}/> <span className="font-semibold">{validCount} Valid Users</span></div>
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400"><AlertCircle size={20}/> <span className="font-semibold">{invalidCount} Invalid Users</span></div>
                                <div className="flex-grow text-right text-sm text-gray-500 dark:text-gray-400">Total records found: {validationResult.length}</div>
                            </div>
                            <div className="overflow-x-auto border dark:border-brand-accent rounded-lg">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 dark:bg-brand-accent/20">
                                        <tr>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">#</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Email</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Role</th>
                                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {validationResult.map((record, index) => (
                                            <tr key={index} className={record.isValid ? '' : 'bg-red-50 dark:bg-red-900/20'}>
                                                <td className="p-2 text-gray-500 dark:text-gray-400">{index + 1}</td>
                                                <td className="p-2 font-medium text-brand-secondary dark:text-gray-200">{record.data.name || '-'}</td>
                                                <td className="p-2 text-gray-700 dark:text-gray-300">{record.data.email || '-'}</td>
                                                <td className="p-2 text-gray-700 dark:text-gray-300">{record.data.role || '-'}</td>
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
                        <ShieldCheck size={18} /> Confirm and Create {validCount} Users
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkUserModal;