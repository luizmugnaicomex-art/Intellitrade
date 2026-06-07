// src/components/Calculations.tsx

import React, { useState, useMemo } from 'react';
import type { ImportProcess, ExchangeRates, Currency, CostItem, NCMEntry } from '../types';
import { Calculator, AlertCircle, ChevronsRight, Loader, Info, MinusCircle, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData, useUI } from '../context/AppContext';

// Based on "COMPARATIVO DE VALORES DE ARMAZENAGEM - TECON Contra proposta.xlsx"
// This is a simplified simulation. A real implementation would need period-based calculations.
// We use a simplified single-period cost for demonstration.
const WAREHOUSE_FEES: Record<string, { percent: number; min: number; desc: string }> = {
    'none': { percent: 0, min: 0, desc: 'No Simulation' },
    'Intermarítima': { percent: 0.003, min: 500, desc: 'Intermarítima (0.30%, min R$500.00)' },
    'TPC': { percent: 0.003, min: 500, desc: 'TPC (0.30%, min R$500.00)' },
    'Empório': { percent: 0.003, min: 500, desc: 'Empório (0.30%, min R$500.00)' },
    'Tecon': { percent: 0.0015, min: 1342.55, desc: 'Tecon (0.15%, min R$1342.55)' },
};

const Calculations: React.FC = () => {
    const { imports, ncms } = useAppData();
    const { exchangeRates, ratesLoading } = useUI();

    const [selectedImportId, setSelectedImportId] = useState<string>('');
    
    // Simulation states
    const [simExTariff, setSimExTariff] = useState(false);
    const [simAdditionalFees, setSimAdditionalFees] = useState(0);
    const [simWarehouse, setSimWarehouse] = useState('none');
    const [simStorageDays, setSimStorageDays] = useState(15);
    
    const selectedImport = useMemo(() => {
        return imports.find(imp => imp.id === selectedImportId);
    }, [selectedImportId, imports]);

    const calculateLandedCostBRL = (
        imp: ImportProcess, 
        rates: ExchangeRates, 
        isSimulation: boolean
    ): { total: number, breakdown: Record<string, number> } => {
        const breakdown: Record<string, number> = {};

        const convertToBRL = (value: number, currency: Currency): number => {
            switch(currency) {
                case 'USD': return value * rates.usd.venda;
                case 'EUR': return value * rates.eur.venda;
                case 'CNY': return value * rates.cny;
                default: return value;
            }
        };

        imp.costs.forEach(cost => {
            let costInBRL = convertToBRL(cost.value, cost.currency);

            if (isSimulation && cost.category === 'II' && simExTariff) {
                costInBRL *= (100 - (imp.exTariff || 0)) / 100; 
            }
            
            breakdown[cost.category] = (breakdown[cost.category] || 0) + costInBRL;
        });

        if (isSimulation) {
            if (simWarehouse !== 'none') {
                const warehouse = WAREHOUSE_FEES[simWarehouse];
                const fob = breakdown['FOB'] || 0;
                const freight = breakdown['International Freight'] || 0;
                const insurance = breakdown['Insurance'] || 0;
                const cifValue = fob + freight + insurance;
                
                // Simplified: assuming 'periods' are roughly 15 days each.
                const periods = Math.ceil(simStorageDays / 15);
                const costPerPeriod = Math.max(cifValue * warehouse.percent, warehouse.min);
                const totalWarehouseCost = costPerPeriod * periods;
                breakdown['Simulated Warehouse'] = totalWarehouseCost;
            }
            if (simAdditionalFees > 0) {
                breakdown['Simulated Additional Fees'] = simAdditionalFees;
            }
        }
        
        const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

        return { total, breakdown };
    };

    const costAnalysis = useMemo(() => {
        if (!selectedImport || !exchangeRates) return null;
        
        const original = calculateLandedCostBRL(selectedImport, exchangeRates, false);
        const simulated = calculateLandedCostBRL(selectedImport, exchangeRates, true);

        return { original, simulated };
    }, [selectedImport, exchangeRates, simExTariff, simAdditionalFees, simWarehouse, simStorageDays]);

    const handleSelectImport = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const impId = e.target.value;
        setSelectedImportId(impId);
        // Reset simulation when import changes
        const imp = imports.find(i => i.id === impId);
        setSimExTariff(!!imp?.exTariff);
        setSimAdditionalFees(0);
        setSimWarehouse('none');
    };

    const CostCard: React.FC<{title: string, analysis: { total: number, breakdown: Record<string, number> } | null, isSimulated?: boolean}> = ({ title, analysis, isSimulated }) => (
        <div className={`p-6 rounded-xl shadow-md ${isSimulated ? 'bg-sky-50 dark:bg-sky-900/40 border-2 border-sky-400' : 'bg-white dark:bg-brand-secondary'}`}>
            <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-2">{title}</h3>
            <p className="text-3xl font-bold text-brand-secondary dark:text-gray-100 mb-4">
                R$ {analysis?.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
            </p>
            <div className="space-y-2 text-sm max-h-60 overflow-y-auto pr-2">
                {analysis && Object.entries(analysis.breakdown).map(([category, value]) => (
                     <div key={category} className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                        <span>{category}</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">R$ {(value as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                ))}
            </div>
        </div>
    );
    
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2"><Calculator /> Cost Calculation & Simulation</h2>
                    <select
                        value={selectedImportId}
                        onChange={handleSelectImport}
                        className="w-full md:w-96 p-2 border dark:border-brand-accent rounded-lg text-sm bg-white dark:bg-brand-primary dark:text-gray-200"
                    >
                        <option value="">-- Select an Import Process to Analyze --</option>
                        {imports.map(imp => (
                            <option key={imp.id} value={imp.id}>
                                {imp.importNumber} / BL: {imp.blNumber}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedImport && (
                <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                    <Info size={32} className="mx-auto mb-2" />
                    Please select an import process to begin a cost simulation.
                </div>
            )}
            
            {ratesLoading && (
                 <div className="text-center p-8 text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                    <Loader className="animate-spin" /> Fetching latest exchange rates...
                </div>
            )}
            
            {selectedImport && !ratesLoading && !exchangeRates && (
                 <div className="text-center p-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/50 rounded-lg">
                    <AlertCircle size={32} className="mx-auto mb-2" />
                    Could not load exchange rates. Cost calculation is unavailable.
                </div>
            )}

            {selectedImport && exchangeRates && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                        <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-4">Simulation Controls</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={simExTariff} onChange={e => setSimExTariff(e.target.checked)} className="h-5 w-5 rounded text-brand-accent focus:ring-brand-accent" />
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Simulate EX Tariff ({selectedImport.exTariff}%) Benefit</span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Additional Fees (BRL)</label>
                                <input
                                    type="number"
                                    value={simAdditionalFees}
                                    onChange={e => setSimAdditionalFees(Number(e.target.value))}
                                    className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Bonded Warehouse Simulation</label>
                                <select 
                                    value={simWarehouse} 
                                    onChange={e => setSimWarehouse(e.target.value)}
                                    className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md"
                                >
                                    {Object.entries(WAREHOUSE_FEES).map(([key, value]) => (
                                        <option key={key} value={key}>{value.desc}</option>
                                    ))}
                                </select>
                                {simWarehouse !== 'none' && (
                                     <div className="mt-2">
                                        <label className="block text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">Storage Days (QTY DAYS)</label>
                                        <input
                                            type="number"
                                            value={simStorageDays}
                                            onChange={e => setSimStorageDays(Number(e.target.value))}
                                            className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md"
                                        />
                                     </div>
                                )}
                            </div>
                        </div>
                    </div>
                     <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <CostCard title="Original Cost" analysis={costAnalysis?.original || null} />
                        <CostCard title="Simulated Cost" analysis={costAnalysis?.simulated || null} isSimulated />
                        {costAnalysis && (
                             <div className="md:col-span-2 p-6 rounded-xl bg-gray-800 text-white shadow-lg flex items-center justify-center gap-6">
                                <div>
                                    <p className="text-sm text-gray-400">Difference</p>
                                    <p className={`text-2xl font-bold ${costAnalysis.simulated.total > costAnalysis.original.total ? 'text-red-400' : 'text-green-400'}`}>
                                        {costAnalysis.simulated.total > costAnalysis.original.total ? <PlusCircle className="inline mr-1" size={20}/> : <MinusCircle className="inline mr-1" size={20}/>}
                                        R$ {(Math.abs(costAnalysis.simulated.total - costAnalysis.original.total)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <ChevronsRight size={32} className="text-gray-600"/>
                                <div>
                                    <p className="text-sm text-gray-400">% Change</p>
                                     <p className={`text-2xl font-bold ${costAnalysis.simulated.total > costAnalysis.original.total ? 'text-red-400' : 'text-green-400'}`}>
                                        {costAnalysis.original.total > 0 ? 
                                            (((costAnalysis.simulated.total - costAnalysis.original.total) / costAnalysis.original.total) * 100).toFixed(2) : 0
                                        }%
                                    </p>
                                </div>
                            </div>
                        )}
                     </div>
                 </div>
            )}
        </div>
    );
};

export default Calculations;