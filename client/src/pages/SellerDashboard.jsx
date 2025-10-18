import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsAPI, ordersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const SellerDashboard = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', 'my-listings'],
    queryFn: () => listingsAPI.getAll({ sellerId: 'me' }),
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'seller'],
    queryFn: () => ordersAPI.getMyOrders({ role: 'seller' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => listingsAPI.delete(id),
    onSuccess: () => {
      toast.success('Listing deleted');
      queryClient.invalidateQueries(['listings']);
      queryClient.invalidateQueries(['listings', 'my-listings']);
    },
    onError: (e) => {
      toast.error(e?.message || 'Failed to delete');
    }
  });

  const onDelete = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleteMutation.isPending) return;
    if (window.confirm('Delete this listing? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('sellerDashboard')}</h1>
        <Link to="/create-listing" className="btn btn-primary">+ {t('createListing')}</Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h3 className="text-sm text-gray-500 mb-1">{t('activeListings')}</h3>
          <p className="text-3xl font-bold">{listingsData?.listings?.length || 0}</p>
        </div>
        <div className="card">
          <h3 className="text-sm text-gray-500 mb-1">{t('pendingOrders')}</h3>
          <p className="text-3xl font-bold">{ordersData?.orders?.filter(o => o.status === 'requested').length || 0}</p>
        </div>
        <div className="card">
          <h3 className="text-sm text-gray-500 mb-1">{t('completed')}</h3>
          <p className="text-3xl font-bold">{ordersData?.orders?.filter(o => o.status === 'delivered').length || 0}</p>
        </div>
      </div>

      {/* My Listings */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{t('myListings')}</h2>
        {listingsLoading ? (
          <p>{t('loading')}</p>
        ) : listingsData?.listings?.length === 0 ? (
          <p className="text-gray-500">{t('noListings')}</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {listingsData?.listings?.map(listing => (
              <div key={listing._id} className="card hover:shadow-lg">
                <Link to={`/listings/${listing._id}`} className="block">
                  {listing.images?.[0] && <img src={listing.images[0].url} alt={listing.title} className="w-full h-32 object-contain bg-gray-50 rounded mb-2" />}
                  <h3 className="font-semibold truncate">{listing.title}</h3>
                </Link>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-primary-600 font-bold">{listing.price} ETB</p>
                  <span className="text-xs text-gray-500">{listing.status}</span>
                </div>
                <div className="flex items-center justify-end space-x-2 mt-3">
                  <Link to={`/listings/${listing._id}/edit`} className="btn btn-secondary px-3 py-1">{t('edit')}</Link>
                  <button onClick={(e) => onDelete(e, listing._id)} className="btn btn-danger px-3 py-1">
                    {deleteMutation.isPending ? '...' : t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-2xl font-bold mb-4">{t('recentOrders')}</h2>
        {ordersLoading ? (
          <p>{t('loading')}</p>
        ) : ordersData?.orders?.length === 0 ? (
          <p className="text-gray-500">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {ordersData?.orders?.slice(0, 5).map(order => (
              <Link key={order._id} to={`/orders/${order._id}`} className="card flex justify-between items-center hover:shadow-lg">
                <div>
                  <h4 className="font-semibold">{order.listingId?.title}</h4>
                  <p className="text-sm text-gray-500">{t('buyer')}: {order.buyerId?.name}</p>
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

