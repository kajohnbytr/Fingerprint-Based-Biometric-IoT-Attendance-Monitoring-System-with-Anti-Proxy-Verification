import { 
  Download, 
  Filter, 
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Badge } from '../ui/badge';
import type { UserRole } from '../../types/rbac';

const reportData = [
  { id: 1, date: '2023-10-25', class: 'Year 1 - Block 3', totalStudents: 45, present: 42, absent: 3, late: 1, status: 'Good' },
  { id: 2, date: '2023-10-25', class: 'Year 2 - Block 7', totalStudents: 30, present: 25, absent: 5, late: 2, status: 'Average' },
  { id: 3, date: '2023-10-25', class: 'Year 3 - Block 2', totalStudents: 50, present: 48, absent: 2, late: 0, status: 'Excellent' },
  { id: 4, date: '2023-10-24', class: 'Year 4 - Block 11', totalStudents: 45, present: 40, absent: 5, late: 3, status: 'Average' },
  { id: 5, date: '2023-10-24', class: 'Year 1 - Block 9', totalStudents: 60, present: 58, absent: 2, late: 1, status: 'Excellent' },
];

function downloadCsv(rows: typeof reportData) {
  const headers = [
    'Date',
    'Year / Block',
    'Total Students',
    'Present',
    'Absent',
    'Late',
    'Attendance Rate',
    'Status',
  ];

  const escapeCsv = (value: string | number) => {
    const text = String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => {
      const rate = Math.round((row.present / row.totalStudents) * 100);
      return [
        row.date,
        row.class,
        row.totalStudents,
        row.present,
        row.absent,
        row.late,
        `${rate}%`,
        row.status,
      ]
        .map(escapeCsv)
        .join(',');
    }),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function Reports({ role }: { role: UserRole }) {
  const title = role === 'admin' ? 'Class Reports' : 'Reports & Analytics';
  const description =
    role === 'admin'
      ? 'Summary reports for the classes you handle.'
      : 'Generate and export attendance reports.';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        <p className="text-neutral-500">{description}</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full md:w-auto flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Date Range</label>
            <div className="flex items-center gap-2">
              <Input type="date" className="w-full" />
              <span className="text-neutral-400">-</span>
              <Input type="date" className="w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Report Type</label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="daily">Daily Attendance</option>
              <option value="weekly">Weekly Summary</option>
              <option value="monthly">Monthly Overview</option>
              <option value="student">Student Performance</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" className="gap-2 flex-1 md:flex-none">
            <Filter className="w-4 h-4" />
            More Filters
          </Button>
          {role !== 'student' && (
            <Button
              className="bg-neutral-900 hover:bg-neutral-800 gap-2 flex-1 md:flex-none"
              onClick={() => downloadCsv(reportData)}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Year / Block</TableHead>
              <TableHead className="text-center">Total Students</TableHead>
              <TableHead className="text-center">Present</TableHead>
              <TableHead className="text-center">Absent</TableHead>
              <TableHead className="text-center">Late</TableHead>
              <TableHead className="text-center">Attendance Rate</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.map((row) => {
              const rate = Math.round((row.present / row.totalStudents) * 100);
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.date}</TableCell>
                  <TableCell>{row.class}</TableCell>
                  <TableCell className="text-center">{row.totalStudents}</TableCell>
                  <TableCell className="text-center text-emerald-600 font-medium">{row.present}</TableCell>
                  <TableCell className="text-center text-red-600 font-medium">{row.absent}</TableCell>
                  <TableCell className="text-center text-amber-600 font-medium">{row.late}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} 
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-500">{rate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={
                      row.status === 'Excellent' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                      row.status === 'Good' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                      'border-amber-200 text-amber-700 bg-amber-50'
                    }>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
