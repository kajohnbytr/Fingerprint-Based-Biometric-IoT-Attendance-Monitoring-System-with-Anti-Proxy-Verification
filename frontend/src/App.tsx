import React, { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import { LoginForm } from './components/LoginForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
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

type NavItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'forgot'>('login');
  const [role, setRole] = useState<UserRole>('admin');
  const [currentView, setCurrentView] = useState('overview');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

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

  useEffect(() => {
    if (!allowedViews.has(currentView)) {
      setCurrentView(navItemsByRole[role][0]?.id ?? 'overview');
    }
  }, [allowedViews, currentView, navItemsByRole, role]);

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <Overview />;
      case 'users':
        return <UserManagement />;
      case 'reports':
        return <Reports role={role} />;
      case 'settings':
        return (
          <Settings
            canManageMaintenance={role === 'super_admin'}
            isMaintenanceMode={isMaintenanceMode}
            onToggleMaintenance={setIsMaintenanceMode}
          />
        );
      case 'logs':
        return <AuditLogs />;
      case 'student-attendance':
        return <StudentAttendance />;
      case 'student-profile':
        return <StudentProfile />;
      case 'student-report':
        return <AppReports mode="submit" />;
      case 'archive-requests':
        return <ArchiveRequests canReview={role === 'super_admin'} />;
      case 'app-reports':
        return <AppReports mode="review" />;
      default:
        return <Overview />;
    }
  };

  if (isAuthenticated) {
    if (isMaintenanceMode && role !== 'super_admin') {
      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-6">
          <div className="max-w-lg text-center bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-neutral-900">We’ll be right back</h1>
            <p className="text-neutral-600 mt-3">
              The system is currently in maintenance mode. Please check back later.
            </p>
            <button
              className="mt-6 px-5 py-2.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
              onClick={() => setIsAuthenticated(false)}
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
        onNavigate={setCurrentView}
        onLogout={() => setIsAuthenticated(false)}
        role={role}
        navItems={navItemsByRole[role]}
        isMaintenanceMode={isMaintenanceMode}
        children={renderView()}
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
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {authView === 'login' ? (
          <Routes>
            <Route
              path="/"
              element={
                <LoginForm
                  onLogin={(nextRole) => {
                    setRole(nextRole);
                    setCurrentView(navItemsByRole[nextRole][0]?.id ?? 'overview');
                    setIsAuthenticated(true);
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
                  }}
                />
              }
            />
            <Route
              path="/login"
              element={
                <LoginForm
                  onLogin={(nextRole) => {
                    setRole(nextRole);
                    setCurrentView(navItemsByRole[nextRole][0]?.id ?? 'overview');
                    setIsAuthenticated(true);
                  }}
                  onForgot={() => setAuthView('forgot')}
                />
              }
            />
          </Routes>
        ) : (
          <ForgotPasswordForm onBack={() => setAuthView('login')} />
        )}
      </div>
    </div>
  );
}
