// src/components/import-detail/ProductSection.tsx

import React from 'react';
import { Package } from 'lucide-react';
import type { Product } from '../../types';

interface ProductSectionProps {
    products: Product[];
}

const ProductSection: React.FC<ProductSectionProps> = ({ products }) => (
    <div className="lg:col-span-2">
        <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-3 flex items-center gap-2"><Package size={20} /> Products ({products?.length || 0})</h3>
        {products && products.length > 0 ? (
            <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-100 dark:bg-brand-accent/20">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">NCM</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Quantity</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Unit Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {products.map(product => (
                            <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-brand-primary">
                                <td className="p-3 font-medium text-brand-secondary dark:text-gray-200">{product.name}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{product.ncm}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{product.quantity}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{product.unitValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400 border border-dashed dark:border-gray-600 rounded-lg">
                No products have been added to this import.
            </div>
        )}
    </div>
);

export default ProductSection;
