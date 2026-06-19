const MasterScheduleEntry = require('../models/MasterScheduleEntry');
const User = require('../models/User');

const trimIfString = (v) => (typeof v === 'string' ? v.trim() : '');

const isProgramHeadOrSuper = (user) =>
  user?.roles?.includes('super_admin') || user?.roles?.includes('program_head');

const isProfessorAdmin = (user) => user?.roles?.includes('admin');

async function comCoursesFromMasterBlock(block) {
  const b = trimIfString(block);
  if (!b) return [];
  const entries = await MasterScheduleEntry.find({ block: b }).sort({ order: 1, courseName: 1 }).lean();
  return entries.map((e) => ({
    courseName: e.courseName || '',
    schedule: e.schedule || '',
    room: e.room || '',
  }));
}

/** Push master schedule rows into all students enrolled in this block (enrollment = block on user). */
async function syncStudentsComCoursesForBlock(block) {
  const comCourses = await comCoursesFromMasterBlock(block);
  const b = trimIfString(block);
  if (!b) return { updated: 0 };
  const result = await User.updateMany(
    {
      $and: [
        { roles: 'student' },
        { roles: { $nin: ['admin', 'super_admin', 'program_head'] } },
        { block: b },
      ],
    },
    { $set: { comCourses } }
  );
  return { updated: result.modifiedCount ?? 0 };
}

const listMasterSchedule = async (req, res) => {
  try {
    const user = req.user;
    const query = {};

    if (isProgramHeadOrSuper(user)) {
      const block = trimIfString(req.query.block);
      if (block) query.block = block;
    } else if (isProfessorAdmin(user)) {
      const email = (user.email || '').toLowerCase().trim();
      if (!email) {
        return res.json({ entries: [] });
      }
      query.assignedProfessorEmail = email;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const entries = await MasterScheduleEntry.find(query).sort({ block: 1, order: 1, courseName: 1 }).lean();
    return res.json({
      entries: entries.map((e) => ({
        id: e._id,
        block: e.block,
        courseName: e.courseName,
        schedule: e.schedule,
        room: e.room,
        assignedProfessorEmail: e.assignedProfessorEmail || '',
        graceOverrideMinutes: e.graceOverrideMinutes,
        order: e.order,
        updatedAt: e.updatedAt,
      })),
    });
  } catch (err) {
    console.error('listMasterSchedule error:', err);
    return res.status(500).json({ error: 'Failed to load master schedule' });
  }
};

const createMasterSchedule = async (req, res) => {
  try {
    if (!isProgramHeadOrSuper(req.user)) {
      return res.status(403).json({ error: 'Only Program Head or Super Admin can create master schedule rows' });
    }
    const { block, courseName, schedule, room, assignedProfessorEmail, graceOverrideMinutes, order } = req.body;
    const b = trimIfString(block);
    const cn = trimIfString(courseName);
    const sch = trimIfString(schedule);
    if (!b || !cn || !sch) {
      return res.status(400).json({ error: 'block, courseName, and schedule are required' });
    }

    const doc = await MasterScheduleEntry.create({
      block: b,
      courseName: cn,
      schedule: sch,
      room: trimIfString(room),
      assignedProfessorEmail: assignedProfessorEmail ? String(assignedProfessorEmail).toLowerCase().trim() : '',
      graceOverrideMinutes:
        graceOverrideMinutes === null || graceOverrideMinutes === undefined || graceOverrideMinutes === ''
          ? null
          : Math.min(180, Math.max(0, Number(graceOverrideMinutes))),
      order: typeof order === 'number' && !Number.isNaN(order) ? order : 0,
    });

    await syncStudentsComCoursesForBlock(b);

    return res.status(201).json({
      entry: {
        id: doc._id,
        block: doc.block,
        courseName: doc.courseName,
        schedule: doc.schedule,
        room: doc.room,
        assignedProfessorEmail: doc.assignedProfessorEmail || '',
        graceOverrideMinutes: doc.graceOverrideMinutes,
        order: doc.order,
      },
    });
  } catch (err) {
    console.error('createMasterSchedule error:', err);
    return res.status(500).json({ error: 'Failed to create schedule entry' });
  }
};

const patchMasterSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const entry = await MasterScheduleEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (isProgramHeadOrSuper(user)) {
      const { block, courseName, schedule, room, assignedProfessorEmail, graceOverrideMinutes, order } = req.body;
      if (block !== undefined) entry.block = trimIfString(block) || entry.block;
      if (courseName !== undefined) entry.courseName = trimIfString(courseName) || entry.courseName;
      if (schedule !== undefined) entry.schedule = trimIfString(schedule) || entry.schedule;
      if (room !== undefined) entry.room = trimIfString(room);
      if (assignedProfessorEmail !== undefined) {
        entry.assignedProfessorEmail = assignedProfessorEmail
          ? String(assignedProfessorEmail).toLowerCase().trim()
          : '';
      }
      if (graceOverrideMinutes !== undefined) {
        entry.graceOverrideMinutes =
          graceOverrideMinutes === null || graceOverrideMinutes === '' ? null : Math.min(180, Math.max(0, Number(graceOverrideMinutes)));
      }
      if (order !== undefined && typeof order === 'number' && !Number.isNaN(order)) entry.order = order;
      await entry.save();
      await syncStudentsComCoursesForBlock(entry.block);
      return res.json({
        entry: {
          id: entry._id,
          block: entry.block,
          courseName: entry.courseName,
          schedule: entry.schedule,
          room: entry.room,
          assignedProfessorEmail: entry.assignedProfessorEmail || '',
          graceOverrideMinutes: entry.graceOverrideMinutes,
          order: entry.order,
        },
      });
    }

    if (isProfessorAdmin(user)) {
      const email = (user.email || '').toLowerCase().trim();
      const assigned = (entry.assignedProfessorEmail || '').toLowerCase().trim();
      if (!email || assigned !== email) {
        return res.status(403).json({ error: 'You can only adjust grace periods for your own assigned classes' });
      }
      const { graceOverrideMinutes } = req.body;
      if (graceOverrideMinutes === undefined) {
        return res.status(400).json({ error: 'graceOverrideMinutes is required' });
      }
      entry.graceOverrideMinutes =
        graceOverrideMinutes === null || graceOverrideMinutes === '' ? null : Math.min(180, Math.max(0, Number(graceOverrideMinutes)));
      await entry.save();
      return res.json({
        entry: {
          id: entry._id,
          block: entry.block,
          courseName: entry.courseName,
          schedule: entry.schedule,
          room: entry.room,
          assignedProfessorEmail: entry.assignedProfessorEmail || '',
          graceOverrideMinutes: entry.graceOverrideMinutes,
          order: entry.order,
        },
      });
    }

    return res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error('patchMasterSchedule error:', err);
    return res.status(500).json({ error: 'Failed to update schedule entry' });
  }
};

const deleteMasterSchedule = async (req, res) => {
  try {
    if (!isProgramHeadOrSuper(req.user)) {
      return res.status(403).json({ error: 'Only Program Head or Super Admin can delete master schedule rows' });
    }
    const entry = await MasterScheduleEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    const block = entry.block;
    await entry.deleteOne();
    await syncStudentsComCoursesForBlock(block);
    return res.json({ message: 'Deleted', block });
  } catch (err) {
    console.error('deleteMasterSchedule error:', err);
    return res.status(500).json({ error: 'Failed to delete schedule entry' });
  }
};

const syncBlocks = async (req, res) => {
  try {
    if (!isProgramHeadOrSuper(req.user)) {
      return res.status(403).json({ error: 'Only Program Head or Super Admin can sync enrollment schedules' });
    }
    const { blocks } = req.body;
    let blockList = [];
    if (Array.isArray(blocks)) {
      blockList = blocks.map(trimIfString).filter(Boolean);
    } else if (typeof blocks === 'string' && trimIfString(blocks)) {
      blockList = [trimIfString(blocks)];
    } else {
      blockList = await MasterScheduleEntry.distinct('block');
      blockList = blockList.map(trimIfString).filter(Boolean);
    }

    let totalUpdated = 0;
    for (const b of blockList) {
      const { updated } = await syncStudentsComCoursesForBlock(b);
      totalUpdated += updated;
    }

    return res.json({
      message: 'Schedules synced from master enrollment records',
      blocksProcessed: blockList.length,
      studentDocumentsUpdated: totalUpdated,
    });
  } catch (err) {
    console.error('syncBlocks error:', err);
    return res.status(500).json({ error: 'Failed to sync schedules' });
  }
};

module.exports = {
  listMasterSchedule,
  createMasterSchedule,
  patchMasterSchedule,
  deleteMasterSchedule,
  syncBlocks,
  syncStudentsComCoursesForBlock,
  comCoursesFromMasterBlock,
};
