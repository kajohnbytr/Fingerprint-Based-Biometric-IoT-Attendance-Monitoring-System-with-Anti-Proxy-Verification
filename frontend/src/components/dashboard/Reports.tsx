import React, { Fragment, useEffect, useState } from 'react';
import { 
  Download, 
  Filter, 
  ChevronDown,
  ChevronRight,
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

import { API_BASE_URL } from '../../config';

type ReportRow = { id: string; date: string; class: string; totalStudents: number; present: number; absent: number; late: number; status: string };
type BlockStudent = { id: string; name: string; idNumber: string; email: string; block: string; status: string };

function downloadCsv(rows: ReportRow[]) {
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
      const rate = row.totalStudents ? Math.round((row.present / row.totalStudents) * 100) : 0;
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
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [startDate, setStartDate] = useState(() => todayStr());
  const [endDate, setEndDate] = useState(() => todayStr());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [blockStudents, setBlockStudents] = useState<Record<string, BlockStudent[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  const fetchBlockDetails = async (row: ReportRow) => {
    const key = row.id;
    if (blockStudents[key]) return;
    setLoadingDetails((p) => ({ ...p, [key]: true }));
    try {
      const params = new URLSearchParams({ date: row.date, block: row.class });
      const res = await fetch(`${API_BASE_URL}/api/admin/reports/block-details?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setBlockStudents((p) => ({ ...p, [key]: data.students || [] }));
    } catch {
      setBlockStudents((p) => ({ ...p, [key]: [] }));
    } finally {
      setLoadingDetails((p) => ({ ...p, [key]: false }));
    }
  };

  const toggleRow = (row: ReportRow) => {
    const key = row.id;
    if (expandedId === key) {
      setExpandedId(null);
    } else {
      setExpandedId(key);
      fetchBlockDetails(row);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    setError(null);
    setReportData([]);
    setExpandedId(null);
    setBlockStudents({});
    setIsLoading(true);
    const fetchReports = async () => {
      try {
        const params = new URLSearchParams({ startDate, endDate });
        const res = await fetch(`${API_BASE_URL}/api/admin/reports?${params}`, {
          credentials: 'include',
          signal: ac.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load reports');
        const rows = (data.reports || []).map((r: any) => ({
          id: r.id,
          date: r.date,
          class: r.class,
          totalStudents: r.totalStudents ?? 0,
          present: r.present ?? 0,
          absent: r.absent ?? 0,
          late: r.late ?? 0,
          status: r.status || 'Average',
        }));
        const seen = new Set<string>();
        const uniqueRows = rows.filter((r) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
        setReportData(uniqueRows);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      } finally {
        if (!ac.signal.aborted) setIsLoading(false);
      }
    };
    fetchReports();
    return () => ac.abort();
  }, [startDate, endDate]);

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
              <Input type="date" className="w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <span className="text-neutral-400">-</span>
              <Input type="date" className="w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Report Table */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-neutral-500 py-8">Loading reports...</TableCell>
              </TableRow>
            ) : reportData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-neutral-500 py-8">No reports found for the selected date range.</TableCell>
              </TableRow>
            ) : (
              reportData.map((row) => {
                const rate = row.totalStudents
                  ? Math.round((row.present / row.totalStudents) * 100)
                  : 0;
                const isExpanded = expandedId === row.id;
                const students = blockStudents[row.id] ?? [];
                const isLoadingDetails = loadingDetails[row.id];
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-neutral-50 transition-colors"
                      onClick={() => toggleRow(row)}
                    >
                      <TableCell className="w-8 py-2">
                        <button type="button" className="p-0.5 hover:bg-neutral-100 rounded">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-neutral-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-neutral-500" />
                          )}
                        </button>
                      </TableCell>
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
                        <Badge
                          variant="outline"
                          className={
                            row.status === 'Excellent'
                              ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                              : row.status === 'Good'
                                ? 'border-blue-200 text-blue-700 bg-blue-50'
                                : 'border-amber-200 text-amber-700 bg-amber-50'
                          }
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-neutral-50 p-0">
                          <div className="px-6 py-4 border-t border-neutral-100">
                            <h4 className="text-sm font-semibold text-neutral-700 mb-3">
                              Students in {row.class} — {row.date}
                            </h4>
                            {isLoadingDetails ? (
                              <p className="text-sm text-neutral-500 py-4">Loading students...</p>
                            ) : students.length === 0 ? (
                              <p className="text-sm text-neutral-500 py-4">No students in this block.</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent border-b border-neutral-200">
                                    <TableHead className="font-medium">Name</TableHead>
                                    <TableHead className="font-medium">ID Number</TableHead>
                                    <TableHead className="font-medium">Email</TableHead>
                                    <TableHead className="font-medium">Block</TableHead>
                                    <TableHead className="font-medium text-right">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {students.map((s) => (
                                    <TableRow key={s.id} className="hover:bg-white/80 border-b border-neutral-100">
                                      <TableCell className="font-medium">{s.name}</TableCell>
                                      <TableCell className="text-neutral-600">{s.idNumber ?? '—'}</TableCell>
                                      <TableCell className="text-neutral-600">{s.email}</TableCell>
                                      <TableCell>{s.block}</TableCell>
                                      <TableCell className="text-right">
                                        <Badge
                                          variant="outline"
                                          className={
                                            s.status === 'Present'
                                              ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                              : s.status === 'Late'
                                                ? 'border-amber-200 text-amber-700 bg-amber-50'
                                                : s.status === 'Absent'
                                                  ? 'border-red-200 text-red-700 bg-red-50'
                                                  : 'border-neutral-200 text-neutral-600 bg-neutral-50'
                                          }
                                        >
                                          {s.status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
