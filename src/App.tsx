import { useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { Overview } from './components/dashboard/Overview';
import { UserManagement } from './components/dashboard/UserManagement';
import { Reports } from './components/dashboard/Reports';
import { Settings } from './components/dashboard/Settings';
import { AuditLogs } from './components/dashboard/AuditLogs';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'forgot'>('login');
  const [currentView, setCurrentView] = useState('overview');

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <Overview />;
      case 'users':
        return <UserManagement />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'logs':
        return <AuditLogs />;
      default:
        return <Overview />;
    }
  };

  if (isAuthenticated) {
    return (
      <DashboardLayout
        currentView={currentView}
        onNavigate={setCurrentView}
        onLogout={() => setIsAuthenticated(false)}
      >
        {renderView()}
      </DashboardLayout>
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
          <LoginForm
            onLogin={() => setIsAuthenticated(true)}
            onForgot={() => setAuthView('forgot')}
          />
        ) : (
          <ForgotPasswordForm onBack={() => setAuthView('login')} />
        )}
      </div>
    </div>
  );
}
