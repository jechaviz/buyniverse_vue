// @/utils/route-prefetch.ts
type ComponentImporter = () => Promise<any>;

// This map should correspond to the lazy loaded routes in App.tsx
const prefetchMap: Record<string, ComponentImporter> = {
    '/': () => import('@/features/job/pages/HomePage'),
    '/clients': () => import('@/features/clients/pages/ClientsPage'),
    '/suppliers': () => import('@/features/suppliers/pages/SuppliersPage'),
    '/leads': () => import('@/features/leads/pages/LeadsPage'),
    '/projects': () => import('@/features/project/pages/ProjectsPage'),
    '/invoices': () => import('@/features/invoice/pages/InvoicesPage'),
    '/estimates': () => import('@/features/estimate/pages/EstimatesPage'),
    '/payments': () => import('@/features/payment/pages/PaymentsPage'),
    '/sales/products': () => import('@/features/products/pages/ProductsPage'),
    '/sales/expenses': () => import('@/features/expenses/pages/ExpensesPage'),
    '/dashboard': () => import('@/features/dashboard/pages/DashboardPage'),
    '/messages': () => import('@/features/messages/pages/MessagesPage'),
    '/find-talent': () => import('@/features/job/pages/FindTalentPage'),
    '/browse-services': () => import('@/features/gig/pages/GigListPage'),
};

export const prefetchRoute = (path: string) => {
    // A simple prefetch, won't handle dynamic routes but is fine for the sidebar.
    if (prefetchMap[path]) {
        prefetchMap[path]();
    }
};
