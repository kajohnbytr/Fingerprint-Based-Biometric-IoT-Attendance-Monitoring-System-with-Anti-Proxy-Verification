import { MailWarning, MessageSquareWarning } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';

const mockReports = [
  {
    id: 'REP-2026-001',
    title: 'Login timeout on mobile',
    severity: 'High',
    status: 'Open',
    submittedBy: 'student01@campus.edu',
    date: '2026-01-24',
  },
  {
    id: 'REP-2026-002',
    title: 'Attendance chart not loading',
    severity: 'Medium',
    status: 'Investigating',
    submittedBy: 'student15@campus.edu',
    date: '2026-01-22',
  },
];

export function AppReports({ mode }: { mode: 'submit' | 'review' }) {
  if (mode === 'review') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">App Reports</h1>
          <p className="text-neutral-500">Review issues submitted by students.</p>
        </div>

        <div className="grid gap-4">
          {mockReports.map((report) => (
            <Card key={report.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription>
                    {report.id} • {report.submittedBy} • {report.date}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="capitalize">
                  {report.status}
                </Badge>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-neutral-600">
                <MailWarning className="w-4 h-4" />
                Severity: <span className="font-medium text-neutral-900">{report.severity}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Report an Issue</h1>
        <p className="text-neutral-500">Send a report directly to the super admin team.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issue Details</CardTitle>
          <CardDescription>Please describe the issue clearly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-title">Title</Label>
            <Input id="report-title" placeholder="Example: QR scanner not opening" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-severity">Severity</Label>
            <select
              id="report-severity"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-description">Description</Label>
            <Textarea id="report-description" rows={5} placeholder="Provide steps to reproduce, expected behavior, and actual behavior." />
          </div>
        </CardContent>
        <CardContent>
          <Button className="bg-neutral-900 hover:bg-neutral-800 gap-2">
            <MessageSquareWarning className="w-4 h-4" />
            Send to Super Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
