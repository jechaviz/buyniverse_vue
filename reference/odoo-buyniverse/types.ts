import React from 'react';

// Enums
export enum UserType {
    Client = 'Client',
    Freelancer = 'Freelancer',
    Admin = 'Admin',
}

export enum JobStatus {
    Draft = 'DRAFT',
    Open = 'OPEN',
    InProgress = 'IN_PROGRESS',
    Completed = 'COMPLETED',
    Cancelled = 'CANCELLED',
    Archived = 'ARCHIVED',
    PendingApproval = 'PENDING_APPROVAL',
    Rejected = 'REJECTED',
    OnHold = 'ON_HOLD',
    RFI = 'RFI',
}

export enum SourcingType {
    RFI = 'RFI',
    RFP = 'RFP',
}

export enum JobType {
    FixedPrice = 'Fixed-Price',
    Hourly = 'Hourly',
}

export enum ExperienceLevel {
    Entry = 'Entry',
    Intermediate = 'Intermediate',
    Expert = 'Expert',
}

export enum ProjectLevel {
    Basic = 'Basic',
    Intermediate = 'Intermediate',
    Advanced = 'Advanced',
}

export enum Duration {
    LessThan1Month = 'Less than 1 month',
    Month1To3 = '1 to 3 months',
    Month3To6 = '3 to 6 months',
    MoreThan6Months = 'More than 6 months',
}

export enum ProposalStatus {
    Pending = 'Pending',
    Accepted = 'Accepted',
    Rejected = 'Rejected',
}

export enum ContractType {
    Job = 'JOB',
    Gig = 'GIG',
}

export enum MilestoneStatus {
    Pending = 'Pending',
    Funded = 'Funded',
    Requested = 'Requested',
    Released = 'Released',
}

export enum NotificationType {
    NEW_MESSAGE = 'NEW_MESSAGE',
    PROPOSAL_RECEIVED = 'PROPOSAL_RECEIVED',
    HIRED = 'HIRED',
    MILESTONE_FUNDED = 'MILESTONE_FUNDED',
    PAYMENT_REQUESTED = 'PAYMENT_REQUESTED',
    PAYMENT_RELEASED = 'PAYMENT_RELEASED',
    JOB_COMPLETED = 'JOB_COMPLETED',
    INVITED_TO_JOB = 'INVITED_TO_JOB',
    JOB_APPROVED = 'JOB_APPROVED',
    JOB_REJECTED = 'JOB_REJECTED',
    TIME_LOGGED = 'TIME_LOGGED',
    GIG_PURCHASED = 'GIG_PURCHASED',
    CONTEST_STARTED = 'CONTEST_STARTED',
    NEW_BID_PLACED = 'NEW_BID_PLACED',
    CONTEST_WINNER_SELECTED = 'CONTEST_WINNER_SELECTED',
}

export enum AgencyRole {
    Owner = 'Owner',
    Admin = 'Admin',
    Member = 'Member',
}

export enum TransactionType {
    MILESTONE_RELEASE = 'MILESTONE_RELEASE',
    GIG_PURCHASE = 'GIG_PURCHASE',
    PAYMENT = 'PAYMENT',
}

export enum ContestStatus {
    Active = 'ACTIVE',
    Finished = 'FINISHED',
}

export enum AvailabilityStatus {
    Available = 'Available',
    NotAvailable = 'Not Available',
}

export enum LeadStatus {
    New = 'New',
    Contacted = 'Contacted',
    Qualified = 'Qualified',
    ProposalSent = 'Proposal Sent',
    Converted = 'Converted',
    Disqualified = 'Disqualified',
}

export enum ExpenseStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Invoiced = 'Invoiced',
    Paid = 'Paid',
    Rejected = 'Rejected',
}

export enum ApprovalStatus {
    Pending = 'PENDING',
    Approved = 'APPROVED',
    Rejected = 'REJECTED',
}

export enum TaskStatus {
    New = 'New',
    InProgress = 'In Progress',
    Testing = 'Testing',
    AwaitingFeedback = 'Awaiting Feedback',
    Complete = 'Complete',
}

export enum TaskPriority {
    Low = 'Low',
    Normal = 'Normal',
    High = 'High',
    Urgent = 'Urgent',
}

export enum FileCategory {
    Documentation = 'Documentation',
    Contract = 'Contract',
    Brief = 'Brief',
    Other = 'Other',
}

export enum ProposalQualificationStatus {
    Pending = 'Pending',
    DocsUploaded = 'Docs Uploaded',
    NdaSigned = 'NDA Signed',
    Qualified = 'Qualified',
    Rejected = 'Rejected',
}

export enum EstimateStatus {
    New = 'New',
    Draft = 'Draft',
    Pending = 'Pending',
    Accepted = 'Accepted',
    Revised = 'Revised',
    Declined = 'Declined',
    Expired = 'Expired',
}


// Interfaces and Types
export interface UserPermissions {
    canCreateProjects: boolean;
    canViewAllProjects: boolean;
    canEditWorkspaceSettings: boolean;
    canManageFinances: boolean;
    isWorkspaceAdmin: boolean;
}

export interface Branch {
    id: string;
    name: string;
    postalCode: string;
}

export interface UserEmailSettings {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
}

export interface UserSettings {
    invoiceForm?: {
        sectionOrder?: string[];
        collapsedSections?: string[];
    }
}

export interface User {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    type: UserType;
    memberSince: Date;
    avatarUrl?: string;
    location?: string;
    permissions: UserPermissions;
    // Client specific
    companyName?: string;
    isIdentityVerified?: boolean;
    clientId?: string; // If part of a client team
    accountOwnerId?: string;
    tags?: string[];
    category?: string;
    clientStatus?: 'Active' | 'Inactive';
    rfc?: string;
    taxRegime?: string;
    postalCode?: string;
    branches?: Branch[];
    defaultInvoiceEmailSettings?: UserEmailSettings;
    folioBalance?: number;
    // Freelancer specific
    headline?: string;
    bio?: string;
    skills?: string[];
    jobSuccessScore?: number;
    totalEarned?: number;
    savedJobs?: string[];
    availabilityStatus?: AvailabilityStatus;
    agencyId?: string;
    agencyRole?: AgencyRole;
    portfolio?: { title: string; description: string; url: string }[];
    onlineStatus?: 'online' | 'away' | 'offline';
    isStarred?: boolean;
    lastSeen?: Date;
    defaultCurrency?: string;
    settings?: UserSettings;
}

export interface JobBudget {
    type: JobType;
    amount: number;
}

export interface Question {
    id: string;
    userId: string;
    text: string;
    postedAt: Date;
    answer?: {
        text: string;
        answeredAt: Date;
    };
}

export interface JobApprover {
    userId: string;
    level: number;
    status: ApprovalStatus;
    role: string;
    rejectionReason?: string;
}

export interface TeamMember {
    userId: string;
    permission: 'view' | 'edit';
    role: string;
}

export interface Activity {
    id: string;
    userId: string;
    type: 'COMMENT' | 'STATUS_CHANGE' | 'TASK_ASSIGNED' | 'ESTIMATE_CREATED';
    text: string;
    timestamp: Date;
    link?: {
        text: string;
        url: string;
    }
}

export interface MilestoneCategory {
    id: string;
    name: string;
    color: string;
    isDefault?: boolean;
}

export interface File {
    id: string;
    name: string;
    path: string;
    size: number;
    type: string;
    uploadedAt: Date;
    uploadedById: string;
    status: 'Uploaded' | 'Modified';
    category: FileCategory;
    content?: string;
}

export interface RfiResponse {
    providerId: string;
    idea: string;
    capabilities: string[];
    submittedAt: Date;
}

export interface Comment {
    id: string;
    userId: string;
    text: string;
    timestamp: Date;
    parentId?: string;
}

export interface Job {
    id: string;
    clientId: string;
    title: string;
    description: string;
    skills: string[];
    budget: JobBudget;
    postedAt: Date;
    status: JobStatus;
    proposals: Proposal[];
    experienceLevel: ExperienceLevel;
    requiresNDA: boolean;
    questions: Question[];
    contractId?: string;
    approvers: JobApprover[];
    team: TeamMember[];
    connectsRequired: number;
    invitedFreelancerIds?: string[];
    sourcingType: SourcingType;
    activity: Activity[];
    milestoneCategories: MilestoneCategory[];
    comments: Comment[];
    files: File[];
    rfiResponses: RfiResponse[];
    shortlistedProviderIds?: string[];
    ignoredProviderIds?: string[];
    currency: string;
    visibility: 'public' | 'private';
    projectLevel: ProjectLevel;
    duration: Duration;
    progress: number;
    hiringLimitDate?: Date;
    dueDate?: Date;
    startDate?: Date;
    category?: string;
    billingType?: 'fixed' | 'hourly' | 'retainer';
    rate?: number;
    estimatedHours?: number;
    timeSpent?: number;
    projectManagerId?: string;
    contestId?: string;
}

export interface Attachment {
    id: string;
    name: string;
    type: string;
    url: string;
}

export interface Proposal {
    id: string;
    jobId: string;
    freelancerId: string;
    freelancerName: string;
    bid: number;
    coverLetter: string;
    submittedAt: Date;
    status: ProposalStatus;
    attachments: Attachment[];
    qualificationStatus: ProposalQualificationStatus;
    ndaSigned: boolean;
    completionTime: string;
}

export interface Task {
    id: string;
    title: string;
    milestoneId: string;
    milestoneCategoryId?: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignedTo: string[];
    createdAt: Date;
    dueDate?: Date;
    commentsCount: number;
    attachmentsCount: number;
}

export interface Milestone {
    id: string;
    description: string;
    amount: number;
    dueDate: Date;
    status: MilestoneStatus;
    tasks: Task[];
}

export interface Contract {
    id: string;
    type: ContractType;
    jobType: JobType;
    sourceId: string; // Job ID or Gig ID
    clientId: string;
    providerId: string; // Freelancer ID or Agency ID
    rateOrBid: number;
    startedAt: Date;
    endedAt?: Date;
    milestones: Milestone[];
}

export interface Review {
    id: string;
    jobId: string;
    fromUserId: string;
    toUserId: string;
    rating: number;
    comment: string;
    submittedAt: Date;
}

export interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: Date;
}

export interface Conversation {
    id: string;
    jobId: string;
    participants: string[];
    messages: Message[];
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    text: string;
    link: string;
    isRead: boolean;
    createdAt: Date;
}

export interface Agency {
    id: string;
    name: string;
    tagline: string;
    logoUrl: string;
    bio: string;
    ownerId: string;
    members: { userId: string; role: AgencyRole }[];
    certifications: string[];
    portfolio: { title: string; description: string; url: string }[];
    location?: string;
    jobSuccessScore?: number;
    totalTeamEarnings?: number;
    specialties?: string[];
}

export interface Gig {
    id: string;
    creatorId: string; // User or Agency ID
    creatorType: 'user' | 'agency';
    title: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
    deliveryTimeDays: number;
    revisions: number;
    scope: string[];
}

export interface CfdiTax {
    base: number;
    taxType: string;
    rate: number;
    amount: number;
    isRetention: boolean;
    isLocal?: boolean;
    included?: boolean;
}

export interface InvoiceLineItem {
    id: string;
    productId?: string;
    productCode: string; // ClaveProdServ
    unitCode: string; // ClaveUnidad
    quantity: number;
    unit: string;
    description: string;
    unitPrice: number;
    discount: number;
    amount: number;
    objetoImp: string; // '01', '02', '03'
    taxes: CfdiTax[];
    // CFDI 4.0 Additions
    noIdentificacion?: string;
    aCuentaTerceros?: {
        rfc: string;
        nombre: string;
        regimenFiscal: string;
        domicilioFiscal: string;
    };
    informacionAduanera?: { numeroPedimento: string }[];
    cuentaPredial?: { numero: string };
    partes?: Partial<InvoiceLineItem>[];
}

export interface Invoice {
    id: string;
    uuid?: string;
    version: '4.0';
    serie: string;
    folio: string;
    date: Date;
    status: 'Vigente' | 'Cancelado';
    paymentStatus: 'Paid' | 'Unpaid' | 'Overdue';
    cancellationDetails?: {
        motive: string;
        replacementUuid?: string;
    };
    tipoDeComprobante: 'I' | 'E' | 'T'; // Ingreso, Egreso, Traslado
    exportacion: string; // Catálogo
    condicionesDePago?: string;
    informacionGlobal?: {
        periodicidad: string;
        meses: string;
        año: number;
    };
    cfdiRelacionados?: {
        tipoRelacion: string;
        uuids: string[];
    };
    issuerId: string;
    branchId: string;
    receiverBranchId?: string;
    issuer: {
        name: string;
        rfc: string;
        taxRegime: string;
        postalCode: string;
    };
    receiver: {
        userId: string;
        name: string;
        rfc: string;
        taxRegime: string;
        postalCode: string;
        cfdiUse: string;
    };
    lineItems: InvoiceLineItem[];
    impuestos?: {
        totalImpuestosTrasladados?: number;
        totalImpuestosRetenidos?: number;
        traslados?: CfdiTax[];
        retenciones?: CfdiTax[];
    };
    cfdiUse: string;
    paymentMethod: 'PUE' | 'PPD';
    paymentType: string;
    currency: 'USD' | 'MXN' | 'EUR';
    exchangeRate: number;
    subtotal: number;
    discount: number;
    taxTotal: number;
    retainedTotal: number;
    total: number;
    originalString: string;
    issuerSeal: string;
    satSeal: string;
    qrCodeData: string;
    companyName: string;
    projectTitle: string;
    amount: number;
    issuedDate: Date;
    dueDate: Date;
    contractId?: string;
    clientId: string;
    providerId: string;
    paymentNotes?: string;
    attachments?: Attachment[];
    emailSettings?: UserEmailSettings;
}

export interface Estimate {
    id: string;
    date: Date;
    companyId: string;
    createdById: string;
    amount: number;
    status: EstimateStatus;
}

export interface Transaction {
    id: string;
    userId: string;
    type: TransactionType;
    amount: number;
    description: string;
    date: Date;
    relatedId: string; // e.g., Contract ID
    invoiceId: string;
}

export interface TimeEntry {
    id: string;
    contractId: string;
    userId: string;
    date: Date;
    hours: number;
    memo: string;
}

export interface Contest {
    id: string;
    jobId: string;
    status: ContestStatus;
    startTime: Date;
    endTime: Date;
    winnerId?: string;
    showParticipantNames: boolean;
    showParticipantOffers: boolean;
    conversationId: string;
    bidHistory: { userId: string; amount: number; timestamp: Date }[];
}

export interface Payment {
    id: string;
    paymentDate: Date;
    invoiceId: string;
    amount: number;
    clientId: string;
    projectId: string;
    method: 'Paypal' | 'Bank';
}

export interface RelatedDocument {
    id: string; // local id for react key
    documentId: string; // The UUID of the original invoice
    serie?: string;
    folio?: string;
    currency: string; // MonedaDR
    equivalenciaDR: number; // Required if MonedaDR != MonedaP
    paymentNumber: number;
    previousBalance: number;
    amountPaid: number; // ImpPagado (in MonedaDR)
    newBalance: number;
    taxes: CfdiTax[]; // ImpuestosDR (original taxes from invoice)
    impuestosP: CfdiTax[]; // Proportional taxes for this payment (ImpuestosP for this DoctoRelacionado)
    objetoImpDR: string;
}

export interface PaymentReceipt {
    id: string;
    uuid?: string;
    version: '2.0';
    serie: string;
    folio: string;
    date: Date; // payment date
    status: 'Vigente' | 'Cancelado';
    
    issuerId: string;
    receiverId: string;

    // From pago20:Pago
    amount: number; // This is MontoTotalPagos
    currency: string; // MonedaP
    exchangeRate?: number; // TipoCambioP
    paymentType: string; // FormaDePagoP

    // Optional fields from pago20:Pago
    numOperacion?: string;
    rfcEmisorCtaOrd?: string;
    nomBancoOrdExt?: string;
    ctaOrdenante?: string;
    rfcEmisorCtaBen?: string;
    ctaBeneficiario?: string;

    relatedDocuments: RelatedDocument[];

    impuestosP: CfdiTax[]; // Aggregated taxes for the entire payment
    
    // From pago20:Totales (this will be a calculated object)
    totals: {
        totalRetencionesIVA: number;
        totalRetencionesISR: number;
        totalRetencionesIEPS: number;
        totalTrasladosBaseIVA16: number;
        totalTrasladosImpuestoIVA16: number;
        totalTrasladosBaseIVA8: number;
        totalTrasladosImpuestoIVA8: number;
        totalTrasladosBaseIVA0: number;
        totalTrasladosImpuestoIVA0: number;
        totalTrasladosBaseIVAExento: number;
        montoTotalPagos: number;
    };
    
    originalString?: string;
    issuerSeal?: string;
    satSeal?: string;
}

export interface Lead {
    id: string;
    contactName: string;
    title: string;
    createdAt: Date;
    value: number;
    assignedTo: string[];
    category: string;
    status: LeadStatus;
}

export interface Supplier {
    id: string;
    name: string;
    category: string;
    contactPerson: string;
    email: string;
    phone: string;
    totalSpend: number;
    rating: number;
    status: 'Active' | 'Inactive' | 'Pending';
}

export interface Product {
    id: string;
    description: string;
    rate: number;
    unit: string;
    category: string;
    isPinned?: boolean;
    defaultTaxes?: Partial<CfdiTax>[];
    // Fields from InvoiceLineItem to auto-populate
    productCode?: string;
    unitCode?: string;
    objetoImp?: string;
    noIdentificacion?: string;
    aCuentaTerceros?: {
        rfc: string;
        nombre: string;
        regimenFiscal: string;
        domicilioFiscal: string;
    };
    informacionAduanera?: { numeroPedimento: string }[];
    cuentaPredial?: { numero: string };
    partes?: Partial<InvoiceLineItem>[];
}

export interface Expense {
    id: string;
    date: Date;
    description: string;
    userId: string;
    clientId?: string;
    projectId?: string;
    amount: number;
    billable: boolean;
    status: ExpenseStatus;
    isPinned?: boolean;
}

export interface DashboardCategory {
    id: string;
    title: string;
    widgets: WidgetConfig[];
}

export interface WidgetConfig {
    id: string;
    type: 'bar' | 'pie' | 'summary';
    title: string;
    dataKey: 'leads' | 'invoices' | 'payments' | 'expenses';
    xAxisColumn?: string;
    yAxisColumn?: string;
    aggregation?: 'count' | 'sum' | 'average';
    size: number;
    minSize: number;
    maxSize: number;
}

export interface FilterRule {
    id: string;
    columnId: string;
    operator: Operator;
    value: string;
}

export interface FilterGroup {
    id: string;
    logic: 'AND' | 'OR';
    filters: (FilterRule | FilterGroup)[];
}

export type Operator =
  | 'contains'
  | 'doesNotContain'
  | 'is'
  | 'isNot'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'dateIs'
  | 'dateIsNot'
  | 'dateIsBefore'
  | 'dateIsAfter';

export interface TableView {
    id: string;
    name: string;
    isDefault?: boolean;
    config: {
        filters?: FilterGroup;
        sorting?: { id: string, desc: boolean }[];
        columnVisibility?: Record<string, boolean>;
        columnOrder?: string[];
        groupByColumns?: string[];
        columnWidths?: Record<string, number>;
    };
}

export interface Issuer {
    id: string;
    name: string;
    rfc: string;
    taxRegime: string;
    branches: Branch[];
    csdCert?: string;
    csdKey?: string;
    csdPassword?: string;
    pacProvider?: string;
    pacUser?: string;
    pacApiKey?: string;
}

export interface TableAdminConfig {
    [tableId: string]: {
        disableSettings?: boolean;
        defaultColumnVisibility?: Record<string, boolean>;
        columnPermissions?: Record<string, 'read' | 'write' | 'none'>;
    };
}

export interface AppState {
    jobs: Job[];
    users: User[];
    leads: Lead[];
    suppliers: Supplier[];
    issuers: Issuer[];
    currentUser: User;
    reviews: Review[];
    contracts: Contract[];
    conversations: Conversation[];
    notifications: Notification[];
    agencies: Agency[];
    gigs: Gig[];
    invoices: Invoice[];
    estimates: Estimate[];
    transactions: Transaction[];
    timeEntries: TimeEntry[];
    contests: Contest[];
    payments: Payment[];
    paymentReceipts: PaymentReceipt[];
    products: Product[];
    expenses: Expense[];
    dashboardLayouts: { [tableId: string]: DashboardCategory[] };
    tableViews: { [tableId: string]: TableView[] };
    tableAdminConfig: TableAdminConfig;
}

export type Action =
    | { type: 'SWITCH_TO_USER'; payload: { userId: string } }
    | { type: 'TOGGLE_SAVE_JOB'; payload: { jobId: string } }
    | { type: 'ADD_PROPOSAL'; payload: { proposal: Proposal; conversation: Conversation; notification: Notification } }
    | { type: 'HIRE_FREELANCER'; payload: { jobId: string; proposalId: string; contract: Contract; notification: Notification } }
    | { type: 'MARK_JOB_COMPLETE', payload: { jobId: string; contractId: string; clientNotification: Notification; freelancerNotification: Notification, invoice: Invoice } }
    | { type: 'CREATE_MILESTONE'; payload: { contractId: string; milestone: Milestone } }
    | { type: 'FUND_MILESTONE'; payload: { contractId: string; milestoneId: string; notification: Notification } }
    | { type: 'REQUEST_MILESTONE_PAYMENT'; payload: { contractId: string; milestoneId: string; notification: Notification } }
    | { type: 'RELEASE_MILESTONE_PAYMENT'; payload: { contractId: string; milestoneId: string; notification: Notification; transaction: Transaction } }
    | { type: 'ADD_REVIEW'; payload: Review }
    | { type: 'POST_QUESTION'; payload: { jobId: string; question: Question } }
    | { type: 'ANSWER_QUESTION'; payload: { jobId: string; questionId: string; answerText: string } }
    | { type: 'SEND_MESSAGE'; payload: { conversationId: string; message: Message; notification?: Notification } }
    | { type: 'MARK_NOTIFICATIONS_READ' }
    | { type: 'CREATE_AGENCY'; payload: { agency: Agency } }
    | { type: 'UPDATE_AGENCY_PROFILE'; payload: { agencyId: string; data: Partial<Agency> } }
    | { type: 'SET_AVAILABILITY'; payload: { status: AvailabilityStatus } }
    | { type: 'CREATE_JOB_DRAFT', payload: Job }
    | { type: 'UPDATE_JOB_DRAFT', payload: { jobId: string; data: Partial<Job> } }
    | { type: 'UPDATE_JOB', payload: { jobId: string; data: Partial<Job> } }
    | { type: 'APPROVE_JOB'; payload: { jobId: string; approverId: string; notification: Notification } }
    | { type: 'REJECT_JOB'; payload: { jobId: string; approverId: string; reason: string; notification: Notification } }
    | { type: 'LOG_TIME'; payload: { timeEntry: TimeEntry, notification: Notification } }
    | { type: 'PURCHASE_GIG', payload: { gig: Gig; contract: Contract; invoice: Invoice; transaction: Transaction; notification: Notification } }
    | { type: 'CREATE_CONTEST', payload: { contest: Contest; conversation: Conversation; notifications: Notification[] } }
    | { type: 'UPDATE_PROPOSAL_BID', payload: { jobId: string; proposalId: string; newBid: number; message: Message; notification: Notification } }
    | { type: 'SELECT_CONTEST_WINNER', payload: { contestId: string, jobId: string, winnerId: string; contract: Contract; notifications: Notification[] } }
    | { type: 'ADD_WIDGET', payload: { tableId: string, categoryId?: string, newCategoryTitle?: string, widget: WidgetConfig } }
    | { type: 'UPDATE_WIDGET', payload: { tableId: string, widget: WidgetConfig } }
    | { type: 'DELETE_WIDGET', payload: { tableId: string, widgetId: string } }
    | { type: 'UPDATE_CATEGORY_TITLE', payload: { tableId: string, categoryId: string, title: string } }
    | { type: 'SET_DASHBOARD_LAYOUT', payload: { tableId: string, layout: DashboardCategory[] } }
    | { type: 'SAVE_TABLE_VIEW', payload: { tableId: string, view: TableView } }
    | { type: 'UPDATE_TABLE_VIEW', payload: { tableId: string, view: TableView } }
    | { type: 'DELETE_TABLE_VIEW', payload: { tableId: string, viewId: string } }
    | { type: 'DUPLICATE_WIDGET', payload: { tableId: string, categoryId: string, widgetId: string } }
    | { type: 'UPDATE_ENTITY', payload: { entity: keyof AppState, id: string, data: any } }
    | { type: 'BULK_UPDATE_LEAD_STATUS', payload: { leadIds: string[], status: LeadStatus } }
    | { type: 'BULK_ADD_LEADS', payload: { leads: Omit<Lead, 'id' | 'createdAt' | 'assignedTo'>[] } }
    | { type: 'UPDATE_PRODUCT', payload: { id: string, data: Partial<Product> } }
    | { type: 'UPDATE_EXPENSE', payload: { id: string, data: Partial<Expense> } }
    | { type: 'CREATE_TASK', payload: { contractId: string, milestoneId: string, task: Task } }
    | { type: 'UPDATE_TASK_STATUS', payload: { contractId: string, milestoneId: string, taskId: string, newStatus: TaskStatus } }
    | { type: 'REORDER_MILESTONE_CATEGORIES', payload: { projectId: string, orderedCategoryIds: string[] } }
    | { type: 'ADD_INVOICE', payload: { invoice: Invoice } }
    | { type: 'UPDATE_INVOICE', payload: { invoice: Invoice } }
    | { type: 'CANCEL_INVOICE', payload: { invoiceId: string, motive: string, replacementUuid?: string } }
    | { type: 'ADD_PAYMENT_RECEIPT', payload: { payment: PaymentReceipt } }
    | { type: 'UPDATE_PAYMENT_RECEIPT', payload: { payment: PaymentReceipt } }
    | { type: 'ADD_JOB', payload: Job }
    | { type: 'UPDATE_ISSUER', payload: { issuer: Issuer } }
    | { type: 'PURCHASE_FOLIOS', payload: { amount: number } }
    | { type: 'UPDATE_USER_SETTINGS', payload: UserSettings }
    | { type: 'INVITE_FREELANCER', payload: { jobId: string, freelancerId: string, notification: Notification } }
    | { type: 'SET_PROVIDER_GROUP', payload: { jobId: string, providerId: string, targetGroup: 'shortlisted' | 'ignored' | 'suggested' | 'invited' } }
    | { type: 'UPDATE_PROPOSAL_QUALIFICATION', payload: { jobId: string, providerId: string, status: ProposalQualificationStatus } }
    | { type: 'SHORTLIST_FOR_PROPOSAL', payload: { jobId: string, providerIds: string[] } }
    | { type: 'CREATE_NEW_FILE', payload: { projectId: string, file: Omit<File, 'id' | 'uploadedAt' | 'uploadedById' | 'size'> } }
    | { type: 'CREATE_NEW_FOLDER', payload: { projectId: string, folderPath: string } }
    | { type: 'UPDATE_FILE_CONTENT', payload: { projectId: string, fileId: string, newContent: string } }
    | { type: 'RENAME_NODE', payload: { projectId: string, nodeId: string, nodeType: 'file' | 'folder', newName: string } }
    | { type: 'DELETE_NODE', payload: { projectId: string, nodeId: string, nodeType: 'file' | 'folder' } }
    | { type: 'UPLOAD_FILE', payload: { projectId: string, file: File } }
    | { type: 'UPDATE_JOB_PROGRESS'; payload: { jobId: string; progress: number } }
    | { type: 'ADD_COMMENT', payload: { projectId: string, comment: Comment } };