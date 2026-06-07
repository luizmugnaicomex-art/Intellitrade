
import React, { useMemo } from 'react';
import type { ImportProcess, Claim, ExchangeRates, Currency } from '../types';
import { Star, BarChart, FileWarning, Clock, AlertTriangle, Handshake } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { useAppData, useUI } from '../context/AppContext';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-slate-100 dark:bg-brand-primary/80 p-3 rounded-lg">
        <div className="flex items-center gap-3">
            <div className="text-brand-accent">{icon}</div>
            <div>
                <p className="text-xs text-brand-gray-500 dark:text-gray-400">{title}</p>
                <p className="font-semibold text-brand-gray-500 dark:text-white truncate">{value}</p>
            </div>
        </div>
    </div>
);

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => {
    const totalStars = 5;
    let stars = [];
    for (let i = 1; i <= totalStars; i++) {
        stars.push(
            <Star key={i} size={20} className={i <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600 fill-gray-300 dark:fill-gray-600"} />
        );
    }
    return <div className="flex">{stars}</div>;
};

const SupplierEvaluation: React.FC = () => {
    const { imports, claims } = useAppData();
    const { exchangeRates } = useUI();

    const supplierData = useMemo(() => {
        const suppliersMap = new Map<string, {
            imports: ImportProcess[],
            claims: Claim[]
        }>();

        imports.forEach(imp => {
            if (!suppliersMap.has(imp.supplier)) {
                suppliersMap.set(imp.supplier, { imports: [], claims: [] });
            }
            suppliersMap.get(imp.supplier)!.imports.push(imp);
        });

        claims.forEach(claim => {
            const imp = imports.find(i => i.id === claim.importId);
            if (imp && suppliersMap.has(imp.supplier)) {
                suppliersMap.get(imp.supplier)!.claims.push(claim);
            }
        });

        const convertToBRL = (value: number, currency: Currency): number => {
            if (!exchangeRates) return 0;
            switch(currency) {
                case 'USD': return value * exchangeRates.usd.venda;
                case 'EUR': return value * exchangeRates.eur.venda;
                case 'CNY': return value * exchangeRates.cny;
                default: return value;
            }
        };

        return Array.from(suppliersMap.entries()).map(([name, data]) => {
            const totalImports = data.imports.length;
            
            let totalLeadTime = 0;
            let leadTimeCount = 0;
            data.imports.forEach(imp => {
                if (imp.arrivalVesselDate && imp.departureVesselDate) {
                    const leadTime = differenceInDays(new Date(imp.arrivalVesselDate), new Date(imp.departureVesselDate));
                    if (leadTime >= 0) {
                        totalLeadTime += leadTime;
                        leadTimeCount++;
                    }
                }
            });

            const totalClaims = data.claims.length;
            const claimRate = totalImports > 0 ? (totalClaims / totalImports) * 100 : 0;
            
            const totalClaimValueBRL = data.claims.reduce((acc, claim) => {
                if(claim.claimedAmountBRL) return acc + claim.claimedAmountBRL;
                if(claim.claimedAmountUSD) return acc + convertToBRL(claim.claimedAmountUSD, 'USD');
                return acc;
            }, 0);
            
            // Simple scoring logic for rating
            const leadTimeScore = leadTimeCount > 0 ? Math.max(0, 5 - (totalLeadTime / leadTimeCount) / 10) : 3; // Lower lead time is better
            const claimRateScore = Math.max(0, 5 - claimRate); // Lower claim rate is better
            const rating = (leadTimeScore + claimRateScore) / 2;

            return {
                name,
                totalImports,
                avgLeadTime: leadTimeCount > 0 ? (totalLeadTime / leadTimeCount) : -1,
                totalClaims,
                claimRate,
                totalClaimValueBRL,
                rating
            };
        }).sort((a, b) => b.rating - a.rating);

    }, [imports, claims, exchangeRates]);

    return (
        <div className="bg-white dark:bg-brand-secondary p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                <Handshake /> Supplier Evaluation
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                Performance analysis of suppliers based on lead times, claims, and overall volume.
            </p>

            <div className="space-y-6">
                {supplierData.map(supplier => (
                    <div key={supplier.name} className="bg-gray-50 dark:bg-brand-primary/50 p-4 rounded-lg border dark:border-brand-accent">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                            <h3 className="text-lg font-bold text-brand-secondary dark:text-white">{supplier.name}</h3>
                            <div className="flex items-center gap-2">
                                <RatingStars rating={supplier.rating} />
                                <span className="font-bold text-brand-gray-500 dark:text-gray-200 text-lg">{supplier.rating.toFixed(1)}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                            <StatCard title="Total Imports" value={supplier.totalImports.toString()} icon={<BarChart size={20}/>} />
                            <StatCard title="Avg. Lead Time" value={supplier.avgLeadTime >= 0 ? `${supplier.avgLeadTime.toFixed(1)} days` : 'N/A'} icon={<Clock size={20}/>} />
                            <StatCard title="Total Claims" value={supplier.totalClaims.toString()} icon={<FileWarning size={20}/>} />
                            <StatCard title="Claim Value (BRL)" value={`R$ ${supplier.totalClaimValueBRL.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={<AlertTriangle size={20}/>} />
                        </div>
                    </div>
                ))}
            </div>

            {supplierData.length === 0 && (
                <div className="p-6 border-2 border-dashed dark:border-gray-600 rounded-lg text-center">
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        No supplier data available to evaluate. Add some import processes to begin.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SupplierEvaluation;
