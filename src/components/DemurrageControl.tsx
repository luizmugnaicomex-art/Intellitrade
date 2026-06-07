

// src/components/DemurrageControl.tsx

import React from 'react';
import type { Container } from '../types';
import { ImportStatus, ContainerStatus } from '../types';
import { Link } from 'react-router-dom';
import { TimerOff, AlertTriangle, Send, Printer } from 'lucide-react';
import { differenceInDays, addDays } from 'date-fns';
import { useAppData, useAppActions } from '../context/AppContext';

interface DemurrageInfo {
    importId: string;
    importNumber: string;
    container: Container;
    arrivalDate: Date;
    freeTimeEndDate: Date;
    daysRemaining: number;
}

const DemurrageControl: React.FC = () => {
    const { imports } = useAppData();
    const { updateImport } = useAppActions();
    
    const demurrageData = React.useMemo(() => {
        const atRiskContainers: DemurrageInfo[] = [];
        const today = new Date();
        today.setHours(0,0,0,0);

        imports.forEach(imp => {
            const arrivalEvent = imp.trackingHistory.find(e => e.stage === ImportStatus.ArrivalAtPort);
            if (!arrivalEvent) return;

            const arrivalDate = new Date(arrivalEvent.date);
            arrivalDate.setHours(0,0,0,0);

            imp.containers
                .filter(c => c.currentStatus === ContainerStatus.AtPort || c.currentStatus === ContainerStatus.CustomsCleared)
                .forEach(container => {
                    const freeTimeEndDate = addDays(arrivalDate, imp.demurrageFreeTimeDays);
                    const daysRemaining = differenceInDays(freeTimeEndDate, today);
                    
                    atRiskContainers.push({
                        importId: imp.id,
                        importNumber: imp.importNumber,
                        container: container,
                        arrivalDate: arrivalDate,
                        freeTimeEndDate: freeTimeEndDate,
                        daysRemaining: daysRemaining,
                    });
                });
        });

        return atRiskContainers.sort((a,b) => a.daysRemaining - b.daysRemaining);

    }, [imports]);
    
    const handleSendToDepot = (importId: string, containerId: string) => {
        const targetImport = imports.find(imp => imp.id === importId);
        if (!targetImport) return;

        const updatedContainers = targetImport.containers.map(c => 
            c.id === containerId ? { ...c, currentStatus: ContainerStatus.SentToDepot, dateSentToDepot: new Date().toISOString() } : c
        );

        updateImport({ ...targetImport, containers: updatedContainers });
    };
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <style>
            {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .printable-area, .printable-area * {
                        visibility: visible;
                    }
                    .printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none;
                    }
                }
            `}
            </style>
            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md printable-area">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4 no-print">
                    <div className="flex items-center">
                        <TimerOff size={24} className="text-brand-accent" />
                        <h2 className="text-xl font-semibold text-brand-primary dark:text-white ml-3">Demurrage Control</h2>
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-200 dark:bg-brand-primary text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-80">
                        <Printer size={16}/> Print Report
                    </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 no-print">Monitor containers at risk of incurring demurrage charges. Containers with 40 or fewer free days remaining are highlighted.</p>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Import #</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Container #</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Arrival Date</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Free Time Ends</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Days Remaining</th>
                                <th className="p-3 font-semibold text-gray-600 dark:text-gray-400 text-center no-print">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {demurrageData.length > 0 ? demurrageData.map(item => (
                                <tr key={item.container.id} className={`hover:bg-gray-50 dark:hover:bg-brand-primary ${item.daysRemaining <= 40 ? 'bg-amber-50 dark:bg-amber-900/40' : ''}`}>
                                    <td className="p-3 font-medium">
                                        <Link to={`/imports/${item.importId}`} className="hover:underline text-sky-600 dark:text-sky-400">{item.importNumber}</Link>
                                    </td>
                                    <td className="p-3 font-medium text-brand-secondary dark:text-gray-200">{item.container.containerNumber}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{item.arrivalDate.toLocaleDateString()}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{item.freeTimeEndDate.toLocaleDateString()}</td>
                                    <td className={`p-3 font-bold ${item.daysRemaining <= 7 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        <div className="flex items-center gap-2">
                                            {item.daysRemaining <= 40 && <AlertTriangle size={16} />}
                                            {item.daysRemaining}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center no-print">
                                        <button
                                            onClick={() => handleSendToDepot(item.importId, item.container.id)}
                                            className="flex items-center justify-center gap-2 text-xs bg-gray-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-700 mx-auto"
                                        >
                                            <Send size={14} /> Send to Depot
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="text-center p-8 text-gray-500 dark:text-gray-400">
                                        No containers currently at risk of demurrage.
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

export default DemurrageControl;