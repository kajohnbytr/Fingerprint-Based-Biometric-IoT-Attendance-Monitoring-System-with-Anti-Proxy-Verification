import { Archive, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';

const requests = [
  {
    id: 'AR-2026-004',
    student: 'Maria Santos',
    block: 'Year 3 - Block 2',
    reason: 'Repeated absenteeism',
    status: 'Pending',
    requestedBy: 'teacher.santos@campus.edu',
  },
  {
    id: 'AR-2026-005',
    student: 'Luis Gomez',
    block: 'Year 1 - Block 9',
    reason: 'Transferred to another school',
    status: 'Reviewed',
    requestedBy: 'teacher.gomez@campus.edu',
  },
];

export function ArchiveRequests({ canReview }: { canReview: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Archive Requests</h1>
        <p className="text-neutral-500">Report students who need to be archived.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit a Request</CardTitle>
          <CardDescription>Send a request to the super admin team (not delete).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-name">Student Name</Label>
              <Input id="student-name" placeholder="Student full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-block">Block / Section</Label>
              <Input id="student-block" placeholder="Year 2 - Block 7" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="archive-reason">Reason</Label>
            <Textarea id="archive-reason" rows={4} placeholder="Explain why the student should be archived." />
          </div>
          <Button className="bg-neutral-900 hover:bg-neutral-800 gap-2">
            <Send className="w-4 h-4" />
            Send Request
          </Button>
        </CardContent>
      </Card>

      {canReview && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">Recent Requests</h2>
          <div className="grid gap-4">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{request.student}</CardTitle>
                    <CardDescription>
                      {request.block} • {request.requestedBy}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{request.status}</Badge>
                </CardHeader>
                <CardContent className="flex items-center gap-2 text-sm text-neutral-600">
                  <Archive className="w-4 h-4" />
                  {request.reason}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
