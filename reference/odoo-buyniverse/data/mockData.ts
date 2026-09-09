// This file contains mock data for the application's initial state.
import {
    User, UserType, Job, JobStatus, JobType, ExperienceLevel, Proposal, ProposalStatus,
    Contract, ContractType, Milestone, MilestoneStatus, Review, Conversation, Message,
    Notification, NotificationType, Agency, AgencyRole, Gig, Invoice, InvoiceLineItem,
    Estimate, EstimateStatus, Transaction, TransactionType, TimeEntry, Contest,
    ContestStatus, Payment, Lead, LeadStatus, Supplier, Product, Expense, ExpenseStatus,
    AvailabilityStatus, ProjectLevel, Duration, SourcingType, ApprovalStatus, Task, TaskStatus, TaskPriority, File, FileCategory, Comment, ProposalQualificationStatus,
    PaymentReceipt
} from '@/types';

// --- USERS ---
export const MOCK_USERS_RAW: Omit<User, 'permissions'>[] = [
    { id: 'user-client-brenda', name: 'Brenda Smith', email: 'brenda@example.com', type: UserType.Client, memberSince: new Date('2023-01-15'), companyName: 'Innovate Inc.', location: 'New York, USA', isIdentityVerified: true, accountOwnerId: 'user-client-brenda', tags: ['Enterprise', 'Tech'], category: 'Software', clientStatus: 'Active', rfc: 'SABR890101ABC', taxRegime: '601', postalCode: '06500', branches: [
        { id: 'brenda-branch-1', name: 'Main Office', postalCode: '06500'},
        { id: 'brenda-branch-2', name: 'Warehouse', postalCode: '11529'}
    ], defaultInvoiceEmailSettings: {
        to: ['accounting@innovate.com'],
        cc: ['brenda@example.com'],
        bcc: [],
        subject: 'New Invoice from {{issuerName}} - {{invoiceNumber}}',
        body: 'Hello,\n\nPlease find attached your invoice {{invoiceNumber}} for a total of {{totalAmount}}.\n\nThank you for your business!',
    }},
    { id: 'user-freelancer-john', name: 'John Doe', email: 'john@example.com', type: UserType.Freelancer, memberSince: new Date('2023-02-20'), headline: 'Senior React Developer', bio: 'I build fast and reliable web applications.', skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'], jobSuccessScore: 98, totalEarned: 125000, availabilityStatus: AvailabilityStatus.Available, avatarUrl: 'https://i.pravatar.cc/150?u=user-freelancer-john', location: 'London, UK', onlineStatus: 'online', isStarred: true, lastSeen: new Date(), rfc: 'DOE880101CDE', taxRegime: '612', postalCode: '50226' },
    { id: 'user-admin-admin', name: 'Admin User', email: 'admin@example.com', type: UserType.Admin, memberSince: new Date('2023-01-01'), avatarUrl: 'https://i.pravatar.cc/150?u=user-admin-admin', location: 'System' },
    { id: 'user-freelancer-jane', name: 'Jane Smith', email: 'jane@example.com', type: UserType.Freelancer, memberSince: new Date('2023-03-10'), headline: 'UI/UX Designer', bio: 'Creating intuitive and beautiful user experiences.', skills: ['Figma', 'UI/UX', 'Prototyping'], jobSuccessScore: 95, totalEarned: 85000, availabilityStatus: AvailabilityStatus.NotAvailable, avatarUrl: 'https://i.pravatar.cc/150?u=user-freelancer-jane', location: 'Paris, France', onlineStatus: 'away', rfc: 'SMIJ850101FGH', taxRegime: '612', postalCode: '75001' },
    { id: 'user-freelancer-charlie', name: 'Charlie Brown', email: 'charlie@example.com', type: UserType.Freelancer, memberSince: new Date('2023-08-15'), headline: 'Vue.js & Firebase Expert', bio: 'Building scalable applications with Vue and Firebase.', skills: ['Vue.js', 'Firebase', 'TailwindCSS', 'JavaScript'], jobSuccessScore: 92, totalEarned: 45000, availabilityStatus: AvailabilityStatus.Available, avatarUrl: 'https://i.pravatar.cc/150?u=user-freelancer-charlie', location: 'Austin, USA', onlineStatus: 'online', rfc: 'BROC870101XYZ', taxRegime: '612', postalCode: '78701' },
];

export const MOCK_AGENCIES: Agency[] = [];
export const MOCK_REVIEWS: Review[] = [];
export const MOCK_GIGS: Gig[] = [];

// --- LEADS ---
export const MOCK_LEADS: Lead[] = [
    { id: 'lead-1', contactName: 'Alice', title: 'New website design', createdAt: new Date('2024-05-01'), value: 5000, assignedTo: ['user-freelancer-john'], category: 'Web Design', status: LeadStatus.New },
    { id: 'lead-2', contactName: 'Bob', title: 'Mobile app development', createdAt: new Date('2024-05-05'), value: 15000, assignedTo: ['user-freelancer-john', 'user-freelancer-jane'], category: 'Mobile Dev', status: LeadStatus.Qualified },
];

// --- SUPPLIERS ---
export const MOCK_SUPPLIERS: Supplier[] = [
    { id: 'sup-1', name: 'Tech Solutions LLC', category: 'Hardware', contactPerson: 'Mike', email: 'mike@tech.com', phone: '123-456-7890', totalSpend: 25000, rating: 4.5, status: 'Active' },
    { id: 'sup-2', name: 'Creative Supplies', category: 'Office Supplies', contactPerson: 'Sara', email: 'sara@creative.com', phone: '098-765-4321', totalSpend: 5000, rating: 4, status: 'Active' },
];

export const MOCK_JOBS: Job[] = [
    {
        id: 'job-1',
        clientId: 'user-client-brenda',
        title: 'E-commerce Platform Development',
        description: 'Build a full-featured e-commerce platform using React and Node.js. The platform should include product listings, a shopping cart, and a checkout process. Integration with Stripe for payments is required.',
        skills: ['React', 'Node.js', 'TypeScript', 'Stripe API', 'PostgreSQL'],
        budget: { type: JobType.FixedPrice, amount: 25000 },
        postedAt: new Date('2024-05-10'),
        status: JobStatus.InProgress,
        proposals: [
             { id: 'prop-1', jobId: 'job-1', freelancerId: 'user-freelancer-john', freelancerName: 'John Doe', bid: 24000, coverLetter: 'I have extensive experience with the MERN stack and have built several e-commerce sites.', submittedAt: new Date('2024-05-12'), status: ProposalStatus.Accepted, attachments: [], qualificationStatus: ProposalQualificationStatus.Qualified, ndaSigned: true, completionTime: '3 months' },
             { id: 'prop-2', jobId: 'job-1', freelancerId: 'user-freelancer-jane', freelancerName: 'Jane Smith', bid: 26000, coverLetter: 'My expertise in UI/UX can greatly benefit this project.', submittedAt: new Date('2024-05-11'), status: ProposalStatus.Rejected, attachments: [], qualificationStatus: ProposalQualificationStatus.Pending, ndaSigned: false, completionTime: '4 months' },
        ],
        experienceLevel: ExperienceLevel.Expert,
        requiresNDA: true,
        questions: [],
        contractId: 'contract-1',
        approvers: [],
        team: [],
        connectsRequired: 10,
        sourcingType: SourcingType.RFP,
        activity: [],
        milestoneCategories: [],
        comments: [],
        files: [],
        rfiResponses: [],
        currency: 'USD',
        visibility: 'public',
        projectLevel: ProjectLevel.Advanced,
        duration: Duration.Month3To6,
        progress: 45,
        dueDate: new Date('2024-09-15')
    },
    {
        id: 'job-2',
        clientId: 'user-client-brenda',
        title: 'Mobile App UI/UX Design',
        description: 'Design a new mobile application for a fintech startup. Deliverables should include wireframes, mockups, and a clickable prototype in Figma.',
        skills: ['Figma', 'UI/UX', 'Mobile Design', 'Prototyping'],
        budget: { type: JobType.FixedPrice, amount: 8000 },
        postedAt: new Date('2024-06-01'),
        status: JobStatus.Open,
        proposals: [],
        experienceLevel: ExperienceLevel.Intermediate,
        requiresNDA: false,
        questions: [],
        approvers: [],
        team: [],
        connectsRequired: 5,
        sourcingType: SourcingType.RFP,
        activity: [],
        milestoneCategories: [],
        comments: [],
        files: [],
        rfiResponses: [],
        currency: 'USD',
        visibility: 'public',
        projectLevel: ProjectLevel.Intermediate,
        duration: Duration.Month1To3,
        progress: 0,
        hiringLimitDate: new Date('2024-07-15'),
        dueDate: new Date('2024-09-01')
    },
    {
        id: 'job-3',
        clientId: 'user-client-brenda',
        title: 'Project Setup - Internal CRM',
        description: 'Initial setup and configuration of a new internal CRM system. This is a draft project.',
        skills: ['CRM', 'Project Management'],
        budget: { type: JobType.FixedPrice, amount: 1500 },
        postedAt: new Date(),
        status: JobStatus.Draft,
        proposals: [],
        experienceLevel: ExperienceLevel.Entry,
        requiresNDA: false,
        questions: [],
        approvers: [],
        team: [],
        connectsRequired: 2,
        sourcingType: SourcingType.RFP,
        activity: [],
        milestoneCategories: [],
        comments: [],
        files: [],
        rfiResponses: [],
        currency: 'USD',
        visibility: 'private',
        projectLevel: ProjectLevel.Basic,
        duration: Duration.LessThan1Month,
        progress: 0,
    },
    {
        id: 'job-4',
        clientId: 'user-client-brenda',
        title: 'Social Media Campaign Graphics',
        description: 'We need a set of eye-catching graphics for an upcoming social media campaign. Deliverables include 10 square graphics and 5 story graphics.',
        skills: ['Graphic Design', 'Social Media', 'Canva', 'Photoshop'],
        budget: { type: JobType.FixedPrice, amount: 1200 },
        postedAt: new Date('2024-06-10'),
        status: JobStatus.Open,
        proposals: [
            { id: 'prop-job4-1', jobId: 'job-4', freelancerId: 'user-freelancer-jane', freelancerName: 'Jane Smith', bid: 1100, coverLetter: 'I specialize in social media graphics and can deliver high-quality assets quickly.', submittedAt: new Date('2024-06-11'), status: ProposalStatus.Pending, attachments: [], qualificationStatus: ProposalQualificationStatus.Pending, ndaSigned: false, completionTime: '1 week' },
            { id: 'prop-job4-2', jobId: 'job-4', freelancerId: 'user-freelancer-charlie', freelancerName: 'Charlie Brown', bid: 1150, coverLetter: 'My design skills are a great fit for your campaign needs.', submittedAt: new Date('2024-06-12'), status: ProposalStatus.Pending, attachments: [], qualificationStatus: ProposalQualificationStatus.Pending, ndaSigned: false, completionTime: '10 days' }
        ],
        experienceLevel: ExperienceLevel.Intermediate,
        requiresNDA: false,
        questions: [],
        approvers: [],
        team: [],
        connectsRequired: 4,
        sourcingType: SourcingType.RFP,
        activity: [],
        milestoneCategories: [],
        comments: [],
        files: [],
        rfiResponses: [],
        currency: 'USD',
        visibility: 'public',
        projectLevel: ProjectLevel.Intermediate,
        duration: Duration.LessThan1Month,
        progress: 0,
    },
    {
        id: 'job-5',
        clientId: 'user-client-brenda',
        title: 'Company Dashboard UI',
        description: 'Design a modern and intuitive UI for our new internal data dashboard. The project requires a clean and data-focused design system.',
        skills: ['UI/UX', 'Figma', 'Dashboard Design'],
        budget: { type: JobType.FixedPrice, amount: 4000 },
        postedAt: new Date('2024-06-15'),
        status: JobStatus.Open,
        contestId: 'contest-5',
        proposals: [
            { id: 'prop-job5-1', jobId: 'job-5', freelancerId: 'user-freelancer-jane', freelancerName: 'Jane Smith', bid: 3750, coverLetter: 'Expert in dashboard UI.', submittedAt: new Date('2024-06-16'), status: ProposalStatus.Pending, attachments: [], qualificationStatus: ProposalQualificationStatus.Qualified, ndaSigned: true, completionTime: '3 weeks' },
            { id: 'prop-job5-2', jobId: 'job-5', freelancerId: 'user-freelancer-john', freelancerName: 'John Doe', bid: 3900, coverLetter: 'Ready to build a great UI.', submittedAt: new Date('2024-06-16'), status: ProposalStatus.Pending, attachments: [], qualificationStatus: ProposalQualificationStatus.Qualified, ndaSigned: true, completionTime: '4 weeks' },
            { id: 'prop-job5-3', jobId: 'job-5', freelancerId: 'user-freelancer-charlie', freelancerName: 'Charlie Brown', bid: 3850, coverLetter: 'My skills are a match.', submittedAt: new Date('2024-06-17'), status: ProposalStatus.Pending, attachments: [], qualificationStatus: ProposalQualificationStatus.Pending, ndaSigned: false, completionTime: '3 weeks' }
        ],
        experienceLevel: ExperienceLevel.Expert,
        requiresNDA: true,
        questions: [],
        approvers: [],
        team: [],
        connectsRequired: 8,
        sourcingType: SourcingType.RFP,
        activity: [],
        milestoneCategories: [],
        comments: [],
        files: [],
        rfiResponses: [],
        currency: 'USD',
        visibility: 'public',
        projectLevel: ProjectLevel.Advanced,
        duration: Duration.Month1To3,
        progress: 0,
    },
    {
        id: 'job-6',
        clientId: 'user-client-brenda',
        title: 'Marketing Video Animation',
        description: 'Create a 60-second animated marketing video to showcase our new product features. Script and voiceover will be provided.',
        skills: ['Animation', 'After Effects', 'Motion Graphics'],
        budget: { type: JobType.FixedPrice, amount: 2500 },
        postedAt: new Date('2024-06-01'),
        status: JobStatus.InProgress,
        contestId: 'contest-6',
        proposals: [
            { id: 'prop-job6-1', jobId: 'job-6', freelancerId: 'user-freelancer-jane', freelancerName: 'Jane Smith', bid: 2300, coverLetter: 'I am a motion graphics expert.', submittedAt: new Date('2024-06-02'), status: ProposalStatus.Pending, attachments: [], qualificationStatus: ProposalQualificationStatus.Qualified, ndaSigned: false, completionTime: '2 weeks' },
            { id: 'prop-job6-2', jobId: 'job-6', freelancerId: 'user-freelancer-john', freelancerName: 'John Doe', bid: 2250, coverLetter: 'I can create a compelling animation for your product.', submittedAt: new Date('2024-06-03'), status: ProposalStatus.Pending, attachments: [], qualificationStatus: ProposalQualificationStatus.Qualified, ndaSigned: false, completionTime: '3 weeks' },
            { id: 'prop-job6-3', jobId: 'job-6', freelancerId: 'user-freelancer-charlie', freelancerName: 'Charlie Brown', bid: 2400, coverLetter: 'My animation style will fit your brand perfectly.', submittedAt: new Date('2024-06-02'), status: ProposalStatus.Pending, attachments: [], qualificationStatus: ProposalQualificationStatus.Qualified, ndaSigned: false, completionTime: '2 weeks' }
        ],
        experienceLevel: ExperienceLevel.Intermediate,
        requiresNDA: false,
        questions: [],
        approvers: [],
        team: [],
        connectsRequired: 6,
        sourcingType: SourcingType.RFP,
        activity: [],
        milestoneCategories: [],
        comments: [],
        files: [],
        rfiResponses: [],
        currency: 'USD',
        visibility: 'public',
        projectLevel: ProjectLevel.Intermediate,
        duration: Duration.LessThan1Month,
        progress: 0,
    },
    {
        id: 'job-7',
        clientId: 'user-client-brenda',
        title: 'Brand Logo Redesign Contest',
        description: 'We are looking to refresh our company logo. We want a modern, minimalist design.',
        skills: ['Logo Design', 'Branding', 'Illustrator'],
        budget: { type: JobType.FixedPrice, amount: 1000 },
        postedAt: new Date('2024-05-20'),
        status: JobStatus.InProgress,
        contestId: 'contest-7',
        contractId: 'contract-7',
        proposals: [
            { id: 'prop-job7-1', jobId: 'job-7', freelancerId: 'user-freelancer-jane', freelancerName: 'Jane Smith', bid: 850, coverLetter: 'I create memorable logos.', submittedAt: new Date('2024-05-21'), status: ProposalStatus.Accepted, attachments: [], qualificationStatus: ProposalQualificationStatus.Qualified, ndaSigned: false, completionTime: '1 week' },
            { id: 'prop-job7-2', jobId: 'job-7', freelancerId: 'user-freelancer-john', freelancerName: 'John Doe', bid: 900, coverLetter: 'My portfolio has similar work.', submittedAt: new Date('2024-05-22'), status: ProposalStatus.Rejected, attachments: [], qualificationStatus: ProposalQualificationStatus.Qualified, ndaSigned: false, completionTime: '10 days' }
        ],
        experienceLevel: ExperienceLevel.Intermediate,
        requiresNDA: false,
        questions: [],
        approvers: [],
        team: [],
        connectsRequired: 3,
        sourcingType: SourcingType.RFP,
        activity: [],
        milestoneCategories: [],
        comments: [],
        files: [],
        rfiResponses: [],
        currency: 'USD',
        visibility: 'public',
        projectLevel: ProjectLevel.Basic,
        duration: Duration.LessThan1Month,
        progress: 10,
    },
];
export const MOCK_CONTRACTS: Contract[] = [
    {
        id: 'contract-1',
        type: ContractType.Job,
        jobType: JobType.FixedPrice,
        sourceId: 'job-1',
        clientId: 'user-client-brenda',
        providerId: 'user-freelancer-john',
        rateOrBid: 24000,
        startedAt: new Date('2024-05-15'),
        milestones: [
            { id: 'm1', description: 'Project Setup and Initial UI', amount: 6000, dueDate: new Date('2024-06-15'), status: MilestoneStatus.Released, tasks: [] },
            { id: 'm2', description: 'Backend API Development', amount: 10000, dueDate: new Date('2024-07-30'), status: MilestoneStatus.Funded, tasks: [] },
            { id: 'm3', description: 'Frontend Integration and Testing', amount: 8000, dueDate: new Date('2024-09-10'), status: MilestoneStatus.Pending, tasks: [] },
        ]
    },
    {
        id: 'contract-7',
        type: ContractType.Job,
        jobType: JobType.FixedPrice,
        sourceId: 'job-7',
        clientId: 'user-client-brenda',
        providerId: 'user-freelancer-jane',
        rateOrBid: 850,
        startedAt: new Date('2024-05-26'),
        milestones: []
    }
];
export const MOCK_CONVERSATIONS: Conversation[] = [
    {
        id: 'convo-1',
        jobId: 'job-1',
        participants: ['user-client-brenda', 'user-freelancer-john'],
        messages: [
            { id: 'msg-1', senderId: 'user-freelancer-john', text: 'I have extensive experience with the MERN stack and have built several e-commerce sites.', timestamp: new Date('2024-05-12T10:00:00Z') },
            { id: 'msg-2', senderId: 'user-client-brenda', text: 'Great, your proposal looks good. We\'d like to move forward.', timestamp: new Date('2024-05-14T15:30:00Z') },
        ]
    },
    {
        id: 'convo-contest-5',
        jobId: 'job-5',
        participants: ['user-client-brenda', 'user-freelancer-jane', 'user-freelancer-john', 'user-freelancer-charlie'],
        messages: []
    },
    {
        id: 'convo-contest-6',
        jobId: 'job-6',
        participants: ['user-client-brenda', 'user-freelancer-jane', 'user-freelancer-john', 'user-freelancer-charlie'],
        messages: []
    },
    {
        id: 'convo-contest-7',
        jobId: 'job-7',
        participants: ['user-client-brenda', 'user-freelancer-jane', 'user-freelancer-john'],
        messages: []
    }
];
export const MOCK_NOTIFICATIONS: Notification[] = [
    { id: 'notif-1', userId: 'user-client-brenda', type: NotificationType.PROPOSAL_RECEIVED, text: 'John Doe submitted a proposal for "E-commerce Platform Development".', link: '/project/job-1', isRead: true, createdAt: new Date('2024-05-12')},
    { id: 'notif-2', userId: 'user-freelancer-john', type: NotificationType.HIRED, text: 'You have been hired for "E-commerce Platform Development"!', link: '/contract/contract-1', isRead: false, createdAt: new Date('2024-05-15')},
];

// --- INVOICES ---
export const MOCK_INVOICES_BASE: Invoice[] = [
    {
        id: 'inv-1672531200000',
        uuid: 'E2B5A41C-5373-4109-8663-B624EDC9B071',
        version: '4.0',
        serie: 'A',
        folio: '101',
        date: new Date('2024-07-15T10:00:00Z'),
        status: 'Vigente',
        paymentStatus: 'Paid',
        tipoDeComprobante: 'I',
        exportacion: '01',
        condicionesDePago: 'Contado',
        issuerId: 'issuer-1',
        branchId: 'branch-1-1',
        receiverBranchId: 'brenda-branch-1',
        issuer: {
            name: 'John Doe',
            rfc: 'DOE880101CDE',
            taxRegime: '612',
            postalCode: '50226',
        },
        receiver: {
            userId: 'user-client-brenda',
            name: 'Innovate Inc.',
            rfc: 'SABR890101ABC',
            taxRegime: '601',
            postalCode: '06500',
            cfdiUse: 'G03',
        },
        lineItems: [
            {
                id: 'item-1',
                productCode: '84111500',
                unitCode: 'E48',
                quantity: 20,
                unit: 'hr',
                description: 'Desarrollo de componente de Calendario en React',
                unitPrice: 75,
                discount: 0,
                amount: 1500,
                objetoImp: '02',
                taxes: [
                    { base: 1500, taxType: 'IVA', rate: 0.16, amount: 240, isRetention: false, included: true },
                ],
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
        cfdiUse: 'G03',
        paymentMethod: 'PUE',
        paymentType: '03',
        currency: 'USD',
        exchangeRate: 1,
        subtotal: 2000,
        discount: 50,
        taxTotal: 312,
        retainedTotal: 45,
        total: 2217,
        originalString: '||original_string_mock...||',
        issuerSeal: 'mock_issuer_seal==',
        satSeal: 'mock_sat_seal==',
        qrCodeData: 'mock_qr_code_data',
        companyName: 'Innovate Inc.',
        projectTitle: 'E-commerce Platform',
        amount: 2217,
        issuedDate: new Date('2024-07-15T10:00:00Z'),
        dueDate: new Date('2024-08-14T10:00:00Z'),
        clientId: 'user-client-brenda',
        providerId: 'user-freelancer-john',
    },
];
export const MOCK_PAYMENTS: Payment[] = [];
export const MOCK_ESTIMATES: Estimate[] = [
    { id: 'est-1', date: new Date('2024-06-10'), companyId: 'user-client-brenda', createdById: 'user-freelancer-john', amount: 1200, status: EstimateStatus.Accepted },
    { id: 'est-2', date: new Date('2024-06-15'), companyId: 'user-client-brenda', createdById: 'user-freelancer-jane', amount: 3500, status: EstimateStatus.Pending },
    { id: 'est-3', date: new Date('2024-05-20'), companyId: 'user-client-brenda', createdById: 'user-freelancer-john', amount: 800, status: EstimateStatus.Declined },
    { id: 'est-4', date: new Date('2024-06-25'), companyId: 'user-client-brenda', createdById: 'user-freelancer-john', amount: 5000, status: EstimateStatus.Draft },
];
export const MOCK_TRANSACTIONS: Transaction[] = [];
export const MOCK_TIME_ENTRIES: TimeEntry[] = [];
export const MOCK_CONTESTS: Contest[] = [
    {
        id: 'contest-5',
        jobId: 'job-5',
        status: ContestStatus.Active,
        startTime: new Date(Date.now() - 5 * 60000), // 5 minutes ago
        endTime: new Date(Date.now() + 10 * 60000), // 10 minutes from now
        showParticipantNames: true,
        showParticipantOffers: true,
        conversationId: 'convo-contest-5',
        bidHistory: [
            { userId: 'user-freelancer-jane', amount: 3950, timestamp: new Date(Date.now() - 8 * 60000) },
            { userId: 'user-freelancer-john', amount: 3900, timestamp: new Date(Date.now() - 7 * 60000) },
            { userId: 'user-freelancer-charlie', amount: 3850, timestamp: new Date(Date.now() - 6 * 60000) },
            { userId: 'user-freelancer-jane', amount: 3800, timestamp: new Date(Date.now() - 5 * 60000) },
            { userId: 'user-freelancer-john', amount: 3780, timestamp: new Date(Date.now() - 4 * 60000) },
            { userId: 'user-freelancer-jane', amount: 3750, timestamp: new Date(Date.now() - 2 * 60000) },
        ]
    },
    {
        id: 'contest-6',
        jobId: 'job-6',
        status: ContestStatus.Finished,
        startTime: new Date('2024-06-05T10:00:00Z'),
        endTime: new Date('2024-06-05T10:15:00Z'),
        showParticipantNames: false,
        showParticipantOffers: true,
        conversationId: 'convo-contest-6',
        bidHistory: [
            { userId: 'user-freelancer-charlie', amount: 2500, timestamp: new Date('2024-06-05T10:01:00Z') },
            { userId: 'user-freelancer-jane', amount: 2450, timestamp: new Date('2024-06-05T10:02:00Z') },
            { userId: 'user-freelancer-john', amount: 2400, timestamp: new Date('2024-06-05T10:04:00Z') },
            { userId: 'user-freelancer-jane', amount: 2300, timestamp: new Date('2024-06-05T10:08:00Z') },
            { userId: 'user-freelancer-john', amount: 2250, timestamp: new Date('2024-06-05T10:12:00Z') },
        ]
    },
    {
        id: 'contest-7',
        jobId: 'job-7',
        status: ContestStatus.Finished,
        startTime: new Date('2024-05-25T11:00:00Z'),
        endTime: new Date('2024-05-25T11:30:00Z'),
        winnerId: 'user-freelancer-jane',
        showParticipantNames: true,
        showParticipantOffers: true,
        conversationId: 'convo-contest-7',
        bidHistory: [
            { userId: 'user-freelancer-john', amount: 900, timestamp: new Date('2024-05-25T11:05:00Z') },
            { userId: 'user-freelancer-jane', amount: 850, timestamp: new Date('2024-05-25T11:15:00Z') },
        ]
    }
];
export const MOCK_PRODUCTS: Product[] = [];
export const MOCK_EXPENSES: Expense[] = [
    { id: 'exp-1', date: new Date('2024-06-05'), description: 'Software License (Figma)', userId: 'user-freelancer-jane', projectId: 'job-1', amount: 144, billable: true, status: ExpenseStatus.Invoiced },
    { id: 'exp-2', date: new Date('2024-06-12'), description: 'Stock Photos for Project', userId: 'user-freelancer-john', projectId: 'job-1', amount: 50, billable: true, status: ExpenseStatus.Approved },
    { id: 'exp-3', date: new Date('2024-06-20'), description: 'Travel to Client Meeting', userId: 'user-freelancer-john', clientId: 'user-client-brenda', amount: 75, billable: false, status: ExpenseStatus.Paid },
    { id: 'exp-4', date: new Date('2024-06-28'), description: 'Cloud Server Hosting', userId: 'user-client-brenda', projectId: 'job-1', amount: 120, billable: false, status: ExpenseStatus.Pending },
];
