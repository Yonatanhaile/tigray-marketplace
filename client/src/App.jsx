import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import SellerDashboard from './pages/SellerDashboard';
import BuyerOrders from './pages/BuyerOrders';
import OrderDetail from './pages/OrderDetail';
import Messages from './pages/Messages';
import AllMessages from './pages/AllMessages';
import SellerProfile from './pages/SellerProfile';
import AdminPanel from './pages/AdminPanel';
import Search from './pages/Search';

// Protected route wrapper
const ProtectedRoute = ({ children, requireAdmin = false, requireSeller = false }) => {
  const { isAuthenticated, isAdmin, isSeller, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" />;
  }

  if (requireSeller && !isSeller) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Public routes */}
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="search" element={<Search />} />
        <Route path="listings/:id" element={<ListingDetail />} />
        <Route path="sellers/:sellerId" element={<SellerProfile />} />

        {/* Protected routes */}
        <Route
          path="create-listing"
          element={
            <ProtectedRoute requireSeller>
              <CreateListing />
            </ProtectedRoute>
          }
        />
        <Route
          path="listings/:id/edit"
          element={
            <ProtectedRoute requireSeller>
              <EditListing />
            </ProtectedRoute>
          }
        />
        <Route
          path="seller-dashboard"
          element={
            <ProtectedRoute requireSeller>
              <SellerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <BuyerOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="messages"
          element={
            <ProtectedRoute>
              <AllMessages />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:orderId/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;

