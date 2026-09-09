import React from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const FolioPackageCard: React.FC<{
    amount: number;
    price: number;
    onPurchase: (amount: number) => void;
}> = ({ amount, price, onPurchase }) => {
    const { t } = useTranslation();
    return (
        <Card className="p-6 text-center">
            <h3 className="text-2xl font-bold">{t('pages.userBilling.folios', { count: amount })}</h3>
            <p className="text-4xl font-bold text-primary-600 my-4">${price}</p>
            <Button className="w-full" onClick={() => onPurchase(amount)}>
                {t('pages.userBilling.purchase')}
            </Button>
        </Card>
    );
};

const UserBillingPage: React.FC = () => {
    const { currentUser } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const handlePurchase = (amount: number) => {
        dispatch({ type: 'PURCHASE_FOLIOS', payload: { amount } });
        alert(t('pages.userBilling.purchaseSuccess', { count: amount }));
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('pages.userBilling.title')}</h1>

            <Card className="p-6">
                <p className="text-sm uppercase text-slate-500">{t('pages.userBilling.currentBalance')}</p>
                <p className="text-4xl font-bold text-green-600">
                    {t('pages.userBilling.folios', { count: currentUser.folioBalance || 0 })}
                </p>
            </Card>

            <div>
                <h2 className="text-2xl font-bold mb-4">{t('pages.userBilling.purchasePackages')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FolioPackageCard amount={10} price={10} onPurchase={handlePurchase} />
                    <FolioPackageCard amount={50} price={45} onPurchase={handlePurchase} />
                    <FolioPackageCard amount={100} price={80} onPurchase={handlePurchase} />
                </div>
            </div>
        </div>
    );
};

export default UserBillingPage;