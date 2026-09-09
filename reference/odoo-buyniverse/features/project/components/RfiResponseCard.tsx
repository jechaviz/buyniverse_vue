import React, { useState, useMemo } from 'react';
import { RfiResponse, User } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';

interface RfiResponseCardProps {
  row: {
      provider: User | undefined;
  } & RfiResponse;
  onShortlist: (providerId: string) => void;
  isShortlisted: boolean;
}

const RfiResponseCard: React.FC<RfiResponseCardProps> = ({ row: rfiResponse, onShortlist, isShortlisted }) => {
    const { provider } = rfiResponse;

    if (!provider) return null;

    return (
        <Card className="p-4 flex flex-col h-full">
            <div className="flex-grow">
                <div className="flex items-start gap-3 mb-3">
                    <img src={provider.avatarUrl} alt={provider.name} className="w-12 h-12 rounded-full" loading="lazy" decoding="async" />
                    <div>
                        <p className="font-bold">{provider.name}</p>
                        <p className="text-sm text-slate-500">{provider.headline}</p>
                    </div>
                </div>
                
                <h4 className="font-semibold text-sm mb-1">Solution Idea:</h4>
                <p className="text-sm text-slate-600 line-clamp-3">
                    {rfiResponse.idea}
                </p>
                
                <div className="mt-3">
                    <h4 className="font-semibold text-sm mb-1">Capabilities:</h4>
                    <div className="flex flex-wrap gap-1">
                        {rfiResponse.capabilities.map(skill => (
                            <Tag key={skill} className="text-xs">{skill}</Tag>
                        ))}
                    </div>
                </div>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
                 <Button 
                    onClick={() => onShortlist(provider.id)} 
                    className="w-full"
                    variant={isShortlisted ? 'secondary' : 'primary'}
                    disabled={isShortlisted}
                >
                    {isShortlisted ? <><i className="fa-solid fa-check mr-2"></i> Shortlisted</> : 'Shortlist & Invite to Propose'}
                </Button>
            </div>
        </Card>
    );
};

// This is a wrapper to match the expected props from DataTable's renderCard
const RfiResponseCardWrapper = (row: any, onShortlist: (providerId: string) => void, isShortlisted: boolean) => <RfiResponseCard row={row} onShortlist={onShortlist} isShortlisted={isShortlisted} />;

export default RfiResponseCardWrapper;