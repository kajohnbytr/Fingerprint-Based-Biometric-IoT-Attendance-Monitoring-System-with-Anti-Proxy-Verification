import { useEffect, useState } from 'react';
import { Lock, Mail, User, BookOpen, CalendarClock, DoorClosed, Layers, Plus, Trash2, Hash, Fingerprint } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { API_BASE_URL } from '../config';
const REGISTRATION_KEY = 'studentRegistrationCompleted';

const BLOCK_OPTIONS = [
  '2BSIT-02', '2BSIT-03', '2BSIT-04', '2BSIT-05', '2BSIT-06',
  '2BSIT-07', '2BSIT-08', '2BSIT-09', '2BSIT-10',
  '3BSIT-SD-01', '3BSIT-SD-02', '3BSIT-CS-01', '3BSIT-CS-02',
  '3BSIT-DA-01', '3BSIT-BI-01', '3BSIT-BI-02',
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
  const [fingerprintRegistered, setFingerprintRegistered] = useState(false);
  const [fingerprintCredentialId, setFingerprintCredentialId] = useState<string | null>(null);
  const [fingerprintPublicKey, setFingerprintPublicKey] = useState<string | null>(null);
  const [isRegisteringFingerprint, setIsRegisteringFingerprint] = useState(false);
  const [courses, setCourses] = useState([{ courseName: '', schedule: '', room: '' }]);

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

    if (!fingerprintRegistered || !fingerprintCredentialId) {
      setError('Please register your fingerprint before submitting.');
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
          token: tokenFromUrl,
          role: 'student',
          name,
          idNumber: idNumber.trim(),
          block,
          email: normalizedEmail,
          password,
          webauthnCredentialId: fingerprintCredentialId,
          webauthnPublicKey: fingerprintPublicKey,
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
    if (maxCoursesReached) return;
    setCourses((prev) => [...prev, { courseName: '', schedule: '', room: '' }]);
  };

  const handleRemoveCourse = (index: number) => {
    if (courses.length === 1) return;
    setCourses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRegisterFingerprint = async () => {
    if (!email || !name) {
      setError('Please fill in your name and email first before registering fingerprint.');
      return;
    }

    // Check for WebAuthn support
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      setError('Fingerprint authentication is not supported in this browser. Please use Chrome, Safari, Edge, or Firefox on a device with fingerprint sensor.');
      return;
    }

    // Check for secure context (HTTPS required for WebAuthn)
    if (!window.isSecureContext) {
      setError('Fingerprint authentication requires a secure connection (HTTPS). Please ensure you are accessing the site via HTTPS.');
      return;
    }

    // Check if platform authenticator is available
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        setError('Platform authenticator (fingerprint sensor) is not available on this device. Please ensure your device has fingerprint/FaceID/TouchID enabled and unlocked.');
        return;
      }
    } catch (err) {
      console.warn('Could not check platform authenticator availability:', err);
      // Continue anyway - some browsers might not support this check
    }

    setIsRegisteringFingerprint(true);
    setError(null);

    try {
      // Generate a user ID (use email as base)
      const userId = new TextEncoder().encode(email.toLowerCase().trim());
      const userName = email.toLowerCase().trim();
      const displayName = name.trim();

      // Create credential using WebAuthn API
      // Use the domain without port for rp.id (required for WebAuthn)
      const rpId = window.location.hostname.split(':')[0];
      
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: {
          name: 'Attendance System',
          id: rpId,
        },
        user: {
          id: userId,
          name: userName,
          displayName: displayName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use built-in fingerprint sensor
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'direct',
      };

      let credential: PublicKeyCredential;
      try {
        credential = await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        }) as PublicKeyCredential;
      } catch (createError: any) {
        if (createError.name === 'NotSupportedError') {
          throw new Error('Your browser does not support fingerprint authentication. Please use Chrome, Safari, or Edge.');
        } else if (createError.name === 'InvalidStateError') {
          throw new Error('Fingerprint is already registered for this account.');
        } else if (createError.name === 'NotAllowedError') {
          throw new Error('Fingerprint registration was cancelled or not allowed. Please try again and allow the fingerprint prompt.');
        } else if (createError.name === 'SecurityError') {
          throw new Error('Security error: Please ensure you are accessing the site via HTTPS (secure connection).');
        } else {
          throw createError;
        }
      }

      if (!credential) {
        throw new Error('Fingerprint registration was cancelled or failed.');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Convert ArrayBuffer to base64
      const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      };

      const credentialId = arrayBufferToBase64(credential.rawId);
      const publicKey = arrayBufferToBase64(response.getPublicKey() || new ArrayBuffer(0));
      const clientDataJSON = arrayBufferToBase64(response.clientDataJSON);
      const attestationObject = arrayBufferToBase64(response.attestationObject);

      setFingerprintCredentialId(credentialId);
      setFingerprintPublicKey(publicKey);
      setFingerprintRegistered(true);
      setSuccessMessage('Fingerprint registered successfully! You can now use it for attendance.');
    } catch (err: any) {
      console.error('Fingerprint registration error:', err);
      
      let errorMessage = 'Failed to register fingerprint. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Fingerprint registration was cancelled or not allowed. Please try again and allow the fingerprint prompt when it appears.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Fingerprint authentication is not supported. Please use Chrome, Safari, or Edge on a device with fingerprint/FaceID/TouchID.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Security error: Please ensure you are accessing the site via HTTPS (secure connection).';
      } else if (err.name === 'InvalidStateError') {
        errorMessage = 'Fingerprint is already registered. If you need to re-register, please contact support.';
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage += 'Please ensure:\n- You are using HTTPS\n- Your browser supports WebAuthn (Chrome, Safari, Edge)\n- Your device has fingerprint/FaceID/TouchID enabled\n- You allow the fingerprint prompt';
      }
      
      setError(errorMessage);
      setFingerprintRegistered(false);
      setFingerprintCredentialId(null);
      setFingerprintPublicKey(null);
    } finally {
      setIsRegisteringFingerprint(false);
    }
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

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Fingerprint Registration
            </label>
            <div className="space-y-3">
              {fingerprintRegistered ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Fingerprint className="w-5 h-5 text-emerald-700" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-emerald-900">Fingerprint Registered</p>
                      <p className="text-xs text-emerald-700">Your fingerprint is ready for attendance verification.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-sm text-neutral-700 mb-3">
                    Register your fingerprint using your phone's fingerprint sensor (TouchID, FaceID, or Android fingerprint). This will be used for attendance verification on IoT scanners.
                  </p>
                  {typeof window !== 'undefined' && window.PublicKeyCredential && window.isSecureContext ? (
                    <>
                      <button
                        type="button"
                        onClick={handleRegisterFingerprint}
                        disabled={isRegisteringFingerprint || !name || !email}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 focus:ring-4 focus:ring-neutral-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRegisteringFingerprint ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Registering fingerprint...</span>
                          </>
                        ) : (
                          <>
                            <Fingerprint className="w-4 h-4" />
                            <span>Register Fingerprint</span>
                          </>
                        )}
                      </button>
                      {(!name || !email) && (
                        <p className="mt-2 text-xs text-amber-600">
                          Please fill in your name and email first.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs text-amber-800 font-medium mb-1">Requirements:</p>
                      <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                        <li>Use Chrome, Safari, or Edge browser</li>
                        <li>Access via HTTPS (secure connection)</li>
                        <li>Device must have fingerprint/FaceID/TouchID enabled</li>
                        <li>Allow browser permissions when prompted</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {fingerprintRegistered 
                ? 'Your fingerprint credential is stored securely. You can use it for attendance on IoT scanners.'
                : 'Touch the button above and follow the prompts to register your fingerprint using your phone\'s fingerprint sensor (TouchID, FaceID, or Android fingerprint).'}
            </p>
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
                    Course Name
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      id={`com-course-${index}`}
                      type="text"
                      value={course.courseName}
                      onChange={(e) => handleCourseChange(index, 'courseName', e.target.value)}
                      placeholder="BSIT 2A"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={`com-schedule-${index}`} className="block text-sm font-medium text-neutral-700 mb-2">
                    Time Schedule
                  </label>
                  <div className="relative">
                    <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      id={`com-schedule-${index}`}
                      type="text"
                      value={course.schedule}
                      onChange={(e) => handleCourseChange(index, 'schedule', e.target.value)}
                      placeholder="Mon/Wed 8:00 AM - 10:00 AM"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
                    />
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
