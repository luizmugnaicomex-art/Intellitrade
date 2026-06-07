// src/App.tsx
import React, { useState, Fragment, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useUI, useAppActions } from './context/AppContext';
import LoginScreen from './components/LoginScreen';
import { useTranslation } from './translations';
import {
    LayoutDashboard, LogOut, Sun, Moon, User, ChevronDown, ChevronUp, Menu, X,
    Briefcase, Ship, DollarSign, FileWarning, BarChart2, Wrench, Settings,
    FileText, UploadCloud, FileBadge, Receipt, FileBarChart2,
    Truck, GanttChartSquare, Anchor, List,
    ClipboardCheck, RefreshCw, Layers, BrainCircuit,
    Wallet, LineChart, Calculator, ShieldAlert, Sparkles,
    Users, BookCopy, Handshake, FolderKanban, Milestone, Building2, Archive,
    Container, Warehouse, CalendarClock, HandPlatter, TimerOff, Package, PlusCircle,
} from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';

// Import all page components
import Dashboard from './components/Dashboard';
import ImportList from './components/ImportList';
import ImportDetail from './components/ImportDetail';
import ImportForm from './components/ImportForm';
import FastInput from './components/FastInput';
import DeclarationDIStatusManagement from './components/DeclarationDIStatusManagement';
import BrokerNumerario from './components/BrokerNumerario';
import DraftDI from './components/DraftDI';
import ProcessTracking from './components/ProcessTracking';
import ContainerInput from './components/ContainerInput';
import ContainerControl from './components/ContainerControl';
import WarehouseManagement from './components/WarehouseManagement';
import ContainerDeliveryWindow from './components/ContainerDeliveryWindow';
import ContainerBuffer from './components/ContainerBuffer';
import VesselSchedule from './components/VesselSchedule';
import DemurrageControl from './components/DemurrageControl';
import PackingList from './components/PackingList';
import PaymentManagement from './components/PaymentManagement';
import Contracts from './components/Contracts';
import CashFlow from './components/CashFlow';
import Calculations from './components/Calculations';
import SupplierEvaluation from './components/SupplierEvaluation';
import SupplierManagement from './components/SupplierManagement';
import Claims from './components/Claims';
import Reports from './components/Reports';
import NCMManagement from './components/NCMManagement';
import WorkflowCRM from './components/WorkflowCRM';
import ProceduresManagement from './components/ProceduresManagement';
import PDCA from './components/PDCA';
import Alerts from './components/Alerts';
import SmartSummary from './components/SmartSummary';
import UserManagement from './components/UserManagement';
import MachineLearn from './components/MachineLearn';
import CompanyProfile from './components/CompanyProfile';
import SystemBackup from './components/SystemBackup';
import Projects from './components/Projects';

const navItems = [
    { name: 'dashboard', icon: LayoutDashboard, path: '/' },
    {
        name: 'broker', icon: Briefcase,
        children: [
            { name: 'allImports', path: '/imports', icon: FileText },
            { name: 'newImport', path: '/imports/new', icon: PlusCircle },
            { name: 'fastInput', path: '/fast-input', icon: UploadCloud },
            { name: 'diStatus', path: '/di-status', icon: FileBadge },
            { name: 'brokerNumerario', path: '/broker-numerario', icon: Receipt },
            { name: 'draftDI', path: '/draft-di', icon: FileBarChart2 },
        ],
    },
    {
        name: 'logistics', icon: Ship,
        children: [
            { name: 'processTracking', path: '/process-tracking', icon: GanttChartSquare },
            { name: 'containerInput', path: '/container-input', icon: Container },
            { name: 'containerControl', path: '/container-control', icon: Layers },
            { name: 'warehouseControl', path: '/warehouse-control', icon: Warehouse },
            { name: 'deliveryWindow', path: '/delivery-window', icon: CalendarClock },
            { name: 'containerBuffer', path: '/container-buffer', icon: HandPlatter },
            { name: 'shipSchedule', path: '/vessel-schedule', icon: Anchor },
            { name: 'demurrageControl', path: '/demurrage-control', icon: TimerOff },
            { name: 'packingList', path: '/packing-list', icon: Package },
        ]
    },
    {
        name: 'financial', icon: DollarSign,
        children: [
            { name: 'payments', path: '/payments', icon: Wallet },
            { name: 'contracts', path: '/contracts', icon: ClipboardCheck },
            { name: 'cashflow', path: '/cash-flow', icon: LineChart },
            { name: 'calculations', path: '/calculations', icon: Calculator },
        ]
    },
    {
        name: 'claims', icon: FileWarning, path: '/claims'
    },
    {
        name: 'projects', icon: FolderKanban, path: '/projects'
    },
    {
        name: 'tools', icon: Wrench,
        children: [
            { name: 'supplierEvaluation', path: '/supplier-evaluation', icon: Handshake },
            { name: 'supplierManagement', path: '/supplier-management', icon: Users },
            { name: 'reports', path: '/reports', icon: BarChart2 },
            { name: 'ncmManagement', path: '/ncm-management', icon: BookCopy },
            { name: 'workflow', path: '/workflow', icon: Milestone },
            { name: 'procedures', path: '/procedures', icon: RefreshCw },
            { name: 'pdca', path: '/pdca', icon: Layers },
        ]
    },
    {
        name: 'admin', icon: Settings,
        children: [
            { name: 'alerts', path: '/alerts', icon: ShieldAlert },
            { name: 'smartSummary', path: '/smart-summary', icon: Sparkles },
            { name: 'userManagement', path: '/user-management', icon: Users },
            { name: 'machineLearning', path: '/machine-learning', icon: BrainCircuit },
            { name: 'companyProfile', path: '/company-profile', icon: Building2 },
            { name: 'systemBackup', path: '/system-backup', icon: Archive },
        ]
    }
];

const NavLink: React.FC<{ to: string, icon: React.ElementType, text: string, isSubItem?: boolean }> = ({ to, icon: Icon, text, isSubItem }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
        <Link to={to} className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${isSubItem ? 'pl-11' : ''} ${isActive ? 'bg-brand-highlight text-brand-primary font-semibold' : 'text-gray-600 dark:text-gray-300 hover:bg-brand-highlight/50 hover:text-brand-primary dark:hover:text-white'}`}>
            <Icon size={18} />
            <span>{text}</span>
        </Link>
    );
};

const CollapsibleNav: React.FC<{ name: string, icon: React.ElementType, children: any[] }> = ({ name, icon: Icon, children }) => {
    const { t } = useTranslation();
    const location = useLocation();
    const containsActiveLink = children.some(child => child.path === location.pathname);
    const [isOpen, setIsOpen] = useState(containsActiveLink);

    useEffect(() => {
        if (containsActiveLink) {
            setIsOpen(true);
        }
    }, [location.pathname, containsActiveLink]);

    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-4 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-brand-highlight/50 hover:text-brand-primary dark:hover:text-white transition-colors">
                <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span>{t(name as any)}</span>
                </div>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isOpen && (
                <div className="mt-1 space-y-1">
                    {children.map(item => (
                        <NavLink key={item.name} to={item.path} icon={item.icon || FileText} text={t(item.name as any)} isSubItem />
                    ))}
                </div>
            )}
        </div>
    );
};

const Sidebar: React.FC<{ isSidebarOpen: boolean, closeSidebar: () => void }> = ({ isSidebarOpen, closeSidebar }) => {
    const { t } = useTranslation();
    const { companyLogo, currentUser } = useUI();
    const { logout } = useAppActions();

    return (
        <>
            <div className={`fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeSidebar}></div>
            <aside className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-brand-secondary border-r dark:border-brand-accent p-4 z-40 transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="flex items-center justify-between mb-6">
                    {companyLogo ? (
                        <img src={companyLogo} alt="Company Logo" className="max-h-10" />
                    ) : (
                        <h1 className="text-xl font-bold text-brand-primary dark:text-white">IntelliTrade</h1>
                    )}
                     <button onClick={closeSidebar} className="lg:hidden p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                        <X size={20} />
                    </button>
                </div>

                <nav className="space-y-2">
                    {navItems.map(item =>
                        item.children ? (
                            <CollapsibleNav key={item.name} name={item.name as any} icon={item.icon} children={item.children} />
                        ) : (
                            <NavLink key={item.name} to={item.path!} icon={item.icon} text={t(item.name as any)} />
                        )
                    )}
                </nav>

                <div className="absolute bottom-4 left-4 right-4 border-t dark:border-brand-accent pt-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-sm">
                            {currentUser?.initials}
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-brand-secondary dark:text-gray-200">{currentUser?.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.role}</p>
                        </div>
                        <button onClick={logout} className="ml-auto p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent" title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
    const { theme, setTheme } = useUI();
    
    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <header className="bg-white/70 dark:bg-brand-secondary/70 backdrop-blur-md sticky top-0 z-20 p-4 border-b dark:border-brand-accent flex items-center justify-between">
            <button onClick={onMenuClick} className="lg:hidden p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                <Menu size={24}/>
            </button>
             <div className="flex-grow"></div> {/* Spacer */}
             <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-brand-accent">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
        </header>
    )
}

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-brand-primary text-brand-secondary dark:text-gray-200">
            <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
            <div className="flex-1 lg:pl-64 flex flex-col">
                <Header onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-4 sm:p-6">
                    <ErrorBoundary>
                       {children}
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
}

export function App() {
    const { currentUser } = useUI();

    if (!currentUser) {
        return <LoginScreen />;
    }

    return (
        <MainLayout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/imports" element={<ImportList />} />
                <Route path="/imports/new" element={<ImportForm />} />
                <Route path="/imports/:id" element={<ImportDetail />} />
                <Route path="/imports/:id/edit" element={<ImportForm />} />
                <Route path="/fast-input" element={<FastInput />} />
                <Route path="/di-status" element={<DeclarationDIStatusManagement />} />
                <Route path="/broker-numerario" element={<BrokerNumerario />} />
                <Route path="/draft-di" element={<DraftDI />} />
                <Route path="/process-tracking" element={<ProcessTracking />} />
                <Route path="/container-input" element={<ContainerInput />} />
                <Route path="/container-control" element={<ContainerControl />} />
                <Route path="/warehouse-control" element={<WarehouseManagement />} />
                <Route path="/delivery-window" element={<ContainerDeliveryWindow />} />
                <Route path="/container-buffer" element={<ContainerBuffer />} />
                <Route path="/vessel-schedule" element={<VesselSchedule />} />
                <Route path="/demurrage-control" element={<DemurrageControl />} />
                <Route path="/packing-list" element={<PackingList />} />
                <Route path="/payments" element={<PaymentManagement />} />
                <Route path="/contracts" element={<Contracts />} />
                <Route path="/cash-flow" element={<CashFlow />} />
                <Route path="/calculations" element={<Calculations />} />
                <Route path="/claims" element={<Claims />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/supplier-evaluation" element={<SupplierEvaluation />} />
                <Route path="/supplier-management" element={<SupplierManagement />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/ncm-management" element={<NCMManagement />} />
                <Route path="/workflow" element={<WorkflowCRM />} />
                <Route path="/procedures" element={<ProceduresManagement />} />
                <Route path="/pdca" element={<PDCA />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/smart-summary" element={<SmartSummary />} />
                <Route path="/user-management" element={<UserManagement />} />
                <Route path="/machine-learning" element={<MachineLearn />} />
                <Route path="/company-profile" element={<CompanyProfile />} />
                <Route path="/system-backup" element={<SystemBackup />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </MainLayout>
    );
}
