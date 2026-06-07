// src/components/import-detail/CostSection.tsx

import React from 'react';
import { DollarSign } from 'lucide-react';
import type { CostItem, ExchangeRates, Currency } from '../../types';

interface CostSectionProps {
    costs: CostItem[];
    exchangeRates: ExchangeRates | null;
}

const CostSection: React.FC<CostSectionProps> = ({ costs, exchangeRates }) => {
    const convertToBRL = (value: number, currency: Currency): number => {
        if (!exchangeRates) return 0;
        switch(currency) {
            case 'USD': return value * exchangeRates.usd.venda;
            case 'EUR': return value * exchangeRates.eur.venda;
            case 'CNY': return value * exchangeRates.cny;
            default: return value;
        }
    };

    const totalCostBRL = costs.reduce((sum, cost) => sum + convertToBRL(cost.value, cost.currency), 0);

    return (
    <div className="lg:col-span-2">
        <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-3 flex items-center gap-2"><DollarSign size={20} /> Costs</h3>
        {costs && costs.length > 0 ? (
            <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-100 dark:bg-brand-accent/20">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Category</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Description</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Value</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                        </tr>
                    </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {costs.map(cost => (
                            <tr key={cost.id} className="hover:bg-gray-50 dark:hover:bg-brand-primary">
                                <td className="p-3 font-medium text-brand-secondary dark:text-gray-200">{cost.category}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{cost.description}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{cost.currency} {cost.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{cost.status}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-brand-accent/20">
                        <tr>
                            <td colSpan={2} className="p-3 text-right font-bold text-brand-primary dark:text-white">Total Estimated (BRL)</td>
                            <td colSpan={2} className="p-3 font-bold text-brand-primary dark:text-white">
                                R$ {totalCostBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        ) : (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400 border border-dashed dark:border-gray-600 rounded-lg">
                No cost items have been added to this import.
            </div>
        )}
    </div>
)};

export default CostSection;
