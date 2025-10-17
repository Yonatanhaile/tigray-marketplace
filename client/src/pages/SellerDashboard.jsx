import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listingsAPI, ordersAPI } from '../services/api';

const SellerDashboard = () => {
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', 'my-listings'],
    queryFn: () => listingsAPI.getAll({ sellerId: 'me' }),
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'seller'],
    queryFn: () => ordersAPI.getMyOrders({ role: 'seller' }),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Seller Dashboard</h1>
        <Link to="/create-listing" className="btn btn-primary">+ Create Listing</Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h3 className="text-sm text-gray-500 mb-1">Active Listings</h3>
          <p className="text-3xl font-bold">{listingsData?.listings?.length || 0}</p>
        </div>
        <div className="card">
          <h3 className="text-sm text-gray-500 mb-1">Pending Orders</h3>
          <p className="text-3xl font-bold">{ordersData?.orders?.filter(o => o.status === 'requested').length || 0}</p>
        </div>
        <div className="card">
          <h3 className="text-sm text-gray-500 mb-1">Completed</h3>
          <p className="text-3xl font-bold">{ordersData?.orders?.filter(o => o.status === 'delivered').length || 0}</p>
        </div>
      </div>

      {/* My Listings */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">My Listings</h2>
        {listingsLoading ? (
          <p>Loading...</p>
        ) : listingsData?.listings?.length === 0 ? (
          <p className="text-gray-500">No listings yet.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {listingsData?.listings?.map(listing => (
              <Link key={listing._id} to={`/listings/${listing._id}`} className="card hover:shadow-lg">
                {listing.images?.[0] && <img src={listing.images[0].url} alt={listing.title} className="w-full h-32 object-cover rounded mb-2" />}
                <h3 className="font-semibold truncate">{listing.title}</h3>
                <p className="text-primary-600 font-bold">{listing.price} ETB</p>
                <p className="text-xs text-gray-500">{listing.status}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Recent Orders</h2>
        {ordersLoading ? (
          <p>Loading...</p>
        ) : ordersData?.orders?.length === 0 ? (
          <p className="text-gray-500">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {ordersData?.orders?.slice(0, 5).map(order => (
              <Link key={order._id} to={`/orders/${order._id}`} className="card flex justify-between items-center hover:shadow-lg">
                <div>
                  <h4 className="font-semibold">{order.listingId?.title}</h4>
                  <p className="text-sm text-gray-500">Buyer: {order.buyerId?.name}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs ${order.status === 'requested' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;

