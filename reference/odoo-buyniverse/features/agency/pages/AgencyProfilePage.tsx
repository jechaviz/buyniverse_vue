
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { NotFoundPage } from '@/features/notfound';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import { FreelancerCard } from '@/features/freelancer';
import { GigCard } from '@/features/gig';
import ProgressCircle from '@/components/ui/ProgressCircle';

const { useParams, Link } = ReactRouterDOM;

const AgencyProfilePage: React.FC = () => {
  const { agencyId } = useParams<{ agencyId: string }>();
  const { agencies, users, gigs } = useAppState();

  const agency = agencies.find(a => a.id === agencyId);
  if (!agency) return <NotFoundPage />;

  const agencyMembers = users.filter(u => u.agencyId === agency.id);
  const agencyGigs = gigs.filter(g => g.creatorId === agency.id && g.creatorType === 'agency');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-1 space-y-6 md:sticky md:top-24">
            <Card className="p-6">
                <div className="flex flex-col items-center text-center">
                    <img src={agency.logoUrl} alt={`${agency.name} logo`} className="w-24 h-24 rounded-xl mb-4" loading="lazy" decoding="async" />
                    <h1 className="text-2xl font-bold text-gray-800">{agency.name}</h1>
                    <p className="text-gray-500 mt-1">{agency.location}</p>
                </div>
            </Card>
            <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">Agency Stats</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <ProgressCircle progress={agency.jobSuccessScore || 0} size={60} strokeWidth={6} />
                        <div>
                            <p className="font-semibold">Job Success Score</p>
                            <p className="text-xs text-gray-500">Based on all team projects</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-2xl text-primary-700">${(agency.totalTeamEarnings || 0).toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Total team earnings</p>
                    </div>
                </div>
            </Card>
             <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">Certifications</h3>
                <div className="flex flex-wrap gap-2">
                    {agency.certifications.map(cert => <Tag key={cert}>{cert}</Tag>)}
                </div>
            </Card>
        </div>
        <div className="md:col-span-2 space-y-8">
            <Card className="p-8">
                <h2 className="text-xl font-semibold text-primary-700 mb-2">{agency.tagline}</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{agency.bio}</p>
            </Card>

            {agencyGigs.length > 0 && (
                <Card className="p-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">Our Services (Gigs)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {agencyGigs.map(gig => <GigCard key={gig.id} gig={gig} />)}
                    </div>
                </Card>
            )}

            {agency.portfolio.length > 0 && (
                 <Card className="p-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">Agency Portfolio</h3>
                    <div className="space-y-6">
                        {agency.portfolio.map((item, index) => (
                            <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-primary-600 hover:underline">{item.title}</a>
                                <p className="text-gray-600 mt-1">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {agencyMembers.length > 0 && (
                <Card className="p-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">Our Team</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {agencyMembers.map(member => <FreelancerCard key={member.id} freelancer={member} />)}
                    </div>
                </Card>
            )}
        </div>
    </div>
  );
};

export default AgencyProfilePage;
