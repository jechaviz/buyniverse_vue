
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { UserType } from '@/types';
import ClientDashboard from '../components/ClientDashboard';
import { FreelancerDashboard } from '../components/FreelancerDashboard';
import TimesheetPage from './TimesheetPage';
import { AgencyManagementPage } from '@/features/agency';
import { TransactionHistoryPage } from '@/features/transactions';
import Card from '@/components/ui/Card';

const { Routes, Route } = ReactRouterDOM;

const AdminDashboard: React.FC = () => {
  const { users, jobs, contracts } = useAppState();
  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Admin Dashboard</h1>
        <Card className="p-8">
            <h2 className="text-xl font-semibold">Platform Overview</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-3xl font-bold">{users.length}</p>
                    <p className="text-sm text-slate-600">Total Users</p>
                </div>
                <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-3xl font-bold">{jobs.length}</p>
                    <p className="text-sm text-slate-600">Total Jobs Posted</p>
                </div>
                <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-3xl font-bold">{contracts.length}</p>
                    <p className="text-sm text-slate-600">Total Contracts</p>
                </div>
            </div>
             <p className="mt-6 text-center text-slate-500">More admin features coming soon.</p>
        </Card>
    </div>
  )
}

const DashboardContent: React.FC = () => {
  const { currentUser } = useAppState();
  if (currentUser.type === UserType.Admin) return <AdminDashboard />;
  return currentUser.type === UserType.Client ? <ClientDashboard /> : <FreelancerDashboard />;
}

const DashboardPage: React.FC = () => {
  return (
    <Routes>
      <Route index element={<DashboardContent />} />
      <Route path="my-agency" element={<AgencyManagementPage />} />
      <Route path="transactions" element={<TransactionHistoryPage />} />
      <Route path="timesheets" element={<TimesheetPage />} />
    </Routes>
  );
};

export default DashboardPage;