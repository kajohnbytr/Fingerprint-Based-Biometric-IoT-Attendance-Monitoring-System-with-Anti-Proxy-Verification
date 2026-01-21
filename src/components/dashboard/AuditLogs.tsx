import { Shield, Clock, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

const logs = [
  { id: 1, action: 'User Login', user: 'admin@university.edu', details: 'Successful login from IP 192.168.1.1', time: '2 minutes ago', status: 'Success' },
  { id: 2, action: 'Settings Updated', user: 'admin@university.edu', details: 'Changed "Late Tolerance" from 10 to 15 minutes', time: '1 hour ago', status: 'Success' },
  { id: 3, action: 'User Creation Failed', user: 'staff@university.edu', details: 'Failed to create user: Email already exists', time: '3 hours ago', status: 'Failed' },
  { id: 4, action: 'Report Exported', user: 'admin@university.edu', details: 'Exported Monthly Attendance Report (CSV)', time: '5 hours ago', status: 'Success' },
  { id: 5, action: 'Proxy Detected', user: 'System', details: 'Flagged suspicious activity for Student ID #23901', time: 'Yesterday', status: 'Warning' },
];

export function AuditLogs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Audit Logs</h1>
        <p className="text-neutral-500">Track system activity and user actions.</p>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input placeholder="Search logs..." className="pl-9" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Details</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-900">{log.action}</td>
                  <td className="px-6 py-4 text-neutral-600">{log.user}</td>
                  <td className="px-6 py-4 text-neutral-600 max-w-xs truncate" title={log.details}>{log.details}</td>
                  <td className="px-6 py-4 text-neutral-500 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {log.time}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Badge variant="outline" className={
                      log.status === 'Success' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                      log.status === 'Warning' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                      'border-red-200 text-red-700 bg-red-50'
                    }>
                      {log.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
