import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

const ROLES = [
  { value: '', label: 'Select your role' },
  { value: 'creator', label: 'Creator — I create content' },
  { value: 'agency', label: 'Agency — I manage creators' },
  { value: 'marketing', label: 'Marketing — I run campaigns' },
  { value: 'admin', label: 'Administrator' },
];

export default function Register() {
  const { register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.default_dashboard || '/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, user?.default_dashboard]);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const validate = () => {
    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      return 'Full name must be at least 2 characters.';
    if (!form.email) return 'Email is required.';
    if (!form.role) return 'Please select your role.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');
    try {
      const data = await register({
        fullName: form.fullName.trim(),
        email: form.email,
        password: form.password,
        role: form.role,
      });
      navigate(data.user?.default_dashboard || '/dashboard', { replace: true });
    } catch (err) {
      console.error('Registration failed:', err);
      const detail = err.response?.data?.detail;
      setError(
        detail ||
          (err.response?.status
            ? `Backend error (HTTP ${err.response.status}) — check the server logs.`
            : 'Network error — could not reach the backend. Make sure the server is running.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold text-slate-900">CreatorIQ</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Start tracking your creator analytics</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {error && (
            <div className="alert-error mb-5" role="alert">{error}</div>
          )}

          {/* Google OAuth 2.0 Sign Up */}
          <div className="mb-6">
            <GoogleSignInButton label="Sign up with Google" role={form.role} redirectPath="/dashboard" />
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Or register with email</span>
            </div>
          </div>

          <form id="register-form" onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="register-fullname" className="form-label">Full name</label>
              <input
                id="register-fullname"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={form.fullName}
                onChange={handleChange}
                className="form-input"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="form-label">Email address</label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                className="form-input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="register-role" className="form-label">Select Role</label>
              <select
                id="register-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                className="form-input"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="register-password" className="form-label">Password</label>
              <div className="relative">
                <input
                  id="register-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="form-input pr-10"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="form-label">Confirm password</label>
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                className="form-input"
                placeholder="Repeat your password"
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-1"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
