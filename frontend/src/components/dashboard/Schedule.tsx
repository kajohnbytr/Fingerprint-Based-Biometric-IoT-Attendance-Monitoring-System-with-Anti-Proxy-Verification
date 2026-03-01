import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { API_BASE_URL } from '../../config';
import type { UserRole } from '../../types/rbac';

type CourseEntry = { courseName: string; schedule: string; room: string };
type BlockEntry = { block: string; studentCount: number; courses: CourseEntry[] };

export function Schedule({ role }: { role: UserRole }) {
  const navigate = useNavigate();
  const [teacherName, setTeacherName] = useState('');
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setError(null);
    const fetchSchedule = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/schedule-summary`, {
          credentials: 'include',
          signal: ac.signal,
        });
        const text = await res.text();
        const data = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
        if (!data) throw new Error('Invalid response');
        if (!res.ok) throw new Error(data.error || 'Failed to load schedule');
        setTeacherName(data.teacherName || '');
        setBlocks(Array.isArray(data.blocks) ? data.blocks : []);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load schedule');
      } finally {
        if (!ac.signal.aborted) setIsLoading(false);
      }
    };
    fetchSchedule();
    return () => ac.abort();
  }, []);

  const goToBlockStudents = (block: string) => {
    const base = role === 'super_admin' ? '/super-admin/reports' : '/admin/reports';
    navigate(`${base}?block=${encodeURIComponent(block)}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="text-neutral-500">Loading schedule…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">Class Schedule</h1>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Class Schedule</h1>
        <p className="text-neutral-500">
          Your assigned blocks and courses. Click a block or “View students” to see attendance.
        </p>
      </div>

      {blocks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-neutral-500">
            No blocks or courses assigned yet. Ask a super admin to set your handled blocks.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {blocks.map(({ block, studentCount, courses }) => (
            <Card key={block} className="overflow-hidden">
              <CardHeader className="bg-neutral-50 border-b border-neutral-100 py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{block}</span>
                    <span className="text-sm font-normal text-neutral-500">({studentCount} students)</span>
                  </CardTitle>
                  <button
                    type="button"
                    onClick={() => goToBlockStudents(block)}
                    className="text-sm font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Users className="w-4 h-4" />
                    View students
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {courses.length === 0 ? (
                  <div className="px-6 py-4 text-neutral-500 text-sm">No course details from students yet.</div>
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {courses.map((c, i) => (
                      <li
                        key={`${c.courseName}-${c.schedule}-${c.room}-${i}`}
                        className="px-6 py-4 hover:bg-neutral-50/50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-emerald-700" />
                          </div>
                          <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div>
                              <span className="text-neutral-500">Subject name:</span>{' '}
                              <span className="font-medium text-neutral-900">{c.courseName || '—'}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500">Schedule:</span>{' '}
                              <span className="text-neutral-900">{c.schedule || '—'}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500">Room:</span>{' '}
                              <span className="text-neutral-900">{c.room || '—'}</span>
                            </div>
                            {teacherName && (
                              <div>
                                <span className="text-neutral-500">Teacher:</span>{' '}
                                <span className="text-neutral-900">{teacherName}</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => goToBlockStudents(block)}
                            className="shrink-0 text-emerald-700 hover:text-emerald-800 text-sm font-medium"
                          >
                            View students
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
