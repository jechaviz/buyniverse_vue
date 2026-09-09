import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const pathnames = location.pathname.split('/').filter(x => x);

  const segmentMapping: Record<string, { pluralNameKey: string, listPath: string }> = {
      project: { pluralNameKey: 'projects', listPath: '/projects' },
      invoice: { pluralNameKey: 'invoices', listPath: '/invoices' },
      payment: { pluralNameKey: 'payments', listPath: '/payments' },
      job: { pluralNameKey: 'home', listPath: '/' },
      gig: { pluralNameKey: 'browse-services', listPath: '/browse-services' },
      profile: { pluralNameKey: 'find-talent', listPath: '/find-talent' },
      agency: { pluralNameKey: 'find-talent', listPath: '/find-talent' },
  };

  if (pathnames.length === 0 && location.pathname === '/') {
    return null; // Don't show for root home page
  }

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center">
        <li className="inline-flex items-center">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-700 hover:text-primary-600 dark:text-slate-400 dark:hover:text-white">
            <i className="fa-solid fa-home w-4 h-4 mr-2"></i>
            {t('layout.breadcrumbs.home')}
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const prevSegment = pathnames[index - 1];

          let name = value;
          let linkPath = to;

          const dynamicSegments = ['job', 'profile', 'agency', 'gig', 'contract', 'invoice', 'invoices', 'project', 'projects', 'post-job', 'client', 'payments', 'admin'];

          if (prevSegment && dynamicSegments.includes(prevSegment)) {
              if (name.length > 10 && name.includes('-')) {
                  name = `#${name.slice(0, 8)}...`;
              } else {
                  name = `#${name}`;
              }
          } else if (segmentMapping[value] && pathnames.length > index + 1) {
              const mapping = segmentMapping[value];
              name = t(`layout.breadcrumbs.${mapping.pluralNameKey}`);
              linkPath = mapping.listPath;
          } else {
            name = t(`layout.breadcrumbs.${value}`, { defaultValue: value });
            name = name.charAt(0).toUpperCase() + name.slice(1);
          }

          return (
            <li key={to}>
              <div className="flex items-center">
                <svg className="w-3 h-3 text-slate-400 mx-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m1 9 4-4-4-4"/>
                </svg>
                {last ? (
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {name}
                    </span>
                ) : (
                    <Link to={linkPath} className="text-sm font-medium text-slate-700 hover:text-primary-600 dark:text-slate-400 dark:hover:text-white">
                        {name}
                    </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
