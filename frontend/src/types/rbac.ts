export type UserRole = 'student' | 'admin' | 'super_admin';

export const roleLabels: Record<UserRole, string> = {
  student: 'Student',
  admin: 'Admin (Teacher)',
  super_admin: 'Super Admin (Developer)',
};

export const panelLabels: Record<UserRole, string> = {
  student: 'Student Panel',
  admin: 'Admin Panel',
  super_admin: 'Super Admin Panel',
};
