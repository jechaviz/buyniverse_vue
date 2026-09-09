import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { NotFoundPage } from '@/features/notfound';
import AppContextMenu from '@/components/layout/AppContextMenu';

// Lazy load pages for better performance
const HomePage = lazy(() => import('@/features/job/pages/HomePage'));
const ClientsPage = lazy(() => import('@/features/clients/pages/ClientsPage'));
const SuppliersPage = lazy(() => import('@/features/suppliers/pages/SuppliersPage'));
const LeadsPage = lazy(() => import('@/features/leads/pages/LeadsPage'));
const ProjectsPage = lazy(() => import('@/features/project/pages/ProjectsPage'));
const ProjectDetailsPage = lazy(() => import('@/features/project/pages/ProjectDetailsPage'));
const InvoicesPage = lazy(() => import('@/features/invoice/pages/InvoicesPage'));
const InvoiceView = lazy(() => import('@/features/invoice/pages/InvoiceView'));
const InvoiceFormPage = lazy(() => import('@/features/invoice/pages/InvoiceFormPage'));
const EstimatesPage = lazy(() => import('@/features/estimate/pages/EstimatesPage'));
const PaymentsPage = lazy(() => import('@/features/payment/pages/PaymentsPage'));
const PaymentFormPage = lazy(() => import('@/features/payment/pages/PaymentFormPage'));
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsPage'));
const ExpensesPage = lazy(() => import('@/features/expenses/pages/ExpensesPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const MessagesPage = lazy(() => import('@/features/messages/pages/MessagesPage'));
const PostJobPage = lazy(() => import('@/features/job/pages/PostJobPage'));
const JobDetailsPage = lazy(() => import('@/features/job/pages/JobDetailsPage'));
const UserProfilePage = lazy(() => import('@/features/profile/pages/UserProfilePage'));
const AgencyProfilePage = lazy(() => import('@/features/agency/pages/AgencyProfilePage'));
const ContractPage = lazy(() => import('@/features/contract/pages/ContractPage'));
const FindTalentPage = lazy(() => import('@/features/job/pages/FindTalentPage'));
const SavedJobsPage = lazy(() => import('@/features/job/pages/SavedJobsPage'));
const GigListPage = lazy(() => import('@/features/gig/pages/GigListPage'));
const GigDetailsPage = lazy(() => import('@/features/gig/pages/GigDetailsPage'));
const LiveContestPage = lazy(() => import('@/features/contest/pages/LiveContestPage'));
const ClientJobViewPage = lazy(() => import('@/features/job/pages/ClientJobViewPage'));
const UserBillingPage = lazy(() => import('@/features/profile/pages/UserBillingPage'));
const IssuersPage = lazy(() => import('@/features/admin/pages/IssuersPage'));


const LoadingFallback: React.FC = () => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
    </div>
);

const AppLayout: React.FC = () => {
    const [isSidebarOpen, setSidebarOpen] = React.useState(true);
    const location = useLocation();
    
    // Simple check for full-width pages
    const isFullWidth = location.pathname.includes('/contest') || location.pathname.startsWith('/post-job/');

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            <Sidebar isOpen={isSidebarOpen} onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                    <div className={`p-4 sm:p-6 lg:p-8 ${isFullWidth ? '' : 'max-w-7xl mx-auto'}`}>
                        {!isFullWidth && <Breadcrumbs />}
                        <div className={`${isFullWidth ? '' : 'mt-6'}`}>
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
          <Routes>
              <Route element={<AppLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="dashboard/*" element={<DashboardPage />} />
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="suppliers" element={<SuppliersPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="project/:id" element={<ProjectDetailsPage />} />
                  <Route path="project/:id/contest" element={<LiveContestPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="invoices/new" element={<InvoiceFormPage />} />
                  <Route path="invoices/:invoiceId/edit" element={<InvoiceFormPage />} />
                  <Route path="invoices/:invoiceId" element={<InvoiceView />} />
                  <Route path="estimates" element={<EstimatesPage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="payments/new" element={<PaymentFormPage />} />
                  <Route path="payments/:paymentId/edit" element={<PaymentFormPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="expenses" element={<ExpensesPage />} />
                  <Route path="messages" element={<MessagesPage />} />
                  <Route path="post-job/:id" element={<PostJobPage />} />
                  <Route path="job/:jobId" element={<JobDetailsPage />} />
                  <Route path="client/job/:jobId" element={<ClientJobViewPage />} />
                  <Route path="profile/billing" element={<UserBillingPage />} />
                  <Route path="profile/:userId" element={<UserProfilePage />} />
                  <Route path="agency/:agencyId" element={<AgencyProfilePage />} />
                  <Route path="contract/:contractId" element={<ContractPage />} />
                  <Route path="find-talent" element={<FindTalentPage />} />
                  <Route path="saved-jobs" element={<SavedJobsPage />} />
                  <Route path="browse-services" element={<GigListPage />} />
                  <Route path="gig/:gigId" element={<GigDetailsPage />} />
                  <Route path="admin/issuers" element={<IssuersPage />} />
                  <Route path="*" element={<NotFoundPage />} />
              </Route>
          </Routes>
      </Suspense>
      <AppContextMenu />
    </>
  );
};

export default App;