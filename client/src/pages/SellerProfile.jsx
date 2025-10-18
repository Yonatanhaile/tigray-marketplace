import { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listingsAPI } from '../services/api';

const SellerProfile = () => {
  const { sellerId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = 12;

  const { data, isLoading } = useQuery({
    queryKey: ['seller-profile', sellerId, page],
    queryFn: () => listingsAPI.getAll({ sellerId, status: 'active', page, limit }),
  });

  const listings = data?.listings || [];
  const pagination = data?.pagination;
  const seller = listings?.[0]?.sellerId || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="card mb-8">
        {isLoading ? (
          <div className="py-8 text-center">Loading...</div>
        ) : seller ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center text-xl font-bold">
                {seller?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{seller?.name}</h1>
                <p className="text-sm text-gray-600">{seller?.email}</p>
                {seller?.kyc?.status && (
                  <p className="text-xs mt-1">
                    KYC: <span className="font-medium">{seller.kyc.status}</span>
                  </p>
                )}
                {seller?.badges?.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {seller.badges.map((b) => (
                      <span key={b} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                        ✓ {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">Seller not found</div>
        )}
      </div>

      {/* Listings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Seller Listings</h2>
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No active listings.</div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <Link key={listing._id} to={`/listings/${listing._id}`} className="card hover:shadow-lg transition">
                  {listing.images?.[0] && (
                    <img src={listing.images[0].url} alt={listing.title} className="w-full h-48 object-contain bg-gray-50 rounded-lg mb-4" />
                  )}
                  <h3 className="font-semibold text-lg mb-2 truncate">{listing.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{listing.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-primary-600">{listing.price} {listing.currency}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{listing.condition}</span>
                  </div>
                </Link>
              ))}
            </div>
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center space-x-2 mt-8">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      const params = Object.fromEntries(searchParams);
                      params.page = p.toString();
                      setSearchParams(params);
                    }}
                    className={`px-4 py-2 rounded ${
                      p === page ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SellerProfile;


