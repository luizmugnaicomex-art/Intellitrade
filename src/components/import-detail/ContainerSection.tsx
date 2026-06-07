// src/components/import-detail/ContainerSection.tsx

import React from 'react';
import { format } from 'date-fns';
import { Container as ContainerIcon } from 'lucide-react';
import type { Container, ImportProcess, Warehouse } from '../../types';

interface ContainerSectionProps {
    importProcess: ImportProcess;
    containersDemurrageStatus: any[];
    warehouses: Warehouse[];
    onWarehouseChange: (containerId: string, warehouseId: string) => void;
}

const ContainerSection: React.FC<ContainerSectionProps> = ({ importProcess, containersDemurrageStatus, warehouses, onWarehouseChange }) => (
    <div className="lg:col-span-2">
        <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-3 flex items-center gap-2"><ContainerIcon size={20} /> Containers ({importProcess.containers?.length || 0})</h3>
        {importProcess.containers && importProcess.containers.length > 0 ? (
            <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-100 dark:bg-brand-accent/20">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Container #</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">ETA Factory</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Demurrage Info</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Warehouse</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {importProcess.containers.map(container => {
                            const demurrageInfo = containersDemurrageStatus?.find(d => d?.containerNumber === container.containerNumber);
                            return (
                                <tr key={container.id} className="hover:bg-gray-50 dark:hover:bg-brand-primary transition-colors duration-200">
                                    <td className="p-3 font-medium text-brand-secondary dark:text-gray-200">{container.containerNumber}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{container.currentStatus || 'N/A'}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{container.etaFactory ? format(new Date(container.etaFactory), 'PPP') : 'N/A'}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                        {demurrageInfo ? (
                                            <span className={`text-xs font-semibold ${demurrageInfo.statusColor}`}>
                                                {demurrageInfo.statusText} (Free: {demurrageInfo.demurrageFreeDays} days)
                                            </span>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="p-3" style={{minWidth: '150px'}}>
                                        <select
                                            value={container.bondedWarehouseId || ''}
                                            onChange={(e) => onWarehouseChange(container.id, e.target.value)}
                                            className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200 text-xs"
                                        >
                                            <option value="">Unassigned</option>
                                            {warehouses.map(wh => (
                                                <option key={wh.id} value={wh.id}>{wh.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400 border border-dashed dark:border-gray-600 rounded-lg">
                No containers registered for this import.
            </div>
        )}
    </div>
);

export default ContainerSection;
