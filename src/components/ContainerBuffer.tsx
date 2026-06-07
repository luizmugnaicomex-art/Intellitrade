
import React, { useState, useMemo } from 'react';
import type { ContainerBufferItem, ContainerBufferStatus, ImportProcess, User, Container } from '../types';
import { HandPlatter, PlusCircle, Edit, Trash2, X, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const emptyBufferItem: Omit<ContainerBufferItem, 'id'> = {
    containerId: '',
    importId: '',
    locationInFactory: '',
    exitDate: undefined,
    maxReturnDate: '',
    status: 'Awaiting Unloading',
};

const BUFFER_STATUSES: ContainerBufferStatus[] = ['Awaiting Unloading', 'Unloading in Progress', 'Unloaded', 'Awaiting Return'];

const BufferCard: React.FC<{
    item: ContainerBufferItem;
    imp?: ImportProcess;
    container?: Container;
    onEdit: (item: ContainerBufferItem) => void;
    onDelete: (id: string) => void;
    canEdit: boolean;
}> = ({ item, imp, container, onEdit, onDelete, canEdit }) => {
    const today = new Date();
    const returnDate = new Date(item.maxReturnDate);
    const daysLeft = differenceInDays(returnDate, today);
    
    let borderColor = 'border-gray-300 dark:border-brand-accent';
    let riskText = '';
    if (daysLeft < 0) {
        borderColor = 'border-red-500';
        riskText = `Overdue by ${-daysLeft} days`;
    } else if (daysLeft <= 7) {
        borderColor = 'border-amber-500';
        riskText = `Return in ${daysLeft} days`;
    }

    return (
        <div className={`bg-white dark:bg-brand-primary p-4 rounded-lg border-l-4 ${borderColor} shadow-sm flex flex-col justify-between`}>
            <div>
                <div className="flex justify-between items-start">
                    <p className="font-bold text-brand-secondary dark:text-gray-200">{container?.containerNumber || 'N/A'}</p>
                    <div className="flex gap-1">
                        {canEdit && <button onClick={() => onEdit(item)} className="p-1 text-sky-600 hover:text-sky-800"><Edit size={16} /></button>}
                        {canEdit && <button onClick={() => onDelete(item.id)} className="p-1 text-red-600 hover:text-red-800"><Trash2 size={16} /></button>}
                    </div>
                </div>
                <Link to={`/imports/${imp?.id}`} className="text-xs hover:underline text-sky-600 dark:text-sky-400">
                    Import: {imp?.importNumber || 'N/A'}
                </Link>
                <div className="text-sm mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                    <p><strong>Location:</strong> {item.locationInFactory}</p>
                    <p><strong>Status:</strong> {item.status}</p>
                </div>
            </div>
            <div className={`mt-3 pt-2 border-t dark:border-gray-700 text-right font-semibold text-sm ${daysLeft < 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {riskText || `Return by: ${returnDate.toLocaleDateString()}`}
            </div>
        </div>
    );
};


const ContainerBuffer: React.FC = () => {
    const { imports, buffer } = useAppData();
    const { addBufferItem: onAddBuffer, updateBufferItem: onUpdateBuffer, deleteBufferItem: onDeleteBuffer } = useAppActions();
    const { currentUser } = useUI();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<ContainerBufferItem> | null>(null);

    if(!currentUser) return null;

    const canEdit = currentUser.role === 'Admin' || currentUser.role === 'Logistics';

    const handleOpenForm = (item?: ContainerBufferItem) => {
        setEditingItem(item ? { ...item } : { ...emptyBufferItem });
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setEditingItem(null);
        setIsFormOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!editingItem) return;
        const { name, value } = e.target;

        if (name === 'containerSelector') {
            const [importId, containerId] = value.split('|');
            setEditingItem(prev => ({ ...prev, importId, containerId }));
        } else {
            setEditingItem(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSave = () => {
        if (!editingItem || !editingItem.importId || !editingItem.containerId || !editingItem.locationInFactory || !editingItem.maxReturnDate) {
            alert('Please select a container and fill Location and Max Return Date.');
            return;
        }

        const itemToSave: Omit<ContainerBufferItem, 'id'> = {
            importId: editingItem.importId,
            containerId: editingItem.containerId,
            locationInFactory: editingItem.locationInFactory,
            maxReturnDate: editingItem.maxReturnDate,
            status: editingItem.status || 'Awaiting Unloading',
            exitDate: editingItem.exitDate,
        };

        if (editingItem.id) {
            onUpdateBuffer({id: editingItem.id, ...itemToSave});
        } else {
            onAddBuffer(itemToSave);
        }
        handleCloseForm();
    };
    
    const handleDelete = (id: string) => {
        if(window.confirm('Are you sure you want to remove this container from the buffer list?')) {
            onDeleteBuffer(id);
        }
    }
    
    const allContainers = useMemo(() => {
        return imports.flatMap(imp => imp.containers.map(c => ({...c, importId: imp.id, importNumber: imp.importNumber})));
    }, [imports]);

    const FormModal: React.FC = () => {
        if (!isFormOpen || !editingItem) return null;

        return (
             <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={handleCloseForm}>
                <div className="bg-white dark:bg-brand-secondary rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-brand-primary dark:text-white">{editingItem.id ? 'Edit Buffer Entry' : 'Add Container to Buffer'}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Container</label>
                            <select name="containerSelector" value={editingItem.id ? `${editingItem.importId}|${editingItem.containerId}` : (editingItem.importId ? `${editingItem.importId}|${editingItem.containerId}` : '')} onChange={handleChange} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md" required disabled={!!editingItem.id}>
                                <option value="" disabled>-- Select a Container --</option>
                                {allContainers.map(c => (
                                    <option key={c.id} value={`${c.importId}|${c.id}`}>{c.containerNumber} ({c.importNumber})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location in Factory</label>
                                <input type="text" name="locationInFactory" value={editingItem.locationInFactory || ''} onChange={handleChange} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md" placeholder="e.g., Patio C, Row 2" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                <select name="status" value={editingItem.status || 'Awaiting Unloading'} onChange={handleChange} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md">
                                    {BUFFER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Return Date</label>
                                <input type="date" name="maxReturnDate" value={editingItem.maxReturnDate || ''} onChange={handleChange} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exit from Buffer Date</label>
                                <input type="date" name="exitDate" value={editingItem.exitDate || ''} onChange={handleChange} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md" />
                            </div>
                        </div>
                    </div>
                     <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3">
                        <button onClick={handleCloseForm} type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent">Cancel</button>
                        <button onClick={handleSave} type="button" className="px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center gap-2 hover:bg-brand-accent">
                            <Save size={16} /> Save
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const getDetails = (item: ContainerBufferItem) => {
        const imp = imports.find(i => i.id === item.importId);
        const cont = imp?.containers.find(c => c.id === item.containerId);
        return { import: imp, container: cont };
    }

    return (
        <>
            {isFormOpen && <FormModal />}
            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2"><HandPlatter /> Container Buffer Management</h2>
                    {canEdit && (
                         <button onClick={() => handleOpenForm()} className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-accent">
                            <PlusCircle size={20} /> Add to Buffer
                        </button>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Manage containers in the temporary factory buffer before final unloading.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {buffer.length > 0 ? buffer.map(item => {
                         const { container, import: imp } = getDetails(item);
                         return (
                            <BufferCard 
                                key={item.id}
                                item={item}
                                imp={imp}
                                container={container}
                                onEdit={handleOpenForm}
                                onDelete={handleDelete}
                                canEdit={canEdit}
                            />
                         );
                     }) : (
                        <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 text-center p-8 text-gray-500 dark:text-gray-400">No containers currently in buffer.</div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ContainerBuffer;
