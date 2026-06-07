// src/types.ts

export enum ImportStatus {
    OrderPlaced = "Order Placed",
    ShipmentConfirmed = "Shipment Confirmed",
    CargoPresence = "Cargo Presence",
    ArrivalAtPort = "Arrival at Port/Airport",
    CustomsClearance = "Customs Clearance",
    Delivered = "Delivered",
}

export enum ContainerStatus {
    OnVessel = "On Vessel",
    AtPort = "At Port",
    CustomsCleared = "Cleared Customs",
    InTransitToFactory = "In Transit to Factory",
    DeliveredToFactory = "Delivered to Factory",
    SentToDepot = "Sent to Depot"
}

export enum SeaportStatus {
    AwaitingDischarge = "Awaiting Discharge",
    Discharging = "Discharging",
    Discharged = "Discharged",
    AwaitingPickup = "Awaiting Inland Pickup",
    PickedUp = "Picked Up by Inland Carrier",
}

export enum PaymentStatus {
    PendingApproval = "Pending Approval",
    Approved = "Approved",
    Processed = "Processed",
    Reconciled = "Reconciled",
    Paid = "Paid",
    Disputed = "Disputed",
    Cancelled = "Cancelled",
    Refunded = "Refunded",
}

export enum InvoiceStatus {
    Draft = "Draft",
    PendingApproval = "Pending Approval",
    Approved = "Approved",
    PartiallyPaid = "Partially Paid",
    Paid = "Paid",
    Cancelled = "Cancelled",
    Rejected = "Rejected"
}

export enum TaskStatus {
    Pending = "Pending",
    InProgress = "In Progress",
    Completed = "Completed",
    Blocked = "Blocked",
}

export type TaskPriority = 'Low' | 'Medium' | 'High';

export type ContainerBufferStatus = 'Awaiting Unloading' | 'Unloading in Progress' | 'Unloaded' | 'Awaiting Return';

export type Role = 'Admin' | 'Finance' | 'Logistics' | 'View-Only';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    initials: string;
    password?: string;
    habilidades?: string;
    melhoresPontosFortes?: string;
    pontosAumentar?: string;
    department?: string;
    manager?: string;
    startDate?: string;
    position?: string;
    isActive?: boolean;
    contactPhone?: string;
    address?: string;
}

export type CostCategory =
    | 'FOB'
    | 'International Freight'
    | 'Insurance'
    | 'II'
    | 'IPI'
    | 'PIS/COFINS'
    | 'ICMS'
    | 'Broker Fees'
    | 'Stevedoring'
    | 'Warehousing'
    | 'Port Fees'
    | 'Domestic Transport'
    | 'Bonded Warehouse'
    | 'Demurrage'
    | 'Other'
    | 'Simulated Warehouse'
    | 'Simulated Additional Fees';

export type Currency = 'USD' | 'BRL' | 'EUR' | 'CNY';

export interface CostItem {
    id: string;
    category: CostCategory;
    description: string;
    value: number;
    currency: Currency;
    dueDate?: string;
    paymentDate?: string;
    status: PaymentStatus;
    oaSystemNumber?: string;
    costCenter?: string;
    monthlyProvision?: number;
    provisionNotes?: string;
    invoiceId?: string;
    invoiceLineItemId?: string;
}

export interface Product {
    id: string;
    name: string;
    ncm: string;
    quantity: number;
    unitValue: number;
    netWeight?: number;
    grossWeight?: number;
    cbm?: number;
    itemNumber?: string;
    vin?: string;
    model?: string;
    color?: string;
    seatingCapacity?: string;
    frontEngineNo?: string;
    engineDisplacement?: string;
    batterySerialNo?: string;
    sapNo?: string;
}

export interface TrackingEvent {
    stage: ImportStatus;
    date: string;
    notes?: string;
}

export interface Document {
    id: string;
    name: string;
    type: 'Invoice' | 'Packing List' | 'BL/AWB' | 'DI' | 'LI' | 'Other' | 'POP';
    uploadDate: string;
    fileUrl: string;
}

export interface ContainerLogEntry {
    timestamp: string;
    status: ContainerStatus | SeaportStatus;
    notes?: string;
    recordedByUserId?: string;
}

export interface Container {
    id: string;
    containerNumber: string;
    sealNumber?: string;
    currentStatus: ContainerStatus | SeaportStatus;
    etaFactory: string;
    etaFromCarrier?: string;
    lastSync?: string;
    tmsNumber?: string;
    deliveryLocation?: string;
    actualDeliveryDateFactory?: string;
    dateSentToDepot?: string;
    observation?: string;
    valueForInsurance?: number;
    demurrageFreeDays: number;
    demurrageStartDate?: string;
    demurrageEndDate?: string;
    log: ContainerLogEntry[];
    localCarrier?: string;
    trailerPlate?: string;
    tractorPlate?: string;
    localLoadingDate?: string;
    vehicleType?: string;
    driverName?: string;
    driverCpf?: string;
    estimatedLocalArrival?: string;
    finalDischargePlace?: string;
    seaportArrivalDate?: string;
    customsReleaseDate?: string;
    actualUnloadingStart?: string;
    actualUnloadingEnd?: string;
    dischargeWindowStart?: string;
    dischargeWindowEnd?: string;
    seaportStatus?: SeaportStatus;
    seaportDischargeLocation?: string;
    quantityByType?: {
        dc20?: number,
        dc40?: number,
        hc40?: number,
        fr40?: number,
        ot40?: number,
        truck?: number
    };
    typeOfInspection?: string;
    quantityContainerInspection?: number;
    bondedWarehouseId?: string; 
    cbm?: number; 
    grossWeightKgs?: number; 
}

export type NumerarioApprovalStatus = 'Pending Approval' | 'Approved' | 'Rejected';

export interface BrokerNumerario {
    estimatedValue: number;
    informedValue?: number;
    approvalStatus: NumerarioApprovalStatus;
    transferConfirmedDate?: string;
    reconciliationDate?: string;
    isPaid?: boolean;
}

export type DIChannel = 'Green' | 'Yellow' | 'Red' | 'Gray';

export interface DraftDIAddition {
    id: string;
    ncm: string;
    description: string;
    quantity: number;
    unitValueUSD: number;
    netWeightKg: number;
}

export interface DraftDIData {
    freightUSD: number;
    insuranceUSD: number;
    additions: DraftDIAddition[];
    calculatedTaxes?: {
        ii: number;
        ipi: number;
        pis: number;
        cofins: number;
        icms: number;
        totalBRL: number;
    };
    exchangeRateUSD: number; // Store the exchange rate used for calculation
}

export interface ImportProcess {
    id: string;
    importNumber: string;
    poNumbers: string;
    blNumber: string;
    vesselName?: string;
    diNumber?: string;
    supplier: string;
    responsibleBroker: string;
    createdById: string;
    typeOfCargo?: string;
    incoterm: 'FOB' | 'CIF' | 'EXW' | 'DDP';
    exTariff: number;
    totalContainers: number;
    demurrageFreeTimeDays: number;
    totalMeasurementCBM?: number;
    products: Product[];
    containers: Container[];
    dates: {
        orderPlaced?: string;
        estimatedShipment?: string;
        estimatedArrival?: string;
    };
    costs: CostItem[];
    trackingHistory: TrackingEvent[];
    documents: Document[];
    brokerNumerario?: BrokerNumerario;
    observationNotes: string;
    notificationEmails: string[];
    pendingBrazilianNF?: boolean;
    dangerousGoods?: string;
    importLicenseNumber?: string;
    importLicenseStatus?: string;
    freightForwarder?: string;
    shipowner?: string;
    additionalImportReference?: string;
    portOfLoading?: string;
    portOfDischarge?: string;
    voyageNumber?: string;
    draftDiData?: DraftDIData;
    diRegistrationDate?: string;
    diChannel?: DIChannel;
    diStatusText?: string;
    departureVesselDate?: string;
    arrivalVesselDate?: string;
    actualETD?: string;
    actualETA?: string;
    greenChannelDate?: string;
    cargoPresenceDate?: string;
    storageDeadline?: string;
    docApprovalDate?: string;
    nfIssueDate?: string;
    docsReceivedDate?: string;
    overallStatus?: string;
    firstTruckDelivery?: string;
    lastTruckDelivery?: string;
    technicianResponsibleBrazil?: string;
    technicianResponsibleChina?: string;
    kpiDocs?: number;
    kpiPoSap?: number;
    kpiCustomsClearance?: number;
    kpiCiLastDelivery?: number;
    kpiCiFirstDelivery?: number;
    kpiOperation2024?: number;
    kpiOperation2025?: number;
    kpiNf2?: number;
    goalClearance?: number;
    goalDelivery?: number;
    goalOperation?: number;
    goalNf?: number;
}

export interface Claim {
    id: string;
    importId: string;
    blNumber: string;
    claimDate: string;
    description: string;
    status: 'Open' | 'In Progress' | 'Resolved' | 'Rejected';
    claimedAmountUSD?: number;
    claimedAmountBRL?: number;
    receivedAmountUSD?: number;
    receivedAmountBRL?: number;
    incidentDate?: string;
    claimNumber?: string;
    claimNature?: string;
    estimatedReceiptDate?: string;
    actualReceiptDate?: string;
    approxDamageValue?: number;
    damagePaidByInsurance?: number;
    reimbursedValue?: number;
    reimbursementMethod?: string;
    partNumber?: string;
    sapNumber?: string;
    damageType?: string;
    totalDamageDescription?: string;
    reparableDamageDescription?: string;
    irreparableDamageDescription?: string;
    totalDamageVolumeM3?: number;
    damagedVolumeM3?: number;
    totalDamageTons?: number;
    reparableDamageTons?: number;
    irreparableDamageTons?: number;
    vesselName?: string;
    origin?: string;
    destination?: string;
    ata?: string;
    endDate?: string;
    project?: string;
    caseNumber?: string;
    hyCode?: string;
    replacementCaseNumber?: string;
    replacementBlNumber?: string;
    evidences?: string;
    vesselInsurance?: string;
    logisticInsurance?: string;
    bydsInsurance?: string;
    currentSituation?: string;
    solutionNotes?: string;
    documents?: Document[];
}

export interface NCMTaxRates {
    ii: number;
    ipi: number;
    pis: number;
    cofins: number;
    icms: number;
}

export interface NCMEntry {
    id: string;
    code: string;
    description: string;
    taxes: NCMTaxRates;
}

export interface Task {
    id: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    assignedToId?: string;
    linkedTo?: {
        type: 'Import';
        id: string;
        name: string;
    };
    comments?: { id: string; userId: string; text: string; date: string }[];
    attachments?: Document[];
    labels?: string[];
}

export interface DeliverySlot {
    id: string;
    dockId: number;
    startTime: string;
    endTime: string;
    containerNumber: string;
    importId?: string;
    containerId?: string;
    receiptConfirmed: boolean;
}

export interface ContainerBufferItem {
    id: string;
    containerId: string;
    importId: string;
    locationInFactory: string;
    status: ContainerBufferStatus;
    maxReturnDate: string;
    exitDate?: string;
    warehouseId?: string; // ADDED: Link to Warehouse ID
}

export interface ProcedureStep {
    id: string;
    text: string;
}

export interface Procedure {
    id: string;
    category: 'broker' | 'logistics' | 'financial';
    title: string;
    summary: string;
    steps: ProcedureStep[];
    documents?: Document[];
}

export interface CurrencyRateDetail {
    compra: number;
    venda: number;
}

export interface ExchangeRates {
    date: string;
    time: string;
    usd: CurrencyRateDetail;
    eur: CurrencyRateDetail;
    cny: number;
}

export type ContractStatus = 'Draft' | 'Active' | 'Expired' | 'Terminated';
export type ContractType = 'Service' | 'Goods' | 'Framework Agreement';

export interface Contract {
    id: string;
    contractNumber: string;
    title: string;
    supplier: string; // supplier ID
    type: ContractType;
    startDate: string;
    endDate: string;
    status: ContractStatus;
    value?: number;
    currency?: Currency;
    renewalTerms?: string;
    relatedImportIds?: string[];
}

export type PDCAStatus = 'Plan' | 'Do' | 'Check' | 'Act';

export interface PDCAItem {
    id: string;
    title: string;
    status: PDCAStatus;
    plan: string;
    do: string;
    check: string;
    act: string;
    ownerId: string;
    createdDate: string; // ISO date string
    relatedImportId?: string;
    relatedImportBL?: string;
    relatedImportNumber?: string;
}

export interface Supplier {
    id: string;
    name: string;
    category: 'Goods' | 'Service' | 'Logistics' | 'Other';
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface ProjectTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    tasks: ProjectTask[];
}

export interface InvoiceLineItem {
    id: string;
    description: string;
    amount: number;
    currency: Currency;
}

export interface Invoice {
    id: string;
    supplierId: string;
    supplierName: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: number;
    currency: Currency;
    status: InvoiceStatus;
    paidAmount?: number;
    outstandingAmount?: number;
    paymentIds?: string[];
    lineItems?: InvoiceLineItem[];
    createdAt: string;
    updatedAt: string;
}

export enum PaymentMethod {
    BankTransfer = 'Bank Transfer',
    CreditCard = 'Credit Card',
    Other = 'Other',
}


export interface Payment {
    id: string;
    invoiceId: string;
    paymentDate: string;
    amountPaid: number;
    currency: Currency;
    method: PaymentMethod;
    transactionRef?: string;
    notes?: string;
    recordedByUserId: string;
    createdAt: string;
    status: PaymentStatus;
}

export interface DiStatusInfo {
    // TBD
}

export interface ContainerMilestone {
    date: string;
    description: string;
    location: string;
}

export interface ContainerTrackingInfo {
    etaFromCarrier: string;
    currentStatus: string;
    milestones: ContainerMilestone[];
    lastSync: string;
}

export interface BackupData {
    imports: ImportProcess[];
    users: User[];
    claims: Claim[];
    ncms: NCMEntry[];
    tasks: Task[];
    deliverySchedule: DeliverySlot[];
    buffer: ContainerBufferItem[];
    procedures: Procedure[];
    companyLogo: string | null;
    suppliers: Supplier[];
    projects: Project[];
    invoices: Invoice[];
    payments: Payment[];
    warehouses: Warehouse[];
    vesselSchedule: VesselScheduleEntry[];
}

export interface Backup {
    id: string;
    timestamp: string;
    description: string;
    createdById: string;
    data: BackupData;
}

export interface BackupLog {
    id: string;
    timestamp: string;
    action: 'CREATE' | 'RESTORE' | 'DELETE';
    backupId: string;
    description: string;
    userId: string;
}

export interface VesselScheduleEntry {
    vesselName: string;
    voyage: string;
    agency: string;
    eta: string;
    etb: string;
    ets: string;
    berth: string;
    status: 'Expected' | 'Berthed';
    cargo: string;
}

export interface ExtractedImportData {
  importerName?: string;
  importerCNPJ?: string;
  exporterName?: string;
  poNumber?: string;
  invoiceNumber?: string;
  invoiceDate?: string; // YYYY-MM-DD
  blNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  estimatedArrivalDate?: string; // YYYY-MM-DD
  totalGrossWeightKgs?: number;
  totalNetWeightKgs?: number;
  totalMeasurementCBM?: number;
  totalQuantityUnits?: number;
  totalFOBValueCNY?: number;
  totalOceanFreightUSD?: number;
  incoterm?: string;
  responsibleBroker?: string;
  freightForwarder?: string;
  shipowner?: string;
  
  containers?: {
    containerNumber: string;
    sealNumber?: string;
    type?: string; 
    cbm?: number; 
    grossWeightKgs?: number;
  }[];
  products?: {
    itemNumber?: string;
    sapNo?: string;
    description: string;
    ncmCode?: string;
    quantity: number;
    unitValueCNY?: number;
    totalValueCNY?: number;
    netWeightKgs?: number;
    grossWeightKgs?: number;
    cbm?: number;
    vin?: string;
    model?: string;
    color?: string;
    batterySerialNo?: string;
  }[];
}

// --- NEW: Warehouse Type for Container Control ---
export interface Warehouse {
    id: string;
    name: string;
    capacity: number; // Total capacity in containers
    location?: string; // Physical address or description
    contactPerson?: string;
    phone?: string;
    email?: string;
    type: 'Bonded' | 'Internal' | 'External'; // e.g., Bonded Warehouse, Internal Patio
}