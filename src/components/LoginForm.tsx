import { useEffect, useState } from 'react';
import { Lock, Mail, Shield, User } from 'lucide-react';
import { roleLabels, type UserRole } from '../types/rbac';

export function LoginForm({
  onLogin,
  onForgot,
  forcedRole,
  showRoleSelector = true,
  title = 'Welcome Back',
  subtitle = 'Sign in to access your dashboard',
}: {
  onLogin?: (role: UserRole) => void;
  onForgot?: () => void;
  forcedRole?: UserRole;
  showRoleSelector?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(forcedRole ?? 'student');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (forcedRole) {
      setRole(forcedRole);
    }
  }, [forcedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      console.log('Login attempted with:', { email, password, role });
      setIsLoading(false);
      if (onLogin) {
        onLogin(role);
      }
    }, 1500);
  };

  const roles = [
    { key: 'student', label: 'Student', icon: <User className="h-5 w-5 mb-1" /> },
    { key: 'admin', label: 'Admin', icon: <Shield className="h-5 w-5 mb-1" /> },
    { key: 'super_admin', label: 'Super Admin', icon: <Shield className="h-5 w-5 mb-1" /> },
  ];

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-md border border-neutral-200 p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-900 mx-auto">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
          <p className="text-neutral-500 text-sm">{subtitle}</p>
        </div>

        {/* Role Selector */}
        {showRoleSelector && (
          <div className="relative flex justify-center mb-6">
            <div className="flex w-full border border-neutral-200 rounded-lg overflow-hidden bg-white/30 backdrop-blur-md shadow-inner">
              {roles.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key as UserRole)}
                  className={`
                    flex-1 flex flex-col items-center justify-center py-3 text-xs font-light text-neutral-700 transition-all duration-200
                    ${role === r.key ? 'bg-black/10 shadow-md' : 'bg-transparent'}
                  `}
                >
                  {r.icon}
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  role === 'student'
                    ? 'student@university.edu.ph'
                    : role === 'admin'
                    ? 'admin@example.com'
                    : 'superadmin@example.com'
                }
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-neutral-900/10 cursor-pointer"
              />
              <span className="ml-2 text-sm text-neutral-600 group-hover:text-neutral-900 transition-colors">
                Remember me
              </span>
            </label>
            <button
              type="button"
              onClick={onForgot}
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 focus:ring-4 focus:ring-neutral-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-neutral-200">
          <p className="text-center text-sm text-neutral-500">
            Authorized access only. Your role controls available features.
          </p>
        </div>
      </div>
    </div>
  );
}
