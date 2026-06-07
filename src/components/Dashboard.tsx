// src/components/Dashboard.tsx

import React, { useMemo, useState, useEffect } from 'react';
import { Home, DollarSign, TrendingUp, Package, Truck, Clock, AlertTriangle, CheckCircle, X, Bell, RefreshCw, Info, CalendarIcon, Loader2, Users, Layers, FileWarning, ListChecks, Edit, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { format, isPast, differenceInDays, addDays } from 'date-fns';
import { ImportStatus, PaymentStatus, TaskStatus } from '../types';
import { useTranslation } from '../translations';
import { useAppData, useUI } from '../context/AppContext';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    const { imports, claims, tasks } = useAppData();
    const { exchangeRates, setExchangeRates, ratesLoading, ratesError, theme, companyLogo, currentUser } = useUI();
    
    const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
    const [manualUSDCompra, setManualUSDCompra] = useState(exchangeRates?.usd.compra.toString() || '');
    const [manualUSDVenda, setManualUSDVenda] = useState(exchangeRates?.usd.venda.toString() || '');
    const [manualEURCompra, setManualEURCompra] = useState(exchangeRates?.eur.compra.toString() || '');
    const [manualEURVenda, setManualEURVenda] = useState(exchangeRates?.eur.venda.toString() || '');
    const [manualCNY, setManualCNY] = useState(exchangeRates?.cny.toString() || '');
    const [manualRatesError, setManualRatesError] = useState<string | null>(null);

    useEffect(() => {
        if (exchangeRates) {
            setManualUSDCompra(exchangeRates.usd.compra.toString());
            setManualUSDVenda(exchangeRates.usd.venda.toString());
            setManualEURCompra(exchangeRates.eur.compra.toString());
            setManualEURVenda(exchangeRates.eur.venda.toString());
            setManualCNY(exchangeRates.cny.toString());
        }
    }, [exchangeRates]);

    const handleSaveRates = () => {
        setManualRatesError(null);
        const newUSDCompra = parseFloat(manualUSDCompra);
        const newUSDVenda = parseFloat(manualUSDVenda);
        const newEURCompra = parseFloat(manualEURCompra);
        const newEURVenda = parseFloat(manualEURVenda);
        const newCNY = parseFloat(manualCNY);

        if (isNaN(newUSDCompra) || isNaN(newUSDVenda) || isNaN(newEURCompra) || isNaN(newEURVenda) || isNaN(newCNY)) {
            setManualRatesError("Please enter valid numbers for all exchange rates.");
            return;
        }

        setExchangeRates({
            date: new Date().toISOString().split('T')[0],
            time: format(new Date(), 'HH:mm'),
            usd: { compra: newUSDCompra, venda: newUSDVenda },
            eur: { compra: newEURCompra, venda: newEURVenda },
            cny: newCNY
        });
        setIsRatesModalOpen(false);
    };

    // --- Key Performance Indicators (KPIs) ---
    const kpis = useMemo(() => {
        const totalImports = imports.length;
        const deliveredImports = imports.filter(imp => imp.overallStatus === ImportStatus.Delivered).length;
        const inProgressImports = imports.filter(imp => imp.overallStatus !== ImportStatus.Delivered).length;

        const totalClaims = claims.length;
        const openClaims = claims.filter(claim => claim.status !== 'Resolved' && claim.status !== 'Rejected').length;

        let totalDemurrageCostUSD = 0;
        let totalOverduePaymentsUSD = 0;
        let totalOverdueTasks = 0;
        let importsAtRisk = 0;
        const today = new Date();
        today.setHours(0,0,0,0);

        imports.forEach(imp => {
            // Demurrage calculation
            imp.containers?.forEach(container => {
                if (container.seaportArrivalDate && container.demurrageFreeDays !== undefined) {
                    const arrivalDate = new Date(container.seaportArrivalDate);
                    arrivalDate.setHours(0,0,0,0);
                    const demurrageStartsDate = addDays(arrivalDate, container.demurrageFreeDays);
                    demurrageStartsDate.setHours(0,0,0,0);

                    if (isPast(demurrageStartsDate)) {
                        // This is a simplified calculation, real demurrage is complex
                        const overdueDays = differenceInDays(today, demurrageStartsDate);
                        // Assuming a placeholder daily demurrage rate, e.g., $100/day
                        totalDemurrageCostUSD += overdueDays * 100; 
                        importsAtRisk++; // Count as at risk if demurrage is active
                    } else if (differenceInDays(demurrageStartsDate, today) <= 7) {
                        importsAtRisk++; // Count as at risk if demurrage is approaching
                    }
                }
            });

            // Overdue payments
            imp.costs?.forEach(cost => {
                if (cost.dueDate && isPast(new Date(cost.dueDate)) && cost.status !== PaymentStatus.Paid && cost.status !== PaymentStatus.Cancelled) {
                    // Convert to USD for aggregation, assuming exchangeRates are available
                    const valueInUSD = cost.currency === 'USD' ? cost.value : 
                                       cost.currency === 'BRL' && exchangeRates?.usd.venda ? cost.value / exchangeRates.usd.venda :
                                       cost.currency === 'EUR' && exchangeRates?.eur.venda ? cost.value / exchangeRates.eur.venda :
                                       cost.currency === 'CNY' && exchangeRates?.cny ? cost.value / exchangeRates.cny : 0;
                    totalOverduePaymentsUSD += valueInUSD;
                }
            });
        });

        // Overdue tasks for current user
        totalOverdueTasks = tasks.filter(task => 
            currentUser && task.assignedToId === currentUser.id && 
            task.status !== TaskStatus.Completed &&
            task.dueDate && isPast(new Date(task.dueDate))
        ).length;


        return {
            totalImports,
            deliveredImports,
            inProgressImports,
            totalClaims,
            openClaims,
            totalDemurrageCostUSD: totalDemurrageCostUSD.toFixed(2),
            totalOverduePaymentsUSD: totalOverduePaymentsUSD.toFixed(2),
            totalOverdueTasks,
            importsAtRisk,
            // Add other KPIs as needed
        };
    }, [imports, claims, exchangeRates, tasks, currentUser]);

    // --- Chart Data (Example: Imports by Status) ---
    const importsByStatusData = useMemo(() => {
        const statusCounts: Record<string, number> = {};
        imports.forEach(imp => {
            statusCounts[imp.overallStatus || 'Unknown'] = (statusCounts[imp.overallStatus || 'Unknown'] || 0) + 1;
        });

        const labels = Object.keys(statusCounts);
        const data = Object.values(statusCounts);

        return {
            labels: labels,
            datasets: [
                {
                    label: 'Number of Imports',
                    data: data,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)', // Delivered (greenish)
                        'rgba(54, 162, 235, 0.6)', // Customs Clearance (bluish)
                        'rgba(153, 102, 255, 0.6)', // At Port (purple)
                        'rgba(255, 206, 86, 0.6)',  // Shipment Confirmed (yellow)
                        'rgba(201, 203, 207, 0.6)', // Order Placed (gray)
                        'rgba(255, 99, 132, 0.6)', // Other (reddish)
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(201, 203, 207, 1)',
                        'rgba(255, 99, 132, 1)',
                    ],
                    borderWidth: 1,
                },
            ],
        };
    }, [imports]);

    const chartColors = useMemo(() => ({
        ticks: theme === 'dark' ? '#9CA3AF' : '#6B7280', // Gray-400 / Gray-500
        grid: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    }), [theme]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: theme === 'dark' ? '#E5E7EB' : '#4B5563', // Gray-200 / Gray-700
                },
            },
            title: {
                display: true,
                text: 'Imports by Status',
                color: theme === 'dark' ? '#FFFFFF' : '#1F2937', // White / Gray-800
            },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y;
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: chartColors.ticks,
                },
                grid: {
                    color: chartColors.grid,
                },
            },
            y: {
                ticks: {
                    color: chartColors.ticks,
                },
                grid: {
                    color: chartColors.grid,
                },
            },
        },
    }), [theme, chartColors]);

    return (
        <div className="p-4 sm:p-6 bg-brand-light min-h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* KPI Cards */}
                <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-md p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Imports</p>
                        <p className="text-3xl font-bold text-brand-primary dark:text-white mt-1">{kpis.totalImports}</p>
                    </div>
                    <Layers size={48} className="text-brand-accent opacity-20" />
                </div>
                <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-md p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Imports In Progress</p>
                        <p className="text-3xl font-bold text-brand-primary dark:text-white mt-1">{kpis.inProgressImports}</p>
                    </div>
                    <Truck size={48} className="text-blue-500 opacity-20" />
                </div>
                <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-md p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Imports Delivered</p>
                        <p className="text-3xl font-bold text-brand-primary dark:text-white mt-1">{kpis.deliveredImports}</p>
                    </div>
                    <CheckCircle size={48} className="text-green-500 opacity-20" />
                </div>

                {/* Risk & Alert KPIs */}
                <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-md p-6 flex items-center justify-between col-span-1 lg:col-span-2">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Imports At Risk (Demurrage/Overdue)</p>
                        <p className="text-3xl font-bold text-red-500 dark:text-red-400 mt-1">{kpis.importsAtRisk}</p>
                    </div>
                    <AlertTriangle size={48} className="text-red-500 opacity-20" />
                </div>
                <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-md p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">My Overdue Tasks</p>
                        <p className="text-3xl font-bold text-red-500 dark:text-red-400 mt-1">{kpis.totalOverdueTasks}</p>
                    </div>
                    <ListChecks size={48} className="text-red-500 opacity-20" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Imports by Status Chart */}
                <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-md p-6">
                    <div style={{ height: '300px' }}>
                        <Bar data={importsByStatusData} options={chartOptions} />
                    </div>
                </div>

                {/* Exchange Rates */}
                <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                        <DollarSign /> Exchange Rates
                        <button onClick={() => setIsRatesModalOpen(true)} className="ml-auto p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                            <Edit size={16} />
                        </button>
                    </h3>
                    {ratesLoading ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 size={24} className="animate-spin text-brand-accent" />
                            <p className="ml-2 text-gray-600 dark:text-gray-300">Loading rates...</p>
                        </div>
                    ) : ratesError ? (
                        <div className="flex items-center justify-center h-24 text-red-600 dark:text-red-400">
                            <AlertCircleIcon size={20} className="mr-2" /> {ratesError}
                        </div>
                    ) : exchangeRates ? (
                        <div className="space-y-3 text-gray-700 dark:text-gray-300">
                            <p className="text-sm">Last updated: {exchangeRates.date} {exchangeRates.time}</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">USD/BRL:</div>
                                <div>Compra: {exchangeRates.usd.compra.toFixed(4)} | Venda: {exchangeRates.usd.venda.toFixed(4)}</div>
                                <div className="font-medium">EUR/BRL:</div>
                                <div>Compra: {exchangeRates.eur.compra.toFixed(4)} | Venda: {exchangeRates.eur.venda.toFixed(4)}</div>
                                <div className="font-medium">CNY/BRL:</div>
                                <div>{exchangeRates.cny.toFixed(4)}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-24 text-gray-500 dark:text-gray-400">
                            No exchange rates available.
                        </div>
                    )}
                </div>

                {/* Other KPI Cards (Demurrage, Claims, Overdue Payments) */}
                <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-md p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Demurrage Cost (Active)</p>
                        <p className="text-3xl font-bold text-brand-danger dark:text-red-300 mt-1">USD {kpis.totalDemurrageCostUSD}</p>
                    </div>
                    <Clock size={48} className="text-brand-danger opacity-20" />
                </div>
                <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-md p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Open Claims</p>
                        <p className="text-3xl font-bold text-brand-accent dark:text-sky-300 mt-1">{kpis.openClaims} / {kpis.totalClaims}</p>
                    </div>
                    <FileWarning size={48} className="text-brand-accent opacity-20" />
                </div>
                <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-md p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue Payments</p>
                        <p className="text-3xl font-bold text-brand-danger dark:text-red-300 mt-1">USD {kpis.totalOverduePaymentsUSD}</p>
                    </div>
                    <DollarSign size={48} className="text-brand-danger opacity-20" />
                </div>
            </div>

            {/* Exchange Rates Modal */}
            {isRatesModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in-down">
                    <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-md transform transition-all animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                            <h3 className="text-lg font-bold text-brand-primary dark:text-white">Set Exchange Rates</h3>
                            <button onClick={() => setIsRatesModalOpen(false)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {manualRatesError && <div className="bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 p-3 rounded-lg flex items-center gap-2"><AlertCircleIcon size={18} /> {manualRatesError}</div>}
                            <div>
                                <label htmlFor="usdCompra" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">USD Compra</label>
                                <input type="number" step="0.0001" id="usdCompra" value={manualUSDCompra} onChange={(e) => setManualUSDCompra(e.target.value)} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" />
                            </div>
                            <div>
                                <label htmlFor="usdVenda" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">USD Venda</label>
                                <input type="number" step="0.0001" id="usdVenda" value={manualUSDVenda} onChange={(e) => setManualUSDVenda(e.target.value)} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" />
                            </div>
                            <div>
                                <label htmlFor="eurCompra" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">EUR Compra</label>
                                <input type="number" step="0.0001" id="eurCompra" value={manualEURCompra} onChange={(e) => setManualEURCompra(e.target.value)} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" />
                            </div>
                            <div>
                                <label htmlFor="eurVenda" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">EUR Venda</label>
                                <input type="number" step="0.0001" id="eurVenda" value={manualEURVenda} onChange={(e) => setManualEURVenda(e.target.value)} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" />
                            </div>
                            <div>
                                <label htmlFor="cny" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNY (to BRL)</label>
                                <input type="number" step="0.0001" id="cny" value={manualCNY} onChange={(e) => setManualCNY(e.target.value)} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={() => setIsRatesModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent">Cancel</button>
                            <button onClick={handleSaveRates} className="px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-brand-accent">Save Rates</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;