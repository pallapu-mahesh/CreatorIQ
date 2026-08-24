import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { YouTubeProvider } from './context/YouTubeContext';
import { InstagramProvider } from './context/InstagramContext';
import { FacebookProvider } from './context/FacebookContext';
import { ActivePlatformProvider } from './context/ActivePlatformContext';
import { NotificationProvider } from './context/NotificationContext';
import { ConnectionGuardProvider } from './components/ConnectionGuard';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Public pages
import Landing          from './pages/Landing';
import Login            from './pages/Login';
import Register         from './pages/Register';
import GoogleCallback   from './pages/GoogleCallback';

// Dashboard pages
import Dashboard        from './pages/Dashboard';
import ContentAnalytics from './pages/ContentAnalytics';
import Audience         from './pages/Audience';
import GrowthTrends     from './pages/GrowthTrends';
import Revenue          from './pages/Revenue';
import SocialAccounts   from './pages/SocialAccounts';
import YouTubeIntegration from './pages/YouTubeIntegration';
import InstagramIntegration from './pages/InstagramIntegration';
import FacebookIntegration from './pages/FacebookIntegration';
import DemoPlatformIntegration from './pages/DemoPlatformIntegration';
import Reports          from './pages/Reports';
import Notifications    from './pages/Notifications';
import Profile          from './pages/Profile';
import Settings         from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ActivePlatformProvider>
          <NotificationProvider>
            <YouTubeProvider>
              <InstagramProvider>
                <FacebookProvider>
                  <ConnectionGuardProvider>
                    <Routes>
                    <Route path="/"                     element={<Landing />} />
                    <Route path="/login"                element={<Login />} />
                    <Route path="/register"             element={<Register />} />
                    <Route path="/auth/google/callback" element={<GoogleCallback />} />
                    <Route path="/social-accounts/instagram" element={<Navigate to="/dashboard/social/instagram" replace />} />

                    {/* ── Protected dashboard routes ─────────── */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index                    element={<Dashboard />} />
                      <Route path="content"           element={<ContentAnalytics />} />
                      <Route path="audience"          element={<Audience />} />
                      <Route path="growth"            element={<GrowthTrends />} />
                      <Route path="revenue"           element={<Revenue />} />
                      
                      {/* Social Accounts Hub & Platform Sub-pages */}
                      <Route path="social"            element={<SocialAccounts />} />
                      <Route path="social/youtube"    element={<YouTubeIntegration />} />
                      <Route path="social/instagram"  element={<InstagramIntegration />} />
                      <Route path="social/facebook"   element={<FacebookIntegration />} />
                      <Route path="social/linkedin"   element={<DemoPlatformIntegration platformId="linkedin" />} />
                      <Route path="social/twitter"    element={<DemoPlatformIntegration platformId="twitter" />} />

                      {/* Backwards-compatibility shortcuts */}
                      <Route path="youtube"           element={<Navigate to="/dashboard/social/youtube" replace />} />
                      <Route path="instagram"         element={<Navigate to="/dashboard/social/instagram" replace />} />

                      <Route path="reports"           element={<Reports />} />
                      <Route path="notifications"     element={<Notifications />} />
                      <Route path="profile"           element={<Profile />} />
                      <Route path="settings"          element={<Settings />} />
                    </Route>

                    {/* ── Catch-all ─────────────────────────── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </ConnectionGuardProvider>
              </FacebookProvider>
            </InstagramProvider>
          </YouTubeProvider>
          </NotificationProvider>
        </ActivePlatformProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

