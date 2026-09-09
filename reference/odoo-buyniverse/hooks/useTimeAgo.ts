import { useMemo } from 'react';
import { useTranslation } from './useTranslation';

export const useTimeAgo = () => {
    const { t } = useTranslation();

    const timeAgo = useMemo(() => (date: Date): string => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return t('pages.job.card.ago.years', { count: Math.floor(interval) });
        interval = seconds / 2592000;
        if (interval > 1) return t('pages.job.card.ago.months', { count: Math.floor(interval) });
        interval = seconds / 86400;
        if (interval > 1) return t('pages.job.card.ago.days', { count: Math.floor(interval) });
        interval = seconds / 3600;
        if (interval > 1) return t('pages.job.card.ago.hours', { count: Math.floor(interval) });
        interval = seconds / 60;
        if (interval > 1) return t('pages.job.card.ago.minutes', { count: Math.floor(interval) });
        return t('pages.job.card.ago.seconds', { count: Math.floor(seconds) });
    }, [t]);

    return timeAgo;
};
