import React, { useMemo } from 'react';
import { Proposal, User, ProposalQualificationStatus } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import StarRating from '@/components/ui/StarRating';
import Dropdown from '@/components/ui/Dropdown';
import { Link } from 'react-router-dom';

interface ProviderSourcingCardProps {
    provider: User;
    proposal?: Proposal;
    onDragStart: (e: React.DragEvent, providerId: string) => void;
    onQualificationChange: (providerId: string, status: ProposalQualificationStatus) => void;
}

export const ProviderSourcingCard: React.FC<ProviderSourcingCardProps> = ({ provider, proposal, onDragStart, onQualificationChange }) => {
    const { t } = useTranslation();

    const qualificationStatus = proposal?.qualificationStatus || ProposalQualificationStatus.Pending;

    const statusInfo = {
        [ProposalQualificationStatus.Pending]: { text: t('pages.project.details.statuses.pending'), color: 'bg-slate-200 text-slate-700' },
        [ProposalQualificationStatus.DocsUploaded]: { text: t('pages.project.details.statuses.docsuploaded'), color: 'bg-blue-100 text-blue-700' },
        [ProposalQualificationStatus.NdaSigned]: { text: t('pages.project.details.statuses.ndasigned'), color: 'bg-purple-100 text-purple-700' },
        [ProposalQualificationStatus.Qualified]: { text: t('pages.project.details.statuses.qualified'), color: 'bg-green-100 text-green-700' },
        [ProposalQualificationStatus.Rejected]: { text: t('pages.project.details.statuses.rejected'), color: 'bg-red-100 text-red-700' },
    }[qualificationStatus];

    return (
        <Card
            draggable
            onDragStart={(e) => onDragStart(e, provider.id)}
            className="p-3 cursor-grab active:cursor-grabbing"
        >
            <div className="flex items-start gap-3">
                <img src={provider.avatarUrl} alt={provider.name} className="w-10 h-10 rounded-full" loading="lazy" decoding="async" />
                <div className="flex-grow">
                    <p className="font-bold text-sm">{provider.name}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{provider.headline}</p>
                </div>
            </div>

            <div className="mt-2 text-xs">
                <p className="font-semibold text-slate-500">{t('pages.project.details.qualificationStatus')}</p>
                <Dropdown
                    align="left"
                    trigger={
                        <button className={`w-full text-left mt-1 ${statusInfo.color} px-2 py-1 rounded-md flex justify-between items-center`}>
                            <span>{statusInfo.text}</span>
                            <i className="fa-solid fa-chevron-down text-xs"></i>
                        </button>
                    }
                >
                    <div className="py-1">
                        {Object.values(ProposalQualificationStatus).map(status => (
                            <button
                                key={status}
                                onClick={() => onQualificationChange(provider.id, status)}
                                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                {t(`pages.project.details.statuses.${(status as string).toLowerCase()}`, { defaultValue: status })}
                            </button>
                        ))}
                    </div>
                </Dropdown>
            </div>

            <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <Link to={`/messages`} className="text-slate-500 hover:text-primary-600 text-sm">
                    <i className="fa-regular fa-comment-dots"></i>
                </Link>
                <Link to={`/profile/${provider.id}`} className="text-slate-500 hover:text-primary-600 text-sm">
                    <i className="fa-regular fa-user"></i>
                </Link>
            </div>
        </Card>
    );
};