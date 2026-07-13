import { fmtDate, formatAge, daysBetween, mondayOf, weekKeyOf, addDays } from './dates.js';
import { secondaryAccent, urgencyColor, urgencyLabel, statusMeta } from './constants.js';

// Decorates a task with display-ready strings/styles derived from its raw
// fields. `localDateStr` is the caller's "today" (YYYY-MM-DD) used to decide
// overdue-ness.
export const decorate = (t, localDateStr) => {
  const now = new Date();
  const overdue = !!(t.deadline && t.status !== 'done' && t.deadline.slice(0, 10) < localDateStr);
  return {
    ...t,
    overdue,
    urgencyLabelText: urgencyLabel[t.urgency],
    urgencyDotStyle: {
      display: 'inline-block',
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      backgroundColor: urgencyColor[t.urgency],
    },
    statusLabelText: statusMeta[t.status].label,
    statusPillStyle: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11.5px',
      fontWeight: 600,
      width: 'fit-content',
      backgroundColor: statusMeta[t.status].bg,
      color: statusMeta[t.status].color,
    },
    dateAddedFmt: fmtDate(t.dateAdded),
    ageFmt: formatAge(t.dateAdded, now),
    dateStartedFmt: fmtDate(t.dateStarted),
    dateCompletedFmt: fmtDate(t.dateCompleted),
    deadlineFmt: t.deadline ? fmtDate(t.deadline) : '—',
    deadlineTextStyle: {
      fontSize: '12.5px',
      color: overdue ? secondaryAccent : 'rgba(33,29,58,0.55)',
      fontWeight: overdue ? '700' : '400',
    },
  };
};

export const getFilteredTasks = (tasks, filters) => {
  return tasks
    .filter((t) => {
      if (filters.project !== 'all' && t.project !== filters.project) return false;
      if (filters.urgency !== 'all' && t.urgency !== filters.urgency) return false;
      if (filters.status === 'active') {
        if (t.status === 'done') return false;
      } else if (filters.status !== 'all' && t.status !== filters.status) {
        return false;
      }
      if (filters.type === 'tasks') {
        if (t.dateType === 'reminder') return false;
      } else if (filters.type === 'reminders') {
        if (t.dateType !== 'reminder') return false;
      }
      if (filters.search && !t.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
};

export const getProjectStats = (tasks, projects, localDateStr) => {
  return projects.map((p) => {
    const pt = tasks.filter((t) => t.project === p.name);
    const total = pt.length;
    const todo = pt.filter((t) => t.status === 'todo').length;
    const doing = pt.filter((t) => t.status === 'doing').length;
    const done = pt.filter((t) => t.status === 'done').length;
    const blocked = pt.filter((t) => t.status === 'blocked').length;
    const overdue = pt.filter((t) => t.deadline && t.status !== 'done' && t.deadline.slice(0, 10) < localDateStr).length;
    const completionRate = total ? Math.round((done / total) * 100) : 0;
    return { ...p, total, todo, doing, done, blocked, overdue, completionRate };
  });
};

export const getWeeklyStatsRaw = (tasks) => {
  const now = new Date();
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const wk = mondayOf(addDays(now, -7 * i).toISOString());
    weeks.push(wk.toISOString().slice(0, 10));
  }
  return weeks.map((key) => ({
    key,
    count: tasks.filter((t) => t.dateCompleted && weekKeyOf(t.dateCompleted) === key).length,
  }));
};

export const getWeeksWithCompletions = (tasks) => {
  const set = new Set();
  tasks.forEach((t) => {
    if (t.dateCompleted) set.add(weekKeyOf(t.dateCompleted));
  });
  return [...set].sort().reverse();
};

export const getWeeklyReportTasksRaw = (tasks, selectedWeekKey) => {
  return tasks
    .filter((t) => t.dateCompleted && weekKeyOf(t.dateCompleted) === selectedWeekKey)
    .map((t) => ({
      ...t,
      sinceAdded: daysBetween(t.dateAdded, t.dateCompleted),
      sinceStarted: t.dateStarted ? daysBetween(t.dateStarted, t.dateCompleted) : null,
    }))
    .sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted));
};

// Focus view derived tasks: overdue, upcoming (next 7d), blocked, and up to
// 3 suggested-next tasks (annotated with a human-readable reason).
export const getFocusTasks = (tasks, localDateStr) => {
  // 1. Overdue tasks (active, non-blocked, deadline has passed)
  const overdue = tasks
    .filter((t) => t.status !== 'done' && t.status !== 'blocked' && t.dateType !== 'reminder' && t.deadline && t.deadline.slice(0, 10) < localDateStr)
    .map((t) => decorate(t, localDateStr))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); // Most overdue first

  // 2. Upcoming tasks (active, non-blocked, deadline in the next 7 days)
  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);
  const next7DaysLocalStr = next7Days.toLocaleDateString('sv-SE');
  const upcoming = tasks
    .filter((t) => {
      if (t.status === 'done' || t.status === 'blocked' || t.dateType === 'reminder' || !t.deadline) return false;
      const dlStr = t.deadline.slice(0, 10);
      return dlStr >= localDateStr && dlStr <= next7DaysLocalStr;
    })
    .map((t) => decorate(t, localDateStr))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); // Soonest first

  // 3. Blocked tasks (all currently blocked tasks)
  const blocked = tasks
    .filter((t) => t.status === 'blocked' && t.dateType !== 'reminder')
    .map((t) => decorate(t, localDateStr))
    .sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded)); // Oldest blocked first

  // 4. Suggested tasks (up to 3 active, non-blocked, non-overdue tasks, prioritized)
  const suggestedCandidates = tasks
    .filter((t) => {
      if (t.status === 'done' || t.status === 'blocked' || t.dateType === 'reminder') return false;
      const isOverdue = t.deadline && t.deadline.slice(0, 10) < localDateStr;
      return !isOverdue;
    })
    .map((t) => decorate(t, localDateStr))
    .sort((a, b) => {
      // Status 'doing' first
      if (a.status === 'doing' && b.status !== 'doing') return -1;
      if (b.status === 'doing' && a.status !== 'doing') return 1;

      // Urgency
      const urgencyVal = { high: 3, medium: 2, low: 1 };
      const diffUrgency = urgencyVal[b.urgency] - urgencyVal[a.urgency];
      if (diffUrgency !== 0) return diffUrgency;

      // Deadline closeness
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      if (a.deadline && b.deadline) {
        const diffDeadline = new Date(a.deadline) - new Date(b.deadline);
        if (diffDeadline !== 0) return diffDeadline;
      }

      // Age (older first)
      return new Date(a.dateAdded) - new Date(b.dateAdded);
    });

  // Annotate suggested tasks with a reason
  const suggested = suggestedCandidates.slice(0, 3).map((t) => {
    let reason = 'Active Queue';
    let reasonColor = 'rgba(33, 29, 58, 0.45)';
    let reasonBg = 'rgba(33, 29, 58, 0.06)';

    if (t.status === 'doing') {
      reason = 'Currently in progress';
      reasonColor = '#3f5f9e';
      reasonBg = 'rgba(79, 111, 176, 0.12)';
    } else if (t.urgency === 'high') {
      reason = 'High urgency priority';
      reasonColor = '#c1493f';
      reasonBg = 'rgba(193, 73, 63, 0.1)';
    } else if (t.deadline) {
      const diffDays = daysBetween(localDateStr, t.deadline.slice(0, 10));
      reason = diffDays === 0 ? 'Due today' : diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays} days`;
      reasonColor = '#c68a2e';
      reasonBg = 'rgba(198, 138, 46, 0.12)';
    }

    return {
      ...t,
      suggestionReason: reason,
      suggestionReasonStyle: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        color: reasonColor,
        backgroundColor: reasonBg,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      },
    };
  });

  return { overdue, upcoming, blocked, suggested };
};

const boardAccent = { todo: 'rgba(33,29,58,0.2)', doing: '#3f5f9e', done: '#357a55', blocked: secondaryAccent };

export const getBoardColumns = (tasks, localDateStr) => {
  return ['todo', 'doing', 'blocked', 'done'].map((status) => {
    const colTasks = tasks.filter((t) => t.status === status && t.dateType !== 'reminder');
    return {
      status,
      label: statusMeta[status].label,
      count: colTasks.length,
      accentColor: boardAccent[status],
      tasks: colTasks.map((t) => decorate(t, localDateStr)),
    };
  });
};
