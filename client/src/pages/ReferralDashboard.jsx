import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const ReferralDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [paymentType, setPaymentType] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [updating, setUpdating] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // First, ensure referral program exists (creates if doesn't exist)
      const programResponse = await fetch(`${API_URL}/api/referrals/program`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!programResponse.ok) {
        throw new Error('Failed to create/fetch referral program');
      }

      // Then fetch detailed stats
      const statsResponse = await fetch(`${API_URL}/api/referrals/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch referral stats');
      }

      const data = await statsResponse.json();
      setReferralData(data.stats);
      
      if (data.stats.paymentMethod) {
        setPaymentType(data.stats.paymentMethod.type);
        setPaymentDetails(data.stats.paymentMethod.details);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
      console.error('Error details:', error.message);
      toast.error(error.message || t('referral.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    
    if (!paymentType || !paymentDetails) {
      toast.error(t('referral.fillPaymentDetails'));
      return;
    }

    setUpdating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/referrals/payment-method`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentType, paymentDetails }),
      });

      if (!response.ok) throw new Error('Failed to update');

      toast.success(t('referral.paymentUpdated'));
      fetchReferralData();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error(t('referral.updateError'));
    } finally {
      setUpdating(false);
    }
  };

  const handleWithdraw = async () => {
    if (!referralData?.paymentMethod) {
      toast.error(t('referral.setPaymentFirst'));
      return;
    }

    if (!referralData?.canWithdraw) {
      toast.error(t('referral.notEnoughReferrals', { 
        count: referralData?.withdrawalThreshold 
      }));
      return;
    }

    if (!confirm(t('referral.confirmWithdrawal'))) {
      return;
    }

    setWithdrawing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/referrals/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to request withdrawal');
      }

      toast.success(t('referral.withdrawalRequested'));
      fetchReferralData();
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast.error(error.message || t('referral.withdrawalError'));
    } finally {
      setWithdrawing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t('referral.codeCopied'));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  const withdrawableReferrals = Math.floor(
    (referralData?.availableReferrals || 0) / (referralData?.withdrawalThreshold || 25)
  ) * (referralData?.withdrawalThreshold || 25);
  
  const withdrawableAmount = withdrawableReferrals * (referralData?.earningsPerReferral || 10);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">{t('referral.title')}</h1>
      <p className="text-[color:var(--color-muted)] mb-8">
        {t('referral.subtitle')}
      </p>

      {/* Warning if flagged */}
      {referralData?.flagged && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-5 mb-6">
          <h3 className="font-semibold text-red-900 mb-2">
            Account Under Review
          </h3>
          <p className="text-sm text-red-800 mb-3">
            Your account has been flagged for suspicious activity and is under review. Withdrawals are temporarily suspended.
          </p>
          <div className="text-sm text-red-700 space-y-1 mb-3">
            {referralData.flagReasons.map((reason, i) => (
              <p key={i}>• {reason}</p>
            ))}
          </div>
          <p className="text-xs text-red-600">
            If you believe this is an error, please contact support.
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">
            {t('referral.totalReferrals')}
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {referralData?.totalReferrals || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">
            {t('referral.availableReferrals')}
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {referralData?.availableReferrals || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">
            {t('referral.availableBalance')}
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {referralData?.availableBalance || 0} {t('referral.birr')}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">
            💰 Total Received
          </p>
          <p className="text-2xl font-semibold text-green-600">
            {referralData?.totalReceived || referralData?.totalWithdrawn || 0} {t('referral.birr')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Total payments received
          </p>
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('referral.withdrawalSection')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('referral.minimumWithdrawal', { count: referralData?.withdrawalThreshold })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">{t('referral.youCanWithdraw')}</p>
            <p className="text-2xl font-semibold text-gray-900">
              {withdrawableAmount} {t('referral.birr')}
            </p>
            <p className="text-xs text-gray-500">
              ({withdrawableReferrals} {t('referral.referrals')})
            </p>
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={!referralData?.canWithdraw || withdrawing || referralData?.flagged}
          className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {withdrawing 
            ? t('referral.requesting') 
            : t('referral.requestWithdrawal')
          }
        </button>

        {!referralData?.canWithdraw && (
          <p className="text-sm text-center text-gray-600 mt-3">
            {t('referral.needMore', { 
              count: (referralData?.withdrawalThreshold || 25) - (referralData?.availableReferrals || 0)
            })}
          </p>
        )}
      </div>

      {/* Referral Code */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">
          {t('referral.yourReferralCode')}
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            {t('referral.yourCode')}
          </p>
          <p className="text-3xl font-mono font-bold text-gray-900 tracking-wider mb-4">
            {referralData?.referralCode || ''}
          </p>
          <button
            onClick={() => copyToClipboard(referralData?.referralCode)}
            className="btn btn-primary"
          >
            {t('referral.copyCode')}
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 font-medium mb-2">
            {t('referral.howToShare')}
          </p>
          <ol className="text-sm text-gray-600 space-y-1 ml-4">
            <li>1. {t('referral.shareStep1')}</li>
            <li>2. {t('referral.shareStep2')}</li>
            <li>3. {t('referral.shareStep3')}</li>
          </ol>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">
          {t('referral.paymentMethod')}
        </h2>
        
        {referralData?.paymentMethod?.type && referralData?.paymentMethod?.details ? (
          // Display saved payment method (read-only)
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Type</p>
                  <p className="text-base font-semibold text-gray-900 capitalize">
                    {referralData.paymentMethod.type === 'bank_transfer' 
                      ? t('referral.bankTransfer') 
                      : referralData.paymentMethod.type}
                  </p>
                </div>
                <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                  Set
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Details</p>
                <p className="text-base text-gray-900 whitespace-pre-wrap">
                  {referralData.paymentMethod.details}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 bg-gray-100 p-3 rounded">
              Your payment method has been saved. The admin will use these details to transfer your earnings. 
              If you need to change this information, please contact support.
            </p>
          </div>
        ) : (
          // Show form to set payment method (first time only)
          <form onSubmit={handleUpdatePayment} className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Please provide your payment details. This will be used to transfer your referral earnings.
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('referral.selectPaymentMethod')}
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">{t('referral.chooseMethod')}</option>
                <option value="telebirr">Telebirr</option>
                <option value="mpesa">M-Pesa</option>
                <option value="bank_transfer">{t('referral.bankTransfer')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('referral.paymentDetails')}
              </label>
              {paymentType === 'bank_transfer' ? (
                <textarea
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  placeholder={t('referral.bankPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="4"
                  required
                />
              ) : (
                <input
                  type="text"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  placeholder={t('referral.phonePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              )}
            </div>

            <button
              type="submit"
              disabled={updating}
              className="btn btn-primary w-full"
            >
              {updating ? t('common.saving') : 'Save Payment Method'}
            </button>
            
            <p className="text-xs text-gray-600 text-center">
              Make sure your details are correct. You won't be able to change them later.
            </p>
          </form>
        )}
      </div>

      {/* Payment History - Money You've Received */}
      {referralData?.paymentHistory?.length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💰</span>
            <h2 className="text-lg font-bold text-green-900">
              Payment History - Money Received
            </h2>
          </div>
          <div className="space-y-3">
            {referralData.paymentHistory.map((payment, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-green-200"
              >
                <div>
                  <p className="font-bold text-green-700 text-lg">
                    ✓ {payment.amount} {t('referral.birr')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(payment.paidAt).toLocaleDateString()} • {payment.paymentMethod}
                  </p>
                  {payment.transactionId && (
                    <p className="text-xs text-gray-500 mt-1">
                      TX: {payment.transactionId}
                    </p>
                  )}
                  {payment.notes && (
                    <p className="text-xs text-gray-700 mt-1 italic">
                      Note: {payment.notes}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    PAID ✓
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-white rounded-lg p-4 border border-green-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total Received:</span>
              <span className="text-xl font-bold text-green-600">
                {referralData.totalReceived || 0} {t('referral.birr')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal History - Pending/Requested */}
      {referralData?.withdrawalHistory?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            {t('referral.withdrawalHistory')}
          </h2>
          <div className="space-y-3">
            {referralData.withdrawalHistory.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {withdrawal.amount} {t('referral.birr')}
                  </p>
                  <p className="text-sm text-[color:var(--color-muted)]">
                    {withdrawal.referralCount} {t('referral.referrals')} • {' '}
                    {new Date(withdrawal.requestedAt).toLocaleDateString()}
                  </p>
                  {withdrawal.rejectionReason && (
                    <p className="text-sm text-red-600 mt-1">
                      {t('referral.reason')}: {withdrawal.rejectionReason}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {t(`referral.status.${withdrawal.status}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">
          {t('referral.referredUsers')}
        </h2>
        
        {referralData?.referredUsers?.length > 0 ? (
          <div className="space-y-3">
            {referralData.referredUsers.map((user, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(user.registeredAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {referralData?.earningsPerReferral || 10} {t('referral.birr')}
                  </p>
                  <p className="text-xs text-gray-600">
                    {user.withdrawn ? t('referral.withdrawn') : t('referral.available')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            {t('referral.noReferrals')}
          </p>
        )}
      </div>

      {/* Simple Rules Section */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          Program Rules
        </h3>
        
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            This referral program is designed to reward you for bringing real users to our platform. 
            To keep it fair for everyone, please note:
          </p>

          <ul className="space-y-2 ml-4">
            <li>• Only refer real people who will actually use the marketplace</li>
            <li>• Don't create fake accounts or refer yourself</li>
            <li>• Each referral must be a genuine, unique person</li>
          </ul>

          <p className="text-xs text-gray-600 bg-gray-100 p-3 rounded">
            <strong>Important:</strong> Attempts to abuse the system will result in loss of all earnings and 
            account suspension. We monitor all referral activity to ensure fairness.
          </p>
        </div>
      </div>

      {/* How it Works */}
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">
          {t('referral.howItWorks')}
        </h3>
        <ol className="space-y-2 text-sm text-gray-700">
          <li>1. {t('referral.step1')}</li>
          <li>2. {t('referral.step2')}</li>
          <li>3. {t('referral.step3')}</li>
          <li>4. {t('referral.step4')}</li>
          <li>5. {t('referral.step5')}</li>
        </ol>
      </div>
    </div>
  );
};

export default ReferralDashboard;

