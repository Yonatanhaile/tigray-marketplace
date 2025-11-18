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
  
  const withdrawableAmount = withdrawableReferrals * (referralData?.earningsPerReferral || 5);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">{t('referral.title')}</h1>
      <p className="text-[color:var(--color-muted)] mb-8">
        {t('referral.subtitle')}
      </p>

      {/* Warning if flagged */}
      {referralData?.flagged && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 mb-6 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-3xl">🚨</div>
            <div className="flex-1">
              <h3 className="font-bold text-red-900 text-lg mb-2">
                {t('referral.accountFlagged')}
              </h3>
              <p className="text-sm text-red-800 mb-3">
                Your referral account has been flagged due to suspicious activity. Withdrawals are blocked until this is resolved.
              </p>
              <div className="bg-red-100 rounded p-3 mb-3">
                <p className="text-xs font-semibold text-red-900 mb-2">Fraud Detection Reasons:</p>
                <ul className="text-sm text-red-800 space-y-1.5">
                  {referralData.flagReasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-600">▪</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                <p className="text-xs font-semibold text-yellow-900 mb-1">⚠️ What This Means:</p>
                <ul className="text-xs text-yellow-800 space-y-1">
                  <li>• You cannot request withdrawals while flagged</li>
                  <li>• Your referrals are still counted but earnings are on hold</li>
                  <li>• An admin will review your account</li>
                  <li>• If this was a mistake, contact support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-sm text-[color:var(--color-muted)] mb-1">
            {t('referral.totalReferrals')}
          </p>
          <p className="text-3xl font-bold text-[color:var(--color-primary)]">
            {referralData?.totalReferrals || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-sm text-[color:var(--color-muted)] mb-1">
            {t('referral.availableReferrals')}
          </p>
          <p className="text-3xl font-bold text-orange-600">
            {referralData?.availableReferrals || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-sm text-[color:var(--color-muted)] mb-1">
            {t('referral.availableBalance')}
          </p>
          <p className="text-3xl font-bold text-green-600">
            {referralData?.availableBalance || 0} {t('referral.birr')}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-sm text-[color:var(--color-muted)] mb-1">
            {t('referral.totalWithdrawn')}
          </p>
          <p className="text-3xl font-bold text-blue-600">
            {referralData?.totalWithdrawn || 0} {t('referral.birr')}
          </p>
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-green-900">
              {t('referral.withdrawalSection')}
            </h2>
            <p className="text-sm text-green-700 mt-1">
              {t('referral.minimumWithdrawal', { count: referralData?.withdrawalThreshold })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-700">{t('referral.youCanWithdraw')}</p>
            <p className="text-3xl font-bold text-green-800">
              {withdrawableAmount} {t('referral.birr')}
            </p>
            <p className="text-xs text-green-600">
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
          <p className="text-sm text-center text-green-700 mt-3">
            {t('referral.needMore', { 
              count: (referralData?.withdrawalThreshold || 25) - (referralData?.availableReferrals || 0)
            })}
          </p>
        )}
      </div>

      {/* Referral Code */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {t('referral.yourReferralCode')}
        </h2>
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-lg p-6 mb-4">
          <p className="text-sm text-gray-600 mb-2 text-center">
            {t('referral.yourCode')}
          </p>
          <p className="text-4xl font-bold text-center text-orange-600 tracking-widest mb-4">
            {referralData?.referralCode || ''}
          </p>
          <button
            onClick={() => copyToClipboard(referralData?.referralCode)}
            className="btn btn-primary w-full"
          >
            {t('referral.copyCode')}
          </button>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-semibold mb-2">
            📋 {t('referral.howToShare')}
          </p>
          <ol className="text-sm text-blue-700 space-y-1 ml-4">
            <li>1. {t('referral.shareStep1')}</li>
            <li>2. {t('referral.shareStep2')}</li>
            <li>3. {t('referral.shareStep3')}</li>
          </ol>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {t('referral.paymentMethod')}
        </h2>
        <form onSubmit={handleUpdatePayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('referral.selectPaymentMethod')}
            </label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                rows="4"
                required
              />
            ) : (
              <input
                type="text"
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                placeholder={t('referral.phonePlaceholder')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            )}
          </div>

          <button
            type="submit"
            disabled={updating}
            className="btn btn-primary w-full"
          >
            {updating ? t('common.saving') : t('referral.updatePayment')}
          </button>
        </form>
      </div>

      {/* Withdrawal History */}
      {referralData?.withdrawalHistory?.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {t('referral.withdrawalHistory')}
          </h2>
          <div className="space-y-3">
            {referralData.withdrawalHistory.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
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
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                    withdrawal.status === 'paid' ? 'bg-green-100 text-green-800' :
                    withdrawal.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                    withdrawal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {t(`referral.status.${withdrawal.status}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral List */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {t('referral.referredUsers')}
        </h2>
        
        {referralData?.referredUsers?.length > 0 ? (
          <div className="space-y-3">
            {referralData.referredUsers.map((user, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-[color:var(--color-muted)]">
                    {new Date(user.registeredAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    5 {t('referral.birr')}
                  </p>
                  <p className="text-xs text-[color:var(--color-muted)]">
                    {user.withdrawn ? t('referral.withdrawn') : t('referral.available')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-[color:var(--color-muted)] py-8">
            {t('referral.noReferrals')}
          </p>
        )}
      </div>

      {/* Anti-Fraud Rules - Prominent Warning */}
      <div className="mt-8 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 rounded-lg p-6 shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 text-3xl">⚠️</div>
          <div>
            <h3 className="font-bold text-red-900 text-xl mb-2">
              ANTI-FRAUD RULES - READ CAREFULLY
            </h3>
            <p className="text-red-800 font-semibold text-base">
              Violations will result in IMMEDIATE FORFEITURE of ALL earnings and PERMANENT BAN
            </p>
          </div>
        </div>

        <div className="bg-white border-2 border-red-300 rounded-lg p-5 mb-4">
          <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
            <span className="text-2xl">🚫</span>
            ZERO TOLERANCE POLICY
          </h4>
          
          {/* Ethiopia-Only Requirement */}
          <div className="mb-4 bg-blue-50 border-2 border-blue-400 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-2xl">🇪🇹</span>
              <div>
                <p className="font-bold text-blue-900 mb-1">Ethiopia-Only Referral Program</p>
                <p className="text-sm text-blue-800">
                  Referrals are ONLY valid for users registering from Ethiopia. 
                  Referrals from outside Ethiopia will be automatically rejected and will NOT earn you any money.
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-900 mb-3">
            Any attempt to manipulate, abuse, or cheat the referral system is strictly forbidden. This includes but is not limited to:
          </p>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold mt-0.5">✗</span>
              <span className="text-gray-900">
                Creating or using fake accounts to generate referrals
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold mt-0.5">✗</span>
              <span className="text-gray-900">
                Referring yourself or registering multiple times
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold mt-0.5">✗</span>
              <span className="text-gray-900">
                Using automated systems or tools to create accounts
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold mt-0.5">✗</span>
              <span className="text-gray-900">
                Sharing your referral code outside of Ethiopia
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold mt-0.5">✗</span>
              <span className="text-gray-900">
                Any other deceptive or fraudulent activity
              </span>
            </li>
          </ul>
          <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
            <p className="text-xs text-red-900 font-semibold">
              ⚠️ We have advanced fraud detection systems in place. Don't try to outsmart the system - you will be caught and will lose everything.
            </p>
          </div>
        </div>

        <div className="bg-red-900 text-white rounded-lg p-5 mb-4">
          <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
            <span className="text-2xl">💰</span>
            CONSEQUENCES OF FRAUD
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-yellow-300 font-bold">1.</span>
              <span>
                <strong>IMMEDIATE ACCOUNT FLAGGING:</strong> Your account will be automatically flagged by our fraud detection system
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-300 font-bold">2.</span>
              <span>
                <strong>ALL EARNINGS FORFEITED:</strong> You will lose 100% of your referral earnings - every single Birr
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-300 font-bold">3.</span>
              <span>
                <strong>WITHDRAWAL BLOCKED:</strong> All withdrawal requests will be permanently rejected
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-300 font-bold">4.</span>
              <span>
                <strong>ACCOUNT SUSPENSION:</strong> Your entire marketplace account may be suspended or banned
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-300 font-bold">5.</span>
              <span>
                <strong>NO APPEALS:</strong> Fraudulent activity decisions are final and cannot be appealed
              </span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
            <span className="text-xl">🔍</span>
            WE ARE WATCHING
          </h4>
          <p className="text-sm text-yellow-900 mb-2">
            Our advanced fraud detection system monitors all referral activity in real-time using sophisticated technology that can identify suspicious patterns and fraudulent behavior.
          </p>
          <p className="text-xs text-yellow-900 font-semibold bg-yellow-100 rounded p-2">
            ⚡ Our detection methods are constantly evolving. What worked yesterday won't work today. Save yourself the trouble - play fair.
          </p>
        </div>
      </div>

      {/* How it Works */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">
          {t('referral.howItWorks')}
        </h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li>1. {t('referral.step1')}</li>
          <li>2. {t('referral.step2')}</li>
          <li>3. {t('referral.step3')}</li>
          <li>4. {t('referral.step4')}</li>
          <li>5. {t('referral.step5')}</li>
        </ol>
      </div>

      {/* Legitimate Use Agreement */}
      <div className="mt-6 bg-green-50 border-2 border-green-400 rounded-lg p-5">
        <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
          <span className="text-2xl">✅</span>
          LEGITIMATE REFERRAL GUIDELINES
        </h4>
        <ul className="space-y-2 text-sm text-green-900">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Only share with people in Ethiopia</strong> - referrals from other countries will be rejected</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Share your code with real friends, family, and colleagues</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Each referred person must be a unique individual using their own device</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Referrals should be spread naturally over time, not all at once</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>If you have questions about what's allowed, contact support first</span>
          </li>
        </ul>
        <div className="mt-4 bg-white border border-green-300 rounded p-3">
          <p className="text-xs text-green-900">
            <strong>By using this referral program, you agree to these terms.</strong> We want to reward genuine 
            users who help us grow our community in Ethiopia, not those who try to cheat the system. Play fair, earn rewards! 🎉
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;

