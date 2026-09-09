import { AppState, DashboardCategory, TableView, TableAdminConfig, Issuer, PaymentReceipt, Invoice, Product } from '@/types';
import { MOCK_USERS_RAW, MOCK_JOBS, MOCK_LEADS, MOCK_SUPPLIERS, MOCK_REVIEWS, MOCK_CONTRACTS, MOCK_CONVERSATIONS, MOCK_NOTIFICATIONS, MOCK_AGENCIES, MOCK_GIGS, MOCK_INVOICES_BASE, MOCK_ESTIMATES, MOCK_TRANSACTIONS, MOCK_TIME_ENTRIES, MOCK_CONTESTS, MOCK_PAYMENTS, MOCK_EXPENSES } from '@/data/mockData';
import { getUserPermissions } from '@/utils/permissions';
import { User, LeadStatus } from '@/types';


const MOCK_USERS: User[] = MOCK_USERS_RAW.map(u => ({ 
    ...u, 
    permissions: getUserPermissions(u),
    folioBalance: u.id === 'user-client-brenda' ? 0 : 50, // Brenda starts with 0 folios
    settings: {}, // Initialize settings for all users
}));

const MOCK_ISSUERS: Issuer[] = [
    {
        id: 'issuer-1',
        name: 'Servicios Profesionales John Doe',
        rfc: 'DOE880101CDE',
        taxRegime: '612',
        branches: [
            { id: 'branch-1-1', name: 'Matriz', postalCode: '50226' },
            { id: 'branch-1-2', name: 'Sucursal CDMX', postalCode: '06500' },
        ],
        pacProvider: 'Facturama',
    },
    {
        id: 'issuer-2',
        name: 'Diseños Creativos Jane Smith',
        rfc: 'SMIJ850101FGH',
        taxRegime: '626',
        branches: [
            { id: 'branch-2-1', name: 'Oficina Principal', postalCode: '75001' },
        ]
    }
];

// Add PPD invoices for payment examples
const MOCK_INVOICES: Invoice[] = [
    {
        ...MOCK_INVOICES_BASE[0],
        cfdiRelacionados: {
            tipoRelacion: '04',
            uuids: ['550C3A73-2615-4B82-9993-3A1ED6A41793']
        },
        condicionesDePago: 'Pago al recibir la mercancía',
        lineItems: [
             {
                id: 'item-1',
                productCode: '84111500',
                unitCode: 'E48',
                quantity: 1,
                unit: 'service',
                description: 'Kit de Desarrollo Web Avanzado (con componentes)',
                unitPrice: 1500,
                discount: 0,
                amount: 1500,
                objetoImp: '02',
                noIdentificacion: 'WEB-DEV-KIT-01',
                taxes: [
                    { base: 1500, taxType: 'IVA', rate: 0.16, amount: 240, isRetention: false, included: true },
                ],
                aCuentaTerceros: {
                    rfc: 'TERC990101XYZ',
                    nombre: 'Proveedor de Hosting Externo S.A. de C.V.',
                    regimenFiscal: '601',
                    domicilioFiscal: '64000',
                },
                informacionAduanera: [
                    { numeroPedimento: '24 47 3807 8003479' }
                ],
                partes: [
                    {
                        id: 'part-1',
                        productCode: '32101600',
                        quantity: 2,
                        unit: 'Pieza',
                        description: 'Tornillos de Acero',
                        unitPrice: 5,
                        amount: 10,
                    },
                    {
                        id: 'part-2',
                        productCode: '43211705',
                        quantity: 1,
                        unit: 'Pieza',
                        description: 'Microcontrolador',
                        unitPrice: 940,
                        amount: 940,
                    }
                ]
            },
            {
                id: 'item-2',
                productCode: '84111500',
                unitCode: 'E48',
                quantity: 1,
                unit: 'service',
                description: 'Consultoría de arquitectura de software',
                unitPrice: 500,
                discount: 50,
                amount: 450,
                objetoImp: '02',
                taxes: [
                    { base: 450, taxType: 'IVA', rate: 0.16, amount: 72, isRetention: false, included: true },
                    { base: 450, taxType: 'ISR', rate: 0.1, amount: 45, isRetention: true, included: true },
                ],
            },
        ],
    },
    {
        id: 'inv-ppd-1',
        uuid: '4F5A6B7C-1234-5678-9101-ABCDEF123456',
        version: '4.0', serie: 'B', folio: '201', date: new Date('2024-06-20T10:00:00Z'), status: 'Vigente', paymentStatus: 'Unpaid',
        tipoDeComprobante: 'I', exportacion: '01',
        issuerId: 'issuer-1', branchId: 'branch-1-1',
        issuer: { name: 'John Doe', rfc: 'DOE880101CDE', taxRegime: '612', postalCode: '50226' },
        receiver: { userId: 'user-client-brenda', name: 'Innovate Inc.', rfc: 'SABR890101ABC', taxRegime: '601', postalCode: '06500', cfdiUse: 'G03' },
        lineItems: [
            { id: 'item-ppd-1', productCode: '84111500', unitCode: 'E48', quantity: 50, unit: 'hr', description: 'Consultoría SEO', unitPrice: 100, discount: 0, amount: 5000, objetoImp: '02', taxes: [
                { base: 5000, taxType: 'IVA', rate: 0.16, amount: 800, isRetention: false },
                { base: 5000, taxType: 'ISR', rate: 0.10, amount: 500, isRetention: true }
            ]}
        ],
        cfdiUse: 'G03', paymentMethod: 'PPD', paymentType: '99', currency: 'MXN', exchangeRate: 1,
        subtotal: 5000, discount: 0, taxTotal: 800, retainedTotal: 500, total: 5300,
        companyName: 'Innovate Inc.', projectTitle: 'SEO Campaign', amount: 5300, issuedDate: new Date('2024-06-20T10:00:00Z'), dueDate: new Date('2024-07-20T10:00:00Z'), clientId: 'user-client-brenda', providerId: 'user-freelancer-john',
        originalString: '', issuerSeal: '', satSeal: '', qrCodeData: ''
    },
     {
        id: 'inv-ppd-2',
        uuid: '9A8B7C6D-1234-5678-9101-FEDCBA654321',
        version: '4.0', serie: 'B', folio: '202', date: new Date('2024-06-25T10:00:00Z'), status: 'Vigente', paymentStatus: 'Unpaid',
        tipoDeComprobante: 'I', exportacion: '01',
        issuerId: 'issuer-1', branchId: 'branch-1-1',
        issuer: { name: 'John Doe', rfc: 'DOE880101CDE', taxRegime: '612', postalCode: '50226' },
        receiver: { userId: 'user-client-brenda', name: 'Innovate Inc.', rfc: 'SABR890101ABC', taxRegime: '601', postalCode: '06500', cfdiUse: 'G03' },
        lineItems: [
            { id: 'item-ppd-2', productCode: '84111500', unitCode: 'E48', quantity: 1, unit: 'project', description: 'Diseño de Landing Page', unitPrice: 350, discount: 0, amount: 350, objetoImp: '02', taxes: [
                { base: 350, taxType: 'IVA', rate: 0.16, amount: 56, isRetention: false },
            ]}
        ],
        cfdiUse: 'G03', paymentMethod: 'PPD', paymentType: '99', currency: 'USD', exchangeRate: 1,
        subtotal: 350, discount: 0, taxTotal: 56, retainedTotal: 0, total: 406,
        companyName: 'Innovate Inc.', projectTitle: 'Landing Page Design', amount: 406, issuedDate: new Date('2024-06-25T10:00:00Z'), dueDate: new Date('2024-07-25T10:00:00Z'), clientId: 'user-client-brenda', providerId: 'user-freelancer-john',
        originalString: '', issuerSeal: '', satSeal: '', qrCodeData: ''
    }
];

// Mock Payment Receipt linking to inv-ppd-1
const MOCK_PAYMENT_RECEIPTS: PaymentReceipt[] = [
    {
        id: 'payrec-1',
        uuid: 'D4E5F6A1-9876-5432-1098-FEDCBA123456',
        version: '2.0',
        serie: 'PAY',
        folio: '1',
        date: new Date('2024-07-10T14:00:00Z'),
        status: 'Vigente',
        issuerId: 'issuer-1',
        receiverId: 'user-client-brenda',
        amount: 2500.00,
        currency: 'MXN',
        paymentType: '03',
        numOperacion: 'OPER-12345',
        ctaOrdenante: '1234567890',
        ctaBeneficiario: '0987654321',
        relatedDocuments: [
            {
                id: 'doc-1-payrec-1',
                documentId: '4F5A6B7C-1234-5678-9101-ABCDEF123456',
                serie: 'B',
                folio: '201',
                currency: 'MXN',
                equivalenciaDR: 1,
                paymentNumber: 1,
                previousBalance: 5300.00,
                amountPaid: 2500.00,
                newBalance: 2800.00,
                objetoImpDR: '02',
                taxes: [
                    { base: 5000, taxType: 'IVA', rate: 0.16, amount: 800, isRetention: false },
                    { base: 5000, taxType: 'ISR', rate: 0.10, amount: 500, isRetention: true }
                ],
                impuestosP: [ // Calculated proportional taxes for this specific document
                    { base: 2358.49, taxType: 'IVA', rate: 0.16, amount: 377.36, isRetention: false },
                    { base: 2358.49, taxType: 'ISR', rate: 0.10, amount: 235.85, isRetention: true }
                ]
            }
        ],
        impuestosP: [ // Aggregated taxes for the whole payment
             { base: 2358.49, taxType: 'IVA', rate: 0.16, amount: 377.36, isRetention: false },
             { base: 2358.49, taxType: 'ISR', rate: 0.10, amount: 235.85, isRetention: true }
        ],
        totals: {
            totalRetencionesIVA: 0,
            totalRetencionesISR: 235.85,
            totalRetencionesIEPS: 0,
            totalTrasladosBaseIVA16: 2358.49,
            totalTrasladosImpuestoIVA16: 377.36,
            totalTrasladosBaseIVA8: 0,
            totalTrasladosImpuestoIVA8: 0,
            totalTrasladosBaseIVA0: 0,
            totalTrasladosImpuestoIVA0: 0,
            totalTrasladosBaseIVAExento: 0,
            montoTotalPagos: 2500.00,
        }
    }
];

const MOCK_DASHBOARD_LAYOUTS: { [tableId: string]: DashboardCategory[] } = {
    'leads': [
        {
            id: 'cat-1',
            title: 'Lead Analysis',
            widgets: [
                { id: 'widget-1', type: 'pie', title: 'Leads by Status', dataKey: 'leads', xAxisColumn: 'status', aggregation: 'count', size: 1, minSize: 1, maxSize: 2 },
                { id: 'widget-2', type: 'bar', title: 'Lead Value by Category', dataKey: 'leads', xAxisColumn: 'category', yAxisColumn: 'value', aggregation: 'sum', size: 2, minSize: 1, maxSize: 4 },
                { id: 'widget-3', type: 'summary', title: 'Total Lead Value', dataKey: 'leads', yAxisColumn: 'value', aggregation: 'sum', size: 1, minSize: 1, maxSize: 1 },
            ]
        }
    ],
    'invoices': [
         {
            id: 'cat-2',
            title: 'Invoice Overview',
            widgets: [
                 { id: 'widget-4', type: 'summary', title: 'Total Invoiced', dataKey: 'invoices', yAxisColumn: 'amount', aggregation: 'sum', size: 1, minSize: 1, maxSize: 1 },
            ]
        }
    ]
};

const MOCK_TABLE_VIEWS: { [tableId: string]: TableView[] } = {
    'leads': [
        {
            id: 'view-leads-default',
            name: 'All Leads',
            isDefault: true,
            config: {
                sorting: [{ id: 'createdAt', desc: true }],
            }
        },
        {
            id: 'view-leads-qualified',
            name: 'Qualified Leads',
            config: {
                filters: {
                    id: 'root',
                    logic: 'AND',
                    filters: [
                        { id: 'filter-1', columnId: 'status', operator: 'is', value: LeadStatus.Qualified }
                    ]
                }
            }
        }
    ]
};

const MOCK_TABLE_ADMIN_CONFIG: TableAdminConfig = {
    'projects': {
        disableSettings: false,
        defaultColumnVisibility: {
            startDate: false,
        },
        columnPermissions: {
            id: 'read',
            title: 'write',
            progress: 'write'
        }
    }
}

const MOCK_PRODUCTS: Product[] = [
    {
        id: 'prod-1',
        description: 'Servicio de Consultoría Web',
        rate: 150,
        unit: 'Hora',
        category: 'Servicios',
        productCode: '84111500', // Servicios de desarrollo de tecnología de la información
        unitCode: 'E48', // Unidad de servicio
        objetoImp: '02',
        defaultTaxes: [
            { taxType: 'IVA', rate: 0.16, isRetention: false },
            { taxType: 'ISR', rate: 0.10, isRetention: true }
        ]
    },
    {
        id: 'prod-2',
        description: 'Licencia de Software Anual',
        rate: 1200,
        unit: 'Pieza',
        category: 'Software',
        productCode: '43232400', // Software de aplicaciones de negocios y productividad
        unitCode: 'H87', // Pieza
        objetoImp: '02',
        defaultTaxes: [
            { taxType: 'IVA', rate: 0.16, isRetention: false }
        ],
        noIdentificacion: 'LIC-SOFT-XYZ-1Y'
    },
    {
        id: 'prod-3',
        description: 'Importación de Componente Electrónico',
        rate: 500,
        unit: 'Pieza',
        category: 'Hardware',
        productCode: '43211700', // Componentes electrónicos
        unitCode: 'H87',
        objetoImp: '02',
        defaultTaxes: [
            { taxType: 'IVA', rate: 0.16, isRetention: false }
        ],
        informacionAduanera: [{ numeroPedimento: '21 47 3807 8003479' }]
    },
    {
        id: 'prod-4',
        description: 'Kit de Ensamblaje (con partes)',
        rate: 950,
        unit: 'Kit',
        category: 'Kits',
        productCode: '44111500', // Kits de ensamblaje
        unitCode: 'KT',
        objetoImp: '02',
        defaultTaxes: [
            { taxType: 'IVA', rate: 0.16, isRetention: false }
        ],
        partes: [
            {
                productCode: '32101600',
                quantity: 2,
                unit: 'Pieza',
                description: 'Tornillos de Acero',
                unitPrice: 5,
                amount: 10
            },
            {
                productCode: '43211705',
                quantity: 1,
                unit: 'Pieza',
                description: 'Microcontrolador',
                unitPrice: 940,
                amount: 940
            }
        ]
    }
];


export const initialState: AppState = {
    currentUser: MOCK_USERS[0],
    users: MOCK_USERS,
    issuers: MOCK_ISSUERS,
    jobs: MOCK_JOBS,
    leads: MOCK_LEADS,
    suppliers: MOCK_SUPPLIERS,
    reviews: MOCK_REVIEWS,
    contracts: MOCK_CONTRACTS,
    conversations: MOCK_CONVERSATIONS,
    notifications: MOCK_NOTIFICATIONS,
    agencies: MOCK_AGENCIES,
    gigs: MOCK_GIGS,
    invoices: MOCK_INVOICES,
    estimates: MOCK_ESTIMATES,
    transactions: MOCK_TRANSACTIONS,
    timeEntries: MOCK_TIME_ENTRIES,
    contests: MOCK_CONTESTS,
    payments: MOCK_PAYMENTS,
    paymentReceipts: MOCK_PAYMENT_RECEIPTS,
    products: MOCK_PRODUCTS,
    expenses: MOCK_EXPENSES,
    dashboardLayouts: MOCK_DASHBOARD_LAYOUTS,
    tableViews: MOCK_TABLE_VIEWS,
    tableAdminConfig: MOCK_TABLE_ADMIN_CONFIG,
};
