import React, { useState } from 'react';
import type { Supplier } from '../types';
import { Users, PlusCircle, Edit, Trash2, Save, X } from 'lucide-react';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const emptySupplier: Omit<Supplier, 'id'> = { name: '', category: 'Goods', email: '', phone: '', contactPerson: '', address: '' };

const SupplierManagement: React.FC = () => {
    const { suppliers } = useAppData();
    const { addSupplier: onAdd, updateSupplier: onUpdate, deleteSupplier: onDelete } = useAppActions();
    const { showNotification } = useUI();
    const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

    const handleSave = async () => {
        if (!editingSupplier || !editingSupplier.name) {
            showNotification("Supplier Name is required.", 'error');
            return;
        }

        try {
            if (editingSupplier.id) {
                await onUpdate(editingSupplier as Supplier);
            } else {
                await onAdd(editingSupplier as Omit<Supplier, 'id'>);
            }
            setEditingSupplier(null);
        } catch (e) {
            showNotification('Failed to save supplier.', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this supplier?")) {
            try {
                await onDelete(id);
            } catch (e) {
                 showNotification('Failed to delete supplier.', 'error');
            }
        }
    }
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!editingSupplier) return;
        const { name, value } = e.target;
        setEditingSupplier(prev => ({ ...prev!, [name]: value }));
    };

    const EditRow: React.FC = () => {
        if (!editingSupplier) return null;
        return (
            <tr className="bg-sky-50 dark:bg-brand-accent/30">
                <td className="p-2"><input name="name" value={editingSupplier.name || ''} onChange={handleInputChange} className="w-full p-1 border dark:border-brand-accent rounded" /></td>
                <td className="p-2">
                    <select name="category" value={editingSupplier.category || 'Goods'} onChange={handleInputChange} className="w-full p-1 border dark:border-brand-accent rounded">
                        <option>Goods</option><option>Service</option><option>Logistics</option><option>Other</option>
                    </select>
                </td>
                <td className="p-2"><input name="contactPerson" value={editingSupplier.contactPerson || ''} onChange={handleInputChange} className="w-full p-1 border dark:border-brand-accent rounded" /></td>
                <td className="p-2"><input name="email" type="email" value={editingSupplier.email || ''} onChange={handleInputChange} className="w-full p-1 border dark:border-brand-accent rounded" /></td>
                <td className="p-2"><input name="phone" value={editingSupplier.phone || ''} onChange={handleInputChange} className="w-full p-1 border dark:border-brand-accent rounded" /></td>
                <td className="p-2 text-center">
                    <div className="flex gap-2 justify-center">
                        <button onClick={handleSave} className="p-2 text-emerald-600 hover:text-emerald-800"><Save size={18} /></button>
                        <button onClick={() => setEditingSupplier(null)} className="p-2 text-red-600 hover:text-red-800"><X size={18} /></button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2">
                    <Users /> Supplier Management
                </h2>
                <button 
                    onClick={() => setEditingSupplier(emptySupplier)}
                    disabled={!!editingSupplier}
                    className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-accent disabled:opacity-50"
                >
                    <PlusCircle size={20} /> Add Supplier
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Category</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Contact</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Email</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Phone</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {editingSupplier && !editingSupplier.id && <EditRow />}
                        {suppliers.map(sup => (
                            editingSupplier?.id === sup.id ? <EditRow key={sup.id} /> : (
                                <tr key={sup.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-brand-primary">
                                    <td className="p-3 font-semibold text-brand-primary dark:text-white">{sup.name}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{sup.category}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{sup.contactPerson}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{sup.email}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{sup.phone}</td>
                                    <td className="p-3 text-center">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => setEditingSupplier(sup)} className="p-2 text-sky-600 hover:text-sky-800"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(sup.id)} className="p-2 text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SupplierManagement;