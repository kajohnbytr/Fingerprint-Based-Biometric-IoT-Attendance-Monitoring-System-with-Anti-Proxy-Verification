import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const attendanceRows = [
  { date: '2026-01-25', status: 'Present', time: '08:05 AM', note: 'On time' },
  { date: '2026-01-24', status: 'Late', time: '08:18 AM', note: 'Traffic delay' },
  { date: '2026-01-23', status: 'Present', time: '08:02 AM', note: 'On time' },
  { date: '2026-01-22', status: 'Absent', time: '-', note: 'Sick leave' },
];

export function StudentAttendance() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Attendance</h1>
        <p className="text-neutral-500">Track your daily attendance and status history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-neutral-500">Present Days</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
            18
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-neutral-500">Late Days</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold text-amber-600">
            <Clock className="w-5 h-5" />
            2
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-neutral-500">Absent Days</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold text-red-600">
            <XCircle className="w-5 h-5" />
            1
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-in Time</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceRows.map((row) => (
              <TableRow key={row.date}>
                <TableCell className="font-medium">{row.date}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      row.status === 'Present'
                        ? 'bg-emerald-50 text-emerald-700'
                        : row.status === 'Late'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {row.status}
                  </span>
                </TableCell>
                <TableCell>{row.time}</TableCell>
                <TableCell className="text-neutral-500">{row.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
