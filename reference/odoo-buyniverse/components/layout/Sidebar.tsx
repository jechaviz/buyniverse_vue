import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppState } from '@/context/AppStateContext';
import { UserType } from '@/types';
import { prefetchRoute } from '@/utils/route-prefetch';

interface SidebarProps {
    isOpen: boolean;
    onToggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggleSidebar }) => {
    const { t } = useTranslation();
    const { currentUser } = useAppState();
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        customers: true,
        projects: true,
        sales: true,
        purchases: true,
        findWork: true,
        admin: true,
    });

    const toggleSection = (section: string) => {
        if (isOpen) {
            setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
        }
    };

    const clientMenu = [
        { path: "/dashboard", icon: "fa-tachometer-alt", label: "dashboard" },
        {
            title: "purchases",
            items: [
                { path: "/projects", icon: "fa-folder", label: "projects" },
                { path: "/suppliers", icon: "fa-truck-field", label: "suppliers" },
                { path: "/expenses", icon: "fa-money-bill-wave", label: "expenses" },
            ]
        },
        {
            title: "sales",
            items: [
                { path: "/clients", icon: "fa-user-tie", label: "clients" },
                { path: "/invoices", icon: "fa-file-invoice-dollar", label: "invoices" },
                { path: "/estimates", icon: "fa-file-invoice", label: "estimates" },
                { path: "/payments", icon: "fa-credit-card", label: "payments" },
            ]
        },
    ];

    const freelancerMenu = [
        { path: "/dashboard", icon: "fa-tachometer-alt", label: "dashboard" },
        { path: "/projects", icon: "fa-folder", label: "projects" },
        {
            title: "findWork",
            label: "findWork",
            items: [
                 { path: "/", icon: "fa-briefcase", label: "findWork" },
                 { path: "/browse-services", icon: "fa-store", label: "services" },
            ]
        },
        {
            title: "sales",
            items: [
                { path: "/clients", icon: "fa-user-tie", label: "clients" },
                { path: "/invoices", icon: "fa-file-invoice-dollar", label: "invoices" },
            ]
        },
    ];

    const adminMenu = [
         { path: "/dashboard", icon: "fa-tachometer-alt", label: "dashboard" },
         { path: "/projects", icon: "fa-folder", label: "projects" },
         { path: "/clients", icon: "fa-user-tie", label: "clients" },
         { path: "/suppliers", icon: "fa-truck-field", label: "suppliers" },
         { path: "/invoices", icon: "fa-file-invoice-dollar", label: "invoices" },
         {
             title: "admin",
             items: [
                { path: "/admin/issuers", icon: "fa-building-columns", label: "issuers"},
             ]
         }
    ];

    const getMenu = () => {
        switch (currentUser.type) {
            case UserType.Client: return clientMenu;
            case UserType.Freelancer: return freelancerMenu;
            case UserType.Admin: return adminMenu;
            default: return [];
        }
    }
    
    const menuItems = getMenu();

    const NavItem: React.FC<{ path: string; icon: string; label: string; }> = ({ path, icon, label }) => (
        <NavLink
            to={path}
            onMouseEnter={() => prefetchRoute(path)}
            className={({ isActive }) =>
                `flex items-center p-2 rounded-lg transition-colors duration-200 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 ${
                    isActive ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 font-semibold' : ''
                }`
            }
        >
            <i className={`fa-solid ${icon} w-6 text-center text-slate-500 dark:text-slate-400`}></i>
            <span className={`ml-3 transition-opacity duration-300 whitespace-nowrap ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>{t(`layout.sidebar.${label}`, { defaultValue: label })}</span>
        </NavLink>
    );

    return (
        <aside className={`bg-white dark:bg-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-20'}`} aria-label="Sidebar">
            <div className="flex-grow px-3 py-4 overflow-y-auto">
                <ul className="space-y-2">
                    {menuItems.map((menu, index) => {
                        if ('title' in menu) {
                            const isSectionOpen = !!openSections[menu.title];
                            return (
                                <li key={index}>
                                    <button
                                        onClick={() => toggleSection(menu.title)}
                                        disabled={!isOpen}
                                        className="w-full flex items-center justify-between px-2 pt-4 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                                    >
                                        <span className={`transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                                            {t(`layout.sidebar.${menu.title}`, { defaultValue: menu.title })}
                                        </span>
                                        {isOpen && <i className={`fa-solid fa-chevron-right text-xxs transition-transform duration-200 ${isSectionOpen ? 'rotate-90' : ''}`}></i>}
                                    </button>
                                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen && isSectionOpen ? 'max-h-96' : 'max-h-0'}`}>
                                        <ul className="space-y-1 pt-1">
                                            {menu.items.map(item => <li key={item.path}><NavItem {...item} /></li>)}
                                        </ul>
                                    </div>
                                    {!isOpen && (
                                         <ul className="space-y-1 pt-1">
                                            {menu.items.map(item => <li key={item.path}><NavItem {...item} /></li>)}
                                        </ul>
                                    )}
                                </li>
                            );
                        }
                        return <li key={(menu as any).path}><NavItem {...(menu as any)} /></li>;
                    })}
                </ul>
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-slate-700">
                <button
                    onClick={onToggleSidebar}
                    className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                    <i className={`fa-solid ${isOpen ? 'fa-angles-left' : 'fa-angles-right'}`}></i>
                </button>
            </div>
        </aside>
    );
};

export default React.memo(Sidebar);