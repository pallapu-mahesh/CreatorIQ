import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGoogle, loading } = useAuth();
  const [error, setError] = useState(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setError(`Google authorization was cancelled or denied: ${oauthError}`);
      return;
    }

    if (!code) {
      setError('Authorization code missing from Google OAuth response.');
      return;
    }

    if (loading) {
      return;
    }

    processedRef.current = true;
    const redirectUri =
      import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
      `${import.meta.env.VITE_FRONTEND_URL || window.location.origin}/auth/google/callback`;

    async function processLogin() {
      try {
        const data = await loginWithGoogle({ code, redirect_uri: redirectUri });
        navigate(data.user?.default_dashboard || '/dashboard', { replace: true });
      } catch (err) {
        console.error('Failed to complete Google sign-in:', err);
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        const message = detail
          ? detail
          : status
            ? `Backend error (HTTP ${status}) — check the server logs.`
            : 'Network error — could not reach the backend at ' +
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}. ` +
              'Make sure the backend server is running.';
        setError(message);
      }
    }

    processLogin();
  }, [searchParams, loginWithGoogle, loading, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
        {error ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Google Sign-In Failed</h2>
            <p className="text-sm text-slate-600 bg-red-50 border border-red-100 rounded-lg p-3 text-left leading-relaxed">
              {error}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="btn-primary w-full py-2.5 text-sm font-medium"
              >
                Return to Login
              </button>
              <Link
                to="/login"
                className="text-xs text-brand-600 hover:underline font-medium pt-1"
              >
                Log into CreatorIQ Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">Signing You In...</h2>
            <p className="text-sm text-slate-500">
              Please wait while we verify your Google credentials.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
