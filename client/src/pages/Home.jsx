import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listingsAPI } from '../services/api';

const Home = () => {
  // Fetch recent listings
  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['listings', 'recent'],
    queryFn: () => listingsAPI.getAll({ limit: 6, page: 1 }),
  });

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Buy & Sell Locally with Confidence
            </h1>
            <p className="text-xl mb-8 text-primary-100">
              Regional marketplace with intent-based transactions
            </p>
            <div className="flex justify-center space-x-4">
              <Link to="/search" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                Browse Listings
              </Link>
              <Link to="/register" className="bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-800 transition border-2 border-white">
                Get Started
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
            <p className="text-gray-600">
              Find items from trusted local sellers with verified payment methods
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">Intent to Buy</h3>
            <p className="text-gray-600">
              Express interest, agree on meeting details, and payment method
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold mb-2">Meet & Complete</h3>
            <p className="text-gray-600">
              Meet in person, verify item, complete payment offline
            </p>
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
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {listingsData?.listings?.slice(0, 6).map((listing) => (
                <Link
                  key={listing._id}
                  to={`/listings/${listing._id}`}
                  className="card hover:shadow-lg transition"
                >
                  {listing.images?.[0] && (
                    <img
                      src={listing.images[0].url}
                      alt={listing.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="font-semibold text-lg mb-2 truncate">{listing.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{listing.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-primary-600">
                      {listing.price} {listing.currency}
                    </span>
                    <span className="text-sm text-gray-500">{listing.condition}</span>
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
            <li>Always meet in public places</li>
            <li>Verify payment receipt before handing over items</li>
            <li>Check seller's verification badge and reviews</li>
            <li>Never share sensitive personal information</li>
            <li>Report suspicious activity to administrators</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;

