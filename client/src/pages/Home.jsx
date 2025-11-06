import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listingsAPI, messagesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { onNewActiveListing, offNewActiveListing } from '../services/socket';

const Home = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch smart home page listings (quality + popularity + recency)
  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['listings', 'home'],
    queryFn: () => listingsAPI.getHomePageListings({ limit: 20 }),
  });

  // Fetch unread message count
  const { data: unreadData } = useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: () => messagesAPI.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = unreadData?.unreadCount || 0;

  // Real-time updates for new active listings
  useEffect(() => {
    const handleNewActiveListing = (data) => {
      console.log('✨ New active listing:', data);
      // Invalidate listings queries to refresh the data
      queryClient.invalidateQueries(['listings', 'home']);
      queryClient.invalidateQueries(['listings']);
    };

    onNewActiveListing(handleNewActiveListing);

    return () => {
      offNewActiveListing(handleNewActiveListing);
    };
  }, [queryClient]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <div>
      {/* New Messages Alert */}
      {isAuthenticated && unreadCount > 0 && (
        <div className="border-b border-[color:var(--color-primary)]/10 bg-[color:var(--color-primary-soft)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
            <div className="flex items-center gap-3 text-sm text-[color:var(--color-text)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m-4 4h6m7 0h-3a2 2 0 01-2-2v-6a2 2 0 012-2h3a2 2 0 012 2v6a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--color-primary)]">
                  {unreadCount} {unreadCount === 1 ? t('notifications.newMessage') : t('messages.newMessage')}.
                </p>
                <p className="text-xs text-[color:var(--color-muted)]">{t('home.viewMessages')}</p>
              </div>
            </div>
            <Link
              to="/messages"
              className="btn btn-primary text-sm"
            >
              {t('home.viewMessagesButton')}
            </Link>
          </div>
        </div>
      )}

      {/* Search & Hero Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold text-center text-[color:var(--color-primary)] md:text-3xl">
              {t('home.title')}
            </h1>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('home.searchPlaceholder')}
                className="input"
              />
              <button type="submit" className="btn btn-primary text-sm whitespace-nowrap">
                {t('common.search')}
              </button>
            </form>
            <p className="text-xs text-center text-[color:var(--color-muted)]">
              <Link to="/search" className="font-semibold text-[color:var(--color-primary)] underline">
                {t('home.browseAllListings')}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="bg-white py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[color:var(--color-primary)]">{t('home.featuredListings') || t('home.recentListings')}</h2>
              <p className="mt-1 text-sm text-[color:var(--color-muted)]">{t('home.subtitle')}</p>
            </div>
            <Link to="/search" className="btn btn-secondary text-sm">
              {t('home.viewAll')}
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? [...Array(9)].map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="h-44 rounded-lg bg-slate-200" />
                    <div className="mt-4 h-6 w-3/4 rounded bg-slate-200" />
                    <div className="mt-2 h-4 w-2/3 rounded bg-slate-200" />
                    <div className="mt-6 flex items-center justify-between">
                      <div className="h-6 w-20 rounded bg-slate-200" />
                      <div className="h-4 w-12 rounded bg-slate-200" />
                    </div>
                  </div>
                ))
              : listingsData?.listings?.slice(0, 18).map((listing) => (
                  <Link
                    key={listing._id}
                    to={`/listings/${listing._id}`}
                    className="card h-full transition-transform duration-200 hover:-translate-y-1"
                  >
                    {listing.images?.[0] && (
                      <img
                        src={listing.images[0].url}
                        alt={listing.title}
                        className="h-44 w-full rounded-lg object-cover"
                      />
                    )}
                    <div className="mt-4 space-y-3">
                      <h3 className="text-base font-semibold text-[color:var(--color-text)] line-clamp-1">{listing.title}</h3>
                      <p className="text-sm text-[color:var(--color-muted)] line-clamp-2">{listing.description}</p>
                      <div className="flex items-center justify-between text-sm font-semibold text-[color:var(--color-primary)]">
                        <span>{listing.price} {listing.currency || 'ETB'}</span>
                        <span className="text-[color:var(--color-muted)] capitalize">{listing.condition}</span>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* Safety Notice */}
      <section className="bg-[color:var(--color-primary-soft)] py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-2xl border border-[color:var(--color-primary)]/20 bg-white p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-[color:var(--color-primary)]">{t('home.safetyTipsTitle')}</h3>
            <p className="mt-2 text-sm text-[color:var(--color-muted)]">{t('footer.disclaimerText')}</p>
            <ul className="mt-6 grid gap-3 text-sm text-[color:var(--color-text)] sm:grid-cols-2">
              {[t('home.safetyTip1'), t('home.safetyTip2'), t('home.safetyTip3'), t('home.safetyTip4'), t('home.safetyTip5')].map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[color:var(--color-accent)]" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
