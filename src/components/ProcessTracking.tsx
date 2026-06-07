
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ImportProcess, User } from '../types';
import { GanttChartSquare, Search, Edit, Save, X } from 'lucide-react';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const ProcessTracking: React.FC = () => {
    const { imports } = useAppData();
    const { updateImport } = useAppActions();
    const { currentUser } = useUI();

    const [searchTerm, setSearchTerm] = useState('');
    const [editingRow, setEditingRow] = useState<string | null>(null);
    const [editableImport, setEditableImport] = useState<ImportProcess | null>(null);
    
    if (!currentUser) return null;

    const canEdit = currentUser.role === 'Admin' || currentUser.role === 'Logistics';

    const filteredImports = useMemo(() => {
        return imports.filter(imp => {
            const lowerSearch = searchTerm.toLowerCase();
            return (
                imp.importNumber.toLowerCase().includes(lowerSearch) ||
                imp.blNumber.toLowerCase().includes(lowerSearch) ||
                (imp.diNumber || '').toLowerCase().includes(lowerSearch) ||
                imp.supplier.toLowerCase().includes(lowerSearch)
            );
        }).sort((a,b) => new Date(b.dates.orderPlaced || 0).getTime() - new Date(a.dates.orderPlaced || 0).getTime());
    }, [imports, searchTerm]);
    
    const handleEditClick = (imp: ImportProcess) => {
        setEditingRow(imp.id);
        setEditableImport({ ...imp });
    };

    const handleCancel = () => {
        setEditingRow(null);
        setEditableImport(null);
    };

    const handleSave = () => {
        if (editableImport) {
            updateImport(editableImport);
        }
        handleCancel();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editableImport) return;
        const { name, value } = e.target;
        setEditableImport({ ...editableImport, [name]: value });
    };

    const renderDateCell = (dateString?: string) => {
        if (!dateString) return <span className="text-gray-400 dark:text-gray-500">N/A</span>;
        return new Date(dateString + 'T00:00:00').toLocaleDateString();
    };
    
    const renderEditableDateCell = (fieldName: keyof ImportProcess, label: string) => {
        return (
            <input
                type="date"
                name={fieldName}
                aria-label={label}
                value={(editableImport?.[fieldName] as string || '').split('T')[0]}
                onChange={handleChange}
                className="w-full p-1 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-xs"
            />
        );
    }
    
    const fields: { key: keyof ImportProcess; label: string }[] = [
        { key: 'departureVesselDate', label: 'Departure' },
        { key: 'arrivalVesselDate', label: 'Arrival' },
        { key: 'actualETD', label: 'Actual ETD' },
        { key: 'actualETA', label: 'Actual ETA' },
        { key: 'cargoPresenceDate', label: 'Cargo Presence' },
        { key: 'diRegistrationDate', label: 'DI Registration' },
        { key: 'greenChannelDate', label: 'Green Channel' },
        { key: 'storageDeadline', label: 'Storage Deadline' },
        { key: 'docApprovalDate', label: 'Doc Approval' },
        { key: 'nfIssueDate', label: 'NF Issue' },
        { key: 'docsReceivedDate', label: 'Docs Received' },
    ];

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                 <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2">
                    <GanttChartSquare /> Process Tracking (FUP)
                </h2>
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                    <input
                        type="text"
                        placeholder="Search by Import#, BL#, Supplier..."
                        className="w-full md:w-72 pl-10 pr-4 py-2 border dark:border-brand-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent bg-transparent text-brand-gray-500 dark:text-gray-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400 sticky left-0 bg-white dark:bg-brand-secondary z-10">Import #</th>
                            {fields.map(f => (
                                <th key={f.key} className="p-2 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">{f.label}</th>
                            ))}
                            {canEdit && <th className="p-2 font-semibold text-gray-600 dark:text-gray-400 sticky right-0 bg-white dark:bg-brand-secondary z-10">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredImports.map(imp => {
                            const isEditing = editingRow === imp.id;
                            return (
                                <tr key={imp.id} className={isEditing ? 'bg-sky-50 dark:bg-sky-900/30' : 'hover:bg-gray-50 dark:hover:bg-brand-primary'}>
                                    <td className={`p-2 font-medium sticky left-0 whitespace-nowrap ${isEditing ? 'bg-sky-50 dark:bg-sky-900/30' : 'bg-white dark:bg-brand-secondary'}`}>
                                        <Link to={`/imports/${imp.id}`} className="hover:underline text-sky-600 dark:text-sky-400 font-semibold">{imp.importNumber}</Link>
                                        <p className="text-gray-500 dark:text-gray-400 text-[10px]">{imp.blNumber}</p>
                                    </td>
                                    {fields.map(f => (
                                        <td key={f.key} className="p-2 whitespace-nowrap">
                                            {isEditing ? renderEditableDateCell(f.key, f.label) : renderDateCell(imp[f.key] as string)}
                                        </td>
                                    ))}
                                    {canEdit && (
                                        <td className={`p-2 sticky right-0 ${isEditing ? 'bg-sky-50 dark:bg-sky-900/30' : 'bg-white dark:bg-brand-secondary'}`}>
                                            {isEditing ? (
                                                <div className="flex gap-2">
                                                    <button onClick={handleSave} className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-md"><Save size={16} /></button>
                                                    <button onClick={handleCancel} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEditClick(imp)} className="p-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-brand-accent rounded-md"><Edit size={16} /></button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            )
                        })}
                         {filteredImports.length === 0 && (
                             <tr>
                                <td colSpan={fields.length + 2} className="text-center p-8 text-gray-500 dark:text-gray-400">No imports match your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProcessTracking;
