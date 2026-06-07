
// src/components/Alerts.tsx

import React, { useMemo } from 'react';
import type { ImportProcess, Invoice, Task, User, Container } from '../types';
import { SeaportStatus, ContainerStatus, PaymentStatus, InvoiceStatus, TaskStatus } from '../types';
import { Link } from 'react-router-dom';
import { ShieldAlert, Clock, AlertTriangle, DollarSign, FileWarning, ListChecks, CheckCircle } from 'lucide-react';
import { differenceInDays, addDays, isPast, format } from 'date-fns';
import { useAppData } from '../context/AppContext';

type AlertItem = {
    type: 'demurrage' | 'payment_due_soon' | 'payment_overdue' | 'invoice_approval' | 'invoice_overdue' | 'task_overdue';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    dueDate: string; // ISO date string
    reference: {
        link: string;
        text: string;
    };
    key: string;
};

const Alerts: React.FC = () => {
    const { imports, invoices, tasks, users } = useAppData();

    const allAlerts = useMemo(() => {
        const alerts: AlertItem[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to start of day

        // --- Demurrage Alerts (Precision Update) ---
        imports.forEach(imp => {
            imp.containers?.forEach((container: Container) => {
                // Use container's actual arrival date and specific free days.
                if (container.seaportArrivalDate && container.demurrageFreeDays) {
                    const actualArrivalDate = new Date(container.seaportArrivalDate + 'T00:00:00Z');
                    const demurrageStartsDate = addDays(actualArrivalDate, container.demurrageFreeDays);
                    const daysUntilDemurrage = differenceInDays(demurrageStartsDate, today);
                    
                    const isAtRiskStatus = [
                        ContainerStatus.AtPort, 
                        ContainerStatus.CustomsCleared,
                        SeaportStatus.AwaitingDischarge,
                        SeaportStatus.Discharging,
                        SeaportStatus.Discharged,
                        SeaportStatus.AwaitingPickup,
                    ].includes(container.currentStatus as any);

                    // Alert if within 10 days of demurrage or already overdue, and container is still at port.
                    if (isAtRiskStatus && daysUntilDemurrage <= 10) {
                        alerts.push({
                            type: 'demurrage',
                            priority: isPast(demurrageStartsDate) || daysUntilDemurrage <= 3 ? 'HIGH' : 'MEDIUM',
                            message: isPast(demurrageStartsDate)
                                ? `Demurrage active for container ${container.containerNumber} (${imp.importNumber})!`
                                : `Demurrage starts in ${daysUntilDemurrage} day(s) for ${container.containerNumber} (${imp.importNumber})`,
                            dueDate: demurrageStartsDate.toISOString().split('T')[0],
                            reference: { link: `/imports/${imp.id}`, text: imp.importNumber },
                            key: `${imp.id}-${container.id}-demurrage`
                        });
                    }
                }
            });
        });

        // --- Payment Alerts (Costs from Imports) ---
        imports.forEach(imp => {
            imp.costs?.forEach(cost => { 
                if (cost.dueDate && cost.status !== PaymentStatus.Paid && cost.status !== PaymentStatus.Cancelled) {
                    const costDueDate = new Date(cost.dueDate + 'T00:00:00Z');
                    if (isPast(costDueDate)) {
                        alerts.push({
                            type: 'payment_overdue',
                            priority: 'HIGH',
                            message: `Payment for '${cost.description}' (${imp.importNumber}) is ${differenceInDays(today, costDueDate)} day(s) overdue`,
                            dueDate: cost.dueDate,
                            reference: { link: `/imports/${imp.id}`, text: imp.importNumber },
                            key: `${imp.id}-${cost.id}-payment-overdue`
                        });
                    } else if (differenceInDays(costDueDate, today) <= 7) {
                        alerts.push({
                            type: 'payment_due_soon',
                            priority: 'MEDIUM',
                            message: `Payment for '${cost.description}' (${imp.importNumber}) due in ${differenceInDays(costDueDate, today)} day(s)`,
                            dueDate: cost.dueDate,
                            reference: { link: `/imports/${imp.id}`, text: imp.importNumber },
                            key: `${imp.id}-${cost.id}-payment-due-soon`
                        });
                    }
                }
            });
        });

        // --- Invoice Alerts ---
        invoices.forEach(inv => {
            const invoiceDueDate = new Date(inv.dueDate + 'T00:00:00Z');
            if (inv.status === InvoiceStatus.PendingApproval) {
                alerts.push({
                    type: 'invoice_approval',
                    priority: 'HIGH',
                    message: `Invoice #${inv.invoiceNumber} from ${inv.supplierName} requires approval`,
                    dueDate: inv.dueDate,
                    reference: { link: `/payments?invoiceId=${inv.id}`, text: `Invoice #${inv.invoiceNumber}` },
                    key: `${inv.id}-invoice-approval`
                });
            } else if (inv.status === InvoiceStatus.Approved && isPast(invoiceDueDate)) {
                alerts.push({
                    type: 'invoice_overdue',
                    priority: 'HIGH',
                    message: `Approved invoice #${inv.invoiceNumber} from ${inv.supplierName} is overdue for payment!`,
                    dueDate: inv.dueDate,
                    reference: { link: `/payments?invoiceId=${inv.id}`, text: `Invoice #${inv.invoiceNumber}` },
                    key: `${inv.id}-invoice-overdue`
                });
            }
        });
            
        // --- Task Alerts ---
        tasks.forEach(task => {
            if (task.status !== TaskStatus.Completed && task.dueDate) {
                const taskDueDate = new Date(task.dueDate + 'T00:00:00Z');
                const assignee = users.find(u => u.id === task.assignedToId);

                if (isPast(taskDueDate)) {
                    alerts.push({
                        type: 'task_overdue',
                        priority: task.priority.toUpperCase() as AlertItem['priority'], 
                        message: `Task for ${assignee?.name || 'Unassigned'} is overdue: ${task.description}`,
                        dueDate: task.dueDate,
                        reference: { link: `/workflow?taskId=${task.id}`, text: 'View Task' },
                        key: `${task.id}-task-overdue`
                    });
                }
            }
        });

        return alerts.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    }, [imports, invoices, tasks, users]);
    
    const alertMeta: Record<AlertItem['type'], { icon: React.ReactNode, color: string }> = {
        demurrage: { icon: <AlertTriangle size={16}/>, color: 'text-amber-500' },
        payment_due_soon: { icon: <DollarSign size={16}/>, color: 'text-orange-500' },
        payment_overdue: { icon: <DollarSign size={16}/>, color: 'text-red-500' },
        invoice_approval: { icon: <FileWarning size={16}/>, color: 'text-purple-500' }, 
        invoice_overdue: { icon: <FileWarning size={16}/>, color: 'text-red-500' },
        task_overdue: { icon: <ListChecks size={16}/>, color: 'text-red-500' },
    };

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                <ShieldAlert /> Comex Early Warning System
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                A centralized view of all time-sensitive alerts requiring your attention for effective Comex team management.
            </p>
            
            <div className="overflow-x-auto">
                {allAlerts.length > 0 ? (
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Alert Details</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Due Date</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {allAlerts.map((alert) => {
                                const priorityStyles: Record<AlertItem['priority'], string> = {
                                    HIGH: 'bg-red-200 text-red-800 dark:bg-red-800/50 dark:text-red-300',
                                    MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-800/50 dark:text-amber-300',
                                    LOW: 'bg-sky-100 text-sky-800 dark:bg-sky-800/50 dark:text-sky-300'
                                };
                                const highPriorityClass = alert.priority === 'HIGH' ? 'animate-pulse-high-priority' : '';

                                return (
                                    <tr key={alert.key} className="hover:bg-gray-50 dark:hover:bg-brand-primary transition-colors duration-200">
                                        <td className="p-3">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${priorityStyles[alert.priority]} ${highPriorityClass}`}>
                                                {alert.priority}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className={`flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200 ${alertMeta[alert.type].color}`}>
                                                {alertMeta[alert.type].icon}
                                                <span>{alert.message}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">
                                            {format(new Date(alert.dueDate + 'T00:00:00Z'), 'PPP')}
                                        </td>
                                        <td className="p-3">
                                            <Link to={alert.reference.link} className="text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors duration-200">
                                                {alert.reference.text}
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center p-8 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                        <CheckCircle size={48} className="mb-4 text-green-500" />
                        <p className="text-lg font-semibold">All clear! No critical alerts at the moment.</p>
                        <p className="text-sm mt-2">Your team is on top of things!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Alerts;
