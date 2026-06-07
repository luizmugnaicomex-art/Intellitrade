// src/data/mockData.ts

import type { 
    ImportProcess, 
    User, 
    Claim, 
    NCMEntry, 
    Task, 
    ContainerBufferItem, 
    Procedure,
    Contract,
    PDCAItem,
    Supplier,
    Project,
    Invoice,
    Payment,
    Container, // Import Container type for clarity
    ContainerLogEntry, // Import ContainerLogEntry type
    InvoiceLineItem, // Import InvoiceLineItem type
    Warehouse, // Import Warehouse type
    VesselScheduleEntry,
} from '../types';
import { ImportStatus, ContainerStatus, PaymentStatus, InvoiceStatus, TaskStatus, PaymentMethod } from '../types'; // Import enums

// NOTE FOR PRODUCTION: Passwords should be securely hashed and validated on a backend. This is for development only.
export const mockUsers: User[] = [
    { 
        id: 'user-1', 
        name: 'Luiz Vieira da Costa Neto', 
        email: 'luiz.neto@byd.com', 
        role: 'Admin', 
        initials: 'LV', 
        // SECURITY NOTE: In a real production environment, this would be a securely hashed password.
        // The hardcoded password in AdminAuthModal.tsx is a separate development mechanism.
        password: 'hashed-password-for-123456', 
        habilidades: 'System Admin, Data Analysis, Strategic Planning', 
        melhoresPontosFortes: 'Problem Solving, Leadership, Comex Expertise', 
        pontosAumentar: 'Delegation, Work-Life Balance', 
        department: 'Management', 
        manager: 'CEO', 
        startDate: '2020-01-15',
        position: 'Supervisor de Comércio Exterior',
        isActive: true,
        contactPhone: '+55 71 98765-4321',
        address: 'Rua Principal, 123, Salvador - BA'
    },
    { id: 'user-2', name: 'Ana Souza', email: 'ana.souza@byd.com', role: 'Logistics', initials: 'AS', password: 'hashed-password-for-password123', habilidades: 'Container Scheduling, Carrier Negotiation', melhoresPontosFortes: 'Organization', pontosAumentar: 'Cost Analysis', department: 'Logistics', manager: 'Luiz Vieira da Costa Neto', startDate: '2021-05-20', position: 'Analista de Logística Sênior', isActive: true },
    { id: 'user-3', name: 'Carlos Ferreira', email: 'carlos.ferreira@byd.com', role: 'Finance', initials: 'CF', password: 'hashed-password-for-password123', habilidades: 'Cost Calculation, Payment Tracking', melhoresPontosFortes: 'Attention to Detail', pontosAumentar: 'Logistics Process Knowledge', department: 'Finance', manager: 'Luiz Vieira da Costa Neto', startDate: '2022-08-01', position: 'Analista Financeiro Pleno', isActive: true },
    { id: 'user-4', name: 'Guest Viewer', email: 'guest@byd.com', role: 'View-Only', initials: 'GV', password: 'hashed-password-for-guest', habilidades: 'Read-only access', melhoresPontosFortes: 'N/A', pontosAumentar: 'N/A', department: 'External', manager: 'N/A', startDate: '2023-01-01', position: 'Visitante', isActive: true },
    { id: 'user-5', name: 'Renata Lima', email: 'renata.lima@byd.com', role: 'Logistics', initials: 'RL', password: 'hashed-password-for-password123', habilidades: 'Customs Clearance, Documentation', melhoresPontosFortes: 'Regulatory Knowledge', pontosAumentar: 'Supplier Negotiation', department: 'Comex', manager: 'Ana Souza', startDate: '2022-11-10', position: 'Analista de Comércio Exterior Pleno', isActive: true },
    { id: 'user-emanoela', name: 'EMANOELA CARDOSO DE O. PEREIRA AMORIM', email: 'emanoela.cardoso@byd.com', role: 'Logistics', initials: 'EC', password: 'hashed-password-for-password123', position: 'ALMOXARIFE KD', department: 'Logistics', isActive: true },
    { id: 'user-andressa', name: 'ANDRESSA PINTO SILVA BARROS', email: 'andressa.barros@byd.com', role: 'Logistics', initials: 'AB', password: 'hashed-password-for-password123', position: 'ANALISTA DE COMÉRCIO EXTERIOR PLENO', department: 'Comex', isActive: true },
    { id: 'user-beatriz', name: 'BEATRIZ REGINA RINALDO', email: 'beatriz.rinaldo@byd.com', role: 'Logistics', initials: 'BR', password: 'hashed-password-for-password123', position: 'ANALISTA DE COMÉRCIO EXTERIOR PLENO', department: 'Comex', isActive: true },
    { id: 'user-daniela', name: 'DANIELA GUIMARÃES BRITO', email: 'daniela.brito@byd.com', role: 'Logistics', initials: 'DB', password: 'hashed-password-for-password123', position: 'ANALISTA DE COMÉRCIO EXTERIOR PLENO', department: 'Comex', isActive: true },
    { id: 'user-marina', name: 'MARINA BARBOSA DE QUADROS', email: 'marina.quadros@byd.com', role: 'Logistics', initials: 'MQ', password: 'hashed-password-for-password123', position: 'ANALISTA DE COMÉRCIO EXTERIOR SÊNIOR', department: 'Comex', isActive: true },
    { id: 'user-israel', name: 'ISRAEL MOREIRA DE OLIVEIRA JUNIOR', email: 'israel.junior@byd.com', role: 'Logistics', initials: 'IJ', password: 'hashed-password-for-password123', position: 'ESPECIALISTA DE COMÉRCIO EXTERIOR', department: 'Comex', isActive: true },
    { id: 'user-caio', name: 'CAIO BLANCO CARREIRA', email: 'caio.carreira@byd.com', role: 'Logistics', initials: 'CB', password: 'hashed-password-for-password123', position: 'ANALISTA DE COMÉRCIO EXTERIOR PLENO', department: 'Comex', isActive: true },
    { id: 'user-giani', name: 'GIANI ORIENTE OLIVEIRA', email: 'giani.oliveira@byd.com', role: 'Logistics', initials: 'GO', password: 'hashed-password-for-password123', position: 'ANALISTA DE COMÉRCIO EXTERIOR JR', department: 'Comex', isActive: true },
    { id: 'user-italo', name: 'ITALO DE ARAÚJO WANDERLEY ROMEIRO', email: 'italo.romeiro@byd.com', role: 'Logistics', initials: 'IW', password: 'hashed-password-for-password123', position: 'ANALISTA DE COMÉRCIO EXTERIOR PLENO', department: 'Comex', isActive: true },
    { id: 'user-taine', name: 'TAINE DE MELO CARNEIRO OLIVEIRA', email: 'taine.oliveira@byd.com', role: 'Logistics', initials: 'TO', password: 'hashed-password-for-password123', position: 'ESPECIALISTA DE COMÉRCIO EXTERIOR', department: 'Comex', isActive: true },
    { id: 'user-fabio', name: 'FABIO LEVI DA CRUZ SILVA', email: 'fabio.silva@byd.com', role: 'Logistics', initials: 'FL', password: 'hashed-password-for-password123', position: 'ASSISTENTE DE COMÉRCIO EXTERIOR', department: 'Comex', isActive: true },
    { id: 'user-rebeca', name: 'REBECA MAGALHÃES JUST DA ROCHA PITA', email: 'rebeca.pita@byd.com', role: 'Logistics', initials: 'RP', password: 'hashed-password-for-password123', position: 'ANALISTA DE COMÉRCIO EXTERIOR JR', department: 'Comex', isActive: true },
    { id: 'user-cindy', name: 'CINDY MILENI ÁLVARES NASCIMENTO', email: 'cindy.nascimento@byd.com', role: 'Logistics', initials: 'CN', password: 'hashed-password-for-password123', position: 'ANALISTA DE COMÉRCIO EXTERIOR PLENO', department: 'Comex', isActive: true },
    { id: 'user-eduardo', name: 'EDUARDO CAVALCANTI SILVA NETO', email: 'eduardo.neto@byd.com', role: 'Logistics', initials: 'ES', password: 'hashed-password-for-password123', position: 'ESPECIALISTA EM COMÉRCIO EXTERIOR', department: 'Comex', isActive: true },
    { id: 'user-bruno', name: 'BRUNO BORGES COELHO', email: 'bruno.coelho@byd.com', role: 'Logistics', initials: 'BC', password: 'hashed-password-for-password123', position: 'ANALISTA DE COMÉRCIO EXTERIOR PLENO', department: 'Comex', isActive: true },
];

export const mockNCMs: NCMEntry[] = [
    { id: 'ncm-1', code: '8703.80.00', description: 'Veículos automóveis, elétricos, para transporte de pessoas.', taxes: { ii: 18, ipi: 25, pis: 2.1, cofins: 9.65, icms: 18 } },
    { id: 'ncm-2', code: '8507.60.00', description: 'Acumuladores elétricos de íon de lítio.', taxes: { ii: 16, ipi: 15, pis: 2.1, cofins: 9.65, icms: 18 } },
];

export const mockProcedures: Procedure[] = [
    {
        id: 'proc-broker-1',
        category: 'broker',
        title: 'DI Registration',
        summary: 'Standard procedure for registering a new Import Declaration (DI).',
        steps: [
            { id: 'step-b1', text: 'Receive commercial invoice and BL from exporter.' },
            { id: 'step-b2', text: 'Verify NCM codes and product descriptions.' },
            { id: 'step-b3', text: 'Input data into Siscomex Import system.' },
            { id: 'step-b4', text: 'Pay import taxes and fees.' },
            { id: 'step-b5', text: 'Await parameterization channel (Green, Yellow, Red).'}
        ],
        documents: []
    },
];

export const mockWarehouses: Warehouse[] = [
    { id: 'wh-1', name: 'Intermarítima', capacity: 800, type: 'Bonded', location: 'Port of Salvador' },
    { id: 'wh-2', name: 'TPC', capacity: 800, type: 'Bonded', location: 'Port of Salvador' },
    { id: 'wh-3', name: 'Empório', capacity: 200, type: 'Bonded', location: 'Port of Salvador' },
    { id: 'wh-4', name: 'Tecon', capacity: 1000, type: 'Bonded', location: 'Port of Salvador' },
    { id: 'wh-5', name: 'BYD Factory Patio', capacity: 400, type: 'Internal', location: 'Camaçari, Bahia' }
];

const today = new Date();
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// --- Mock Containers with specific demurrage data ---
const createMockContainers = (count: number, freeDays: number, arrivalDate?: string): Container[] => {
    return Array.from({ length: count }, (_, i) => {
        const log: ContainerLogEntry[] = arrivalDate ? [{
            timestamp: new Date(arrivalDate).toISOString(),
            status: ContainerStatus.AtPort,
            notes: 'Container arrived at port.'
        }] : [];
        
        return {
            id: `cont-mock-${Math.random()}`,
            containerNumber: `MSKU${Math.floor(1000000 + Math.random() * 9000000)}`,
            currentStatus: arrivalDate ? ContainerStatus.AtPort : ContainerStatus.OnVessel,
            etaFactory: addDays(today, 15 + i).toISOString().split('T')[0],
            demurrageFreeDays: freeDays,
            log: log,
            seaportArrivalDate: arrivalDate,
            bondedWarehouseId: `wh-${(i % 5) + 1}`, // Assign to a mock warehouse
        } as Container;
    });
};


// --- Mock Imports ---
export const mockImports: ImportProcess[] = [
    {
        id: 'imp-1',
        importNumber: 'BR-2024-001-RISK',
        poNumbers: 'PO-1001, PO-1002',
        blNumber: 'BL-RISK-A1',
        supplier: 'Shenzhen Components Ltd.',
        responsibleBroker: 'Agility Logistics',
        createdById: 'user-2',
        typeOfCargo: 'Automotive Parts',
        incoterm: 'FOB',
        exTariff: 0,
        totalContainers: 2,
        demurrageFreeTimeDays: 7, // Default for import
        products: [{ id: 'prod-1', name: 'Battery Pack Model S', ncm: '8507.60.00', quantity: 20, unitValue: 15000 }],
        containers: createMockContainers(2, 7, addDays(today, -5).toISOString().split('T')[0]),
        dates: { orderPlaced: addDays(today, -40).toISOString().split('T')[0], estimatedArrival: addDays(today, -5).toISOString().split('T')[0] },
        costs: [
            { id: 'cost-1', category: 'FOB', description: 'FOB Value', value: 300000, currency: 'USD', status: PaymentStatus.Paid },
            { id: 'cost-2', category: 'International Freight', description: 'Freight Cost', value: 12000, currency: 'USD', status: PaymentStatus.Approved, dueDate: addDays(today, 3).toISOString().split('T')[0] },
            { id: 'cost-3', category: 'II', description: 'Import Duty', value: 95000, currency: 'BRL', status: PaymentStatus.Approved, dueDate: addDays(today, -2).toISOString().split('T')[0] }
        ],
        trackingHistory: [
            { stage: ImportStatus.OrderPlaced, date: addDays(today, -40).toISOString() },
            { stage: ImportStatus.ShipmentConfirmed, date: addDays(today, -35).toISOString() },
            { stage: ImportStatus.ArrivalAtPort, date: addDays(today, -5).toISOString() }
        ],
        documents: [],
        observationNotes: 'High priority shipment.',
        notificationEmails: ['ana.souza@byd.com'],
        docsReceivedDate: addDays(today, -30).toISOString().split('T')[0],
        overallStatus: ImportStatus.ArrivalAtPort,
    },
];

export const mockClaims: Claim[] = [
    { id: 'claim-1', importId: 'imp-1', blNumber: 'BL-RISK-A1', claimDate: addDays(today, -2).toISOString(), description: 'Minor scratches on 2 battery packs.', status: 'Open', claimedAmountUSD: 500 }
];

export const mockTasks: Task[] = [
    { id: 'task-1', description: 'Verify shipping documents for BR-2024-001-RISK', status: TaskStatus.InProgress, priority: 'High', assignedToId: 'user-5', dueDate: addDays(today, 1).toISOString().split('T')[0], linkedTo: { type: 'Import', id: 'imp-1', name: 'BR-2024-001-RISK' } },
    { id: 'task-3', description: 'Follow up on claim for BR-2024-001-RISK', status: TaskStatus.Pending, priority: 'High', assignedToId: 'user-1', dueDate: addDays(today, -1).toISOString().split('T')[0], linkedTo: { type: 'Import', id: 'imp-1', name: 'BR-2024-001-RISK' } } // OVERDUE
];

export const mockInvoices: Invoice[] = [
    {
        id: 'inv-1',
        supplierId: 'sup-1',
        supplierName: 'Agility Logistics',
        invoiceNumber: 'AG-8872',
        invoiceDate: addDays(today, -15).toISOString().split('T')[0],
        dueDate: addDays(today, -1).toISOString().split('T')[0], // Overdue
        totalAmount: 12000,
        currency: 'USD',
        status: InvoiceStatus.Approved,
        paidAmount: 0,
        outstandingAmount: 12000,
        createdAt: addDays(today, -15).toISOString(),
        updatedAt: addDays(today, -10).toISOString(),
    },
    {
        id: 'inv-2',
        supplierId: 'sup-2',
        supplierName: 'Hamburg Sud',
        invoiceNumber: 'HS-5521',
        invoiceDate: addDays(today, -5).toISOString().split('T')[0],
        dueDate: addDays(today, 25).toISOString().split('T')[0],
        totalAmount: 8500,
        currency: 'USD',
        status: InvoiceStatus.PendingApproval, // Pending Approval
        paidAmount: 0,
        outstandingAmount: 8500,
        createdAt: addDays(today, -5).toISOString(),
        updatedAt: addDays(today, -5).toISOString(),
    }
];
export const mockPayments: Payment[] = [];
export const mockBuffer: ContainerBufferItem[] = [];
export const mockContracts: Contract[] = [
    {
        id: 'contract-1',
        contractNumber: 'BYD-AGL-2024',
        title: 'Agility Logistics Services Agreement 2024',
        supplier: 'sup-1',
        type: 'Service',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'Active',
        value: 500000,
        currency: 'USD',
        renewalTerms: 'Auto-renews unless terminated 90 days prior to expiry.',
        relatedImportIds: [],
    }
];
export const mockPDCAItems: PDCAItem[] = [
    {
        id: 'pdca-1',
        title: 'Reduce Demurrage Costs for Automotive Parts',
        status: 'Check',
        plan: 'Implement a container buffer system and pre-scheduling for high-volume imports.',
        do: 'Deployed Container Buffer module and started scheduling for all BR-2024-XXX imports.',
        check: 'Monitoring demurrage costs for Q3. Initial data shows a 15% reduction in at-risk containers.',
        act: 'Standardize buffer usage for all brokers. Develop automated alerts for containers nearing free-time expiry.',
        ownerId: 'user-2', // Ana Souza
        createdDate: new Date('2024-06-01').toISOString(),
        relatedImportId: 'imp-1',
        relatedImportBL: 'BL-RISK-A1',
        relatedImportNumber: 'BR-2024-001-RISK'
    }
];
export const mockSuppliers: Supplier[] = [
    { id: 'sup-1', name: 'Agility Logistics', category: 'Logistics' },
    { id: 'sup-2', name: 'Hamburg Sud', category: 'Logistics' },
    { id: 'sup-3', name: 'Shenzhen Components Ltd.', category: 'Goods' }
];
export const mockProjects: Project[] = [];
export const mockVesselSchedule: VesselScheduleEntry[] = [];
