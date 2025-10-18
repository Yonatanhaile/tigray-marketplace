import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-primary-600 mb-3">404</h1>
        <p className="text-lg text-gray-600 mb-6">The page you’re looking for doesn’t exist.</p>
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    </div>
  );
};

export default NotFound;


