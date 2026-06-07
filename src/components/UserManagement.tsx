// src/components/UserManagement.tsx

import React, { useState, useRef } from 'react';
import type { User } from '../types';
import { PlusCircle, Edit, Save, X, KeyRound, UploadCloud } from 'lucide-react';
import BulkUserModal from './BulkUserModal';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const emptyUser: Omit<User, 'id'> = { name: '', email: '', role: 'View-Only', initials: '', password: '', habilidades: '', melhoresPontosFortes: '', pontosAumentar: '' };

const UserManagement: React.FC = () => {
    const { users } = useAppData();
    const { updateUser: onSaveUser, addUser: onAddUser, addMultipleUsers } = useAppActions();
    const { showNotification } = useUI();
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [csvContent, setCsvContent] = useState<string | null>(null);
    const bulkFileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        if (!editingUser || !editingUser.name || !editingUser.email) {
            showNotification("Name and Email are required.", "error");
            return;
        }
        
        let userToSave = { ...editingUser };
        if (!userToSave.initials) {
            userToSave.initials = userToSave.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
        }

        try {
            if ('id' in userToSave && userToSave.id) {
                await onSaveUser(userToSave as User);
            } else {
                if (!userToSave.password) {
                    showNotification("Password is required for a new user.", "error");
                    return;
                }
                const { id, ...newUser } = userToSave;
                await onAddUser(newUser as Omit<User, 'id'>);
            }
            setEditingUser(null);
        } catch(e) {
            showNotification('Failed to save user.', 'error');
        }
    };

    const handleCancel = () => {
        setEditingUser(null);
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!editingUser) return;
        const { name, value } = e.target;
        setEditingUser(prev => ({...prev!, [name]: value}));
    }
    
    const handleBulkImportClick = () => {
        bulkFileInputRef.current?.click();
    };

    const handleFileChangeForBulk = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setCsvContent(content);
            setIsBulkModalOpen(true);
        };
        reader.readAsText(file);
        
        e.target.value = ''; // Reset file input
    };

    const UserRow: React.FC<{user: User}> = ({ user }) => (
         <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-brand-primary">
            <td className="p-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-secondary text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {user.initials}
                    </div>
                    <div>
                        <p className="font-semibold text-brand-primary dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
                    </div>
                </div>
            </td>
            <td className="p-3 text-gray-700 dark:text-gray-300">{user.role}</td>
            <td className="p-3 text-center">
                <button onClick={() => setEditingUser(user)} className="p-2 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-brand-accent rounded-md">
                    <Edit size={18} />
                </button>
            </td>
        </tr>
    );

    const EditRow: React.FC = () => {
        if(!editingUser) return null;
        return (
             <tr className="border-b border-gray-100 dark:border-gray-700 bg-sky-50 dark:bg-brand-accent/30">
                <td className="p-3" colSpan={2}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         <input type="text" name="name" value={editingUser.name || ''} onChange={handleInputChange} placeholder="Full Name" className="p-2 border dark:border-brand-accent rounded-md w-full bg-white dark:bg-brand-primary dark:text-gray-200" required />
                         <input type="email" name="email" value={editingUser.email || ''} onChange={handleInputChange} placeholder="Email" className="p-2 border dark:border-brand-accent rounded-md w-full bg-white dark:bg-brand-primary dark:text-gray-200" required />
                         <select name="role" value={editingUser.role || 'View-Only'} onChange={handleInputChange} className="p-2 border dark:border-brand-accent rounded-md w-full bg-white dark:bg-brand-primary dark:text-gray-200">
                            <option value="Admin">Admin</option>
                            <option value="Finance">Finance</option>
                            <option value="Logistics">Logistics</option>
                            <option value="View-Only">View-Only</option>
                         </select>
                         <div className="lg:col-span-3">
                             <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><KeyRound size={14}/> Password</label>
                             <input type="password" name="password" value={editingUser.password || ''} onChange={handleInputChange} placeholder={editingUser.id ? "Enter new password to change" : "Set initial password"} className="p-2 border dark:border-brand-accent rounded-md w-full bg-white dark:bg-brand-primary dark:text-gray-200" />
                         </div>
                        <div className="lg:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Habilidades (Abilities)</label>
                            <textarea name="habilidades" value={editingUser.habilidades || ''} onChange={handleInputChange} rows={2} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary dark:text-gray-200" />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Melhores Pontos Fortes (Strengths)</label>
                            <textarea name="melhoresPontosFortes" value={editingUser.melhoresPontosFortes || ''} onChange={handleInputChange} rows={2} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary dark:text-gray-200" />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pontos a Aumentar (Improvements)</label>
                            <textarea name="pontosAumentar" value={editingUser.pontosAumentar || ''} onChange={handleInputChange} rows={2} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary dark:text-gray-200" />
                        </div>
                    </div>
                </td>
                <td className="p-3 text-center">
                    <div className="flex flex-col gap-2">
                         <button onClick={handleSave} className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-md">
                            <Save size={18} />
                        </button>
                         <button onClick={handleCancel} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md">
                            <X size={18} />
                        </button>
                    </div>
                </td>
            </tr>
        )
    };

    return (
        <>
            <input
                type="file"
                ref={bulkFileInputRef}
                onChange={handleFileChangeForBulk}
                className="hidden"
                accept=".csv"
            />
             <BulkUserModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onConfirm={addMultipleUsers}
                fileContent={csvContent}
            />
            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-brand-primary dark:text-white">User Management</h2>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                        <button 
                            onClick={handleBulkImportClick}
                            disabled={!!editingUser}
                            className="flex items-center gap-2 bg-brand-highlight text-brand-primary px-3 py-2 rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                        >
                            <UploadCloud size={18} /> Bulk Import
                        </button>
                        <button 
                            onClick={() => setEditingUser(emptyUser)}
                            disabled={!!editingUser}
                            className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-accent disabled:opacity-50"
                        >
                            <PlusCircle size={20} /> Add User
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 w-2/5">User</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 w-2/5">Role</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 w-1/5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editingUser && !('id' in editingUser && editingUser.id) && <EditRow />}
                            {users.map(user => (
                                editingUser && 'id' in editingUser && editingUser.id === user.id ? <EditRow key={user.id} /> : <UserRow key={user.id} user={user} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default UserManagement;