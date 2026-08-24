import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useActivePlatform } from '../context/ActivePlatformContext';
import { User, Mail, Shield, Calendar, Pencil, X, Check, Link2, Activity, Camera } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR_SIZE = 512;

const ROLE_OPTIONS = ['creator', 'agency', 'marketing', 'admin'];

const formatRole = (role) =>
  role ? role.charAt(0).toUpperCase() + role.slice(1) : '—';

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const fileToAvatarDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('The selected file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_AVATAR_SIZE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { activePlatform, PLATFORM_REGISTRY } = useActivePlatform();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageError, setImageError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    role: user?.role || 'creator',
  });

  const fileInputRef = useRef(null);

  const startEditing = () => {
    setForm({
      fullName: user?.full_name || '',
      email: user?.email || '',
      role: user?.role || 'creator',
    });
    setPreviewImage(null);
    setError('');
    setSuccess('');
    setImageError('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setPreviewImage(null);
    setIsEditing(false);
    setError('');
    setSuccess('');
    setImageError('');
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleChangeImage = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file (PNG, JPG, etc.).');
      return;
    }
    setImageError('');
    fileToAvatarDataUrl(file)
      .then(setPreviewImage)
      .catch(() => setImageError('Could not load the selected image.'));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const fullName = form.fullName.trim();
    const email = form.email.trim();

    if (fullName.length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (!email) {
      setError('Email is required.');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const avatarUrl = previewImage ?? user?.avatar_url ?? null;

    setSaving(true);
    setError('');
    setSuccess('');
    setImageError('');
    try {
      await updateProfile({ fullName, email, role: form.role, avatarUrl });
      setSuccess('Profile updated successfully.');
      setPreviewImage(null);
      setIsEditing(false);
    } catch (err) {
      console.error('Profile update failed:', err);
      const detail = err.response?.data?.detail;
      setError(
        detail ||
          (err.response?.status
            ? `Backend error (HTTP ${err.response.status}) — check the server logs.`
            : 'Network error — could not reach the backend. Make sure the server is running.')
      );
    } finally {
      setSaving(false);
    }
  };

  const isActive = user?.is_active;
  const accountStatus = {
    label: isActive ? 'Active' : 'Inactive',
    badgeClass: isActive ? 'badge-green' : 'badge-red',
  };

  const avatarSrc = previewImage || user?.avatar_url;
  const avatarInitial = user?.full_name?.[0]?.toUpperCase() ?? 'U';

  const fields = [
    { icon: User,     label: 'Full Name',     value: user?.full_name },
    { icon: Mail,     label: 'Email',         value: user?.email },
    { icon: Shield,   label: 'Role',          value: formatRole(user?.role) },
    { icon: Calendar, label: 'Member Since',  value: formatDate(user?.created_at) },
    {
      icon: Activity,
      label: 'Account Status',
      render: () => (
        <span className={`badge ${accountStatus.badgeClass}`}>{accountStatus.label}</span>
      ),
    },
  ];

  const platformEntries = Object.values(PLATFORM_REGISTRY);

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Your account information</p>
        </div>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-[1.02] self-start sm:self-auto"
          >
            <Pencil size={14} /> Edit Profile
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Left column — Profile information */}
        <div className="space-y-4 max-w-2xl">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChangeImage}
          />

          {success && (
            <div className="alert-success mb-4" role="alert">{success}</div>
          )}
          {error && (
            <div className="alert-error mb-4" role="alert">{error}</div>
          )}

          {/* Avatar + name */}
          <div className="card p-6 flex items-center gap-5 mb-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={user?.full_name || 'Profile'} className="w-16 h-16 object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-brand-700">{avatarInitial}</span>
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow hover:bg-brand-700 transition-colors"
                  title="Change profile image"
                  aria-label="Change profile image"
                >
                  <Camera size={12} />
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.full_name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              <span className="badge badge-blue mt-1 capitalize">{user?.role}</span>
              <span className={`badge ${accountStatus.badgeClass} ml-2`}>{accountStatus.label}</span>
            </div>
          </div>

          {imageError && (
            <p className="text-xs text-red-600 mb-4" role="alert">{imageError}</p>
          )}

          {isEditing ? (
            /* Edit form — Full Name and Email editable, image via Change button */
            <form onSubmit={handleSave} noValidate className="card p-6 space-y-5">
              <div>
                <label htmlFor="profile-fullname" className="form-label">Full Name</label>
                <input
                  id="profile-fullname"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="form-label">Email</label>
                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="profile-role" className="form-label">Role</label>
                <select
                  id="profile-role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="form-input"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>{formatRole(role)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs font-bold rounded-xl px-5 py-2.5"
                >
                  <Check size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Info fields */
            <div className="card divide-y divide-slate-100 dark:divide-slate-800">
              {fields.map(({ icon: Icon, label, value, render }) => (
                <div key={label} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                    {render ? render() : <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{value ?? '—'}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isEditing && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
              Click “Edit Profile” to update your name, email, or profile image.
            </p>
          )}
        </div>

        {/* Right column — Connected Platforms */}
        <div className="min-w-0">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                <Link2 size={15} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Connected Platforms</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Platforms linked to your account</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {platformEntries.map((meta) => {
                const isConnected = activePlatform === meta.id;
                return (
                  <div
                    key={meta.id}
                    className={`rounded-xl border p-4 flex flex-col items-start gap-2.5 transition-colors ${
                      isConnected
                        ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/50'
                        : 'border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 ${meta.accentBg}`}>
                      {meta.icon ? <meta.icon className="w-5 h-5" /> : null}
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{meta.displayName}</p>
                      <span className={`badge mt-1 ${isConnected ? 'badge-green' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}