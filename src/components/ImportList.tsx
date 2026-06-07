// src/components/ImportList.tsx

import React, { useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, PlusCircle, Search, FileText, Layers } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import type { ImportProcess, User, Claim } from '../types';
import { ImportStatus } from '../types';
import { useTranslation } from '../translations';
import { useAppData, useAppActions } from '../context/AppContext';

// Memoized component for a single import row to optimize re-renders
const ImportRow: React.FC<{ imp: ImportProcess; claims: Claim[]; deleteImport: (id: string) => Promise<void>; }> = memo(
    ({ imp, claims, deleteImport }) => {
        const { t } = useTranslation();

        // Calculate days until estimated arrival
        const daysToArrival = useMemo(() => {
            if (imp.dates?.estimatedArrival) {
                const arrivalDate = new Date(imp.dates.estimatedArrival + 'T00:00:00Z');
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Normalize to start of day
                const diff = differenceInDays(arrivalDate, today);
                if (diff >= 0) return `${diff} day(s)`;
                return `${Math.abs(diff)} day(s) overdue`;
            }
            return 'N/A';
        }, [imp.dates?.estimatedArrival]);

        // Get claims count for this import
        const importClaimsCount = useMemo(() => {
            return claims.filter(claim => claim.importId === imp.id).length;
        }, [claims, imp.id]);

        // Determine status chip style
        const getStatusStyle = (status: string) => {
            switch (status) {
                case ImportStatus.Delivered: return 'bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-300';
                case ImportStatus.CustomsClearance: return 'bg-blue-100 text-blue-800 dark:bg-blue-800/50 dark:text-blue-300';
                case ImportStatus.ArrivalAtPort: return 'bg-purple-100 text-purple-800 dark:bg-purple-800/50 dark:text-purple-300';
                case ImportStatus.ShipmentConfirmed: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-300';
                case ImportStatus.OrderPlaced: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
                default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
            }
        };

        return (
            <tr className="hover:bg-gray-50 dark:hover:bg-brand-primary transition-colors duration-200">
                <td className="p-3 text-gray-800 dark:text-gray-200 font-medium">
                    <Link to={`/imports/${imp.id}`} className="text-brand-accent hover:underline">
                        {imp.importNumber}
                    </Link>
                </td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{imp.blNumber}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{imp.supplier}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{imp.responsibleBroker}</td>
                <td className="p-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusStyle(imp.overallStatus || ImportStatus.OrderPlaced)}`}>
                        {imp.overallStatus || ImportStatus.OrderPlaced}
                    </span>
                </td>
                <td className="p-3 text-gray-700 dark:text-gray-300">
                    {imp.dates?.estimatedArrival ? format(new Date(imp.dates.estimatedArrival + 'T00:00:00Z'), 'PPP') : 'N/A'}
                    <br />
                    <span className="text-xs text-gray-500 dark:text-gray-400">({daysToArrival})</span>
                </td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{imp.containers?.length || 0}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{imp.products?.length || 0}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{imp.costs?.length || 0}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{importClaimsCount > 0 ? `${importClaimsCount} Claims` : 'No Claims'}</td>
                <td className="p-3 text-center">
                    <div className="flex justify-center items-center space-x-2">
                        <Link to={`/imports/${imp.id}/edit`} className="p-2 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-200" title="Edit">
                            <Edit size={18} />
                        </Link>
                        <button onClick={() => deleteImport(imp.id)} className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors duration-200" title="Delete">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </td>
            </tr>
        );
    }
);

const ImportList: React.FC = () => {
    const { imports, claims } = useAppData();
    const { deleteImport } = useAppActions();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const { t } = useTranslation();

    const filteredImports = useMemo(() => {
        let filtered = imports;

        if (filterStatus !== 'All') {
            filtered = filtered.filter(imp => imp.overallStatus === filterStatus);
        }

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(imp =>
                imp.importNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
                imp.blNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
                imp.supplier.toLowerCase().includes(lowerCaseSearchTerm) ||
                imp.responsibleBroker?.toLowerCase().includes(lowerCaseSearchTerm) ||
                imp.overallStatus?.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }

        // Sort by estimated arrival date, soonest first
        return filtered.sort((a, b) => {
            const dateA = a.dates?.estimatedArrival ? new Date(a.dates.estimatedArrival).getTime() : Infinity;
            const dateB = b.dates?.estimatedArrival ? new Date(b.dates.estimatedArrival).getTime() : Infinity;
            return dateA - dateB;
        });
    }, [imports, filterStatus, searchTerm]);

    const allStatuses = useMemo(() => {
        const statuses = new Set<string>();
        imports.forEach(imp => {
            if (imp.overallStatus) {
                statuses.add(imp.overallStatus);
            }
        });
        return ['All', ...Array.from(statuses).sort()];
    }, [imports]);

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                <FileText /> {t('allImports')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Manage all your import processes, track their status, and quickly access details.
            </p>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <div className="relative w-full sm:w-1/3">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search imports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-brand-accent rounded-lg bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                </div>
                <div className="w-full sm:w-1/4">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-brand-accent rounded-lg bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                        {allStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
                <Link
                    to="/imports/new"
                    className="w-full sm:w-auto px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center justify-center gap-2 hover:bg-brand-accent transition-colors duration-200 shadow-md"
                >
                    <PlusCircle size={20} /> New Import
                </Link>
            </div>

            <div className="overflow-x-auto">
                {filteredImports.length > 0 ? (
                    <table className="min-w-full bg-white dark:bg-brand-secondary rounded-lg shadow-sm">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Import #</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">BL #</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Supplier</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Broker</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Status</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">ETA</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Containers</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Products</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Costs</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">Claims</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredImports.map(imp => (
                                <ImportRow key={imp.id} imp={imp} claims={claims} deleteImport={deleteImport} />
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center p-8 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                        <Layers size={48} className="mb-4 text-gray-400 dark:text-gray-500" />
                        <h3 className="text-lg font-semibold">No import processes found.</h3>
                        <p className="text-sm mt-2">Start by adding a new import or using the Fast Input feature!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportList;