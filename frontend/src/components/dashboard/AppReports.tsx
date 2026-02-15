import React, { useState } from 'react';
import { MailWarning, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

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

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sanitizeText = (value: string) =>
    value
      .replace(/[<>`$]/g, '')
      .replace(/[{}\[\]]/g, '')
      .replace(/\s{3,}/g, ' ')
      .trimStart();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!subject || !category || !description) {
      setError('Please select a subject, category, and provide a description.');
      return;
    }

    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/students/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subject,
          category,
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSuccessMessage('Report submitted successfully.');
      setSubject('');
      setCategory('');
      setDescription('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">File a Report</h1>
        <p className="text-neutral-500">Submit bugs or issues directly to the administration.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {successMessage && <p className="text-sm text-emerald-600">{successMessage}</p>}
            <div className="space-y-2">
              <Label htmlFor="report-subject">Subject</Label>
              <select
                id="report-subject"
                name="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="" disabled>
                  Select a subject
                </option>
                <option value="attendance-not-updated">Attendance not updated</option>
                <option value="app-crash">App crash</option>
                <option value="login-issue">Login issue</option>
                <option value="slow-performance">Slow performance</option>
                <option value="sync-problem">Sync problem</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-category">Category</Label>
              <select
                id="report-category"
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="" disabled>
                  Select a category
                </option>
                <option value="attendance">Attendance</option>
                <option value="auth">Authentication</option>
                <option value="performance">Performance</option>
                <option value="ui">UI/UX</option>
                <option value="data">Data/Sync</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-description">Description</Label>
              <Textarea
                id="report-description"
                name="description"
                value={description}
                onChange={(event) => setDescription(sanitizeText(event.target.value))}
                rows={5}
                maxLength={500}
                minLength={10}
                inputMode="text"
                autoComplete="off"
                spellCheck
                placeholder="Please describe the issue in detail..."
                disabled={isSubmitting}
              />
            </div>
            <Button
              className="w-full bg-neutral-900 hover:bg-neutral-800 gap-2"
              type="submit"
              disabled={isSubmitting}
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
