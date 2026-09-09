import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { NotFoundPage } from '@/features/notfound';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { User, Agency, Contract, ContractType, Invoice, Transaction, TransactionType, NotificationType, UserType, JobType, InvoiceLineItem } from '@/types';
import Tag from '@/components/ui/Tag';

const GigDetailsPage: React.FC = () => {
  const { gigId } = useParams<{ gigId: string }>();
  const { gigs, users, agencies, currentUser, issuers } = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const gig = gigs.find(g => g.id === gigId);
  if (!gig) return <NotFoundPage />;

  const creator: User | Agency | undefined = gig.creatorType === 'user'
    ? users.find(u => u.id === gig.creatorId)
    : agencies.find(a => a.id === gig.creatorId);

  if (!creator) return <NotFoundPage />;

  const handlePurchase = () => {
    if (currentUser.type !== UserType.Client) {
        alert("Only clients can purchase services.");
        return;
    }
    if (!window.confirm(`Confirm purchase of "${gig.title}" for $${gig.price}?`)) return;

    const contractId = `contract-gig-${Date.now()}`;
    const invoiceId = `inv-gig-${Date.now()}`;
    const transactionId = `trans-gig-${Date.now()}`;

    const newContract: Contract = {
        id: contractId,
        type: ContractType.Gig,
        jobType: JobType.FixedPrice,
        sourceId: gig.id,
        clientId: currentUser.id,
        providerId: gig.creatorId,
        rateOrBid: gig.price,
        startedAt: new Date(),
        endedAt: new Date(), // Gigs can be considered complete on purchase for simplicity here
        milestones: [],
    };

    const clientUser = currentUser;
    const isAgency = gig.creatorType === 'agency';
    const providerEntity = creator;
    const issuerUser = isAgency ? users.find(u => u.id === (providerEntity as Agency).ownerId) : providerEntity as User;
    const issuer = issuers.find(i => i.rfc === issuerUser?.rfc);

    if (!issuerUser) return;
    
    const totalAmount = gig.price;
    const lineItems: InvoiceLineItem[] = [{
        id: `item-gig-${gig.id}`,
        productCode: '80111600', // Creative services
        unitCode: 'E48', // Service Unit
        quantity: 1,
        unit: 'Service',
        description: `Purchase of Gig: ${gig.title}`,
        unitPrice: totalAmount,
        discount: 0,
        amount: totalAmount,
        objetoImp: '02',
        taxes: []
    }];

    const newInvoice: Invoice = {
        id: invoiceId,
        version: '4.0',
        folio: String(Math.floor(1000 + Math.random() * 9000)),
        serie: 'G',
        date: new Date(),
        status: 'Vigente',
        paymentStatus: 'Paid',
        issuerId: issuer?.id || '',
        branchId: issuer?.branches?.[0]?.id || '',
        tipoDeComprobante: 'I',
        exportacion: '01',
        issuer: {
            name: providerEntity.name,
            rfc: issuerUser.rfc || 'XAXX010101000',
            taxRegime: issuerUser.taxRegime || '612',
            postalCode: issuerUser.postalCode || '00000',
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
        paymentType: '01',
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
        projectTitle: gig.title,
        amount: totalAmount,
        issuedDate: new Date(),
        dueDate: new Date(),
        contractId: contractId,
        clientId: currentUser.id,
        providerId: gig.creatorId,
    };

    const newTransaction: Transaction = {
        id: transactionId,
        userId: currentUser.id,
        type: TransactionType.GIG_PURCHASE,
        amount: -gig.price,
        description: `Purchase of Gig: ${gig.title}`,
        date: new Date(),
        relatedId: contractId,
        invoiceId: invoiceId,
    }
    
    const notificationForProvider = {
        id: `notif-gig-${Date.now()}`,
        userId: gig.creatorType === 'user' ? gig.creatorId : (creator as Agency).ownerId,
        type: NotificationType.GIG_PURCHASED,
        text: `${currentUser.name} has purchased your service: "${gig.title}"!`,
        link: `/contract/${contractId}`,
        isRead: false,
        createdAt: new Date(),
    };

    dispatch({
        type: 'PURCHASE_GIG',
        payload: {
            gig,
            contract: newContract,
            invoice: newInvoice,
            transaction: newTransaction,
            notification: notificationForProvider,
        }
    });

    navigate('/dashboard');
    alert("Purchase successful! You can view the details in your dashboard.");
  }

  const CreatorProfileLink: React.FC = () => {
    const link = gig.creatorType === 'user' ? `/profile/${creator.id}` : `/agency/${creator.id}`;
    return (
        <Link to={link} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg">
            <img src={(creator as Agency).logoUrl || 'https://via.placeholder.com/150/16a34a/ffffff?text=U'} alt={creator.name} className="w-12 h-12 rounded-full" loading="lazy" decoding="async" />
            <div>
                <p className="font-bold">{creator.name}</p>
                <p className="text-sm text-gray-500">{gig.creatorType === 'user' ? (creator as User).headline : (creator as Agency).tagline}</p>
            </div>
        </Link>
    );
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
            <Card className="p-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">{gig.title}</h1>
                <img src={gig.imageUrl} alt={gig.title} className="w-full h-auto object-cover rounded-lg mb-6 max-h-96" loading="lazy" decoding="async" />
                <h2 className="text-xl font-bold mb-2">About This Gig</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{gig.description}</p>
            </Card>
        </div>
        <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
            <Card className="p-6">
                 <div className="text-3xl font-bold text-gray-800 mb-4">${gig.price.toLocaleString()}</div>
                 <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z" clipRule="evenodd" /></svg>
                        <span>{gig.deliveryTimeDays} Day Delivery</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500" viewBox="0 0 20 20" fill="currentColor"><path d="M17.926 9.395a3.001 3.001 0 00-4.071-2.023 3.001 3.001 0 00-2.31 4.752l.26.234.233.26a3.001 3.001 0 004.072 2.023 3.001 3.001 0 002.31-4.752l-.26-.234-.234-.26zM5.002 8.97a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zM3.588 12.5a1.5 1.5 0 112.121-2.121A1.5 1.5 0 013.588 12.5zM12.5 3.588a1.5 1.5 0 10-2.121 2.121A1.5 1.5 0 0012.5 3.588zM6.467 6.467a.75.75 0 00-1.06 1.06l5.25 5.25a.75.75 0 001.06-1.06l-5.25-5.25z"/></svg>
                        <span>{gig.revisions} Revisions</span>
                    </li>
                 </ul>
                 <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="font-semibold mb-2">What's Included:</h3>
                    <div className="flex flex-wrap gap-2">
                        {gig.scope.map(item => <Tag key={item}>{item}</Tag>)}
                    </div>
                 </div>
                 {currentUser.type === UserType.Client ? (
                    <Button className="w-full mt-6" onClick={handlePurchase}>Purchase for ${gig.price}</Button>
                 ) : (
                    <p className="text-center text-sm text-gray-500 mt-6">You must be logged in as a client to purchase.</p>
                 )}
            </Card>
            <Card className="p-4">
                <h3 className="font-bold mb-2">About The Seller</h3>
                <CreatorProfileLink />
            </Card>
        </aside>
    </div>
  );
};

export default GigDetailsPage;