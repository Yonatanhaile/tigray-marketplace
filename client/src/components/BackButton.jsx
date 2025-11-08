import { useNavigate } from 'react-router-dom';

const BackButton = ({ className = '' }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-soft)] rounded-lg transition-all font-medium ${className}`}
      title="Go back"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span>Back</span>
    </button>
  );
};

export default BackButton;

