import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import * as dataService from '../services/dataService';
import { STORAGE_KEYS } from '../services/dataService';
import { mockImports, mockUsers, mockClaims, mockNCMs, mockTasks, mockBuffer, mockProcedures, mockContracts, mockPDCAItems, mockSuppliers, mockProjects, mockInvoices, mockPayments, mockWarehouses, mockVesselSchedule } from '../data/mockData';
import type { ImportProcess, User, Claim, NCMEntry, Task, DeliverySlot, ContainerBufferItem, Procedure, ExchangeRates, Contract, PDCAItem, Supplier, Project, Invoice, Payment, Warehouse, VesselScheduleEntry } from '../types';
import { InvoiceStatus } from '../types';
import { AlertCircle, CheckCircle as CheckCircleIcon, X } from 'lucide-react';

// --- CONTEXT FOR UI STATE ---
interface UIContextType {
    currentUser: User | null;
    login: (user: User) => void;
    companyLogo: string | null;
    handleUpdateLogo: (logo: string | null) => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    globalDate: string;
    setGlobalDate: (date: string) => void;
    exchangeRates: ExchangeRates | null;
    setExchangeRates: React.Dispatch<React.SetStateAction<ExchangeRates | null>>;
    ratesLoading: boolean;
    ratesError: string | null;
    showNotification: (message: string, type?: 'success' | 'error') => void;
}
const UIContext = createContext<UIContextType | undefined>(undefined);

// --- CONTEXT FOR APP DATA ---
interface DataContextType {
    imports: ImportProcess[];
    users: User[];
    claims: Claim[];
    ncms: NCMEntry[];
    tasks: Task[];
    deliverySchedule: DeliverySlot[];
    buffer: ContainerBufferItem[];
    procedures: Procedure[];
    contracts: Contract[];
    pdcaItems: PDCAItem[];
    suppliers: Supplier[];
    projects: Project[];
    invoices: Invoice[];
    payments: Payment[];
    warehouses: Warehouse[];
    vesselSchedule: VesselScheduleEntry[];
    isLoadingData: boolean;
}
const DataContext = createContext<DataContextType | undefined>(undefined);

// --- CONTEXT FOR DATA ACTIONS ---
interface ActionsContextType {
    logout: () => void;
    addImport: (newImport: Omit<ImportProcess, 'id'>) => Promise<ImportProcess>;
    addMultipleImports: (newImports: Omit<ImportProcess, 'id'>[]) => Promise<void>;
    updateImport: (updatedImport: ImportProcess) => Promise<ImportProcess>;
    deleteImport: (importId: string) => Promise<void>;
    updateUser: (updatedUser: User) => Promise<void>;
    addUser: (newUser: Omit<User, 'id'>) => Promise<User>;
    addMultipleUsers: (newUsers: Omit<User, 'id'>[]) => Promise<void>;
    addClaim: (newClaim: Omit<Claim, 'id'>) => Promise<void>;
    addMultipleClaims: (newClaims: Omit<Claim, 'id'>[]) => Promise<void>;
    updateClaim: (updatedClaim: Claim) => Promise<void>;
    deleteClaim: (claimId: string) => Promise<void>;
    addNcm: (newNcm: Omit<NCMEntry, 'id'>) => Promise<void>;
    updateNcm: (updatedNcm: NCMEntry) => Promise<void>;
    deleteNcm: (ncmId: string) => Promise<void>;
    addTask: (newTask: Omit<Task, 'id'>) => Promise<void>;
    updateTask: (updatedTask: Task) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
    addDeliverySlot: (newSlot: Omit<DeliverySlot, 'id'>) => Promise<void>;
    updateDeliverySlot: (updatedSlot: DeliverySlot) => Promise<void>;
    deleteDeliverySlot: (slotId: string) => Promise<void>;
    addBufferItem: (newItem: Omit<ContainerBufferItem, 'id'>) => Promise<void>;
    updateBufferItem: (updatedItem: ContainerBufferItem) => Promise<void>;
    deleteBufferItem: (itemId: string) => Promise<void>;
    addSupplier: (newSupplier: Omit<Supplier, 'id'>) => Promise<Supplier>;
    updateSupplier: (updatedSupplier: Supplier) => Promise<void>;
    deleteSupplier: (supplierId: string) => Promise<void>;
    addInvoice: (newInvoice: Omit<Invoice, 'id'>) => Promise<Invoice>;
    updateInvoice: (updatedInvoice: Invoice) => Promise<void>;
    addPayment: (newPaymentData: Omit<Payment, 'id' | 'recordedByUserId' | 'createdAt'>) => Promise<Payment | undefined>;
    addContract: (newContract: Omit<Contract, 'id'>) => Promise<Contract>;
    updateContract: (updatedContract: Contract) => Promise<void>;
    deleteContract: (id: string) => Promise<void>;
    addPdcaItem: (newItem: Omit<PDCAItem, 'id'>) => Promise<PDCAItem>;
    updatePdcaItem: (updatedItem: PDCAItem) => Promise<void>;
    deletePdcaItem: (id: string) => Promise<void>;
    addProcedure: (newProcedure: Omit<Procedure, 'id'>) => Promise<Procedure>;
    updateProcedure: (updatedProcedure: Procedure) => Promise<void>;
    deleteProcedure: (id: string) => Promise<void>;
    addWarehouse: (newWarehouse: Omit<Warehouse, 'id'>) => Promise<Warehouse>;
    updateWarehouse: (updatedWarehouse: Warehouse) => Promise<void>;
    deleteWarehouse: (id: string) => Promise<void>;
    updateVesselSchedule: (newSchedule: VesselScheduleEntry[]) => Promise<void>;
    setProjects: (data: React.SetStateAction<Project[]>) => void;
}
const ActionsContext = createContext<ActionsContextType | undefined>(undefined);

const Notification: React.FC<{ message: string; type: 'success' | 'error'; onDismiss: () => void }> = ({ message, type, onDismiss }) => {
    return (
        <div className="fixed top-5 right-5 z-[100] animate-fade-in-down">
            <div className={`flex items-center gap-3 p-4 rounded-lg shadow-lg text-white ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                {type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircle size={20} />}
                <span className="font-semibold">{message}</span>
                <button onClick={onDismiss} className="ml-4 p-1 rounded-full hover:bg-white/20">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [imports, setImports] = useState<ImportProcess[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [ncms, setNcms] = useState<NCMEntry[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [deliverySchedule, setDeliverySchedule] = useState<DeliverySlot[]>([]);
    const [buffer, setBuffer] = useState<ContainerBufferItem[]>([]);
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [pdcaItems, setPdcaItems] = useState<PDCAItem[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [vesselSchedule, setVesselSchedule] = useState<VesselScheduleEntry[]>([]); 
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);
    const [companyLogo, setCompanyLogo] = useLocalStorage<string | null>('companyLogo', null);
    const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
    const [globalDate, setGlobalDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [exchangeRates, setExchangeRates] = useLocalStorage<ExchangeRates | null>('exchangeRates', null);
    const [ratesLoading, setRatesLoading] = useState(true);
    const [ratesError, setRatesError] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingData(true);
            try {
                const [
                    importsData, usersData, claimsData, ncmData, tasksData, deliveryData,
                    bufferData, proceduresData, contractsData, pdcaData, suppliersData, 
                    projectsData, invoicesData, paymentsData, warehousesData, vesselScheduleData
                ] = await Promise.all([
                    dataService.getData(STORAGE_KEYS.IMPORTS, mockImports),
                    dataService.getData(STORAGE_KEYS.USERS, mockUsers),
                    dataService.getData(STORAGE_KEYS.CLAIMS, mockClaims),
                    dataService.getData(STORAGE_KEYS.NCMS, mockNCMs),
                    dataService.getData(STORAGE_KEYS.TASKS, mockTasks),
                    dataService.getData(STORAGE_KEYS.DELIVERY_SCHEDULE, []),
                    dataService.getData(STORAGE_KEYS.CONTAINER_BUFFER, mockBuffer),
                    dataService.getData(STORAGE_KEYS.PROCEDURES, mockProcedures),
                    dataService.getData(STORAGE_KEYS.CONTRACTS, mockContracts),
                    dataService.getData(STORAGE_KEYS.PDCA_ITEMS, mockPDCAItems),
                    dataService.getData(STORAGE_KEYS.SUPPLIERS, mockSuppliers),
                    dataService.getData(STORAGE_KEYS.PROJECTS, mockProjects),
                    dataService.getData(STORAGE_KEYS.INVOICES, mockInvoices),
                    dataService.getData(STORAGE_KEYS.PAYMENTS, mockPayments),
                    dataService.getData(STORAGE_KEYS.WAREHOUSES, mockWarehouses),
                    dataService.getData(STORAGE_KEYS.VESSEL_SCHEDULE, mockVesselSchedule),
                ]);
                setImports(importsData);
                setUsers(usersData);
                setClaims(claimsData);
                setNcms(ncmData);
                setTasks(tasksData);
                setDeliverySchedule(deliveryData);
                setBuffer(bufferData);
                setProcedures(proceduresData);
                setContracts(contractsData);
                setPdcaItems(pdcaData);
                setSuppliers(suppliersData);
                setProjects(projectsData);
                setInvoices(invoicesData);
                setPayments(paymentsData);
                setWarehouses(warehousesData);
                setVesselSchedule(vesselScheduleData);
            } catch (err) {
                console.error("Failed to load initial data", err);
                showNotification("Failed to load application data. Please refresh.", "error");
            } finally {
                setIsLoadingData(false);
            }
        };
        loadInitialData();
    }, [showNotification]);


    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
    }, [theme]);

    useEffect(() => {
        setRatesLoading(true);
        if (!exchangeRates) {
            setExchangeRates({
                date: new Date().toISOString().split('T')[0],
                time: "10:00 (Default)",
                usd: { compra: 5.25, venda: 5.26 },
                eur: { compra: 5.68, venda: 5.69 },
                cny: 0.725
            });
        }
        setRatesLoading(false);
    }, [setExchangeRates]);
    
    const login = (user: User) => setCurrentUser(user);
    const logout = () => setCurrentUser(null);
    const handleUpdateLogo = (logo: string | null) => setCompanyLogo(logo);
    
    const addImport = useCallback(async (newImport: Omit<ImportProcess, 'id'>) => {
        const createdImport = await dataService.addDataItem<ImportProcess>(STORAGE_KEYS.IMPORTS, newImport);
        setImports(prev => [...prev, createdImport]);
        showNotification('Import created successfully!', 'success');
        return createdImport;
    }, [showNotification]);
    
    const addMultipleImports = useCallback(async (newImports: Omit<ImportProcess, 'id'>[]) => {
        const created = await dataService.addMultipleDataItems<ImportProcess>(STORAGE_KEYS.IMPORTS, newImports);
        setImports(prev => [...prev, ...created]);
        showNotification(`${created.length} imports created successfully!`, 'success');
    }, [showNotification]);

    const updateImport = useCallback(async (updatedImport: ImportProcess) => {
        const result = await dataService.updateDataItem<ImportProcess>(STORAGE_KEYS.IMPORTS, updatedImport);
        setImports(prev => prev.map(imp => imp.id === updatedImport.id ? updatedImport : imp));
        showNotification('Import updated successfully!', 'success');
        return result;
    }, [showNotification]);

    const deleteImport = useCallback(async (importId: string) => {
        await dataService.deleteDataItem(STORAGE_KEYS.IMPORTS, importId);
        setImports(prev => prev.filter(imp => imp.id !== importId));
        showNotification('Import deleted successfully!', 'error');
    }, [showNotification]);

    const updateUser = useCallback(async (updatedUser: User) => {
        await dataService.updateDataItem<User>(STORAGE_KEYS.USERS, updatedUser);
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        showNotification('User updated!', 'success');
    }, [showNotification]);

    const addUser = useCallback(async (newUser: Omit<User, 'id'>) => {
        const createdUser = await dataService.addDataItem<User>(STORAGE_KEYS.USERS, newUser);
        setUsers(prev => [...prev, createdUser]);
        showNotification('User added!', 'success');
        return createdUser;
    }, [showNotification]);

    const addMultipleUsers = useCallback(async (newUsers: Omit<User, 'id'>[]) => {
        const created = await dataService.addMultipleDataItems<User>(STORAGE_KEYS.USERS, newUsers);
        setUsers(prev => [...prev, ...created]);
        showNotification(`${created.length} users created!`, 'success');
    }, [showNotification]);

    const addClaim = useCallback(async (newClaim: Omit<Claim, 'id'>) => {
        const created = await dataService.addDataItem<Claim>(STORAGE_KEYS.CLAIMS, newClaim);
        setClaims(prev => [...prev, created]);
        showNotification('Claim added!', 'success');
    }, [showNotification]);
    
    const addMultipleClaims = useCallback(async (newClaims: Omit<Claim, 'id'>[]) => {
        const created = await dataService.addMultipleDataItems<Claim>(STORAGE_KEYS.CLAIMS, newClaims);
        setClaims(prev => [...prev, ...created]);
        showNotification(`${created.length} claims created!`, 'success');
    }, [showNotification]);

    const updateClaim = useCallback(async (updatedClaim: Claim) => {
        await dataService.updateDataItem<Claim>(STORAGE_KEYS.CLAIMS, updatedClaim);
        setClaims(prev => prev.map(c => c.id === updatedClaim.id ? updatedClaim : c));
        showNotification('Claim updated!', 'success');
    }, [showNotification]);

    const deleteClaim = useCallback(async (claimId: string) => {
        await dataService.deleteDataItem(STORAGE_KEYS.CLAIMS, claimId);
        setClaims(prev => prev.filter(c => c.id !== claimId));
        showNotification('Claim deleted!', 'error');
    }, [showNotification]);

    const addNcm = useCallback(async (newNcm: Omit<NCMEntry, 'id'>) => {
        const created = await dataService.addDataItem<NCMEntry>(STORAGE_KEYS.NCMS, newNcm);
        setNcms(prev => [...prev, created]);
        showNotification('NCM added!', 'success');
    }, [showNotification]);

    const updateNcm = useCallback(async (updatedNcm: NCMEntry) => {
        await dataService.updateDataItem<NCMEntry>(STORAGE_KEYS.NCMS, updatedNcm);
        setNcms(prev => prev.map(n => n.id === updatedNcm.id ? updatedNcm : n));
        showNotification('NCM updated!', 'success');
    }, [showNotification]);

    const deleteNcm = useCallback(async (ncmId: string) => {
        await dataService.deleteDataItem(STORAGE_KEYS.NCMS, ncmId);
        setNcms(prev => prev.filter(n => n.id !== ncmId));
        showNotification('NCM deleted!', 'error');
    }, [showNotification]);
    
    const addTask = useCallback(async (newTask: Omit<Task, 'id'>) => {
        const created = await dataService.addDataItem<Task>(STORAGE_KEYS.TASKS, newTask);
        setTasks(prev => [...prev, created]);
        showNotification('Task added!', 'success');
    }, [showNotification]);

    const updateTask = useCallback(async (updatedTask: Task) => {
        await dataService.updateDataItem<Task>(STORAGE_KEYS.TASKS, updatedTask);
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        showNotification('Task updated!', 'success');
    }, [showNotification]);
    
    const deleteTask = useCallback(async (taskId: string) => {
        await dataService.deleteDataItem(STORAGE_KEYS.TASKS, taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        showNotification('Task deleted!', 'error');
    }, [showNotification]);

    const addDeliverySlot = useCallback(async (newSlot: Omit<DeliverySlot, 'id'>) => {
        const created = await dataService.addDataItem<DeliverySlot>(STORAGE_KEYS.DELIVERY_SCHEDULE, newSlot);
        setDeliverySchedule(prev => [...prev, created]);
        showNotification('Delivery slot added!', 'success');
    }, [showNotification]);

    const updateDeliverySlot = useCallback(async (updatedSlot: DeliverySlot) => {
        await dataService.updateDataItem<DeliverySlot>(STORAGE_KEYS.DELIVERY_SCHEDULE, updatedSlot);
        setDeliverySchedule(prev => prev.map(slot => slot.id === updatedSlot.id ? updatedSlot : slot));
        showNotification('Delivery slot updated!', 'success');
    }, [showNotification]);

    const deleteDeliverySlot = useCallback(async (slotId: string) => {
        await dataService.deleteDataItem(STORAGE_KEYS.DELIVERY_SCHEDULE, slotId);
        setDeliverySchedule(prev => prev.filter(slot => slot.id !== slotId));
        showNotification('Delivery slot removed!', 'error');
    }, [showNotification]);
    
    const addBufferItem = useCallback(async (newItem: Omit<ContainerBufferItem, 'id'>) => {
        const created = await dataService.addDataItem<ContainerBufferItem>(STORAGE_KEYS.CONTAINER_BUFFER, newItem);
        setBuffer(prev => [...prev, created]);
        showNotification('Container added to buffer!', 'success');
    }, [showNotification]);

    const updateBufferItem = useCallback(async (updatedItem: ContainerBufferItem) => {
        await dataService.updateDataItem<ContainerBufferItem>(STORAGE_KEYS.CONTAINER_BUFFER, updatedItem);
        setBuffer(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        showNotification('Buffer item updated!', 'success');
    }, [showNotification]);
    
    const deleteBufferItem = useCallback(async (itemId: string) => {
        await dataService.deleteDataItem(STORAGE_KEYS.CONTAINER_BUFFER, itemId);
        setBuffer(prev => prev.filter(item => item.id !== itemId));
        showNotification('Buffer item removed!', 'error');
    }, [showNotification]);

    const addSupplier = useCallback(async (newSupplier: Omit<Supplier, 'id'>) => {
        const created = await dataService.addDataItem<Supplier>(STORAGE_KEYS.SUPPLIERS, newSupplier);
        setSuppliers(prev => [...prev, created]);
        showNotification('Supplier added!', 'success');
        return created;
    }, [showNotification]);

    const updateSupplier = useCallback(async (updatedSupplier: Supplier) => {
        await dataService.updateDataItem<Supplier>(STORAGE_KEYS.SUPPLIERS, updatedSupplier);
        setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
        showNotification('Supplier updated!', 'success');
    }, [showNotification]);
    
    const deleteSupplier = useCallback(async (supplierId: string) => {
        await dataService.deleteDataItem(STORAGE_KEYS.SUPPLIERS, supplierId);
        setSuppliers(prev => prev.filter(s => s.id !== supplierId));
        showNotification('Supplier deleted!', 'error');
    }, [showNotification]);
    
    const addInvoice = useCallback(async (newInvoice: Omit<Invoice, 'id'>) => {
        const created = await dataService.addDataItem<Invoice>(STORAGE_KEYS.INVOICES, newInvoice);
        setInvoices(prev => [...prev, created]);
        showNotification('Invoice created successfully!', 'success');
        return created;
    }, [showNotification]);

    const updateInvoice = useCallback(async (updatedInvoice: Invoice) => {
        await dataService.updateDataItem<Invoice>(STORAGE_KEYS.INVOICES, updatedInvoice);
        setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? updatedInvoice : i));
        showNotification('Invoice updated!', 'success');
    }, [showNotification]);

    const addPayment = useCallback(async (newPaymentData: Omit<Payment, 'id' | 'recordedByUserId' | 'createdAt'>) => {
        if (!currentUser) return;
        
        const paymentWithMeta: Omit<Payment, 'id'> = {
            ...newPaymentData,
            recordedByUserId: currentUser.id,
            createdAt: new Date().toISOString(),
        };

        const created = await dataService.addDataItem<Payment>(STORAGE_KEYS.PAYMENTS, paymentWithMeta);
        setPayments(prev => [...prev, created]);
        showNotification('Payment recorded!', 'success');
        
        if (newPaymentData.invoiceId) {
            const linkedInvoice = invoices.find(inv => inv.id === newPaymentData.invoiceId);
            if (linkedInvoice) {
                const updatedInvoice = {
                    ...linkedInvoice,
                    paidAmount: (linkedInvoice.paidAmount || 0) + newPaymentData.amountPaid,
                    outstandingAmount: (linkedInvoice.totalAmount || 0) - ((linkedInvoice.paidAmount || 0) + newPaymentData.amountPaid),
                    paymentIds: [...(linkedInvoice.paymentIds || []), created.id],
                    status: (linkedInvoice.totalAmount <= ((linkedInvoice.paidAmount || 0) + newPaymentData.amountPaid)) ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid
                };
                await dataService.updateDataItem<Invoice>(STORAGE_KEYS.INVOICES, updatedInvoice);
                setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? updatedInvoice : i));
            }
        }
        return created;
    }, [showNotification, invoices, currentUser]);
    
    const addContract = useCallback(async (newContract: Omit<Contract, 'id'>): Promise<Contract> => {
        const created = await dataService.addDataItem<Contract>(STORAGE_KEYS.CONTRACTS, newContract);
        setContracts(prev => [...prev, created]);
        showNotification('Contract added successfully!', 'success');
        return created;
    }, [showNotification]);

    const updateContract = useCallback(async (updatedContract: Contract) => {
        await dataService.updateDataItem<Contract>(STORAGE_KEYS.CONTRACTS, updatedContract);
        setContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c));
        showNotification('Contract updated!', 'success');
    }, [showNotification]);

    const deleteContract = useCallback(async (id: string) => {
        await dataService.deleteDataItem(STORAGE_KEYS.CONTRACTS, id);
        setContracts(prev => prev.filter(c => c.id !== id));
        showNotification('Contract deleted!', 'error');
    }, [showNotification]);
    
    const addPdcaItem = useCallback(async (newItem: Omit<PDCAItem, 'id'>): Promise<PDCAItem> => {
        const created = await dataService.addDataItem<PDCAItem>(STORAGE_KEYS.PDCA_ITEMS, newItem);
        setPdcaItems(prev => [...prev, created]);
        showNotification('PDCA Item added successfully!', 'success');
        return created;
    }, [showNotification]);

    const updatePdcaItem = useCallback(async (updatedItem: PDCAItem) => {
        await dataService.updateDataItem<PDCAItem>(STORAGE_KEYS.PDCA_ITEMS, updatedItem);
        setPdcaItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
        showNotification('PDCA Item updated!', 'success');
    }, [showNotification]);
    
    const deletePdcaItem = useCallback(async (id: string) => {
        await dataService.deleteDataItem(STORAGE_KEYS.PDCA_ITEMS, id);
        setPdcaItems(prev => prev.filter(i => i.id !== id));
        showNotification('PDCA Item deleted!', 'error');
    }, [showNotification]);
    
    const addProcedure = useCallback(async (newProcedure: Omit<Procedure, 'id'>): Promise<Procedure> => {
        const created = await dataService.addDataItem<Procedure>(STORAGE_KEYS.PROCEDURES, newProcedure);
        setProcedures(prev => [...prev, created]);
        showNotification('Procedure added successfully!', 'success');
        return created;
    }, [showNotification]);

    const updateProcedure = useCallback(async (updatedProcedure: Procedure) => {
        await dataService.updateDataItem<Procedure>(STORAGE_KEYS.PROCEDURES, updatedProcedure);
        setProcedures(prev => prev.map(p => p.id === updatedProcedure.id ? updatedProcedure : p));
        showNotification('Procedure updated!', 'success');
    }, [showNotification]);
    
    const deleteProcedure = useCallback(async (id: string) => {
        await dataService.deleteDataItem(STORAGE_KEYS.PROCEDURES, id);
        setProcedures(prev => prev.filter(p => p.id !== id));
        showNotification('Procedure deleted!', 'error');
    }, [showNotification]);

    const addWarehouse = useCallback(async (newWarehouse: Omit<Warehouse, 'id'>): Promise<Warehouse> => {
        const created = await dataService.addDataItem<Warehouse>(STORAGE_KEYS.WAREHOUSES, newWarehouse);
        setWarehouses(prev => [...prev, created]);
        showNotification('Warehouse added successfully!', 'success');
        return created;
    }, [showNotification]);

    const updateWarehouse = useCallback(async (updatedWarehouse: Warehouse) => {
        await dataService.updateDataItem<Warehouse>(STORAGE_KEYS.WAREHOUSES, updatedWarehouse);
        setWarehouses(prev => prev.map(w => w.id === updatedWarehouse.id ? updatedWarehouse : w));
        showNotification('Warehouse updated!', 'success');
    }, [showNotification]);
    
    const deleteWarehouse = useCallback(async (id: string) => {
        await dataService.deleteDataItem(STORAGE_KEYS.WAREHOUSES, id);
        setWarehouses(prev => prev.filter(w => w.id !== id));
        showNotification('Warehouse deleted!', 'error');
    }, [showNotification]);
    
    const updateVesselSchedule = useCallback(async (newSchedule: VesselScheduleEntry[]) => {
        await dataService.updateData<VesselScheduleEntry[]>(STORAGE_KEYS.VESSEL_SCHEDULE, newSchedule);
        setVesselSchedule(newSchedule);
        showNotification('Vessel schedule updated!', 'success');
    }, [showNotification]);

    const dataContextValue: DataContextType = {
        imports, users, claims, ncms, tasks, deliverySchedule, buffer, procedures,
        contracts, pdcaItems, suppliers, projects, invoices, payments, warehouses,
        vesselSchedule, isLoadingData
    };
    
    const uiContextValue: UIContextType = {
        currentUser, login, companyLogo, handleUpdateLogo, theme, setTheme,
        globalDate, setGlobalDate, exchangeRates, setExchangeRates, ratesLoading,
        ratesError, showNotification
    };

    const actionsContextValue: ActionsContextType = {
        logout, addImport, addMultipleImports, updateImport, deleteImport,
        updateUser, addUser, addMultipleUsers, addClaim, addMultipleClaims, updateClaim, deleteClaim,
        addNcm, updateNcm, deleteNcm, addTask, updateTask, deleteTask,
        addDeliverySlot, updateDeliverySlot, deleteDeliverySlot,
        addBufferItem, updateBufferItem, deleteBufferItem, addSupplier, updateSupplier, deleteSupplier,
        addInvoice, updateInvoice, addPayment, addContract, updateContract, deleteContract,
        addPdcaItem, updatePdcaItem, deletePdcaItem, addProcedure, updateProcedure, deleteProcedure,
        addWarehouse, updateWarehouse, deleteWarehouse, updateVesselSchedule, setProjects
    };
    
    return (
        <DataContext.Provider value={dataContextValue}>
            <UIContext.Provider value={uiContextValue}>
                <ActionsContext.Provider value={actionsContextValue}>
                    {notification && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
                    {children}
                </ActionsContext.Provider>
            </UIContext.Provider>
        </DataContext.Provider>
    );
};

export const useUI = (): UIContextType => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within an AppProvider');
    }
    return context;
};

export const useAppData = (): DataContextType => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useAppData must be used within an AppProvider');
    }
    return context;
};

export const useAppActions = (): ActionsContextType => {
    const context = useContext(ActionsContext);
    if (!context) {
        throw new Error('useAppActions must be used within an AppProvider');
    }
    return context;
};
