

import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-extrabold text-primary-600">404</h1>
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-4">{t('pages.notFound.title')}</h2>
      <p className="text-slate-600 dark:text-slate-300 mt-2 mb-8">
        {t('pages.notFound.description')}
      </p>
      <Link to="/">
        <Button size="lg">{t('pages.notFound.goHome')}</Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;