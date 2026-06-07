import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, AlertTriangle, Filter, X } from 'lucide-react';
import { useAppData } from '../context/AppContext';
import { ImportStatus, ContainerStatus } from '../types';
import { differenceInDays, addDays } from 'date-fns';

const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        alert("No data available to export for the selected period.");
        return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = "data:text/csv;charset=utf-8," 
        + [
            headers.join(','), 
            ...data.map(row => headers.map(header => {
                const value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
                return `"${value.replace(/"/g, '""')}"`;
            }).join(','))
          ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const ReportCard: React.FC<{ title: string; description: string; onExport: () => void; }> = ({ title, description, onExport }) => (
    <div className="bg-white dark:bg-brand-secondary p-6 rounded-xl shadow-md flex flex-col justify-between">
        <div>
            <div className="flex items-center gap-3 mb-2">
                <FileSpreadsheet className="text-brand-accent" size={24}/>
                <h3 className="text-lg font-semibold text-brand-gray-500 dark:text-white">{title}</h3>
            </div>
            <p className="text-sm text-brand-gray-400 dark:text-gray-400 mb-4">{description}</p>
        </div>
        <button onClick={onExport} className="mt-auto w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
            <Download size={16} /> Export to Excel
        </button>
    </div>
);

const Reports: React.FC = () => {
    const { imports, claims, ncms, tasks, deliverySchedule, buffer, users } = useAppData();
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const filteredImports = useMemo(() => {
        return imports.filter(imp => {
            const startDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00') : null;
            const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : null;
    
            if (!startDate && !endDate) return true; // No date filter, include all
    
            const arrivalDate = imp.dates.estimatedArrival ? new Date(imp.dates.estimatedArrival + 'T00:00:00') : null;
            if (!arrivalDate) return false; // No arrival date, cannot match range

            return (!startDate || arrivalDate >= startDate) && (!endDate || arrivalDate <= endDate);
        });
    }, [imports, dateRange]);

    const exportHandler = (type: string) => {
        switch(type) {
            case 'payments': {
                const data = filteredImports.flatMap(i => i.costs.map(c => ({
                    Import_Number: i.importNumber,
                    BL_Number: i.blNumber,
                    PO_Numbers: i.poNumbers,
                    Cost_Category: c.category,
                    Description: c.description,
                    Value: c.value,
                    Due_Date: c.dueDate,
                    Payment_Date: c.paymentDate,
                    Status: c.status,
                    OA_System_Number: c.oaSystemNumber
                })));
                downloadCSV(data, 'payments_report.csv');
                break;
            }
             case 'shipments': {
                const data = filteredImports.map(i => ({
                    Import_Number: i.importNumber,
                    PO_Numbers: i.poNumbers,
                    BL_Number: i.blNumber,
                    Vessel_Name: i.vesselName,
                    DI_Number: i.diNumber,
                    Supplier: i.supplier,
                    Broker: i.responsibleBroker,
                    Cargo_Type: i.typeOfCargo,
                    Incoterm: i.incoterm,
                    Total_Containers: i.totalContainers,
                    Order_Date: i.dates.orderPlaced,
                    Estimated_Arrival: i.dates.estimatedArrival,
                    Status: i.trackingHistory[i.trackingHistory.length - 1]?.stage
                }));
                downloadCSV(data, 'shipments_report.csv');
                break;
            }
            case 'containers': {
                const data = filteredImports.flatMap(i => i.containers.map(c => ({
                    Import_Number: i.importNumber,
                    BL_Number: i.blNumber,
                    Container_Number: c.containerNumber,
                    Seal_Number: c.sealNumber,
                    Status: c.currentStatus,
                    ETA_Factory: c.etaFactory,
                    Actual_Delivery_Date: c.actualDeliveryDateFactory,
                    Sent_To_Depot_Date: c.dateSentToDepot,
                    TMS_Number: c.tmsNumber,
                    Seaport_Arrival_Date: c.seaportArrivalDate,
                    Seaport_Status: c.seaportStatus,
                })));
                downloadCSV(data, 'containers_report.csv');
                break;
            }
            case 'claims': {
                const filteredClaims = claims.filter(c => filteredImports.some(i => i.id === c.importId));
                const data = filteredClaims.map(c => ({
                   Claim_ID: c.id,
                   Import_Number: imports.find(i => i.id === c.importId)?.importNumber || 'N/A',
                   BL_Number: c.blNumber,
                   Claim_Date: c.claimDate,
                   Description: c.description,
                   Status: c.status,
                   Claimed_Amount_USD: c.claimedAmountUSD,
                   Claimed_Amount_BRL: c.claimedAmountBRL,
                }));
                downloadCSV(data, 'claims_report.csv');
                break;
            }
            case 'romaneios': {
                const data = filteredImports.flatMap(i => i.products.map(p => ({
                    Import_Number: i.importNumber,
                    BL_Number: i.blNumber,
                    Product_Name: p.name,
                    NCM: p.ncm,
                    Quantity: p.quantity,
                    Unit_Value: p.unitValue,
                    Total_Value: p.quantity * p.unitValue,
                    Net_Weight_kg: p.netWeight,
                    Gross_Weight_kg: p.grossWeight,
                    CBM: p.cbm
                })));
                downloadCSV(data, 'packing_list_data_report.csv');
                break;
            }
            case 'ncms':
                downloadCSV(ncms, 'ncm_database.csv');
                break;
            case 'di_statuses': {
                const data = filteredImports.map(i => ({
                    Import_Number: i.importNumber,
                    DI_Number: i.diNumber,
                    DI_Registration_Date: i.diRegistrationDate,
                    DI_Channel: i.diChannel,
                    DI_Status_Text: i.diStatusText
                }));
                downloadCSV(data, 'di_statuses_report.csv');
                break;
            }
            case 'demurrage': {
                const today = new Date();
                const demurrageData = filteredImports.flatMap(imp => {
                    const arrivalEvent = imp.trackingHistory.find(e => e.stage === ImportStatus.ArrivalAtPort);
                    if (!arrivalEvent) return [];
                    const arrivalDate = new Date(arrivalEvent.date);
                    return imp.containers
                        .filter(c => c.currentStatus === ContainerStatus.AtPort || c.currentStatus === ContainerStatus.CustomsCleared)
                        .map(container => {
                            const freeTimeEndDate = addDays(arrivalDate, imp.demurrageFreeTimeDays);
                            const daysRemaining = differenceInDays(freeTimeEndDate, today);
                            return {
                                Import_Number: imp.importNumber,
                                Container_Number: container.containerNumber,
                                Arrival_Date: arrivalDate.toLocaleDateString(),
                                Free_Time_End_Date: freeTimeEndDate.toLocaleDateString(),
                                Days_Remaining: daysRemaining,
                                Status: container.currentStatus
                            };
                        });
                }).filter(Boolean);
                downloadCSV(demurrageData as any[], 'demurrage_report.csv');
                break;
            }
            case 'tasks': {
                const filteredTasks = tasks.filter(task => {
                    const startDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00') : null;
                    const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : null;
                    if (!startDate && !endDate) return true;

                    const dueDate = task.dueDate ? new Date(task.dueDate + 'T00:00:00') : null;
                    if (!dueDate) return false;

                    return (!startDate || dueDate >= startDate) && (!endDate || dueDate <= endDate);
                });

                const data = filteredTasks.map(t => ({
                    Task_ID: t.id,
                    Description: t.description,
                    Status: t.status,
                    Priority: t.priority,
                    Due_Date: t.dueDate,
                    Assigned_To: t.assignedToId ? (users.find(u => u.id === t.assignedToId)?.name || 'Unknown User') : 'Unassigned',
                    Linked_Import: t.linkedTo?.name || ''
                }));
                downloadCSV(data, 'tasks_report.csv');
                break;
            }
            case 'delivery_schedule': {
                const filteredSchedule = deliverySchedule.filter(slot => {
                    const startDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00') : null;
                    const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : null;
                    if (!startDate && !endDate) return true;

                    const slotDate = new Date(slot.startTime);
                    if (!slotDate) return false;

                    return (!startDate || slotDate >= startDate) && (!endDate || slotDate <= endDate);
                });
                const data = filteredSchedule.map(s => {
                    const imp = imports.find(i => i.id === s.importId);
                    return {
                        Dock_ID: s.dockId,
                        Container_Number: s.containerNumber,
                        Start_Time: new Date(s.startTime).toLocaleString(),
                        End_Time: new Date(s.endTime).toLocaleString(),
                        Import_Number: imp?.importNumber || 'N/A',
                        BL_Number: imp?.blNumber || 'N/A',
                    };
                });
                downloadCSV(data, 'delivery_schedule_report.csv');
                break;
            }
            case 'container_buffer': {
                const data = buffer.map(b => {
                    const imp = imports.find(i => i.id === b.importId);
                    const cont = imp?.containers.find(c => c.id === b.containerId);
                    return {
                        Container_Number: cont?.containerNumber || 'N/A',
                        Import_Number: imp?.importNumber || 'N/A',
                        Location_In_Factory: b.locationInFactory,
                        Status: b.status,
                        Max_Return_Date: b.maxReturnDate,
                        Exit_Date: b.exitDate || 'N/A',
                    };
                });
                downloadCSV(data, 'container_buffer_report.csv');
                break;
            }
        }
    };

    const reportTypes = [
        { key: 'shipments', title: 'Shipments Report', description: 'General data for all import processes in the selected period.' },
        { key: 'containers', title: 'Containers Report', description: 'Detailed status and information for all containers.' },
        { key: 'payments', title: 'Payments Report', description: 'All cost items, including due dates and payment status.' },
        { key: 'claims', title: 'Claims Report', description: 'Export all registered claims against shipments.' },
        { key: 'romaneios', title: 'Packing List / Items Report', description: 'Detailed list of all products across all imports.' },
        { key: 'di_statuses', title: 'DI Statuses Report', description: 'Current status of all Import Declarations.' },
        { key: 'demurrage', title: 'Demurrage Report', description: 'Containers at risk of incurring demurrage charges.' },
        { key: 'delivery_schedule', title: 'Delivery Schedule Report', description: 'Container arrival schedule at the factory docks for the period.' },
        { key: 'container_buffer', title: 'Container Buffer Report', description: 'Status of all containers currently in the internal buffer.' },
        { key: 'tasks', title: 'Tasks Report', description: 'Export all tasks from the To-Do List module for the period.' },
        { key: 'ncms', title: 'NCM Database', description: 'The complete NCM table with associated tax rates.' },
    ];
    
    const hasDataForPeriod = filteredImports.length > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-brand-gray-500 dark:text-white">Reports</h2>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 dark:bg-brand-primary/50 rounded-lg flex flex-wrap items-center gap-2">
                <Filter size={16} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Filter by period (arrival/due date):</span>
                 <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="p-1 border dark:border-brand-accent rounded-md text-sm bg-transparent dark:text-gray-200" />
                 <span className="text-sm text-gray-700 dark:text-gray-300">and</span>
                 <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="p-1 border dark:border-brand-accent rounded-md text-sm bg-transparent dark:text-gray-200" />
                 <button onClick={() => setDateRange({start: '', end: ''})} className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" title="Clear dates">
                    <X size={16} />
                </button>
             </div>

            <p className="text-sm text-brand-gray-400 dark:text-gray-400">This module is a centralized hub for all system reports and data exports. Select a report to download as an Excel (CSV) file.</p>

            {!hasDataForPeriod && (dateRange.start || dateRange.end) && (
                <div className="bg-white dark:bg-brand-secondary p-6 rounded-xl shadow-md text-center">
                    <AlertTriangle size={32} className="mx-auto text-amber-500 mb-2"/>
                    <p className="text-brand-gray-400 dark:text-gray-400">No import data found for the selected period. Please adjust the date range or clear the filter to see all reports.</p>
                </div>
            )}
            
            {(hasDataForPeriod || (!dateRange.start && !dateRange.end)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reportTypes.map(report => (
                        <ReportCard 
                            key={report.key}
                            title={report.title}
                            description={report.description}
                            onExport={() => exportHandler(report.key)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Reports;