import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { NotFoundPage } from '@/features/notfound';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UserType, Contract, Job, User, Milestone, MilestoneStatus, NotificationType, JobStatus, Notification, Task, Agency, Gig, ContractType, Invoice, ProposalStatus, InvoiceLineItem } from '@/types';
import { MilestoneItem, ContractOverview, TimesheetView } from '@/features/contract';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { LeaveReviewModal } from '@/features/job';

const { useParams, Link } = ReactRouterDOM;

const AddMilestoneModal: React.FC<{ isOpen: boolean; onClose: () => void; contract: Contract; }> = ({ isOpen, onClose, contract }) => {
    const dispatch = useAppDispatch();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');

    const handleSubmit = () => {
        if(!description || !amount || !dueDate) return;
        const newMilestone: Milestone = {
            id: `milestone-${new Date().toISOString()}`,
            description,
            amount: parseFloat(amount),
            dueDate: new Date(dueDate),
            status: MilestoneStatus.Pending,
            tasks: [],
        };
        dispatch({ type: 'CREATE_MILESTONE', payload: { contractId: contract.id, milestone: newMilestone } });
        onClose();
        setDescription('');
        setAmount('');
        setDueDate('');
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Milestone">
            <div className="space-y-4">
                <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} required/>
                <Input label="Amount ($)" type="number" value={amount} onChange={e => setAmount(e.target.value)} required/>
                <Input label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required/>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Add Milestone</Button>
                </div>
            </div>
        </Modal>
    );
}

const ContractHeader: React.FC<{ contract: Contract, source: Job | Gig, otherParty: User | Agency }> = ({ contract, source, otherParty }) => {
    const isCompleted = !!contract.endedAt;

    return (
        <Card className="p-6">
            <h1 className="text-2xl font-bold text-gray-800">{source.title}</h1>
            <div className="text-sm text-gray-500 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Contract with <Link to={(otherParty as Agency).tagline ? `/agency/${otherParty.id}` : `/profile/${otherParty.id}`} className="font-semibold text-primary-600 hover:underline">{otherParty.name}</Link></span>
                <span className="hidden md:inline">|</span>
                <span>Budget: <span className="font-bold text-gray-700">${contract.rateOrBid.toLocaleString()} {contract.jobType === 'Hourly' && '/hr'}</span></span>
                <span className="hidden md:inline">|</span>
                <span className={`font-semibold ${isCompleted ? 'text-purple-700' : 'text-blue-700'}`}>
                    Status: {isCompleted ? 'Completed' : 'In Progress'}
                </span>
            </div>
        </Card>
    );
}

const ContractPage: React.FC = () => {
    const { contractId } = useParams<{ contractId: string }>();
    const { contracts, jobs, users, currentUser, agencies, gigs, reviews, issuers } = useAppState();
    const dispatch = useAppDispatch();
    const [isMilestoneModalOpen, setMilestoneModalOpen] = useState(false);
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return <NotFoundPage />;

    const source = contract.type === ContractType.Job ? jobs.find(j => j.id === contract.sourceId) : gigs.find(g => g.id === contract.sourceId);
    if (!source) return <NotFoundPage />;
    
    const isClient = currentUser.id === contract.clientId;
    const provider = agencies.find(a => a.id === contract.providerId) || users.find(u => u.id === contract.providerId);
    const otherParty = isClient ? provider : users.find(u => u.id === contract.clientId);

    if (!otherParty) return <NotFoundPage />;

    const canCompleteJob = isClient && !contract.endedAt && contract.type === ContractType.Job;

    const hasCurrentUserReviewed = reviews.some(r => r.jobId === source.id && r.fromUserId === currentUser.id);
    const canReview = contract.endedAt && contract.type === ContractType.Job && !hasCurrentUserReviewed;

    const handleMarkComplete = () => {
        if (!window.confirm('Are you sure you want to mark this contract as complete? This action cannot be undone.')) return;
        
        const freelancerId = contract.type === 'JOB' ? (users.find(u => u.id === contract.providerId) || users.find(u => u.agencyId === contract.providerId))?.id : (gigs.find(g=>g.id === contract.sourceId)?.creatorId);
        if(!freelancerId) return;

        const clientNotification: Notification = { id: `notif-${Date.now()}-client`, userId: contract.clientId, type: NotificationType.JOB_COMPLETED, text: `You have marked "${source.title}" as complete. Leave a review.`, link: `/contract/${contract.id}`, isRead: false, createdAt: new Date() };
        const freelancerNotification: Notification = { id: `notif-${Date.now()}-freelancer`, userId: freelancerId, type: NotificationType.JOB_COMPLETED, text: `Client marked "${source.title}" as complete. Leave a review.`, link: `/contract/${contract.id}`, isRead: false, createdAt: new Date() };
        
        const clientUser = users.find(u => u.id === contract.clientId);
        const providerAsUser = users.find(u => u.id === contract.providerId);
        const providerAsAgency = agencies.find(a => a.id === contract.providerId);
        const providerEntity = providerAsAgency || providerAsUser;

        if (!clientUser || !providerEntity) return;

        const issuerUserForData = providerAsAgency ? users.find(u => u.id === providerAsAgency.ownerId) : providerAsUser;
        if (!issuerUserForData) return;

        const issuer = issuers.find(i => i.rfc === issuerUserForData.rfc);

        const totalAmount = contract.rateOrBid;
        const lineItems: InvoiceLineItem[] = [{
            id: `item-contract-${contract.id}`,
            productCode: '84111500', // IT services
            unitCode: 'E48', // Service Unit
            quantity: 1,
            unit: 'Service',
            description: source.title, 
            unitPrice: totalAmount,
            discount: 0,
            amount: totalAmount,
            objetoImp: '02', // Yes, subject to tax
            taxes: []
        }];
        
        const invoice: Invoice = { 
            id: `inv-${Date.now()}`,
            version: '4.0',
            folio: String(Math.floor(1000 + Math.random() * 9000)),
            serie: 'A',
            date: new Date(),
            status: 'Vigente',
            paymentStatus: 'Paid',
            issuerId: issuer?.id || '',
            branchId: issuer?.branches?.[0]?.id || '',
            tipoDeComprobante: 'I',
            exportacion: '01',
            issuer: {
                name: providerEntity.name,
                rfc: issuerUserForData.rfc || 'XAXX010101000',
                taxRegime: issuerUserForData.taxRegime || '612',
                postalCode: issuerUserForData.postalCode || '00000',
            },
            receiver: {
                userId: clientUser.id,
                name: clientUser.companyName || clientUser.name,
                rfc: clientUser.rfc || 'XAXX010101000',
                taxRegime: clientUser.taxRegime || '601',
                postalCode: clientUser.postalCode || '00000',
                cfdiUse: 'G03',
            },
            lineItems,
            cfdiUse: 'G03',
            paymentMethod: 'PUE',
            paymentType: '03',
            currency: 'USD',
            exchangeRate: 1,
            subtotal: totalAmount,
            discount: 0,
            taxTotal: 0,
            retainedTotal: 0,
            total: totalAmount,
            originalString: `||...${totalAmount}...||`,
            issuerSeal: 'mockseal==',
            satSeal: 'mocksatseal==',
            qrCodeData: 'mockqrdata',
            companyName: clientUser.companyName || clientUser.name,
            projectTitle: source.title,
            amount: totalAmount, 
            issuedDate: new Date(), 
            dueDate: new Date(), 
            contractId: contract.id,
            clientId: contract.clientId, 
            providerId: contract.providerId
        };

        dispatch({ type: 'MARK_JOB_COMPLETE', payload: { jobId: source.id, contractId: contract.id, clientNotification, freelancerNotification, invoice } });
    };

    const tabClass = (tabName: string) => `px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeTab === tabName ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-800'}`;
    
    const MilestonesComponent = () => (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Project Plan</h2>
                {isClient && !contract.endedAt && <Button size="sm" onClick={() => setMilestoneModalOpen(true)}>Add Milestone</Button>}
            </div>
            {contract.milestones.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                    {contract.milestones.map(milestone => (
                        <MilestoneItem key={milestone.id} milestone={milestone} contract={contract} />
                    ))}
                </ul>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    {isClient ? "No milestones created yet. Click 'Add Milestone' to get started." : "The client has not created any milestones yet."}
                </div>
            )}
        </div>
    );

    return (
        <>
            <div className="space-y-8">
                <ContractHeader contract={contract} source={source} otherParty={otherParty} />

                <div className="flex justify-end gap-2">
                    {canCompleteJob && <Button onClick={handleMarkComplete}>Mark Contract as Complete</Button>}
                    {canReview && <Button onClick={() => setReviewModalOpen(true)}>Leave a Review</Button>}
                </div>
                
                <Card>
                    <div className="border-b border-gray-200">
                         <nav className="flex -mb-px px-6 space-x-4 overflow-x-auto">
                            <button className={tabClass('overview')} onClick={() => setActiveTab('overview')}>Overview</button>
                             {contract.jobType === 'Fixed-Price' ? (
                                 <button className={tabClass('milestones')} onClick={() => setActiveTab('milestones')}>Milestones & Payments</button>
                             ) : (
                                <button className={tabClass('timesheet')} onClick={() => setActiveTab('timesheet')}>Timesheet</button>
                             )}
                            <button className={tabClass('messages')} onClick={() => setActiveTab('messages')}>Messages</button>
                         </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'overview' && <ContractOverview contract={contract} />}
                        {activeTab === 'milestones' && <MilestonesComponent />}
                        {activeTab === 'timesheet' && <TimesheetView contract={contract} />}
                        {activeTab === 'messages' && (
                             <div className="text-center py-16 text-gray-500">
                                <p className="font-semibold">Messaging is coming soon!</p>
                                <p className="text-sm">For now, please use the main <Link to="/messages" className="text-primary-600 underline">Messages page</Link>.</p>
                             </div>
                         )}
                    </div>
                </Card>
            </div>
            
            {isClient && <AddMilestoneModal isOpen={isMilestoneModalOpen} onClose={() => setMilestoneModalOpen(false)} contract={contract} />}
            {contract.type === ContractType.Job && <LeaveReviewModal isOpen={isReviewModalOpen} onClose={() => setReviewModalOpen(false)} job={source as Job} userType={currentUser.type} />}
        </>
    );
};

export default ContractPage;