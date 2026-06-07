// src/components/CashFlow.tsx

import React, { useState, useMemo } from 'react';
import { Currency, PaymentStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, endOfMonth, addMonths, endOfYear } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAppData, useUI } from '../context/AppContext';

const CashFlow: React.FC = () => {
    const { imports } = useAppData();
    const { theme, exchangeRates } = useUI();
    const [dateRange, setDateRange] = useState<'this_month' | 'next_3_months' | 'this_year'>('next_3_months');

    const { startDate, endDate } = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        switch (dateRange) {
            case 'this_month':
                return { startDate: new Date(today.getFullYear(), today.getMonth(), 1), endDate: endOfMonth(today) };
            case 'next_3_months':
                return { startDate: new Date(today.getFullYear(), today.getMonth(), 1), endDate: endOfMonth(addMonths(today, 2)) };
            case 'this_year':
                 return { startDate: new Date(today.getFullYear(), 0, 1), endDate: endOfYear(today) };
            default:
                return { startDate: today, endDate: addMonths(today, 3) };
        }
    }, [dateRange]);

    const projectionData = useMemo(() => {
        if (!exchangeRates) {
            return { chartData: [], tableData: [] };
        }

        const allPayments = imports.flatMap(imp => 
            imp.costs.map(cost => ({...cost, importNumber: imp.importNumber, importId: imp.id}))
        );

        const convertToBRL = (value: number, currency: Currency) => {
            switch(currency) {
                case 'USD': return value * exchangeRates.usd.venda;
                case 'EUR': return value * exchangeRates.eur.venda;
                case 'CNY': return value * exchangeRates.cny;
                case 'BRL': return value;
                default: return value; // No conversion if unknown
            }
        };

        const monthlyTotals: { [key: string]: { projected: number, actual: number } } = {};
        
        let currentDate = new Date(startDate);
        while(currentDate <= endDate) {
            const monthKey = format(currentDate, 'yyyy-MM');
            monthlyTotals[monthKey] = { projected: 0, actual: 0 };
            currentDate = addMonths(currentDate, 1);
        }

        allPayments.forEach(payment => {
            // Actual paid amounts
            if (payment.status === PaymentStatus.Paid && payment.paymentDate) {
                 const paymentDate = new Date(payment.paymentDate  + 'T00:00:00Z');
                 if (paymentDate >= startDate && paymentDate <= endDate) {
                    const monthKey = format(paymentDate, 'yyyy-MM');
                    if (monthlyTotals[monthKey]) {
                        monthlyTotals[monthKey].actual += convertToBRL(payment.value, payment.currency);
                    }
                 }
            }
            // Projected amounts for unpaid items
            if (payment.status !== PaymentStatus.Paid && payment.status !== PaymentStatus.Cancelled && payment.dueDate) {
                const dueDate = new Date(payment.dueDate  + 'T00:00:00Z');
                if (dueDate >= startDate && dueDate <= endDate) {
                    const monthKey = format(dueDate, 'yyyy-MM');
                     if (monthlyTotals[monthKey]) {
                        // Prioritize provisioned amount (assumed to be in BRL), otherwise use converted total value
                        const projectedValue = payment.monthlyProvision && payment.monthlyProvision > 0 
                            ? payment.monthlyProvision
                            : convertToBRL(payment.value, payment.currency);
                        monthlyTotals[monthKey].projected += projectedValue;
                    }
                }
            }
        });

        const chartData = Object.entries(monthlyTotals)
            .map(([month, totals]) => ({
                name: format(new Date(month  + '-02'), 'MMM yyyy'),
                'Projected Expense': totals.projected,
                'Actual Expense': totals.actual,
            }))
            .sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());
            
        const tableData = allPayments.filter(cost => 
            cost.status !== PaymentStatus.Paid && cost.status !== PaymentStatus.Cancelled && 
            cost.dueDate &&
            new Date(cost.dueDate) >= startDate &&
            new Date(cost.dueDate) <= endDate
        ).sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

        return { chartData, tableData };

    }, [imports, startDate, endDate, exchangeRates]);
    
    const tickColor = theme === 'dark' ? '#A9A9A9' : '#708090';
    const currencyFormatter = (value: number) => `R$${(value/1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`;

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-brand-gray-500 dark:text-white">Cash Flow: Projected vs Actual (BRL)</h2>
                        <p className="text-sm text-brand-gray-400 dark:text-gray-400">Forecast of upcoming expenses vs. actual payments made in the period.</p>
                    </div>
                     <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-brand-primary rounded-lg self-start sm:self-center">
                        {(['this_month', 'next_3_months', 'this_year'] as const).map(range => (
                            <button 
                                key={range} 
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${dateRange === range ? 'bg-white dark:bg-brand-accent shadow text-brand-gray-500 dark:text-white' : 'text-brand-gray-400 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-brand-accent/50'}`}
                            >
                                {range.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="h-80 mt-8">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={projectionData.chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}/>
                            <XAxis dataKey="name" stroke={tickColor} />
                            <YAxis stroke={tickColor} width={80} tickFormatter={currencyFormatter} />
                            <Tooltip formatter={(value: number) => `R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} contentStyle={{ backgroundColor: theme === 'dark' ? '#022C43' : 'white', border: '1px solid #374151' }} cursor={{fill: theme === 'dark' ? 'rgba(113, 199, 232, 0.1)' : 'rgba(200, 200, 0.1)'}}/>
                            <Legend wrapperStyle={{color: tickColor}}/>
                            <Bar dataKey="Projected Expense" fill={theme === 'dark' ? '#708090' : '#A9A9A9'} />
                            <Bar dataKey="Actual Expense" fill={theme === 'dark' ? '#7ac7e8' : '#36454F'} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
             <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-brand-gray-500 dark:text-white mb-4">Pending Payments in Period</h3>
                 <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-brand-accent/20 sticky top-0">
                            <tr>
                                <th className="p-3 font-semibold text-brand-gray-400 dark:text-gray-300">Due Date</th>
                                <th className="p-3 font-semibold text-brand-gray-400 dark:text-gray-300">Import #</th>
                                <th className="p-3 font-semibold text-brand-gray-400 dark:text-gray-300">Category</th>
                                <th className="p-3 font-semibold text-brand-gray-400 dark:text-gray-300 text-right">Amount / Provision</th>
                                <th className="p-3 font-semibold text-brand-gray-400 dark:text-gray-300">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                           {projectionData.tableData.length > 0 ? projectionData.tableData.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-brand-primary">
                                    <td className="p-3 font-medium text-brand-gray-500 dark:text-gray-300">{new Date(item.dueDate!  + 'T00:00:00Z').toLocaleDateString()}</td>
                                    <td className="p-3 font-medium text-brand-gray-500 dark:text-gray-200">
                                      <Link to={`/imports/${item.importId}`} className="hover:underline text-brand-gray-400 dark:text-brand-gray-300 hover:text-brand-gray-500">{item.importNumber}</Link>
                                    </td>
                                    <td className="p-3 text-brand-gray-400 dark:text-gray-300">{item.category}</td>
                                    <td className="p-3 text-brand-gray-500 dark:text-gray-300 text-right">
                                        {item.monthlyProvision ? 
                                         <span title={`Original Value: ${item.currency} ${item.value.toFixed(2)}`}>
                                            R$ {item.monthlyProvision.toFixed(2)} (Prov.)
                                         </span>
                                         : `${item.currency} ${item.value.toFixed(2)}`}
                                    </td>
                                    <td className="p-3 text-brand-gray-400 dark:text-gray-300">{item.status}</td>
                                </tr>
                           )) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-brand-gray-400 dark:text-gray-400">No pending payments in the selected date range.</td>
                                </tr>
                           )}
                        </tbody>
                    </table>
                 </div>
             </div>
        </div>
    );
};

export default CashFlow;