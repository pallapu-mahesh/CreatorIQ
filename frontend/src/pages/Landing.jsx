import { Link } from 'react-router-dom';
import {
  Zap, BarChart2, Users, TrendingUp, Share2,
  ArrowRight, CheckCircle
} from 'lucide-react';
import {
  YouTubeIcon, InstagramIcon, FacebookIcon, LinkedInIcon, XIcon
} from '../components/PlatformBrandIcon';

const features = [
  {
    icon: BarChart2,
    title: 'Content Analytics',
    desc: 'Track views, watch time, engagement rate and performance across all your content in one place.',
  },
  {
    icon: Users,
    title: 'Audience Insights',
    desc: 'Understand your audience demographics, geography, and behaviour patterns to grow smarter.',
  },
  {
    icon: TrendingUp,
    title: 'Growth Trends',
    desc: 'Visualise follower growth, reach, and engagement trends over time with interactive charts.',
  },
  {
    icon: Share2,
    title: 'Multi-Platform',
    desc: 'Connect YouTube, Instagram and Facebook — unified analytics without switching tabs.',
  },
];

const platforms = [
  { name: 'YouTube', color: 'bg-red-100 text-red-600', icon: YouTubeIcon },
  { name: 'Instagram', color: 'bg-pink-100 text-pink-600', icon: InstagramIcon },
  { name: 'Facebook', color: 'bg-blue-100 text-blue-600', icon: FacebookIcon },
  { name: 'LinkedIn', color: 'bg-sky-100 text-sky-700', icon: LinkedInIcon },
  { name: 'X', color: 'bg-slate-100 text-slate-900', icon: XIcon },
];

const checks = [
  'Real-time analytics dashboard',
  'Multi-platform integrations',
  'Revenue & monetisation tracking',
  'Automated reports',
  'Role-based team access',
  'ML-powered recommendations (coming soon)',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Navbar ─────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-bold text-slate-900">CreatorIQ</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-slate-600 text-sm font-medium">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 bg-gradient-to-b from-slate-50 to-white">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight max-w-3xl leading-tight">
          Turn Your Creator Data Into Your Next Big Move.{' '}
          <span className="text-brand-600">Creator Analytics</span>
        </h1>
        <p className="mt-5 text-lg text-slate-500 max-w-xl leading-relaxed">
          CreatorIQ connects your YouTube, Instagram, and Facebook accounts to give
          you a single, powerful view of your content performance, audience, and revenue.
        </p>
        <div className="mt-8 flex items-center gap-3 flex-wrap justify-center">
          <Link to="/register" className="btn-primary gap-2 px-6 py-2.5">
            Start for free <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn-ghost text-slate-700 px-6 py-2.5 border border-slate-200 rounded-lg">
            Sign in to dashboard
          </Link>
        </div>

        {/* Platform badges */}
        <div className="mt-10 flex items-center gap-3">
          {platforms.map(({ name, color, icon: Icon }) => (
            <span key={name} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${color}`}>
              <Icon className="w-3.5 h-3.5" /> {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────── */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900">Everything you need to grow</h2>
            <p className="text-slate-500 mt-2 text-sm">Built for creators, agencies, and marketing teams.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-5 hover:shadow-md transition-shadow">
                <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center mb-4">
                  <Icon size={18} className="text-brand-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Checklist ──────────────────────────── */}
      <section className="py-16 bg-slate-50 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Built with a professional stack</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-left">
            {checks.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-brand-600 shrink-0" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
          <Link to="/register" className="btn-primary mt-10 px-8 py-2.5 inline-flex">
            Create your account
          </Link>
        </div>
      </section>
    </div>
  );
}
