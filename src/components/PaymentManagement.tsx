import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, Payment, User, Supplier, InvoiceStatus, Currency, PaymentMethod, InvoiceLineItem, PaymentStatus } from '../types';
import { PlusCircle, Edit, Save, X, Banknote, FileText, AlertCircle, DollarSign, Send, CheckCircle, Trash2, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, format, isPast } from 'date-fns';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const emptyInvoice: Partial<Invoice> = {
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    totalAmount: 0,
    currency: 'USD',
    status: InvoiceStatus.PendingApproval,
    lineItems: [{ id: uuidv4(), description: '', amount: 0, currency: 'USD' }],
};

const getStatusChip = (status: InvoiceStatus) => {
    switch (status) {
        case InvoiceStatus.Paid: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300';
        case InvoiceStatus.PartiallyPaid: return 'bg-teal-100 text-teal-700 dark:bg-teal-800/50 dark:text-teal-300';
        case InvoiceStatus.PendingApproval: return 'bg-amber-100 text-amber-700 dark:bg-amber-800/50 dark:text-amber-300';
        case InvoiceStatus.Approved: return 'bg-sky-100 text-sky-700 dark:bg-sky-800/50 dark:text-sky-300';
        case InvoiceStatus.Cancelled: return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
        default: return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
};

const InvoiceFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (invoice: Omit<Invoice, 'id'> | Invoice) => void;
    suppliers: Supplier[];
    invoices: Invoice[];
    editingInvoice: Partial<Invoice> | null;
}> = ({ isOpen, onClose, onSave, suppliers, invoices, editingInvoice }) => {
    const [formData, setFormData] = useState<Partial<Invoice>>(emptyInvoice);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormData(editingInvoice || emptyInvoice);
            setError('');
        }
    }, [isOpen, editingInvoice]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumber = ['totalAmount'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
    };

    const handleSave = () => {
        // Validation
        if (!formData.supplierId || !formData.invoiceNumber || !formData.invoiceDate || !formData.dueDate || !formData.totalAmount) {
            setError('Supplier, Invoice Number, Dates, and Total Amount are required.');
            return;
        }
        // Double payment guard
        const isDuplicate = invoices.some(inv => 
            inv.invoiceNumber === formData.invoiceNumber && 
            inv.supplierId === formData.supplierId &&
            inv.id !== formData.id // Exclude self when editing
        );
        if (isDuplicate) {
            setError('An invoice with this number already exists for this supplier.');
            return;
        }

        const supplier = suppliers.find(s => s.id === formData.supplierId);
        const finalData = {
            ...formData,
            supplierName: supplier?.name || 'Unknown Supplier',
            outstandingAmount: formData.totalAmount - (formData.paidAmount || 0),
            createdAt: formData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        onSave(finalData as Invoice);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-brand-primary dark:text-white">{editingInvoice ? 'Edit' : 'New'} Invoice</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                    <select name="supplierId" value={formData.supplierId} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded-md">
                        <option value="">-- Select Supplier --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} placeholder="Invoice Number" className="w-full p-2 border dark:border-brand-accent rounded-md" />
                    <div className="grid grid-cols-2 gap-4">
                        <input name="invoiceDate" type="date" value={formData.invoiceDate} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded-md" />
                        <input name="dueDate" type="date" value={formData.dueDate} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded-md" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <input name="totalAmount" type="number" value={formData.totalAmount} onChange={handleChange} placeholder="Total Amount" className="w-full p-2 border dark:border-brand-accent rounded-md" />
                        <select name="currency" value={formData.currency} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded-md">
                            <option value="USD">USD</option>
                            <option value="BRL">BRL</option>
                            <option value="EUR">EUR</option>
                            <option value="CNY">CNY</option>
                        </select>
                    </div>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded-md">
                        {Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3">
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={handleSave} className="bg-brand-secondary text-white px-4 py-2 rounded-lg">Save</button>
                </div>
            </div>
        </div>
    );
};

const PaymentFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (payment: Omit<Payment, 'id' | 'recordedByUserId' | 'createdAt'>) => void;
    invoice: Invoice;
}> = ({ isOpen, onClose, onSave, invoice }) => {
    const [amountPaid, setAmountPaid] = useState<number | ''>(invoice.outstandingAmount || '');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.BankTransfer);
    const [transactionRef, setTransactionRef] = useState('');
    
    if (!isOpen) return null;

    const handleSave = () => {
        if (!amountPaid || amountPaid <= 0) {
            alert("Please enter a valid amount.");
            return;
        }
        onSave({
            invoiceId: invoice.id,
            amountPaid: Number(amountPaid),
            paymentDate,
            method,
            transactionRef,
            currency: invoice.currency,
            status: PaymentStatus.Paid,
        });
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-brand-primary dark:text-white">Record Payment for #{invoice.invoiceNumber}</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                 <div className="p-6 space-y-4">
                    <p>Outstanding: {invoice.currency} {invoice.outstandingAmount?.toFixed(2)}</p>
                    <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="Amount Paid" className="w-full p-2 border dark:border-brand-accent rounded-md" />
                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2 border dark:border-brand-accent rounded-md" />
                     <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} className="w-full p-2 border dark:border-brand-accent rounded-md">
                        {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input value={transactionRef} onChange={e => setTransactionRef(e.target.value)} placeholder="Transaction Ref (Optional)" className="w-full p-2 border dark:border-brand-accent rounded-md" />
                 </div>
                 <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3">
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={handleSave} className="bg-brand-secondary text-white px-4 py-2 rounded-lg">Record Payment</button>
                </div>
            </div>
        </div>
    );
};

const PaymentManagement: React.FC = () => {
    const { suppliers, invoices, payments, users } = useAppData();
    const { addInvoice, updateInvoice, addPayment } = useAppActions();
    const { currentUser } = useUI();

    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Partial<Invoice> | null>(null);
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
    const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');

    const handleOpenInvoiceModal = (invoice?: Invoice) => {
        setEditingInvoice(invoice || null);
        setIsInvoiceModalOpen(true);
    };

    const handleCloseInvoiceModal = () => {
        setIsInvoiceModalOpen(false);
        setEditingInvoice(null);
    };
    
    const handleOpenPaymentModal = (invoice: Invoice) => {
        setSelectedInvoiceForPayment(invoice);
        setIsPaymentModalOpen(true);
    };

    const handleClosePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setSelectedInvoiceForPayment(null);
    };
    
    if (!currentUser) return null; // Should not happen if routing is correct
    
    const canEdit = currentUser.role === 'Admin' || currentUser.role === 'Finance';

    const filteredInvoices = useMemo(() => {
        if (filter === 'all') return invoices;
        if (filter === 'pending') return invoices.filter(i => i.status === InvoiceStatus.PendingApproval || i.status === InvoiceStatus.Approved);
        if (filter === 'overdue') {
            const today = new Date();
            today.setHours(0,0,0,0);
            return invoices.filter(i => (i.status === InvoiceStatus.Approved || i.status === InvoiceStatus.PartiallyPaid) && isPast(new Date(i.dueDate + 'T00:00:00Z')));
        }
        return invoices;
    }, [invoices, filter]);

    return (
        <>
            <InvoiceFormModal isOpen={isInvoiceModalOpen} onClose={handleCloseInvoiceModal} onSave={editingInvoice?.id ? updateInvoice : addInvoice} suppliers={suppliers} invoices={invoices} editingInvoice={editingInvoice} />
            {isPaymentModalOpen && selectedInvoiceForPayment && <PaymentFormModal isOpen={true} onClose={handleClosePaymentModal} onSave={addPayment} invoice={selectedInvoiceForPayment} />}

            <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2"><FileText /> Invoices & Payments</h2>
                    {canEdit && <button onClick={() => handleOpenInvoiceModal()} className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-accent"><PlusCircle size={20} /> New Invoice</button>}
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm rounded-full ${filter === 'all' ? 'bg-brand-accent text-white' : 'bg-gray-200 dark:bg-brand-primary'}`}>All</button>
                    <button onClick={() => setFilter('pending')} className={`px-3 py-1 text-sm rounded-full ${filter === 'pending' ? 'bg-brand-accent text-white' : 'bg-gray-200 dark:bg-brand-primary'}`}>Pending</button>
                    <button onClick={() => setFilter('overdue')} className={`px-3 py-1 text-sm rounded-full ${filter === 'overdue' ? 'bg-brand-accent text-white' : 'bg-gray-200 dark:bg-brand-primary'}`}>Overdue</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-3"></th>
                                <th className="p-3">Invoice #</th>
                                <th className="p-3">Supplier</th>
                                <th className="p-3">Due Date</th>
                                <th className="p-3">Total</th>
                                <th className="p-3">Outstanding</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                        {filteredInvoices.map(invoice => {
                            const invoicePayments = payments.filter(p => p.invoiceId === invoice.id);
                            const isOverdue = (invoice.status === InvoiceStatus.Approved || invoice.status === InvoiceStatus.PartiallyPaid) && isPast(new Date(invoice.dueDate + 'T00:00:00Z'));
                            
                            return (
                            <React.Fragment key={invoice.id}>
                                <tr className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-brand-primary ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                                    <td className="p-3">
                                        <button onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)} className="p-1">
                                            <ChevronDown size={16} className={`transition-transform ${expandedInvoice === invoice.id ? 'rotate-180' : ''}`} />
                                        </button>
                                    </td>
                                    <td className="p-3 font-medium">{invoice.invoiceNumber}</td>
                                    <td className="p-3">{invoice.supplierName}</td>
                                    <td className="p-3">{format(new Date(invoice.dueDate + 'T00:00:00Z'), 'PPP')}</td>
                                    <td className="p-3">{invoice.currency} {invoice.totalAmount.toFixed(2)}</td>
                                    <td className="p-3">{invoice.currency} {invoice.outstandingAmount?.toFixed(2)}</td>
                                    <td className="p-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusChip(invoice.status)}`}>{invoice.status}</span></td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            {canEdit && invoice.status !== InvoiceStatus.Paid && (
                                                <button onClick={() => handleOpenPaymentModal(invoice)} className="p-2 text-emerald-600" title="Record Payment"><DollarSign size={16}/></button>
                                            )}
                                            {canEdit && <button onClick={() => handleOpenInvoiceModal(invoice)} className="p-2 text-sky-600" title="Edit Invoice"><Edit size={16}/></button>}
                                        </div>
                                    </td>
                                </tr>
                                {expandedInvoice === invoice.id && (
                                    <tr>
                                        <td colSpan={8} className="p-4 bg-gray-50 dark:bg-brand-primary/50">
                                            <h4 className="font-semibold mb-2">Payment History</h4>
                                            {invoicePayments.length > 0 ? (
                                                <ul className="list-disc list-inside text-xs space-y-1">
                                                    {invoicePayments.map(p => {
                                                        const recorder = users.find(u => u.id === p.recordedByUserId);
                                                        return (
                                                            <li key={p.id}>
                                                                Paid {invoice.currency} {p.amountPaid.toFixed(2)} on {format(new Date(p.paymentDate + 'T00:00:00Z'), 'PPP')} via {p.method}.
                                                                {recorder && <span className="text-gray-500 text-xs"> (by {recorder.name})</span>}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            ) : <p className="text-xs">No payments recorded for this invoice.</p>}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        )})}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default PaymentManagement;