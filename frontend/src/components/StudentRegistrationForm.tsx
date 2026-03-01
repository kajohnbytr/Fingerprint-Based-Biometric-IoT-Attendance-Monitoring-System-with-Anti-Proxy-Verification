import { useEffect, useState } from 'react';
import { Lock, Mail, User, BookOpen, CalendarClock, DoorClosed, Layers, Plus, Trash2, Hash } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { API_BASE_URL } from '../config';
const REGISTRATION_KEY = 'studentRegistrationCompleted';

const BLOCK_OPTIONS = [
  '3BSIT-SD-01', '3BSIT-SD-02', '3BSIT-CS-01', '3BSIT-CS-02',
  '3BSIT-DA-01', '3BSIT-BI-01', '3BSIT-BI-02',
];

const SUBJECT_OPTIONS = [
  'ITE 384',
  'ITE 385',
  'ITE 401',
  'ITE 293',
  'ITE 370',
  'ITE 309',
  'SSP 008',
];

const DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const TIME_SCHEDULE_OPTIONS = [
  '7:30 AM - 9:00 AM',
  '9:00 AM - 10:30 AM',
  '10:30 AM - 12:00 PM',
  '12:00 PM - 1:30 PM',
  '1:30 PM - 3:00 PM',
  '3:00 PM - 4:30 PM',
  '4:30 PM - 6:00 PM',
];

export function StudentRegistrationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const [isLocked, setIsLocked] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [prefillEmail, setPrefillEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [block, setBlock] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [courses, setCourses] = useState([{ courseName: '', day: '', schedule: '', room: '' }]);

  const maxCoursesReached = courses.length >= 12;

  useEffect(() => {
    const alreadyRegistered = window.localStorage.getItem(REGISTRATION_KEY) === 'true';
    if (alreadyRegistered) {
      setIsLocked(true);
      return;
    }
    if (!tokenFromUrl) {
      setTokenValid(false);
      setTokenError('Registration requires an invite link from your admin or teacher.');
      return;
    }
    const validate = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(`${API_BASE_URL}/api/auth/invite/${encodeURIComponent(tokenFromUrl)}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await res.json().catch(() => ({}));
        if (data.valid) {
          setTokenValid(true);
          if (data.email) setPrefillEmail(data.email);
        } else {
          setTokenValid(false);
          setTokenError(data.error || 'Invalid or expired invite link.');
        }
      } catch (err) {
        setTokenValid(false);
        const msg = err instanceof Error && err.name === 'AbortError'
          ? 'Request timed out. Check your connection and that the app is running.'
          : 'Failed to validate invite link. Check your connection.';
        setTokenError(msg);
      }
    };
    validate();
  }, [tokenFromUrl]);

  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
  }, [prefillEmail]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name || !idNumber || !block || !email || !password || !confirmPassword) {
      setError('Please fill out all required fields.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes('phinmaed')) {
      setError('Please use your PHINMAED email address.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (courses.length === 0) {
      setError('Please add at least one course.');
      return;
    }

    if (courses.length > 12) {
      setError('You can only register up to 12 courses.');
      return;
    }

    const hasIncompleteCourse = courses.some(
      (course) =>
        !course.courseName.trim() ||
        !course.day.trim() ||
        !course.schedule.trim() ||
        !course.room.trim()
    );
    if (hasIncompleteCourse) {
      setError('Each course must include subject, day, time schedule, and room assigned.');
      return;
    }

    const subjectCounts = courses.reduce<Record<string, number>>((acc, c) => {
      const s = c.courseName.trim();
      if (s) acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});
    const hasDuplicateSubject = Object.values(subjectCounts).some((n: number) => n > 1);
    if (hasDuplicateSubject) {
      setError('Each subject can only be selected once. Please choose a different subject for any duplicate.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenFromUrl,
          role: 'student',
          name,
          idNumber: idNumber.trim(),
          block,
          email: normalizedEmail,
          password,
          comCourses: courses.map((course) => ({
            courseName: course.courseName.trim(),
            schedule: `${course.day.trim()} ${course.schedule.trim()}`.trim(),
            room: course.room.trim(),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      window.localStorage.setItem(REGISTRATION_KEY, 'true');
      setIsLocked(true);
      setSuccessMessage('Registration successful. You can now log in.');
      setTimeout(() => {
        navigate('/login/student');
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourseChange = (
    index: number,
    field: 'courseName' | 'day' | 'schedule' | 'room',
    value: string
  ) => {
    setCourses((prev) =>
      prev.map((course, courseIndex) =>
        courseIndex === index ? { ...course, [field]: value } : course
      )
    );
  };

  const handleAddCourse = () => {
    if (maxCoursesReached) return;
    setCourses((prev) => [...prev, { courseName: '', day: '', schedule: '', room: '' }]);
  };

  const handleRemoveCourse = (index: number) => {
    if (courses.length === 1) return;
    setCourses((prev) => prev.filter((_, i) => i !== index));
  };

  if (tokenValid === false && !tokenFromUrl) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mx-auto">
            <Lock className="w-5 h-5 text-amber-700" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Invite link required</h1>
          <p className="text-neutral-500">
            Student registration is by invite only. Ask your admin or teacher to send you a registration link.
          </p>
          <button
            onClick={() => navigate('/login/student')}
            className="w-full py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 focus:ring-4 focus:ring-neutral-900/20 transition-all"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (tokenValid === false && tokenFromUrl) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
            <Lock className="w-5 h-5 text-red-700" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Invalid invite link</h1>
          <p className="text-neutral-500">{tokenError ?? 'Invalid or expired invite link. Please request a new one.'}</p>
          <button
            onClick={() => navigate('/login/student')}
            className="w-full py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 focus:ring-4 focus:ring-neutral-900/20 transition-all"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (tokenValid !== true) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
          <p className="mt-4 text-neutral-600">Validating invite link...</p>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-900 mx-auto">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Registration complete</h1>
          <p className="text-neutral-500">
            This registration page can only be accessed once. Please sign in to continue.
          </p>
          <button
            onClick={() => navigate('/login/student')}
            className="w-full py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 focus:ring-4 focus:ring-neutral-900/20 transition-all"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-900 mb-4">
            <User className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Student Registration</h1>
          <p className="text-neutral-500">Complete your student profile to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-sm text-emerald-700">{successMessage}</p>
            </div>
          )}

          <div>
            <label htmlFor="student-name" className="block text-sm font-medium text-neutral-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="student-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Juan Dela Cruz"
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="student-id-number" className="block text-sm font-medium text-neutral-700 mb-2">
              ID Number
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="student-id-number"
                type="text"
                value={idNumber}
                onChange={(event) => setIdNumber(event.target.value)}
                placeholder="03-2324-035749"
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="student-block" className="block text-sm font-medium text-neutral-700 mb-2">
              Block / Section
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none z-10" />
              <select
                id="student-block"
                value={block}
                onChange={(event) => setBlock(event.target.value)}
                required
                className="w-full pl-11 pr-10 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 appearance-none bg-white"
              >
                <option value="">Select block / section</option>
                {BLOCK_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="student-email" className="block text-sm font-medium text-neutral-700 mb-2">
              PHINMAED Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="student-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@phinmaed.edu.ph"
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="student-password" className="block text-sm font-medium text-neutral-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="student-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Min 8 chars, uppercase, lowercase, number, special character (!@#$%^&*)
            </p>
          </div>

          <div>
            <label htmlFor="student-confirm-password" className="block text-sm font-medium text-neutral-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="student-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700">COM Course Details</p>
                <p className="text-xs text-neutral-500">Add up to 12 courses.</p>
              </div>
              <button
                type="button"
                onClick={handleAddCourse}
                disabled={maxCoursesReached}
                className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add course
              </button>
            </div>

            {courses.map((course, index) => (
              <div key={`course-${index}`} className="space-y-3 rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-700">Course {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => handleRemoveCourse(index)}
                    disabled={courses.length === 1}
                    className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                </div>

                <div>
                  <label htmlFor={`com-course-${index}`} className="block text-sm font-medium text-neutral-700 mb-2">
                    Subject
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none z-10" />
                    <select
                      id={`com-course-${index}`}
                      value={course.courseName}
                      onChange={(e) => handleCourseChange(index, 'courseName', e.target.value)}
                      required
                      className="w-full pl-11 pr-10 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 appearance-none bg-white"
                    >
                      <option value="">Select subject</option>
                      {(() => {
                        const takenByOther = courses
                          .filter((_, i) => i !== index)
                          .map((c) => c.courseName.trim())
                          .filter(Boolean);
                        return SUBJECT_OPTIONS.filter(
                          (subject) => subject === course.courseName || !takenByOther.includes(subject)
                        ).map((subject) => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`com-day-${index}`} className="block text-sm font-medium text-neutral-700 mb-2">
                    Day
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none z-10">
                      {/* simple circle to align with other icons */}
                      <span className="inline-block w-3 h-3 rounded-full border border-neutral-300" />
                    </div>
                    <select
                      id={`com-day-${index}`}
                      value={course.day}
                      onChange={(e) => handleCourseChange(index, 'day', e.target.value)}
                      required
                      className="w-full pl-11 pr-10 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 appearance-none bg-white"
                    >
                      <option value="">Select day</option>
                      {DAY_OPTIONS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`com-schedule-${index}`} className="block text-sm font-medium text-neutral-700 mb-2">
                    Time Schedule
                  </label>
                  <div className="relative">
                    <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none z-10" />
                    <select
                      id={`com-schedule-${index}`}
                      value={course.schedule}
                      onChange={(e) => handleCourseChange(index, 'schedule', e.target.value)}
                      required
                      className="w-full pl-11 pr-10 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 appearance-none bg-white"
                    >
                      <option value="">Select time schedule</option>
                      {TIME_SCHEDULE_OPTIONS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`com-room-${index}`} className="block text-sm font-medium text-neutral-700 mb-2">
                    Room Assigned
                  </label>
                  <div className="relative">
                    <DoorClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      id={`com-room-${index}`}
                      type="text"
                      value={course.room}
                      onChange={(e) => handleCourseChange(index, 'room', e.target.value)}
                      placeholder="Room 204"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 focus:ring-4 focus:ring-neutral-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login/student')}
            className="w-full text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  );
}
