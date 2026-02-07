import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from './components/LoginForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { NotFound } from './components/NotFound';
import {
  AppReports,
  ArchiveRequests,
  AuditLogs,
  DashboardLayout,
  Overview,
  Reports,
  Settings,
  StudentAttendance,
  StudentProfile,
  UserManagement,
} from './components/dashboard';
import type { UserRole } from './types/rbac';
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  FileText,
  Shield,
  ClipboardList,
  UserCircle,
  MessageSquareWarning,
} from 'lucide-react';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

type NavItem = {
  id: string;
  label: string;
  icon: any;
};

type ViewRoute = {
  id: string;
  path: string;
  element: any;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'forgot'>('login');
  const [role, setRole] = useState<UserRole>('admin');
  const [currentView, setCurrentView] = useState('overview');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for existing session on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setIsLoadingAuth(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setRole(data.user.role);
            setCurrentView(navItemsByRole[data.user.role][0]?.id ?? 'overview');
            setIsAuthenticated(true);
            const defaultPath = viewRoutesByRole[data.user.role][0]?.path ?? '/';
            if (location.pathname === '/' || location.pathname === '/login/student' || location.pathname === '/login/admin' || location.pathname === '/login/super-admin') {
              navigate(defaultPath, { replace: true });
            }
          }
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoadingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setRole('admin');
      navigate('/');
    }
  };

  const navItemsByRole: Record<UserRole, NavItem[]> = useMemo(
    () => ({
      student: [
        { id: 'student-attendance', label: 'My Attendance', icon: ClipboardList },
        { id: 'student-profile', label: 'Profile & Security', icon: UserCircle },
        { id: 'student-report', label: 'Report an Issue', icon: MessageSquareWarning },
      ],
      admin: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'reports', label: 'Class Reports', icon: FileText },
        { id: 'archive-requests', label: 'Archive Requests', icon: ClipboardList },
      ],
      super_admin: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'reports', label: 'Reports & Analytics', icon: FileText },
        { id: 'archive-requests', label: 'Archive Requests', icon: ClipboardList },
        { id: 'settings', label: 'System Configuration', icon: SettingsIcon },
        { id: 'logs', label: 'Audit Logs', icon: Shield },
        { id: 'app-reports', label: 'App Reports', icon: MessageSquareWarning },
      ],
    }),
    []
  );

  const allowedViews = useMemo(
    () => new Set(navItemsByRole[role].map((item) => item.id)),
    [navItemsByRole, role]
  );

  const viewRoutesByRole = useMemo<Record<UserRole, ViewRoute[]>>(
    () => ({
      student: [
        { id: 'student-attendance', path: '/student/attendance', element: <StudentAttendance /> },
        { id: 'student-profile', path: '/student/profile', element: <StudentProfile /> },
        { id: 'student-report', path: '/student/report', element: <AppReports mode="submit" /> },
      ],
      admin: [
        { id: 'overview', path: '/admin/overview', element: <Overview /> },
        { id: 'reports', path: '/admin/reports', element: <Reports role={role} /> },
        {
          id: 'archive-requests',
          path: '/admin/archive-requests',
          element: <ArchiveRequests canReview={false} />,
        },
      ],
      super_admin: [
        { id: 'overview', path: '/super-admin/overview', element: <Overview /> },
        { id: 'users', path: '/super-admin/users', element: <UserManagement /> },
        { id: 'reports', path: '/super-admin/reports', element: <Reports role={role} /> },
        {
          id: 'archive-requests',
          path: '/super-admin/archive-requests',
          element: <ArchiveRequests canReview />,
        },
        {
          id: 'settings',
          path: '/super-admin/settings',
          element: (
            <Settings
              canManageMaintenance
              isMaintenanceMode={isMaintenanceMode}
              onToggleMaintenance={setIsMaintenanceMode}
            />
          ),
        },
        { id: 'logs', path: '/super-admin/logs', element: <AuditLogs /> },
        { id: 'app-reports', path: '/super-admin/app-reports', element: <AppReports mode="review" /> },
      ],
    }),
    [isMaintenanceMode, role]
  );

  const defaultPath = viewRoutesByRole[role][0]?.path ?? '/';

  useEffect(() => {
    if (!isAuthenticated || isLoadingAuth) {
      return;
    }
    const roleRoutes = viewRoutesByRole[role];
    const matchingRoute = roleRoutes.find((route) => route.path === location.pathname);
    if (matchingRoute) {
      if (matchingRoute.id !== currentView) {
        setCurrentView(matchingRoute.id);
      }
      return;
    }
    if (location.pathname !== defaultPath) {
      navigate(defaultPath, { replace: true });
    }
  }, [currentView, defaultPath, isAuthenticated, isLoadingAuth, location.pathname, navigate, role, viewRoutesByRole]);

  useEffect(() => {
    if (!allowedViews.has(currentView)) {
      setCurrentView(navItemsByRole[role][0]?.id ?? 'overview');
    }
  }, [allowedViews, currentView, navItemsByRole, role]);

  const handleNavigate = (viewId: string) => {
    const match = viewRoutesByRole[role].find((route) => route.id === viewId);
    if (!match) {
      return;
    }
    setCurrentView(viewId);
    navigate(match.path);
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
          <p className="mt-4 text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (isMaintenanceMode && role !== 'super_admin') {
      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-6">
          <div className="max-w-lg text-center bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-neutral-900">We'll be right back</h1>
            <p className="text-neutral-600 mt-3">
              The system is currently in maintenance mode. Please check back later.
            </p>
            <button
              className="mt-6 px-5 py-2.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }
    return (
      <DashboardLayout
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        role={role}
        navItems={navItemsByRole[role]}
        isMaintenanceMode={isMaintenanceMode}
        children={
          <Routes>
            {viewRoutesByRole[role].map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            <Route path="/student" element={<Navigate to={defaultPath} replace />} />
            <Route path="/admin" element={<Navigate to={defaultPath} replace />} />
            <Route path="/super-admin" element={<Navigate to={defaultPath} replace />} />
            <Route path="/login/student" element={<Navigate to={defaultPath} replace />} />
            <Route path="/login/admin" element={<Navigate to={defaultPath} replace />} />
            <Route path="/login/super-admin" element={<Navigate to={defaultPath} replace />} />
            <Route path="/" element={<Navigate to={defaultPath} replace />} />
            <Route 
              path="*" 
              element={
                <NotFound 
                  isAuthenticated={true} 
                  onGoHome={() => navigate(defaultPath)} 
                />
              } 
            />
          </Routes>
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Minimalist Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large Circle - Top Right */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-neutral-200/40 to-transparent blur-3xl"></div>
        
        {/* Medium Circle - Bottom Left */}
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-neutral-300/30 to-transparent blur-3xl"></div>
        
        {/* Small Circle - Center */}
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-neutral-200/20 blur-2xl"></div>
        
        {/* Subtle Grid Pattern */}
        <div 
        className="absolute inset-0 opacity-[0.02]" 
        style={{
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      ></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {authView === 'login' ? (
          <Routes>
            <Route
              path="/"
              element={
                <LoginForm
                  forcedRole="student"
                  showRoleSelector={false}
                  title="Student Login"
                  subtitle="Enter your credentials to continue"
                  onLogin={(nextRole) => {
                    setRole(nextRole);
                    setCurrentView(navItemsByRole[nextRole][0]?.id ?? 'overview');
                    setIsAuthenticated(true);
                    const nextDefault = viewRoutesByRole[nextRole][0]?.path ?? '/';
                    navigate(nextDefault);
                  }}
                  onForgot={() => setAuthView('forgot')}
                />
              }
            />
            <Route
              path="/login/student"
              element={
                <LoginForm
                  forcedRole="student"
                  showRoleSelector={false}
                  title="Student Login"
                  subtitle="Enter your credentials to continue"
                  onLogin={(nextRole) => {
                    setRole(nextRole);
                    setCurrentView(navItemsByRole[nextRole][0]?.id ?? 'overview');
                    setIsAuthenticated(true);
                    const nextDefault = viewRoutesByRole[nextRole][0]?.path ?? '/';
                    navigate(nextDefault);
                  }}
                  onForgot={() => setAuthView('forgot')}
                />
              }
            />
            <Route
              path="/login/admin"
              element={
                <LoginForm
                  forcedRole="admin"
                  showRoleSelector={false}
                  title="Admin Login"
                  subtitle="Enter your credentials to continue"
                  onLogin={(nextRole) => {
                    setRole(nextRole);
                    setCurrentView(navItemsByRole[nextRole][0]?.id ?? 'overview');
                    setIsAuthenticated(true);
                    const nextDefault = viewRoutesByRole[nextRole][0]?.path ?? '/';
                    navigate(nextDefault);
                  }}
                  onForgot={() => setAuthView('forgot')}
                />
              }
            />
            <Route
              path="/login/super-admin"
              element={
                <LoginForm
                  forcedRole="super_admin"
                  showRoleSelector={false}
                  title="Super Admin Login"
                  subtitle="Enter your credentials to continue"
                  onLogin={(nextRole) => {
                    setRole(nextRole);
                    setCurrentView(navItemsByRole[nextRole][0]?.id ?? 'overview');
                    setIsAuthenticated(true);
                    const nextDefault = viewRoutesByRole[nextRole][0]?.path ?? '/';
                    navigate(nextDefault);
                  }}
                />
              }
            />
            <Route path="*" element={<NotFound isAuthenticated={false} />} />
          </Routes>
        ) : (
          <ForgotPasswordForm onBack={() => setAuthView('login')} />
        )}
      </div>
    </div>
  );
}