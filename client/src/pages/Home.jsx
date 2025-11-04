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
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/50">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="relative">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                  </span>
                </div>
                <div>
                  <span className="font-bold text-base sm:text-lg">
                    {unreadCount} {unreadCount === 1 ? t('notifications.newMessage') : t('messages.newMessage')}!
                  </span>
                  <p className="text-xs sm:text-sm text-purple-100">{t('home.viewMessages')}</p>
                </div>
              </div>
              <Link
                to="/messages"
                className="bg-white text-purple-600 px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold hover:bg-purple-50 hover:shadow-xl transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg text-sm sm:text-base"
              >
                <span>{t('home.viewMessagesButton')}</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center mb-4 sm:mb-6 px-2">
            {t('home.title')}
          </h2>
          <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              className="flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl text-base sm:text-lg focus:outline-none focus:ring-4 focus:ring-purple-300 shadow-xl"
            />
            <button
              type="submit"
              className="bg-white text-purple-600 px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold hover:bg-purple-50 transition-all transform hover:scale-105 shadow-xl flex items-center gap-2"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">{t('common.search')}</span>
            </button>
          </form>
          <div className="mt-3 sm:mt-4 text-center">
            <Link 
              to="/search" 
              className="text-white hover:text-purple-200 text-xs sm:text-sm underline transition-colors"
            >
              {t('home.browseAllListings')}
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center mb-4 sm:mb-6 px-2">{t('home.howItWorks')}</h2>
        
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
          <div className="text-center p-2 sm:p-3 md:p-4 bg-white rounded-lg shadow-sm">
            <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">🛍️</div>
            <h3 className="text-xs sm:text-sm md:text-base font-semibold mb-1">{t('home.browseListing')}</h3>
            <p className="text-gray-600 text-xs hidden sm:block">{t('home.browseDescription')}</p>
          </div>
          
          <div className="text-center p-2 sm:p-3 md:p-4 bg-white rounded-lg shadow-sm">
            <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">💬</div>
            <h3 className="text-xs sm:text-sm md:text-base font-semibold mb-1">{t('home.expressIntent')}</h3>
            <p className="text-gray-600 text-xs hidden sm:block">{t('home.expressIntentDescription')}</p>
          </div>
          
          <div className="text-center p-2 sm:p-3 md:p-4 bg-white rounded-lg shadow-sm">
            <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">🤝</div>
            <h3 className="text-xs sm:text-sm md:text-base font-semibold mb-1">{t('home.meetComplete')}</h3>
            <p className="text-gray-600 text-xs hidden sm:block">{t('home.meetCompleteDescription')}</p>
          </div>
        </div>
      </div>

      {/* Featured Listings */}
      <div className="bg-gray-100 py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6 sm:mb-8 px-1">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">{t('home.featuredListings') || t('home.recentListings')}</h2>
            <Link to="/search" className="text-primary-600 hover:text-primary-700 font-semibold text-sm sm:text-base whitespace-nowrap">
              {t('home.viewAll')} →
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="w-full h-40 sm:h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {listingsData?.listings?.slice(0, 20).map((listing) => (
                <Link
                  key={listing._id}
                  to={`/listings/${listing._id}`}
                  className="card hover:shadow-2xl transition-all duration-200 transform hover:scale-[1.02] p-4"
                >
                  {listing.images?.[0] && (
                    <img
                      src={listing.images[0].url}
                      alt={listing.title}
                      className="w-full h-40 sm:h-48 object-contain bg-gray-50 rounded-lg mb-3 sm:mb-4"
                    />
                  )}
                  <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-1">{listing.title}</h3>
                  <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">{listing.description}</p>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary-600">
                      {listing.price} {listing.currency || 'ETB'}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500 capitalize truncate">{listing.condition}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Safety Notice */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 sm:p-6 rounded">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-2">🛡️ {t('home.safetyTipsTitle')}</h3>
          <ul className="list-disc list-inside space-y-1.5 sm:space-y-1 text-gray-700 text-sm sm:text-base">
            <li>{t('home.safetyTip1')}</li>
            <li>{t('home.safetyTip2')}</li>
            <li>{t('home.safetyTip3')}</li>
            <li>{t('home.safetyTip4')}</li>
            <li>{t('home.safetyTip5')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;
