import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ImportProcess, Container, Warehouse as WarehouseType } from '../types';
import { ContainerStatus, SeaportStatus } from '../types';
import { Search, Filter, X, Truck, Ship, CheckCircle, Warehouse, BrainCircuit, Anchor } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { useAppData } from '../context/AppContext';

const StatusDisplay: React.FC<{ status: ContainerStatus | SeaportStatus }> = ({ status }) => {
    const meta: Record<string, { icon: React.ReactNode, text: string, chip: string }> = {
        [ContainerStatus.OnVessel]: { icon: <Ship size={14}/>, text: 'On Vessel', chip: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
        [ContainerStatus.AtPort]: { icon: <Anchor size={14}/>, text: 'At Port', chip: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' },
        [ContainerStatus.CustomsCleared]: { icon: <CheckCircle size={14}/>, text: 'Cleared', chip: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' },
        [ContainerStatus.InTransitToFactory]: { icon: <Truck size={14}/>, text: 'In Transit', chip: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300' },
        [ContainerStatus.DeliveredToFactory]: { icon: <Warehouse size={14}/>, text: 'Delivered', chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' },
        [ContainerStatus.SentToDepot]: { icon: <Warehouse size={14}/>, text: 'To Depot', chip: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    };
    const statusMeta = meta[status] || { icon: null, text: status, chip: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };

    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 ${statusMeta.chip}`}>
            {statusMeta.icon}
            <span>{statusMeta.text}</span>
        </span>
    );
};

const ContainerControl: React.FC = () => {
    const { imports, warehouses } = useAppData();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ContainerStatus | 'all'>('all');

    const allContainers = useMemo(() => {
        return imports.flatMap(imp => 
            imp.containers.map(c => {
                let transitTime: number | null = null;
                if (imp.departureVesselDate && c.actualDeliveryDateFactory) {
                    try {
                        transitTime = differenceInDays(new Date(c.actualDeliveryDateFactory), new Date(imp.departureVesselDate));
                    } catch (e) {
                        console.error("Error parsing dates for transit time", e);
                    }
                }
                return {
                    ...c,
                    importId: imp.id,
                    importNumber: imp.importNumber,
                    blNumber: imp.blNumber,
                    vesselName: imp.vesselName,
                    transitTime: transitTime
                }
            })
        );
    }, [imports]);

    const filteredContainers = useMemo(() => {
        return allContainers.filter(container => {
            const lowerSearch = searchTerm.toLowerCase();
            const searchMatch = (
                container.containerNumber.toLowerCase().includes(lowerSearch) ||
                container.importNumber.toLowerCase().includes(lowerSearch) ||
                container.blNumber.toLowerCase().includes(lowerSearch) ||
                (container.vesselName || '').toLowerCase().includes(lowerSearch)
            );
            const statusMatch = statusFilter === 'all' || container.currentStatus === statusFilter;
            return searchMatch && statusMatch;
        });
    }, [allContainers, searchTerm, statusFilter]);
    
    const unassignedContainers = useMemo(() => {
        return filteredContainers.filter(c => !c.bondedWarehouseId);
    }, [filteredContainers]);

    const WarehouseCapacity: React.FC<{warehouse: WarehouseType, count: number}> = ({warehouse, count}) => {
        const utilization = warehouse.capacity > 0 ? (count / warehouse.capacity) * 100 : 0;
        let color = 'bg-green-500';
        if (utilization > 85) color = 'bg-red-500';
        else if (utilization > 65) color = 'bg-yellow-500';

        return (
            <div className="bg-gray-100 dark:bg-brand-primary p-3 rounded-lg">
                <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-brand-secondary dark:text-gray-200">{warehouse.name}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{count} / {warehouse.capacity}</span>
                </div>
                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                    <div className={`${color} h-2.5 rounded-full`} style={{width: `${utilization}%`}}></div>
                </div>
            </div>
        )
    };

    const ContainerTable: React.FC<{containers: typeof filteredContainers, title: string, icon: React.ReactNode}> = ({containers, title, icon}) => (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
             <h3 className="text-lg font-semibold text-brand-gray-500 dark:text-white mb-4 flex items-center gap-2">{icon} {title} ({containers.length})</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold text-brand-gray-500 dark:text-gray-300">Container #</th>
                            <th className="p-3 text-sm font-semibold text-brand-gray-500 dark:text-gray-300">Import Process</th>
                            <th className="p-3 text-sm font-semibold text-brand-gray-500 dark:text-gray-300 hidden md:table-cell">Transit Time</th>
                            <th className="p-3 text-sm font-semibold text-brand-gray-500 dark:text-gray-300">ETA Factory</th>
                            <th className="p-3 text-sm font-semibold text-brand-gray-500 dark:text-gray-300">Current Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {containers.length > 0 ? containers.map(c => (
                            <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-brand-primary">
                                <td className="p-3 font-mono font-medium text-brand-gray-500 dark:text-gray-200">{c.containerNumber}</td>
                                <td className="p-3">
                                    <Link to={`/imports/${c.importId}`} className="hover:underline text-sky-600 dark:text-sky-400">{c.importNumber}</Link>
                                    <p className="text-xs text-brand-gray-500 dark:text-gray-400">BL: {c.blNumber}</p>
                                </td>
                                <td className="p-3 text-brand-gray-500 dark:text-gray-300 hidden md:table-cell">
                                    {c.transitTime !== null ? `${c.transitTime} days` : 'N/A'}
                                </td>
                                <td className="p-3 text-brand-gray-500 dark:text-gray-300">{c.etaFactory ? new Date(c.etaFactory + 'T00:00:00Z').toLocaleDateString() : 'N/A'}</td>
                                <td className="p-3"><StatusDisplay status={c.currentStatus} /></td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={5} className="text-center p-8 text-brand-gray-500 dark:text-gray-400">
                                    No containers match your criteria in this location.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold text-brand-gray-500 dark:text-white mb-4">Container Control Center</h2>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 p-4 bg-gray-50 dark:bg-brand-primary/50 rounded-lg">
                    <div className="relative w-full md:w-auto md:flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by Container #, Import #, BL #..."
                            className="w-full pl-10 pr-4 py-2 border dark:border-brand-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent bg-transparent text-brand-gray-500 dark:text-gray-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <label className="text-sm font-medium text-brand-gray-500 dark:text-gray-300">Status:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="p-2 border dark:border-brand-accent rounded-lg text-sm bg-white dark:bg-brand-primary text-brand-gray-500 dark:text-gray-200"
                        >
                            <option value="all">All Statuses</option>
                            {Object.values(ContainerStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h3 className="text-lg font-semibold text-brand-gray-500 dark:text-white flex items-center gap-2"><Warehouse /> Warehouse Capacity Control</h3>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {warehouses.map((wh) => {
                         const count = filteredContainers.filter(c => c.bondedWarehouseId === wh.id).length;
                         return <WarehouseCapacity key={wh.id} warehouse={wh} count={count} />
                    })}
                 </div>
            </div>
            
            {warehouses.map(wh => {
                const warehouseContainers = filteredContainers.filter(c => c.bondedWarehouseId === wh.id);
                return (
                    <ContainerTable 
                        key={wh.id}
                        containers={warehouseContainers}
                        title={`Containers at ${wh.name}`}
                        icon={<Truck />}
                    />
                )
            })}
            
            <ContainerTable 
                containers={unassignedContainers}
                title="Unassigned Containers"
                icon={<Ship />}
            />
            
        </div>
    );
};

export default ContainerControl;