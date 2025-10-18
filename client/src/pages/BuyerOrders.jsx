import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ordersAPI } from '../services/api';
import { useTranslation } from 'react-i18next';

const BuyerOrders = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'buyer'],
    queryFn: () => ordersAPI.getMyOrders({ role: 'buyer' }),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('myOrders')}</h1>

      {isLoading ? (
        <p>{t('loading')}</p>
      ) : data?.orders?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No orders yet.</p>
          <Link to="/search" className="btn btn-primary">{t('browseListings')}</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.orders?.map(order => (
            <Link key={order._id} to={`/orders/${order._id}`} className="card flex items-center space-x-4 hover:shadow-lg">
              {order.listingId?.images?.[0] && (
                <img src={order.listingId.images[0].url} alt="" className="w-24 h-24 object-contain bg-gray-50 rounded" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{order.listingId?.title}</h3>
                <p className="text-gray-600">Seller: {order.sellerId?.name}</p>
                <p className="text-sm text-gray-500">Created: {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary-600">{order.price_agreed} {order.currency}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs mt-2 ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'disputed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerOrders;

