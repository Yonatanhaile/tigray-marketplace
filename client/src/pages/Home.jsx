import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listingsAPI, messagesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const Home = () => {
  const { isAuthenticated } = useAuth();

  // Fetch recent listings
  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['listings', 'recent'],
    queryFn: () => listingsAPI.getAll({ limit: 6, page: 1 }),
  });

  // Fetch unread message count
  const { data: unreadData } = useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: () => messagesAPI.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = unreadData?.unreadCount || 0;

  return (
    <div>
      {/* New Messages Alert */}
      {isAuthenticated && unreadCount > 0 && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <svg className="w-8 h-8 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                  </span>
                </div>
                <div>
                  <span className="font-bold text-lg">
                    {unreadCount} {unreadCount === 1 ? 'New Message' : 'New Messages'}!
                  </span>
                  <p className="text-sm text-purple-100">Click to view your conversations</p>
                </div>
              </div>
              <Link
                to="/messages"
                className="bg-white text-purple-600 px-6 md:px-8 py-3 rounded-xl font-bold hover:bg-purple-50 hover:shadow-xl transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg"
              >
                <span>View Messages</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to YohaTrade</h1>
            <p className="text-xl mb-8 text-primary-100">Buy and sell locally with secure intent-based transactions</p>
            <div className="flex justify-center">
              <Link to="/search" className="bg-white text-primary-600 px-10 py-4 rounded-lg font-semibold hover:bg-gray-100 transition transform hover:scale-105 shadow-lg hover:shadow-xl text-lg">
                Browse Listings
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="text-4xl mb-4">🛍️</div>
            <h3 className="text-xl font-semibold mb-2">Browse Listings</h3>
            <p className="text-gray-600">Discover items from local sellers in your area</p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">Express Intent to Buy</h3>
            <p className="text-gray-600">Submit your intent with proposed terms and chat with the seller</p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold mb-2">Meet & Complete</h3>
            <p className="text-gray-600">Meet safely and complete the transaction off-platform</p>
          </div>
        </div>
      </div>

      {/* Recent Listings */}
      <div className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Recent Listings</h2>
            <Link to="/search" className="text-primary-600 hover:text-primary-700 font-semibold">
              View All →
            </Link>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {listingsData?.listings?.slice(0, 6).map((listing) => (
                <Link
                  key={listing._id}
                  to={`/listings/${listing._id}`}
                  className="card hover:shadow-2xl transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {listing.images?.[0] && (
                    <img
                      src={listing.images[0].url}
                      alt={listing.title}
                      className="w-full h-48 object-contain bg-gray-50 rounded-lg mb-4"
                    />
                  )}
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1">{listing.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{listing.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-primary-600">
                      {listing.price} {listing.currency || 'ETB'}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">{listing.condition}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Safety Notice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded">
          <h3 className="text-lg font-semibold mb-2">🛡️ Safety Tips</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Meet in public, well-lit places</li>
            <li>Verify items before payment</li>
            <li>Look for sellers with verified badges</li>
            <li>Never share sensitive personal information</li>
            <li>Report suspicious activity to admins</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;
