// src/components/ImportDetail.tsx

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FileText, Edit, RefreshCw, X, AlertCircle } from 'lucide-react';
import { format, differenceInDays, isPast, addDays } from 'date-fns';
import type { ImportProcess, DIChannel, TrackingEvent } from '../types';
import { useTranslation } from '../translations';
import { ContainerStatus, ImportStatus } from '../types';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

// Import new sub-components
import GeneralDetails from './import-detail/GeneralDetails';
import VesselDetails from './import-detail/VesselDetails';
import DiInformation from './import-detail/DiInformation';
import ContainerSection from './import-detail/ContainerSection';
import TrackingSection from './import-detail/TrackingSection';
import CostSection from './import-detail/CostSection';
import ProductSection from './import-detail/ProductSection';
import DocumentSection from './import-detail/DocumentSection';

const DI_CHANNELS: DIChannel[] = ['Green', 'Yellow', 'Red', 'Gray'];

const ImportDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { imports, users, warehouses } = useAppData();
    const { updateImport } = useAppActions();
    const { currentUser, exchangeRates, showNotification } = useUI();
    
    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [currentTrackingNotes, setCurrentTrackingNotes] = useState('');
    const [selectedTrackingStage, setSelectedTrackingStage] = useState<ImportStatus | ''>('');
    const [trackingError, setTrackingError] = useState<string | null>(null);

    const [isDIModalOpen, setIsDIModalOpen] = useState(false);
    const [diFormData, setDiFormData] = useState<Partial<ImportProcess>>({});
    const [diFormError, setDiFormError] = useState<string | null>(null);

    const importProcess = useMemo(() => imports.find(imp => imp.id === id), [imports, id]);

    useEffect(() => {
        if (importProcess) {
            setDiFormData({
                diNumber: importProcess.diNumber || '',
                diRegistrationDate: importProcess.diRegistrationDate || '',
                diChannel: importProcess.diChannel || undefined,
                greenChannelDate: importProcess.greenChannelDate || '',
            });
        }
    }, [importProcess, isDIModalOpen]);

    const calculatedData = useMemo(() => {
        if (!importProcess) return null;
        const totalCBM = importProcess.products?.reduce((sum, product) => sum + (product.cbm || 0), 0) || 0;
        const overallCBM = importProcess.totalMeasurementCBM || totalCBM;
        const createdByUser = users.find(u => u.id === importProcess.createdById);
        const containersDemurrageStatus = importProcess.containers?.map(container => {
            if (container.seaportArrivalDate && container.demurrageFreeDays !== undefined) {
                const arrivalDate = new Date(container.seaportArrivalDate);
                arrivalDate.setHours(0,0,0,0);
                const demurrageStartsDate = addDays(arrivalDate, container.demurrageFreeDays);
                const daysUntilDemurrage = differenceInDays(demurrageStartsDate, new Date());
                const isOverdue = isPast(demurrageStartsDate) && (container.currentStatus !== ContainerStatus.DeliveredToFactory && container.currentStatus !== ContainerStatus.SentToDepot);
                return {
                    containerNumber: container.containerNumber,
                    demurrageFreeDays: container.demurrageFreeDays,
                    seaportArrivalDate: container.seaportArrivalDate,
                    demurrageStartsDate: format(demurrageStartsDate, 'PPP'),
                    daysUntilDemurrage,
                    isOverdue,
                    statusText: isOverdue ? `OVERDUE by ${Math.abs(daysUntilDemurrage)} days` :
                                daysUntilDemurrage <= 7 && daysUntilDemurrage >= 0 ? `Starts in ${daysUntilDemurrage} days` :
                                `Free until ${format(demurrageStartsDate, 'PPP')}`,
                    statusColor: isOverdue ? 'text-red-500' : daysUntilDemurrage <= 7 ? 'text-amber-500' : 'text-green-500',
                };
            }
            return null;
        }).filter(Boolean);
        return { createdByUser, containersDemurrageStatus, overallCBM };
    }, [importProcess, users]);

    const handleContainerWarehouseChange = async (containerId: string, warehouseId: string) => {
        if (!importProcess) return;
        const updatedContainers = importProcess.containers.map(c => c.id === containerId ? { ...c, bondedWarehouseId: warehouseId || undefined } : c);
        try {
            await updateImport({ ...importProcess, containers: updatedContainers });
        } catch (error) {
            console.error("Failed to update container warehouse:", error);
        }
    };

    const handleUpdateTracking = async () => {
        if (!selectedTrackingStage || !currentTrackingNotes) {
            setTrackingError("Please select a stage and add notes.");
            return;
        }
        if (!currentUser || !importProcess) return;
        setTrackingError(null);

        const newTrackingEvent: TrackingEvent = {
            stage: selectedTrackingStage,
            date: new Date().toISOString(),
            notes: currentTrackingNotes,
        };

        let updatedImport: ImportProcess = {
            ...importProcess,
            trackingHistory: [...(importProcess.trackingHistory || []), newTrackingEvent],
            overallStatus: selectedTrackingStage,
        };

        // Cascade status updates to containers
        if (selectedTrackingStage === ImportStatus.ArrivalAtPort) {
            updatedImport.containers = updatedImport.containers.map(c => ({...c, seaportArrivalDate: newTrackingEvent.date, currentStatus: ContainerStatus.AtPort, log: [...(c.log || []), { timestamp: newTrackingEvent.date, status: ContainerStatus.AtPort, notes: 'Import arrived at port', recordedByUserId: currentUser.id }] }));
        }
        
        try {
            await updateImport(updatedImport);
            setIsTrackingModalOpen(false);
            setCurrentTrackingNotes('');
            setSelectedTrackingStage('');
        } catch (error) {
            setTrackingError(`Failed to update tracking: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const handleSaveDI = async () => {
        if (!importProcess) return;
        setDiFormError(null);
        if (!diFormData.diNumber || !diFormData.diRegistrationDate || !diFormData.diChannel) {
            setDiFormError("DI Number, Registration Date, and Channel are required.");
            return;
        }
        try {
            await updateImport({ ...importProcess, ...diFormData });
            showNotification('DI information updated successfully!', 'success');
            setIsDIModalOpen(false);
        } catch (error) {
            showNotification(`Failed to update DI info: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
    };
    
    if (!importProcess || !calculatedData) {
        return (
            <div className="bg-white dark:bg-brand-secondary p-6 rounded-xl shadow-md text-center text-gray-500 dark:text-gray-400">
                <AlertCircle size={48} className="mx-auto mb-4" />
                <h2 className="text-xl font-semibold">Import Process Not Found</h2>
                <button onClick={() => navigate('/imports')} className="mt-4 px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-brand-accent">Back to List</button>
            </div>
        );
    }
    
    // MODAL COMPONENTS
    const DIFormModal: React.FC = () => (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in-down" onClick={() => setIsDIModalOpen(false)}>
            <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center"><h3 className="text-lg font-bold">Update DI Information</h3><button onClick={() => setIsDIModalOpen(false)}><X/></button></div>
                <div className="p-6 space-y-4">
                    {diFormError && <div className="p-2 bg-red-100 text-red-700 rounded-md">{diFormError}</div>}
                    <input name="diNumber" value={diFormData.diNumber || ''} onChange={e => setDiFormData(prev => ({...prev, diNumber: e.target.value}))} placeholder="DI Number" className="w-full p-2 border rounded"/>
                    <input name="diRegistrationDate" type="date" value={diFormData.diRegistrationDate || ''} onChange={e => setDiFormData(prev => ({...prev, diRegistrationDate: e.target.value}))} className="w-full p-2 border rounded"/>
                    <select name="diChannel" value={diFormData.diChannel || ''} onChange={e => setDiFormData(prev => ({...prev, diChannel: e.target.value as DIChannel}))} className="w-full p-2 border rounded">
                        <option>-- Select Channel --</option>{DI_CHANNELS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input name="greenChannelDate" type="date" value={diFormData.greenChannelDate || ''} onChange={e => setDiFormData(prev => ({...prev, greenChannelDate: e.target.value}))} className="w-full p-2 border rounded"/>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3"><button onClick={() => setIsDIModalOpen(false)}>Cancel</button><button onClick={handleSaveDI} className="bg-brand-secondary text-white px-4 py-2 rounded">Save</button></div>
            </div>
        </div>
    );

    const TrackingUpdateModal: React.FC = () => (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in-down" onClick={() => setIsTrackingModalOpen(false)}>
            <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center"><h3 className="text-lg font-bold">Update Tracking</h3><button onClick={() => setIsTrackingModalOpen(false)}><X/></button></div>
                <div className="p-6 space-y-4">
                    {trackingError && <div className="p-2 bg-red-100 text-red-700 rounded-md">{trackingError}</div>}
                    <select value={selectedTrackingStage} onChange={e => setSelectedTrackingStage(e.target.value as ImportStatus)} className="w-full p-2 border rounded">
                        <option>-- Select Stage --</option>{Object.values(ImportStatus).map(s => <option key={s}>{s}</option>)}
                    </select>
                    <textarea value={currentTrackingNotes} onChange={e => setCurrentTrackingNotes(e.target.value)} rows={3} placeholder="Notes..." className="w-full p-2 border rounded"/>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3"><button onClick={() => setIsTrackingModalOpen(false)}>Cancel</button><button onClick={handleUpdateTracking} className="bg-brand-secondary text-white px-4 py-2 rounded">Update</button></div>
            </div>
        </div>
    );
    
    return (
        <div className="space-y-6">
             <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2">
                        <FileText /> Import Details: {importProcess.importNumber}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => setIsTrackingModalOpen(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2 hover:bg-blue-600">
                            <RefreshCw size={18} /> Update Tracking
                        </button>
                        <Link to={`/imports/${importProcess.id}/edit`} className="px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center gap-2 hover:bg-brand-accent">
                            <Edit size={18} /> Edit Import
                        </Link>
                    </div>
                </div>
                 <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Detailed view of import process {importProcess.importNumber} ({importProcess.blNumber}).</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GeneralDetails importProcess={importProcess} createdByUser={calculatedData.createdByUser} />
                <VesselDetails importProcess={importProcess} overallCBM={calculatedData.overallCBM} />
                <DiInformation importProcess={importProcess} onUpdateClick={() => setIsDIModalOpen(true)} />
            </div>

            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md space-y-6">
                <ContainerSection importProcess={importProcess} containersDemurrageStatus={calculatedData.containersDemurrageStatus || []} warehouses={warehouses} onWarehouseChange={handleContainerWarehouseChange} />
                <TrackingSection trackingHistory={importProcess.trackingHistory || []} />
                <CostSection costs={importProcess.costs || []} exchangeRates={exchangeRates} />
                <ProductSection products={importProcess.products || []} />
                <DocumentSection documents={importProcess.documents || []} />
            </div>

            {isTrackingModalOpen && <TrackingUpdateModal />}
            {isDIModalOpen && <DIFormModal />}
        </div>
    );
};

export default ImportDetail;
