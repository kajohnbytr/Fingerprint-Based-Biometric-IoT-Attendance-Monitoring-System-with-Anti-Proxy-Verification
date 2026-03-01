const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { validatePassword } = require('../utils/passwordPolicy');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const ArchiveRequest = require('../models/ArchiveRequest');
const AuditLog = require('../models/AuditLog');
const SystemSettings = require('../models/SystemSettings');
const InviteToken = require('../models/InviteToken');

const trimIfString = (v) => (typeof v === 'string' ? v.trim() : '');

const getHandledBlocksForUser = (user) => {
  const isSuperAdmin = user?.roles?.includes?.('super_admin');
  if (isSuperAdmin) return { isSuperAdmin: true, blocks: [] };

  const rawBlocks = Array.isArray(user?.handledBlocks) ? user.handledBlocks : [];
  const blocks = rawBlocks.map((b) => trimIfString(b)).filter(Boolean);
  return { isSuperAdmin: false, blocks };
};

const logAudit = async (action, user, details, status = 'Success') => {
  try {
    await AuditLog.create({ action, user, details, status });
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
};

const getOverview = async (req, res) => {
  const emptyTrends = [
    { name: 'Mon', present: 0, absent: 0, late: 0 },
    { name: 'Tue', present: 0, absent: 0, late: 0 },
    { name: 'Wed', present: 0, absent: 0, late: 0 },
    { name: 'Thu', present: 0, absent: 0, late: 0 },
    { name: 'Fri', present: 0, absent: 0, late: 0 },
    { name: 'Sat', present: 0, absent: 0, late: 0 },
    { name: 'Sun', present: 0, absent: 0, late: 0 },
  ];
  const emptyPie = [{ name: 'No Data', value: 1, color: '#9ca3af' }];

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const { isSuperAdmin: isSuperAdminUser, blocks: handledBlocks } = getHandledBlocksForUser(req.user);

    const studentFilter = {
      $and: [
        { roles: 'student' },
        { roles: { $nin: ['admin', 'super_admin'] } },
        // If this is a regular admin/teacher and they have handledBlocks configured,
        // only include students from those blocks.
        ...(!isSuperAdminUser && handledBlocks.length > 0
          ? [{ block: { $in: handledBlocks } }]
          : []),
      ],
    };
    const students = await User.find(studentFilter).select('_id createdAt').lean();
    const studentIds = (students || []).map((u) => u._id);
    const totalStudents = studentIds.length;
    const studentsEnrolledBeforeToday = (students || []).filter((u) => {
      const created = u.createdAt ? new Date(u.createdAt) : null;
      return !created || created < todayStart;
    }).length;

    const todayRecords =
      studentIds.length === 0
        ? []
        : await Attendance.find({
            date: { $gte: todayStart, $lt: todayEnd },
            user: { $in: studentIds },
          })
            .populate('user', 'name block')
            .lean();

    const present = todayRecords.filter((r) => r.status === 'Present').length;
    const late = todayRecords.filter((r) => r.status === 'Late').length;
    const absent = present + late > 0 ? Math.max(0, studentsEnrolledBeforeToday - present - late) : 0;

    const attendanceTrends = [];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);

    let recordsInRange = [];
    if (studentIds.length > 0) {
      try {
        recordsInRange = await Attendance.find({
          date: { $gte: weekAgo },
          user: { $in: studentIds },
        })
          .select('date status')
          .lean();
      } catch (err) {
        console.error('Overview attendance fetch error:', err);
      }
    }

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dateStr = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;
      const label = `${dayStart.getMonth() + 1}/${dayStart.getDate()}`;

      const onThisDay = recordsInRange.filter((r) => {
        const rd = r.date ? new Date(r.date) : null;
        return rd && rd >= dayStart && rd < dayEnd;
      });
      const present = onThisDay.filter((r) => r.status === 'Present').length;
      const late = onThisDay.filter((r) => r.status === 'Late').length;
      const absent = Math.max(0, totalStudents - present - late);

      attendanceTrends.push({ name: label, date: dateStr, present, absent, late });
    }

    let pieData = [
      { name: 'Present', value: present, color: '#10b981' },
      { name: 'Absent', value: absent, color: '#ef4444' },
      { name: 'Late', value: late, color: '#f59e0b' },
    ];
    if (pieData.every((d) => d.value === 0)) pieData = emptyPie;

    let alertItems = [];
    try {
      const alerts = await Report.find({ status: { $in: ['open', 'investigating'] } })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'email')
        .lean();
      alertItems = (alerts || []).map((r) => ({
        id: r._id != null ? String(r._id) : '',
        title: r.subject || 'Report',
        details: (r.description || '').substring(0, 80) + ((r.description || '').length > 80 ? '...' : ''),
        submittedBy: (r.user && r.user.email) || 'Unknown',
        time: r.createdAt,
      }));
    } catch (reportErr) {
      console.error('Overview reports error:', reportErr);
    }

    const payload = {
      stats: {
        totalStudents,
        presentToday: present,
        absentToday: absent,
        lateToday: late,
      },
      attendanceTrends,
      pieData,
      alerts: alertItems,
    };

    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    twoWeeksAgo.setHours(0, 0, 0, 0);
    let weekdayRecords = [];
    if (studentIds.length > 0) {
      weekdayRecords = await Attendance.find({
        date: { $gte: twoWeeksAgo },
        user: { $in: studentIds },
      })
        .select('date status user')
        .lean();
    }
    const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const byUserDate = {};
    const studentsWithAnyAttendance = new Set();
    weekdayRecords.forEach((r) => {
      const d = r.date ? new Date(r.date) : null;
      if (!d) return;
      const uid = r.user ? String(r.user) : null;
      if (uid) studentsWithAnyAttendance.add(uid);
      const dayStr = toDateStr(d);
      const key = `${uid}|${dayStr}`;
      if (!byUserDate[key]) byUserDate[key] = { present: 0, late: 0 };
      if (r.status === 'Present') byUserDate[key].present += 1;
      if (r.status === 'Late') byUserDate[key].late += 1;
    });
    const byWeekday = { Mon: { present: 0, late: 0 }, Tue: { present: 0, late: 0 }, Wed: { present: 0, late: 0 }, Thu: { present: 0, late: 0 }, Fri: { present: 0, late: 0 } };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    Object.keys(byUserDate).forEach((key) => {
      const parts = key.split('|');
      const dayStr = parts.length >= 2 ? parts.slice(1).join('|') : '';
      if (!dayStr) return;
      const d = new Date(dayStr);
      if (Number.isNaN(d.getTime())) return;
      const dayName = dayNames[d.getDay()];
      if (dayName === 'Sat' || dayName === 'Sun') return;
      const slot = byUserDate[key];
      if (slot.present > 0) byWeekday[dayName].present += 1;
      else if (slot.late > 0) byWeekday[dayName].late += 1;
    });
    const studentsWithAttendanceCount = studentsWithAnyAttendance.size;
    const weekdaysInRange = 2;
    const expectedStudentDays = studentsWithAttendanceCount * weekdaysInRange;
    payload.attendanceTrendsWeekday = weekdays.map((name) => {
      const rec = byWeekday[name];
      const present = rec?.present ?? 0;
      const late = rec?.late ?? 0;
      const absent = Math.max(0, expectedStudentDays - present - late);
      return { name, present, absent, late };
    });

    if (isSuperAdminUser) {
      const totalUsers = await User.countDocuments();
      const reportsFiled = await Report.countDocuments();
      const activeAlertsCount = await Report.countDocuments({ status: { $in: ['open', 'investigating'] } });
      const systemLoad = Math.min(99, Math.max(0, 5 + activeAlertsCount * 3 + Math.floor(reportsFiled / 20)));
      const weekAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const prevWeekUsers = await User.countDocuments({ createdAt: { $lt: weekAgoDate } });
      const prevWeekReports = await Report.countDocuments({ createdAt: { $lt: weekAgoDate } });
      payload.systemStats = {
        totalUsers,
        systemLoad,
        reportsFiled,
        activeAlerts: activeAlertsCount,
        totalUsersTrend: prevWeekUsers > 0 ? `${((totalUsers - prevWeekUsers) / prevWeekUsers * 100).toFixed(1)}%` : '0%',
        systemLoadTrend: systemLoad > 15 ? '-2%' : '+1%',
        reportsFiledTrend: reportsFiled > prevWeekReports ? `+${reportsFiled - prevWeekReports}` : String(reportsFiled - prevWeekReports),
        activeAlertsTrend: activeAlertsCount > 0 ? `-${Math.min(activeAlertsCount, 2)}` : '0',
      };
    }

    return res.json(payload);
  } catch (error) {
    console.error('Overview error:', error);
    const payload = {
      stats: { totalStudents: 0, presentToday: 0, absentToday: 0, lateToday: 0 },
      attendanceTrends: emptyTrends,
      pieData: emptyPie,
      alerts: [],
    };
    payload.attendanceTrendsWeekday = [
      { name: 'Mon', present: 0, absent: 0, late: 0 },
      { name: 'Tue', present: 0, absent: 0, late: 0 },
      { name: 'Wed', present: 0, absent: 0, late: 0 },
      { name: 'Thu', present: 0, absent: 0, late: 0 },
      { name: 'Fri', present: 0, absent: 0, late: 0 },
    ];
    if (req.user?.roles?.includes?.('super_admin')) {
      payload.systemStats = {
        totalUsers: 0,
        systemLoad: 0,
        reportsFiled: 0,
        activeAlerts: 0,
        totalUsersTrend: '0%',
        systemLoadTrend: '0%',
        reportsFiledTrend: '0',
        activeAlertsTrend: '0',
      };
    }
    return res.json(payload);
  }
};

const getScheduleSummary = async (req, res) => {
  try {
    const { isSuperAdmin, blocks: handledBlocks } = getHandledBlocksForUser(req.user);
    const teacherName = typeof req.user?.name === 'string' ? req.user.name.trim() : '';

    let blockList = handledBlocks;
    if (isSuperAdmin) {
      const students = await User.find({ roles: 'student' }).select('block').lean();
      const set = new Set();
      students.forEach((s) => {
        const b = trimIfString(s.block);
        if (b) set.add(b);
      });
      blockList = [...set].sort();
    }

    if (blockList.length === 0) {
      return res.json({ teacherName, blocks: [] });
    }

    const studentFilter = {
      $and: [
        { roles: 'student' },
        { roles: { $nin: ['admin', 'super_admin'] } },
        { block: { $in: blockList } },
      ],
    };
    const students = await User.find(studentFilter)
      .select('block comCourses')
      .lean();

    const byBlock = {};
    blockList.forEach((b) => { byBlock[b] = { studentCount: 0, courseSet: new Map(), courses: [] }; });
    students.forEach((s) => {
      const block = trimIfString(s.block) || 'Unknown';
      if (!byBlock[block]) return;
      byBlock[block].studentCount += 1;
      const list = Array.isArray(s.comCourses) ? s.comCourses : [];
      list.forEach((c) => {
        const name = trimIfString(c.courseName) || '';
        const schedule = trimIfString(c.schedule) || '';
        const room = trimIfString(c.room) || '';
        if (!name && !schedule && !room) return;
        const key = `${name}|${schedule}|${room}`;
        if (byBlock[block].courseSet.has(key)) return;
        byBlock[block].courseSet.set(key, true);
        byBlock[block].courses.push({ courseName: name, schedule, room });
      });
    });

    const blocks = blockList.map((block) => ({
      block,
      studentCount: (byBlock[block] && byBlock[block].studentCount) || 0,
      courses: (byBlock[block] && byBlock[block].courses) || [],
    }));

    return res.json({ teacherName, blocks });
  } catch (err) {
    console.error('Schedule summary error:', err);
    return res.status(500).json({ error: 'Failed to load schedule summary' });
  }
};

const normalizeBlock = (v) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || 'Unknown';
};

const getReports = async (req, res) => {
  try {
    const { startDate, endDate, block, groupBy, subject, day, timeSlot } = req.query;
    const dailySummary = groupBy === 'date';

    let start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    let end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    if (start.getTime() > end.getTime()) [start, end] = [end, start];

    const { isSuperAdmin, blocks: handledBlocks } = getHandledBlocksForUser(req.user);

    const filterSubject = trimIfString(subject);
    const filterDay = trimIfString(day);
    const filterTime = trimIfString(timeSlot);

    // For non-super admins, restrict to their handledBlocks. If a block query is provided,
    // intersect it with the allowed blocks.
    let effectiveBlockFilter = block;
    if (!isSuperAdmin && handledBlocks.length > 0) {
      if (block && block !== 'All Classes') {
        // If requested block is not in handledBlocks, result should be empty.
        if (!handledBlocks.includes(block)) {
          return res.json({ reports: [] });
        }
        effectiveBlockFilter = block;
      } else {
        // No specific block requested; use all handledBlocks.
        effectiveBlockFilter = null;
      }
    }

    const studentFilter = {
      $and: [
        { roles: 'student' },
        { roles: { $nin: ['admin', 'super_admin'] } },
        ...(!isSuperAdmin && handledBlocks.length > 0
          ? [{ block: { $in: handledBlocks } }]
          : []),
        ...(effectiveBlockFilter && effectiveBlockFilter !== 'All Classes'
          ? [{ block: effectiveBlockFilter }]
          : []),
      ],
    };
    const students = await User.find(studentFilter).select('_id name block createdAt comCourses');

    const matchesCourseFilters = (user) => {
      if (!filterSubject && !filterDay && !filterTime) return true;
      const list = Array.isArray(user.comCourses) ? user.comCourses : [];
      if (list.length === 0) return false;
      const dayToken = filterDay ? filterDay.toLowerCase().slice(0, 3) : null;
      const timeToken = filterTime ? filterTime.toLowerCase() : null;
      return list.some((c) => {
        const name = trimIfString(c.courseName);
        const schedule = trimIfString(c.schedule).toLowerCase();
        if (filterSubject && name !== filterSubject) return false;
        if (dayToken && !schedule.includes(dayToken)) return false;
        if (timeToken && !schedule.includes(timeToken)) return false;
        return true;
      });
    };

    const filteredStudents = students.filter(matchesCourseFilters);

    const studentIds = filteredStudents.map((s) => s._id);
    const totalStudents = filteredStudents.length;
    const getEnrolledBeforeCount = (beforeDate, blockFilter = null) => {
      const before = new Date(beforeDate);
      before.setHours(23, 59, 59, 999);
      return filteredStudents.filter((s) => {
        const created = s.createdAt ? new Date(s.createdAt) : null;
        if (!created || created > before) return false;
        if (blockFilter != null && normalizeBlock(s.block) !== blockFilter) return false;
        return true;
      }).length;
    };

    const records = await Attendance.find({
      user: { $in: studentIds },
      date: { $gte: start, $lte: end },
    }).populate('user', 'block');

    const toDateStr = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (dailySummary) {
      const byDate = {};
      records.forEach((r) => {
        const d = r.date;
        const dateStr = toDateStr(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        if (!byDate[dateStr]) byDate[dateStr] = { present: 0, late: 0 };
        if (r.status === 'Present') byDate[dateStr].present += 1;
        if (r.status === 'Late') byDate[dateStr].late += 1;
      });
      const reportRows = [];
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      for (let d = new Date(startDay.getTime()); d.getTime() <= endDay.getTime(); d.setDate(d.getDate() + 1)) {
        const dateStr = toDateStr(d);
        const row = byDate[dateStr];
        const present = row ? row.present : 0;
        const late = row ? row.late : 0;
        const expectedForDate = getEnrolledBeforeCount(d, null);
        const absent = present + late > 0 ? Math.max(0, expectedForDate - present - late) : 0;
        const rate = expectedForDate ? Math.round(((present + late) / expectedForDate) * 100) : 0;
        let status = 'Average';
        if (rate >= 90) status = 'Excellent';
        else if (rate >= 75) status = 'Good';
        reportRows.push({
          id: dateStr,
          date: dateStr,
          class: 'All Classes',
          totalStudents: expectedForDate,
          present,
          absent,
          late,
          attendanceRate: rate,
          status,
        });
      }
      reportRows.sort((a, b) => b.date.localeCompare(a.date));
      return res.json({ reports: reportRows.slice(0, 200) });
    }

    const blockCounts = {};
    filteredStudents.forEach((s) => {
      const blk = normalizeBlock(s.block);
      blockCounts[blk] = (blockCounts[blk] || 0) + 1;
    });
    const blocks = [...new Set(Object.keys(blockCounts).filter(Boolean))];
    if (blocks.length === 0) blocks.push('Unknown');

    const byDateBlock = {};
    records.forEach((r) => {
      const d = r.date;
      const dateStr = toDateStr(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      const blk = normalizeBlock(r.user?.block);
      const key = `${dateStr}|${blk}`;
      if (!byDateBlock[key]) {
        byDateBlock[key] = { date: dateStr, block: blk, present: 0, late: 0 };
      }
      if (r.status === 'Present') byDateBlock[key].present += 1;
      if (r.status === 'Late') byDateBlock[key].late += 1;
    });

    const reportRows = [];
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    for (let d = new Date(startDay.getTime()); d.getTime() <= endDay.getTime(); d.setDate(d.getDate() + 1)) {
      const dateStr = toDateStr(d);
      for (const blk of blocks) {
        const key = `${dateStr}|${blk}`;
        const row = byDateBlock[key];
        const total = blockCounts[blk] || 0;
        const expectedForDateBlock = getEnrolledBeforeCount(d, blk);
        const present = row ? row.present : 0;
        const late = row ? row.late : 0;
        const absent = present + late > 0 ? Math.max(0, expectedForDateBlock - present - late) : 0;
        const rate = expectedForDateBlock ? Math.round(((present + late) / expectedForDateBlock) * 100) : 0;
        let status = 'Average';
        if (rate >= 90) status = 'Excellent';
        else if (rate >= 75) status = 'Good';
        reportRows.push({
          id: key,
          date: dateStr,
          class: blk,
          totalStudents: expectedForDateBlock,
          present,
          absent,
          late,
          attendanceRate: rate,
          status,
        });
      }
    }

    reportRows.sort((a, b) => (b.date + b.class).localeCompare(a.date + a.class));

    return res.json({ reports: reportRows.slice(0, 200) });
  } catch (error) {
    console.error('Reports error:', error);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

const getReportBlockDetails = async (req, res) => {
  try {
    const { date, block, subject, day, timeSlot } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const { isSuperAdmin, blocks: handledBlocks } = getHandledBlocksForUser(req.user);

    const baseFilter = {
      $and: [
        { roles: 'student' },
        { roles: { $nin: ['admin', 'super_admin'] } },
        ...(!isSuperAdmin && handledBlocks.length > 0
          ? [{ block: { $in: handledBlocks } }]
          : []),
        ...(block && block !== 'All Classes'
          ? [{ block }]
          : []),
      ],
    };

    let students = await User.find(baseFilter)
      .select('_id name email block idNumber createdAt comCourses')
      .lean();

    // As a safety fallback, also apply block normalization filtering in memory
    // for the requested block value.
    if (block && block !== 'All Classes') {
      students = students.filter((s) => normalizeBlock(s.block) === block);
    }
    const filterSubject = trimIfString(subject);
    const filterDay = trimIfString(day);
    const filterTime = trimIfString(timeSlot);

    if (filterSubject || filterDay || filterTime) {
      const dayToken = filterDay ? filterDay.toLowerCase().slice(0, 3) : null;
      const timeToken = filterTime ? filterTime.toLowerCase() : null;
      students = students.filter((u) => {
        const list = Array.isArray(u.comCourses) ? u.comCourses : [];
        if (list.length === 0) return false;
        return list.some((c) => {
          const name = trimIfString(c.courseName);
          const schedule = trimIfString(c.schedule).toLowerCase();
          if (filterSubject && name !== filterSubject) return false;
          if (dayToken && !schedule.includes(dayToken)) return false;
          if (timeToken && !schedule.includes(timeToken)) return false;
          return true;
        });
      });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const studentIds = students.map((s) => s._id);
    const records = await Attendance.find({
      date: { $gte: dayStart, $lt: dayEnd },
      user: { $in: studentIds },
    })
      .select('user status')
      .lean();

    const statusByUser = {};
    records.forEach((r) => {
      const uid = r.user ? String(r.user) : null;
      if (uid && !statusByUser[uid]) statusByUser[uid] = r.status;
    });
    const hasAnyAttendance = records.length > 0;

    const list = students
      .filter((s) => {
        const created = s.createdAt ? new Date(s.createdAt) : null;
        return !created || created < dayEnd;
      })
      .map((s) => {
        const uid = String(s._id);
        let status = statusByUser[uid] || null;
        if (!status) status = hasAnyAttendance ? 'Absent' : '—';
        return {
          id: s._id,
          name: s.name || '—',
          idNumber: s.idNumber || '—',
          email: s.email || '—',
          block: normalizeBlock(s.block),
          status,
        };
      });

    return res.json({ students: list });
  } catch (error) {
    console.error('Report block details error:', error);
    return res.status(500).json({ error: 'Failed to fetch block details' });
  }
};

const listArchiveRequests = async (req, res) => {
  try {
    const user = req.user;
    const isSuperAdmin = user.roles && user.roles.includes('super_admin');

    const query = isSuperAdmin ? {} : { requestedBy: user._id };
    const requests = await ArchiveRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('requestedBy', 'email name');

    return res.json({
      requests: requests.map((r) => ({
        id: r._id,
        requestId: `AR-${r.createdAt.getFullYear()}-${String(r._id).slice(-3)}`,
        student: r.studentName,
        block: r.studentBlock,
        reason: r.reason,
        status: r.status,
        requestedBy: r.requestedBy?.email || 'Unknown',
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('List archive requests error:', error);
    return res.status(500).json({ error: 'Failed to fetch archive requests' });
  }
};

const createArchiveRequest = async (req, res) => {
  try {
    const { studentName, studentBlock, reason } = req.body;

    if (!trimIfString(studentName) || !trimIfString(studentBlock) || !trimIfString(reason)) {
      return res.status(400).json({ error: 'Student name, block, and reason are required' });
    }

    const request = await ArchiveRequest.create({
      studentName: trimIfString(studentName),
      studentBlock: trimIfString(studentBlock),
      reason: trimIfString(reason),
      requestedBy: req.user._id,
    });

    await logAudit(
      'Archive Request Submitted',
      req.user.email,
      `Archive request for ${request.studentName} (${request.studentBlock})`,
      'Success'
    );

    return res.status(201).json({
      message: 'Archive request submitted',
      request: {
        id: request._id,
        requestId: `AR-${request.createdAt.getFullYear()}-${String(request._id).slice(-3)}`,
        student: request.studentName,
        block: request.studentBlock,
        reason: request.reason,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error) {
    console.error('Create archive request error:', error);
    return res.status(500).json({ error: 'Failed to submit archive request' });
  }
};

const updateArchiveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Reviewed', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await ArchiveRequest.findById(id);
    if (!request) return res.status(404).json({ error: 'Archive request not found' });

    request.status = status;
    await request.save();

    await logAudit(
      'Archive Request Updated',
      req.user.email,
      `Status changed to ${status} for ${request.studentName}`,
      'Success'
    );

    return res.json({
      message: 'Archive request updated',
      request: {
        id: request._id,
        requestId: `AR-${request.createdAt.getFullYear()}-${String(request._id).slice(-3)}`,
        student: request.studentName,
        block: request.studentBlock,
        reason: request.reason,
        status: request.status,
      },
    });
  } catch (error) {
    console.error('Update archive request error:', error);
    return res.status(500).json({ error: 'Failed to update archive request' });
  }
};

const getAvailableBlocks = async (req, res) => {
  try {
    const students = await User.find({ roles: 'student' }).select('block').lean();
    const blockSet = new Set();
    students.forEach((s) => {
      const b = trimIfString(s.block);
      if (b) blockSet.add(b);
    });
    const blocks = [...blockSet].sort();
    return res.json({ blocks });
  } catch (error) {
    console.error('Get available blocks error:', error);
    return res.status(500).json({ error: 'Failed to fetch available blocks' });
  }
};

const listUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (trimIfString(search)) {
      const s = new RegExp(trimIfString(search), 'i');
      filter.$or = [{ name: s }, { email: s }, { block: s }];
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    const roleLabels = { student: 'Student', admin: 'Admin (Teacher)', super_admin: 'Super Admin (Developer)' };

    return res.json({
      users: users.map((u) => ({
        id: u._id,
        name: u.name || '—',
        email: u.email,
        role: u.roles?.[0] || 'admin',
        roleLabel: roleLabels[u.roles?.[0]] || 'Admin',
        department: u.block || '—',
        status: 'Active',
        handledBlocks: Array.isArray(u.handledBlocks) ? u.handledBlocks.filter((b) => typeof b === 'string' && b.trim()) : [],
      })),
    });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role, handledBlocks } = req.body;

    if (!trimIfString(email) || !trimIfString(password)) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error });
    }

    const validRoles = ['student', 'admin', 'super_admin'];
    const finalRole = validRoles.includes(role) ? role : 'admin';

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      name: trimIfString(name),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      roles: [finalRole],
    };

    if (finalRole === 'admin' && Array.isArray(handledBlocks)) {
      userData.handledBlocks = handledBlocks.map((b) => trimIfString(b)).filter(Boolean);
    }

    const user = await User.create(userData);

    await logAudit('User Created', req.user.email, `Created user ${user.email} (${finalRole})`, 'Success');

    const roleLabels = { student: 'Student', admin: 'Admin (Teacher)', super_admin: 'Super Admin (Developer)' };
    return res.status(201).json({
      message: 'User created',
      user: {
        id: user._id,
        name: user.name || '—',
        email: user.email,
        role: finalRole,
        roleLabel: roleLabels[finalRole],
        department: user.block || '—',
        status: 'Active',
        handledBlocks: Array.isArray(user.handledBlocks) ? user.handledBlocks : [],
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, handledBlocks } = req.body;

    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (typeof name === 'string') user.name = name.trim();
    if (typeof email === 'string' && email.trim()) {
      const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
      if (existing) return res.status(409).json({ error: 'Email already in use' });
      user.email = email.toLowerCase().trim();
    }
    if (role && ['student', 'admin', 'super_admin'].includes(role)) {
      user.roles = [role];
    }

    if (role === 'admin' || user.roles?.[0] === 'admin') {
      if (Array.isArray(handledBlocks)) {
        user.handledBlocks = handledBlocks.map((b) => trimIfString(b)).filter(Boolean);
      }
    } else if (role === 'super_admin' || user.roles?.[0] === 'super_admin') {
      user.handledBlocks = [];
    }

    await user.save();

    await logAudit('User Updated', req.user.email, `Updated user ${user.email}`, 'Success');

    const roleLabels = { student: 'Student', admin: 'Admin (Teacher)', super_admin: 'Super Admin (Developer)' };
    return res.json({
      message: 'User updated',
      user: {
        id: user._id,
        name: user.name || '—',
        email: user.email,
        role: user.roles?.[0] || 'admin',
        roleLabel: roleLabels[user.roles?.[0]],
        department: user.block || '—',
        status: 'Active',
        handledBlocks: Array.isArray(user.handledBlocks) ? user.handledBlocks : [],
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
};

const listAuditLogs = async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;
    const filter = {};
    if (trimIfString(search)) {
      filter.$or = [
        { action: new RegExp(trimIfString(search), 'i') },
        { user: new RegExp(trimIfString(search), 'i') },
        { details: new RegExp(trimIfString(search), 'i') },
      ];
    }

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(limit) || 50, 200));

    return res.json({
      logs: logs.map((l) => ({
        id: l._id,
        action: l.action,
        user: l.user,
        details: l.details,
        status: l.status,
        time: l.createdAt,
      })),
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

const listAppReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', 'email name');

    return res.json({
      reports: reports.map((r) => ({
        id: r._id,
        reportId: `REP-${r.createdAt.getFullYear()}-${String(r._id).slice(-3)}`,
        title: r.subject,
        severity: r.severity?.charAt(0).toUpperCase() + (r.severity?.slice(1) || 'medium'),
        status: r.status?.charAt(0).toUpperCase() + (r.status?.slice(1) || 'open'),
        submittedBy: r.user?.email || 'Unknown',
        date: r.createdAt.toISOString().slice(0, 10),
        category: r.category,
        description: r.description,
      })),
    });
  } catch (error) {
    console.error('List app reports error:', error);
    return res.status(500).json({ error: 'Failed to fetch app reports' });
  }
};

const updateAppReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (status) report.status = status.toLowerCase();
    await report.save();

    await logAudit('App Report Updated', req.user.email, `Report ${report.subject} status: ${report.status}`, 'Success');

    return res.json({
      message: 'Report updated',
      report: {
        id: report._id,
        title: report.subject,
        status: report.status,
      },
    });
  } catch (error) {
    console.error('Update app report error:', error);
    return res.status(500).json({ error: 'Failed to update report' });
  }
};

const getSettings = async (req, res) => {
  try {
    const docs = await SystemSettings.find({});
    const settings = {};
    docs.forEach((d) => {
      settings[d.key] = d.value;
    });

    if (typeof settings.maintenanceMode === 'undefined') settings.maintenanceMode = false;
    if (typeof settings.orgName === 'undefined') settings.orgName = 'University of Technology';
    if (typeof settings.attendanceThreshold === 'undefined') settings.attendanceThreshold = 75;
    if (typeof settings.lateTolerance === 'undefined') settings.lateTolerance = 15;

    return res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object required' });
    }

    const keys = ['maintenanceMode', 'orgName', 'attendanceThreshold', 'lateTolerance', 'proxyDetection', 'twoFactorAuth', 'sessionTimeout', 'passwordExpiry'];
    for (const key of Object.keys(settings)) {
      if (!keys.includes(key)) continue;
      await SystemSettings.findOneAndUpdate(
        { key },
        { $set: { value: settings[key] } },
        { upsert: true, new: true }
      );
    }

    await logAudit('Settings Updated', req.user.email, 'System settings changed', 'Success');

    const docs = await SystemSettings.find({});
    const out = {};
    docs.forEach((d) => { out[d.key] = d.value; });

    return res.json({ message: 'Settings updated', settings: out });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
};

const createInvite = async (req, res) => {
  try {
    const { email, expiresInDays = 7 } = req.body;
    const { token, expiresAt } = await InviteToken.createInvite({
      email: trimIfString(email) || null,
      createdBy: req.user._id,
      expiresInDays: Math.min(Math.max(Number(expiresInDays) || 7, 1), 30),
      maxUses: 50,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/register/student?token=${token}`;

    await logAudit('Invite Created', req.user.email, `Generated invite link${email ? ` for ${email}` : ''}`, 'Success');

    return res.status(201).json({
      message: 'Invite link created',
      inviteLink,
      token,
      expiresAt,
    });
  } catch (error) {
    console.error('Create invite error:', error);
    return res.status(500).json({ error: 'Failed to create invite link' });
  }
};

module.exports = {
  getOverview,
  getScheduleSummary,
  getReports,
  getReportBlockDetails,
  getAvailableBlocks,
  listArchiveRequests,
  createArchiveRequest,
  updateArchiveRequest,
  listUsers,
  createUser,
  updateUser,
  listAuditLogs,
  listAppReports,
  updateAppReport,
  getSettings,
  updateSettings,
  createInvite,
};
