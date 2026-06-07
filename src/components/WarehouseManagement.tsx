
// src/components/WarehouseManagement.tsx
import React, { useState } from 'react';
import type { Warehouse } from '../types';
import { Warehouse as WarehouseIcon, PlusCircle, Edit, Trash2, Save, X } from 'lucide-react';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const emptyWarehouse: Omit<Warehouse, 'id'> = { name: '', capacity: 0, type: 'Bonded', location: '', contactPerson: '', phone: '', email: '' };

const WarehouseManagement: React.FC = () => {
    const { warehouses } = useAppData();
    const { addWarehouse: onAdd, updateWarehouse: onUpdate, deleteWarehouse: onDelete } = useAppActions();
    const { showNotification } = useUI();
    
    const [editingWarehouse, setEditingWarehouse] = useState<Partial<Warehouse> | null>(null);

    const handleSave = async () => {
        if (!editingWarehouse || !editingWarehouse.name || !editingWarehouse.capacity) {
            showNotification("Warehouse Name and Capacity are required.", 'error');
            return;
        }

        try {
            if (editingWarehouse.id) {
                await onUpdate(editingWarehouse as Warehouse);
            } else {
                await onAdd(editingWarehouse as Omit<Warehouse, 'id'>);
            }
            setEditingWarehouse(null);
        } catch (error) {
            console.error("Failed to save warehouse", error);
            showNotification("Failed to save warehouse.", 'error');
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!editingWarehouse) return;
        const { name, value, type } = e.target;
        setEditingWarehouse(prev => ({ ...prev!, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this warehouse? This action cannot be undone.")) {
            try {
                await onDelete(id);
            } catch (error) {
                 console.error("Failed to delete warehouse", error);
                 showNotification("Failed to delete warehouse.", 'error');
            }
        }
    };

    const EditRow: React.FC = () => {
        if (!editingWarehouse) return null;
        return (
            <tr className="bg-sky-50 dark:bg-brand-accent/30">
                <td className="p-2"><input name="name" value={editingWarehouse.name || ''} onChange={handleInputChange} className="w-full p-1 border dark:border-brand-accent rounded bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" /></td>
                <td className="p-2">
                    <select name="type" value={editingWarehouse.type || 'Bonded'} onChange={handleInputChange} className="w-full p-1 border dark:border-brand-accent rounded bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200">
                        <option>Bonded</option><option>Internal</option><option>External</option>
                    </select>
                </td>
                <td className="p-2"><input name="capacity" type="number" value={editingWarehouse.capacity || 0} onChange={handleInputChange} className="w-full p-1 border dark:border-brand-accent rounded bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" /></td>
                <td className="p-2"><input name="location" value={editingWarehouse.location || ''} onChange={handleInputChange} className="w-full p-1 border dark:border-brand-accent rounded bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200" /></td>
                <td className="p-2 text-center">
                    <div className="flex gap-2 justify-center">
                        <button onClick={handleSave} className="p-2 text-emerald-600 hover:text-emerald-800"><Save size={18} /></button>
                        <button onClick={() => setEditingWarehouse(null)} className="p-2 text-red-600 hover:text-red-800"><X size={18} /></button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2">
                    <WarehouseIcon /> Warehouse Control
                </h2>
                <button 
                    onClick={() => setEditingWarehouse(emptyWarehouse)}
                    disabled={!!editingWarehouse}
                    className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-accent disabled:opacity-50"
                >
                    <PlusCircle size={20} /> Add Warehouse
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Type</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Capacity (Containers)</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400">Location</th>
                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-400 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {editingWarehouse && !editingWarehouse.id && <EditRow />}
                        {warehouses.map(wh => (
                            editingWarehouse?.id === wh.id ? <EditRow key={wh.id} /> : (
                                <tr key={wh.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-brand-primary">
                                    <td className="p-3 font-semibold text-brand-primary dark:text-white">{wh.name}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{wh.type}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{wh.capacity}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{wh.location}</td>
                                    <td className="p-3 text-center">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => setEditingWarehouse(wh)} className="p-2 text-sky-600 hover:text-sky-800"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(wh.id)} className="p-2 text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
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

export default WarehouseManagement;
