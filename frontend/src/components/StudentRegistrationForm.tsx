import { useEffect, useState } from 'react';
import { Lock, Mail, User, BookOpen, CalendarClock, DoorClosed, Layers, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
const REGISTRATION_KEY = 'studentRegistrationCompleted';

export function StudentRegistrationForm() {
  const navigate = useNavigate();
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [block, setBlock] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [courses, setCourses] = useState([{ courseName: '', schedule: '', room: '' }]);

  const maxCoursesReached = courses.length >= 12;

  useEffect(() => {
    const alreadyRegistered = window.localStorage.getItem(REGISTRATION_KEY) === 'true';
    if (alreadyRegistered) {
      setIsLocked(true);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name || !block || !email || !password || !confirmPassword) {
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
      (course) => !course.courseName.trim() || !course.schedule.trim() || !course.room.trim()
    );

    if (hasIncompleteCourse) {
      setError('Each course must include course name, time schedule, and room assigned.');
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
          role: 'student',
          name,
          block,
          email: normalizedEmail,
          password,
          comCourses: courses.map((course) => ({
            courseName: course.courseName.trim(),
            schedule: course.schedule.trim(),
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
    field: 'courseName' | 'schedule' | 'room',
    value: string
  ) => {
    setCourses((prev) =>
      prev.map((course, courseIndex) =>
        courseIndex === index ? { ...course, [field]: value } : course
      )
    );
  };

  const handleAddCourse = () => {
    if (maxCoursesReached) {
      return;
    }
    setCourses((prev) => [...prev, { courseName: '', schedule: '', room: '' }]);
  };

  const handleRemoveCourse = (index: number) => {
    if (courses.length === 1) {
      return;
    }
    setCourses((prev) => prev.filter((_, courseIndex) => courseIndex !== index));
  };

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
            <label htmlFor="student-block" className="block text-sm font-medium text-neutral-700 mb-2">
              Block / Section
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="student-block"
                type="text"
                value={block}
                onChange={(event) => setBlock(event.target.value)}
                placeholder="Year 2 - Block 3"
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
              />
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
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
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
                  <label
                    htmlFor={`com-course-${index}`}
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Course Name
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      id={`com-course-${index}`}
                      type="text"
                      value={course.courseName}
                      onChange={(event) => handleCourseChange(index, 'courseName', event.target.value)}
                      placeholder="BSIT 2A"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`com-schedule-${index}`}
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Time Schedule
                  </label>
                  <div className="relative">
                    <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      id={`com-schedule-${index}`}
                      type="text"
                      value={course.schedule}
                      onChange={(event) => handleCourseChange(index, 'schedule', event.target.value)}
                      placeholder="Mon/Wed 8:00 AM - 10:00 AM"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`com-room-${index}`}
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Room Assigned
                  </label>
                  <div className="relative">
                    <DoorClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      id={`com-room-${index}`}
                      type="text"
                      value={course.room}
                      onChange={(event) => handleCourseChange(index, 'room', event.target.value)}
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
