
// src/components/DraftDI.tsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { ImportProcess, NCMEntry, DraftDIData, DraftDIAddition } from '../types';
import { FileBadge, Save, HardHat, DollarSign, Package, Calculator, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { useTranslation } from '../translations';
import { v4 as uuidv4 } from 'uuid';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const DraftDI: React.FC = () => {
    const { t } = useTranslation();
    const { imports, ncms } = useAppData();
    const { updateImport } = useAppActions();
    const { exchangeRates } = useUI();
    
    const [selectedImportId, setSelectedImportId] = useState<string>('');
    const [draftData, setDraftData] = useState<DraftDIData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const eligibleImports = useMemo(() => {
        return imports.filter(imp => imp.diNumber === undefined || imp.diNumber === '');
    }, [imports]);

    const selectedImport = useMemo(() => {
        return imports.find(imp => imp.id === selectedImportId);
    }, [imports, selectedImportId]);

    const findNcmRates = useCallback((ncmCode: string) => {
        return ncms.find(n => n.code.replace(/\D/g, '') === ncmCode.replace(/\D/g, ''))?.taxes;
    }, [ncms]);

    const calculatedTaxes = useMemo(() => {
        if (!draftData || !exchangeRates) return null;

        const exchangeRate = exchangeRates.usd.venda;
        let totalII = 0;
        let totalIPI = 0;
        let totalPIS = 0;
        let totalCOFINS = 0;
        let totalICMS = 0;
        
        const totalFreightUSD = draftData.freightUSD || 0;
        const totalInsuranceUSD = draftData.insuranceUSD || 0;
        const totalFOB_USD = draftData.additions.reduce((sum, add) => sum + (add.unitValueUSD * add.quantity), 0);
        
        if (totalFOB_USD === 0) return { ii: 0, ipi: 0, pis: 0, cofins: 0, icms: 0, totalBRL: 0 };

        const customsValueBRL = (totalFOB_USD + totalFreightUSD + totalInsuranceUSD) * exchangeRate;

        draftData.additions.forEach(addition => {
            const itemFobUSD = addition.unitValueUSD * addition.quantity;
            const itemPortionOfCIF = (itemFobUSD / totalFOB_USD);
            const itemCustomsValueBRL = customsValueBRL * itemPortionOfCIF;

            const ncmRates = findNcmRates(addition.ncm);
            if (ncmRates) {
                const ii = itemCustomsValueBRL * (ncmRates.ii / 100);
                const ipi = (itemCustomsValueBRL + ii) * (ncmRates.ipi / 100);
                
                const pisCofinsBase = itemCustomsValueBRL;
                const pis = pisCofinsBase * (ncmRates.pis / 100);
                const cofins = pisCofinsBase * (ncmRates.cofins / 100);
                
                // Detailed ICMS calculation base
                const icmsBase = (itemCustomsValueBRL + ii + ipi + pis + cofins) / (1 - (ncmRates.icms / 100));
                const icms = icmsBase * (ncmRates.icms / 100);

                totalII += ii;
                totalIPI += ipi;
                totalPIS += pis;
                totalCOFINS += cofins;
                totalICMS += icms;
            }
        });

        const totalBRL = totalII + totalIPI + totalPIS + totalCOFINS + totalICMS;

        return {
            ii: totalII,
            ipi: totalIPI,
            pis: totalPIS,
            cofins: totalCOFINS,
            icms: totalICMS,
            totalBRL: totalBRL,
        };
    }, [draftData, exchangeRates, findNcmRates]);


    useEffect(() => {
        if (selectedImport) {
            if (selectedImport.draftDiData) {
                setDraftData(selectedImport.draftDiData);
            } else {
                // Create a new draft from import data
                const freightCost = selectedImport.costs.find(c => c.category === 'International Freight');
                const insuranceCost = selectedImport.costs.find(c => c.category === 'Insurance');

                const newDraft: DraftDIData = {
                    freightUSD: freightCost?.currency === 'USD' ? freightCost.value : 0,
                    insuranceUSD: insuranceCost?.currency === 'USD' ? insuranceCost.value : 0,
                    additions: selectedImport.products.map(p => ({
                        id: uuidv4(),
                        ncm: p.ncm,
                        description: p.name,
                        quantity: p.quantity,
                        unitValueUSD: p.unitValue, // Assuming product unitValue is USD
                        netWeightKg: p.netWeight || 0,
                    })),
                    exchangeRateUSD: exchangeRates?.usd.venda || 0,
                };
                setDraftData(newDraft);
            }
        } else {
            setDraftData(null);
        }
    }, [selectedImport, exchangeRates, imports]);

    const handleAdditionChange = (id: string, field: keyof DraftDIAddition, value: string | number) => {
        if (!draftData) return;
        const newAdditions = draftData.additions.map(add => {
            if (add.id === id) {
                return { ...add, [field]: value };
            }
            return add;
        });
        setDraftData({ ...draftData, additions: newAdditions });
    };

    const handleAddAddition = () => {
        if (!draftData) return;
        const newAddition: DraftDIAddition = {
            id: uuidv4(), ncm: '', description: 'New Item', quantity: 1, unitValueUSD: 0, netWeightKg: 0
        };
        setDraftData({ ...draftData, additions: [...draftData.additions, newAddition] });
    };

    const handleRemoveAddition = (id: string) => {
        if (!draftData) return;
        setDraftData({ ...draftData, additions: draftData.additions.filter(add => add.id !== id) });
    };
    
    const handleSaveDraft = async () => {
        if (!selectedImport || !draftData) return;
        setIsLoading(true);
        const updatedImport = {
            ...selectedImport,
            draftDiData: {
                ...draftData,
                calculatedTaxes: calculatedTaxes || undefined,
                exchangeRateUSD: exchangeRates?.usd.venda || draftData.exchangeRateUSD,
            }
        };
        try {
            await updateImport(updatedImport);
            // Success notification is handled by App.tsx
        } catch (e) {
            console.error("Failed to save draft DI", e);
        } finally {
            setIsLoading(false);
        }
    };


    const TaxRow: React.FC<{label: string, value?: number}> = ({label, value}) => (
        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
                {value != null ? `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '...'}
            </span>
        </div>
    );
    
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                    <FileBadge /> {t('draftDI')}
                </h2>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <label htmlFor="import-select" className="font-medium text-gray-700 dark:text-gray-300">Select Import Process:</label>
                    <select
                        id="import-select"
                        value={selectedImportId}
                        onChange={e => setSelectedImportId(e.target.value)}
                        className="w-full md:w-1/2 p-2 border dark:border-brand-accent rounded-lg text-sm bg-white dark:bg-brand-primary dark:text-gray-200"
                    >
                        <option value="">-- Select an Import --</option>
                        {eligibleImports.map(imp => (
                            <option key={imp.id} value={imp.id}>
                                {imp.importNumber} / BL: {imp.blNumber}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedImport && draftData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-down">
                    {/* Main DI Form Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header Info */}
                        <div className="bg-white dark:bg-brand-secondary p-4 rounded-xl shadow-md">
                            <h3 className="font-semibold text-brand-primary dark:text-white mb-3">Header Information</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><strong className="block text-gray-500">Importer:</strong> BYD DO BRASIL LTDA</div>
                                <div><strong className="block text-gray-500">Exporter:</strong> {selectedImport.supplier}</div>
                                <div><strong className="block text-gray-500">BL Number:</strong> {selectedImport.blNumber}</div>
                                <div><strong className="block text-gray-500">Vessel:</strong> {selectedImport.vesselName || 'N/A'}</div>
                            </div>
                        </div>

                        {/* Financials */}
                         <div className="bg-white dark:bg-brand-secondary p-4 rounded-xl shadow-md">
                            <h3 className="font-semibold text-brand-primary dark:text-white mb-3 flex items-center gap-2"><DollarSign size={18}/> Financials</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Freight (USD)</label>
                                    <input type="number" step="0.01" value={draftData.freightUSD} onChange={e => setDraftData({...draftData, freightUSD: parseFloat(e.target.value) || 0})} className="w-full p-2 border dark:border-brand-accent rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Insurance (USD)</label>
                                    <input type="number" step="0.01" value={draftData.insuranceUSD} onChange={e => setDraftData({...draftData, insuranceUSD: parseFloat(e.target.value) || 0})} className="w-full p-2 border dark:border-brand-accent rounded" />
                                </div>
                            </div>
                        </div>

                        {/* Additions */}
                        <div className="bg-white dark:bg-brand-secondary p-4 rounded-xl shadow-md">
                            <h3 className="font-semibold text-brand-primary dark:text-white mb-3 flex items-center gap-2"><Package size={18}/> Additions ({draftData.additions.length})</h3>
                            <div className="space-y-3">
                                {draftData.additions.map((add) => (
                                    <div key={add.id} className="grid grid-cols-12 gap-2 items-center border p-2 rounded-lg dark:border-gray-700">
                                        <div className="col-span-3"><input type="text" placeholder="NCM" value={add.ncm} onChange={e => handleAdditionChange(add.id, 'ncm', e.target.value)} className="w-full p-1 text-xs border rounded"/></div>
                                        <div className="col-span-5"><input type="text" placeholder="Description" value={add.description} onChange={e => handleAdditionChange(add.id, 'description', e.target.value)} className="w-full p-1 text-xs border rounded"/></div>
                                        <div className="col-span-1"><input type="number" placeholder="Qty" value={add.quantity} onChange={e => handleAdditionChange(add.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full p-1 text-xs border rounded"/></div>
                                        <div className="col-span-2"><input type="number" placeholder="Unit Val (USD)" step="0.01" value={add.unitValueUSD} onChange={e => handleAdditionChange(add.id, 'unitValueUSD', parseFloat(e.target.value) || 0)} className="w-full p-1 text-xs border rounded"/></div>
                                        <div className="col-span-1"><button onClick={() => handleRemoveAddition(add.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={14}/></button></div>
                                    </div>
                                ))}
                                <button onClick={handleAddAddition} className="text-sm text-sky-600 flex items-center gap-1"><PlusCircle size={14}/> Add Addition</button>
                            </div>
                        </div>

                    </div>

                    {/* Tax Calculation Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-brand-secondary p-4 rounded-xl shadow-md sticky top-6">
                             <h3 className="font-semibold text-brand-primary dark:text-white mb-3 flex items-center gap-2"><Calculator size={18}/> Tax Calculation Summary</h3>
                             {!exchangeRates && <div className="p-2 text-sm bg-amber-100 text-amber-800 rounded-md"><AlertCircle size={16} className="inline mr-1"/> Exchange rates not loaded. Calculation may be inaccurate.</div>}
                             <TaxRow label="II" value={calculatedTaxes?.ii} />
                             <TaxRow label="IPI" value={calculatedTaxes?.ipi} />
                             <TaxRow label="PIS" value={calculatedTaxes?.pis} />
                             <TaxRow label="COFINS" value={calculatedTaxes?.cofins} />
                             <TaxRow label="ICMS" value={calculatedTaxes?.icms} />
                             <div className="flex justify-between items-center py-2 mt-2 font-bold text-lg border-t-2 border-brand-accent">
                                <span className="text-brand-primary dark:text-white">TOTAL TAXES (BRL)</span>
                                <span className="text-brand-primary dark:text-white">R$ {calculatedTaxes?.totalBRL.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? '...'}</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-brand-secondary p-4 rounded-xl shadow-md">
                            <h3 className="font-semibold text-brand-primary dark:text-white mb-3">Actions</h3>
                            <div className="space-y-3">
                                <button onClick={handleSaveDraft} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-brand-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary disabled:opacity-50">
                                    <Save size={18}/> {isLoading ? 'Saving...' : 'Save Draft DI'}
                                </button>
                                <button disabled className="w-full flex items-center justify-center gap-2 bg-gray-300 text-gray-500 px-4 py-2 rounded-lg font-semibold cursor-not-allowed">
                                    <HardHat size={18}/> Generate Official DI (Coming Soon)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DraftDI;
