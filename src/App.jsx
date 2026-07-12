import { useState, useEffect } from 'react';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from './auth.jsx';

export default function App() {
  const localDateStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
  const [view, setView] = useState('focus');
  const [filters, setFilters] = useState({ search: '', project: 'all', urgency: 'all', status: 'active', type: 'all' });
  const [panel, setPanel] = useState(null); // null or { mode: 'new' | 'edit', draft: { ... } }
  const [projectForm, setProjectForm] = useState({ show: false, name: '', description: '' });
  const [editingProject, setEditingProject] = useState(null); // null or { id, name, description }
  const [weekKey, setWeekKey] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Update checking state
  const [updateVersion, setUpdateVersion] = useState(null);
  const [dismissedVersion, setDismissedVersion] = useState(null);

  // Auth: session comes from GoogleAuthProvider; the backend independently
  // verifies the Google ID token on every Convex call.
  const { session: user, authError, signInButtonRef, signOut } = useAuth();
  const { isAuthenticated } = useConvexAuth();

  // Update checking effect (polls version.json periodically)
  useEffect(() => {
    if (import.meta.env.DEV) return;

    const checkInterval = 60000; // Check every 60 seconds

    const checkForUpdates = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (!response.ok) return;
        const data = await response.json();

        // Compare server version with build-time __APP_VERSION__ global
        const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
        if (data.version && String(data.version) !== String(currentVersion)) {
          setUpdateVersion(data.version);
        }
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, checkInterval);

    const handleFocus = () => {
      checkForUpdates();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Load state from Convex (skip until the auth token is attached)
  const tasks = useQuery(api.tasks.get, isAuthenticated ? {} : 'skip') ?? [];
  const projects = useQuery(api.projects.get, isAuthenticated ? {} : 'skip') ?? [];

  // Convex mutations
  const saveTaskMutation = useMutation(api.tasks.save);
  const removeTaskMutation = useMutation(api.tasks.remove);
  const moveTaskStatusMutation = useMutation(api.tasks.moveStatus);
  const createProjectMutation = useMutation(api.projects.create);
  const updateProjectMutation = useMutation(api.projects.update);

  // Helper date functions
  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso) || iso.endsWith('T00:00:00.000Z');
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(isDateOnly ? { timeZone: 'UTC' } : {})
    });
  };

  const formatAge = (iso, baseDate) => {
    if (!iso) return '—';
    const now = baseDate || new Date();
    const diffMs = now - new Date(iso);
    if (diffMs < 0) return 'Just now';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} d`;

    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} w`;
  };

  const daysBetween = (a, b) => {
    return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
  };

  const mondayOf = (dateIso) => {
    const d = new Date(dateIso);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const weekKeyOf = (dateIso) => {
    return mondayOf(dateIso).toISOString().slice(0, 10);
  };

  const weekLabel = (weekKeyStr) => {
    const start = new Date(weekKeyStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return fmt(start) + ' – ' + fmt(end);
  };

  // State derive functions
  const getFilteredTasks = () => {
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

  const getProjectStats = () => {
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

  const getWeeklyStatsRaw = () => {
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

  const getWeeksWithCompletions = () => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.dateCompleted) set.add(weekKeyOf(t.dateCompleted));
    });
    return [...set].sort().reverse();
  };

  const getWeeklyReportTasksRaw = (selectedWeekKey) => {
    return tasks
      .filter((t) => t.dateCompleted && weekKeyOf(t.dateCompleted) === selectedWeekKey)
      .map((t) => ({
        ...t,
        sinceAdded: daysBetween(t.dateAdded, t.dateCompleted),
        sinceStarted: t.dateStarted ? daysBetween(t.dateStarted, t.dateCompleted) : null,
      }))
      .sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted));
  };

  // Actions
  const openNewTask = () => {
    setPanel({
      mode: 'new',
      draft: { description: '', project: '', urgency: 'medium', deadline: '', status: 'todo', recurrence: null, dateType: 'deadline' },
    });
  };

  const openEditTask = (task) => {
    setPanel({
      mode: 'edit',
      draft: { ...task, deadline: task.deadline ? task.deadline.slice(0, 10) : '', recurrence: task.recurrence || null, dateType: task.dateType || 'deadline' },
    });
  };

  const closePanel = () => setPanel(null);
  const stopClick = (e) => e.stopPropagation();

  const updateDraft = (key, value) => {
    setPanel((s) => {
      if (!s) return null;
      return {
        ...s,
        draft: { ...s.draft, [key]: value },
      };
    });
  };

  const saveTask = async () => {
    if (!panel || !panel.draft.description.trim()) return;
    let draft = { ...panel.draft };

    // Validate that deadline is provided if task is recurring
    if (draft.recurrence && draft.recurrence !== 'none' && !draft.deadline) {
      alert("A deadline is required for recurring tasks.");
      return;
    }

    const project = (draft.project || '').trim() || 'General';
    const deadline = draft.deadline ? new Date(draft.deadline).toISOString() : null;
    const recurrence = (draft.recurrence && draft.recurrence !== 'none') ? draft.recurrence : null;
    const dateType = draft.deadline ? (draft.dateType || 'deadline') : null;

    await saveTaskMutation({
      _id: panel.mode === 'edit' ? draft._id : undefined,
      description: draft.description,
      project,
      urgency: draft.urgency,
      status: draft.status,
      deadline,
      recurrence,
      dateType,
    });
    setPanel(null);
  };

  const deleteTask = async () => {
    if (!panel || panel.mode !== 'edit') return;
    await removeTaskMutation({ id: panel.draft._id });
    setPanel(null);
  };

  const moveTaskStatus = async (id, status) => {
    await moveTaskStatusMutation({ id, status });
  };

  const snoozeReminder = async (task) => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    const deadline = tom.toISOString();
    await saveTaskMutation({
      _id: task._id,
      description: task.description,
      project: task.project,
      urgency: task.urgency,
      status: task.status,
      deadline,
      recurrence: task.recurrence || null,
      dateType: 'reminder',
    });
  };

  const dragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const allowDrop = (e) => e.preventDefault();

  const handleDrop = (e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    moveTaskStatus(id, status);
  };

  const addProjectQuick = async () => {
    const name = projectForm.name.trim();
    if (!name) return;
    await createProjectMutation({ name, description: projectForm.description });
    setProjectForm({ show: false, name: '', description: '' });
  };

  const saveProjectEdit = async () => {
    if (!editingProject) return;
    const name = editingProject.name.trim();
    if (!name) return;

    const origProject = projects.find((p) => p._id === editingProject.id);
    const oldName = origProject ? origProject.name : '';

    try {
      await updateProjectMutation({
        id: editingProject.id,
        name,
        description: editingProject.description,
      });

      if (oldName && filters.project === oldName) {
        setFilters((f) => ({ ...f, project: name }));
      }

      setEditingProject(null);
    } catch (err) {
      alert(err.message || 'Failed to update project');
    }
  };

  const goToProjectTasks = (name) => {
    setView('tasks');
    setFilters((f) => ({ ...f, project: name, status: 'active', urgency: 'all', search: '' }));
  };

  // Rendering Helpers & Variables
  const accent = '#d8f24a';
  const secondaryAccent = '#c2542f';
  const bg = '#ffffff';

  const urgencyColor = { high: '#c1493f', medium: '#c68a2e', low: '#4b8f6a' };
  const urgencyLabel = { high: 'High', medium: 'Medium', low: 'Low' };
  const statusMeta = {
    todo: { label: 'To Do', bg: 'rgba(33,29,58,0.08)', color: '#4a4570' },
    doing: { label: 'Doing', bg: 'rgba(79,111,176,0.16)', color: '#3f5f9e' },
    done: { label: 'Done', bg: 'rgba(75,143,106,0.18)', color: '#357a55' },
    blocked: { label: 'Blocked', bg: 'rgba(193,73,63,0.16)', color: '#a83c33' },
  };

  const pillBase = 'display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:600;width:fit-content;';

  const decorate = (t) => {
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

  const decoratedFiltered = getFilteredTasks().map(decorate);

  // Focus view derived tasks computation
  const getFocusTasks = () => {
    // 1. Overdue tasks (active, non-blocked, deadline has passed)
    const overdue = tasks
      .filter((t) => t.status !== 'done' && t.status !== 'blocked' && t.dateType !== 'reminder' && t.deadline && t.deadline.slice(0, 10) < localDateStr)
      .map(decorate)
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
      .map(decorate)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); // Soonest first

    // 3. Blocked tasks (all currently blocked tasks)
    const blocked = tasks
      .filter((t) => t.status === 'blocked' && t.dateType !== 'reminder')
      .map(decorate)
      .sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded)); // Oldest blocked first

    // 4. Suggested tasks (up to 3 active, non-blocked, non-overdue tasks, prioritized)
    const suggestedCandidates = tasks
      .filter((t) => {
        if (t.status === 'done' || t.status === 'blocked' || t.dateType === 'reminder') return false;
        const isOverdue = t.deadline && t.deadline.slice(0, 10) < localDateStr;
        return !isOverdue;
      })
      .map(decorate)
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
        }
      };
    });

    return { overdue, upcoming, blocked, suggested };
  };

  const { overdue: focusOverdue, upcoming: focusUpcoming, blocked: focusBlocked, suggested: focusSuggested } = getFocusTasks();

  const activeReminders = tasks.filter((t) => 
    t.status !== 'done' && 
    t.dateType === 'reminder' && 
    t.deadline && 
    t.deadline.slice(0, 10) <= localDateStr
  ).map(decorate);

  const boardAccent = { todo: 'rgba(33,29,58,0.2)', doing: '#3f5f9e', done: '#357a55', blocked: secondaryAccent };
  const boardColumns = ['todo', 'doing', 'blocked', 'done'].map((status) => {
    const colTasks = tasks.filter((t) => t.status === status && t.dateType !== 'reminder');
    return {
      status,
      label: statusMeta[status].label,
      count: colTasks.length,
      accentColor: boardAccent[status],
      tasks: colTasks.map(decorate),
    };
  });

  const projectStats = getProjectStats().map((p) => ({
    ...p,
    hasDescription: !!p.description,
    barStyle: {
      height: '100%',
      borderRadius: '4px',
      backgroundColor: '#211d3a',
      width: `${p.completionRate}%`,
    },
  }));

  const weeklyRaw = getWeeklyStatsRaw();
  const maxWeek = Math.max(1, ...weeklyRaw.map((w) => w.count));
  const weeklyStatsBars = weeklyRaw.map((w) => ({
    key: w.key,
    count: w.count,
    shortLabel: fmtDate(w.key),
    barStyle: {
      width: '28px',
      borderRadius: '5px 5px 0 0',
      backgroundColor: accent,
      height: `${Math.max(4, Math.round((w.count / maxWeek) * 150))}px`,
    },
  }));

  const weeksList = getWeeksWithCompletions();
  const selectedWeekKey = weekKey && weeksList.includes(weekKey) ? weekKey : weeksList[0] || null;
  const weeklyReportRows = selectedWeekKey
    ? getWeeklyReportTasksRaw(selectedWeekKey).map((t) => ({
        ...t,
        dateAddedFmt: fmtDate(t.dateAdded),
        dateStartedFmt: fmtDate(t.dateStarted),
        dateCompletedFmt: fmtDate(t.dateCompleted),
        sinceAddedFmt: t.sinceAdded + 'd',
        sinceStartedFmt: t.sinceStarted != null ? t.sinceStarted + 'd' : '—',
      }))
    : [];

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const totalOverdue = tasks.filter((t) => t.deadline && t.status !== 'done' && t.deadline.slice(0, 10) < localDateStr).length;
  const totalBlocked = tasks.filter((t) => t.status === 'blocked').length;
  const overallCompletionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const completedWithDates = tasks.filter((t) => t.status === 'done' && t.dateCompleted);
  const overallAvgDays = completedWithDates.length
    ? Math.round(
        completedWithDates.reduce((s, t) => s + daysBetween(t.dateAdded, t.dateCompleted), 0) /
          completedWithDates.length
      )
    : 0;

  const tabLabels = {
    focus: 'Focus',
    tasks: 'Tasks',
    board: 'Board',
    projects: 'Projects',
    analytics: 'Analytics',
    weekly: 'Weekly Report',
  };
  const tabs = ['focus', 'tasks', 'board', 'projects', 'analytics', 'weekly'].map((v) => {
    const active = view === v;
    return {
      key: v,
      label: tabLabels[v],
      active,
    };
  });

  const urgencyOptions = ['high', 'medium', 'low'].map((u) => {
    const active = panel && panel.draft.urgency === u;
    return {
      value: u,
      label: urgencyLabel[u],
      style: {
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1.5px solid ' + urgencyColor[u],
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        backgroundColor: active ? urgencyColor[u] : 'transparent',
        color: active ? '#fff' : urgencyColor[u],
      },
    };
  });

  const statusOptions = ['todo', 'doing', 'blocked', 'done'].map((s) => {
    const active = panel && panel.draft.status === s;
    return {
      value: s,
      label: statusMeta[s].label,
      style: {
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1.5px solid ' + statusMeta[s].color,
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        backgroundColor: active ? statusMeta[s].color : 'transparent',
        color: active ? '#fff' : statusMeta[s].color,
      },
    };
  });

  const panelView = panel
    ? {
        description: panel.draft.description,
        project: panel.draft.project,
        deadline: panel.draft.deadline,
        recurrence: panel.draft.recurrence || null,
        addedFmt: panel.mode === 'edit' ? fmtDate(panel.draft.dateAdded) : null,
        startedFmt: panel.mode === 'edit' ? fmtDate(panel.draft.dateStarted) : null,
        completedFmt: panel.mode === 'edit' ? fmtDate(panel.draft.dateCompleted) : null,
      }
    : { description: '', project: '', deadline: '', recurrence: null };

  const ringDeg = Math.round((overallCompletionRate / 100) * 360);

  if (!user) {
    return (
      <div className="login-overlay">
        <div className="login-card">
          <div className="login-logo">Task Manager</div>
          <div className="login-tagline">Personal Task Record</div>
          
          <h1 className="login-title">Sign In</h1>
          <p className="login-description">
            This is a private personal task record application. Please sign in with your authorized Google account to proceed.
          </p>

          {authError && (
            <div className="login-error">
              {authError}
            </div>
          )}

          <div className="login-google-container">
            <div ref={signInButtonRef}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button className="hamburger-btn" onClick={() => setMobileMenuOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <span className="mobile-title">Task Manager</span>
        </div>
        <button className="mobile-new-task-btn" onClick={openNewTask}>
          + New Task
        </button>
      </div>

      {/* Sidebar Drawer Overlay for Mobile */}
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div style={{ marginBottom: '52px' }}>
          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '27px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Task Manager
          </div>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: 'rgba(247, 242, 232, 0.4)',
              marginTop: '5px',
            }}
          >
            PERSONAL TASK RECORD
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setView(tab.key);
                setMobileMenuOpen(false);
              }}
              className={`sidebar-tab ${tab.active ? 'active' : 'inactive'}`}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '3px',
                  height: '16px',
                  borderRadius: '2px',
                  marginRight: '12px',
                  verticalAlign: 'middle',
                  backgroundColor: tab.active ? accent : 'transparent',
                }}
              ></span>
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{tab.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            openNewTask();
            setMobileMenuOpen(false);
          }}
          className="cta-btn"
          style={{ marginBottom: '12px' }}
        >
          + New Task
        </button>

        <button
          onClick={signOut}
          className="logout-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Log Out
        </button>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Focus Screen */}
        {view === 'focus' && (
          <div style={{ animation: 'fadeInUp 0.45s ease' }}>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '11px',
                letterSpacing: '0.14em',
                color: 'rgba(33, 29, 58, 0.4)',
                marginBottom: '10px',
              }}
            >
              00 — ACTION CENTER
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '24px',
                flexWrap: 'wrap',
                marginBottom: '28px',
              }}
            >
              <div className="page-title">
                Focus
              </div>
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '12px',
                  color: 'rgba(33, 29, 58, 0.45)',
                }}
              >
                DAILY HUDDLE & PRIORITIES
              </div>
            </div>
            <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '28px' }}></div>



            <div className="focus-grid">
              {/* Overdue Column */}
              <div className="focus-column">
                <div className="focus-column-header">
                  <div className="focus-column-header-top">
                    <span className="focus-column-title">Overdue</span>
                    <span className="focus-column-count">{focusOverdue.length}</span>
                  </div>
                  <div className="focus-column-bar" style={{ backgroundColor: '#c2542f' }}></div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {focusOverdue.map((t) => (
                    <div key={t._id} onClick={() => openEditTask(t)} className="focus-task-card">
                      <div className="focus-task-title">
                        {t.description}
                        {t.recurrence && (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '2px',
                            marginLeft: '6px',
                            fontSize: '8.5px',
                            color: '#6b4fbb',
                            backgroundColor: 'rgba(107, 79, 187, 0.08)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: '700',
                            verticalAlign: 'middle',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10"></polyline>
                              <polyline points="1 20 1 14 7 14"></polyline>
                              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                            {t.recurrence}
                          </span>
                        )}
                      </div>
                      <div className="focus-task-meta">
                        <span className="focus-task-project">{t.project}</span>
                        <span className="focus-task-date-red">Overdue • {t.deadlineFmt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Column */}
              <div className="focus-column">
                <div className="focus-column-header">
                  <div className="focus-column-header-top">
                    <span className="focus-column-title">Upcoming • 7d</span>
                    <span className="focus-column-count">{focusUpcoming.length}</span>
                  </div>
                  <div className="focus-column-bar" style={{ backgroundColor: '#c68a2e' }}></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {focusUpcoming.map((t) => (
                    <div key={t._id} onClick={() => openEditTask(t)} className="focus-task-card">
                      <div className="focus-task-title">
                        {t.description}
                        {t.recurrence && (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '2px',
                            marginLeft: '6px',
                            fontSize: '8.5px',
                            color: '#6b4fbb',
                            backgroundColor: 'rgba(107, 79, 187, 0.08)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: '700',
                            verticalAlign: 'middle',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10"></polyline>
                              <polyline points="1 20 1 14 7 14"></polyline>
                              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                            {t.recurrence}
                          </span>
                        )}
                      </div>
                      <div className="focus-task-meta">
                        <span className="focus-task-project">{t.project}</span>
                        <span className="focus-task-date-gold">Due • {t.deadlineFmt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Blocked Column */}
              <div className="focus-column">
                <div className="focus-column-header">
                  <div className="focus-column-header-top">
                    <span className="focus-column-title">Blocked</span>
                    <span className="focus-column-count">{focusBlocked.length}</span>
                  </div>
                  <div className="focus-column-bar" style={{ backgroundColor: '#c2542f' }}></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {focusBlocked.map((t) => (
                    <div key={t._id} onClick={() => openEditTask(t)} className="focus-task-card">
                      <div className="focus-task-title">
                        {t.description}
                        {t.recurrence && (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '2px',
                            marginLeft: '6px',
                            fontSize: '8.5px',
                            color: '#6b4fbb',
                            backgroundColor: 'rgba(107, 79, 187, 0.08)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: '700',
                            verticalAlign: 'middle',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10"></polyline>
                              <polyline points="1 20 1 14 7 14"></polyline>
                              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                            {t.recurrence}
                          </span>
                        )}
                      </div>
                      <div className="focus-task-meta">
                        <span className="focus-task-project">{t.project}</span>
                        {t.deadline && (
                          <span className="focus-task-date-gray">{t.deadlineFmt}</span>
                        )}
                      </div>
                      <div className="focus-badge-container">
                        <span className="focus-badge badge-blocked">Blocked</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Column */}
              <div className="focus-column">
                <div className="focus-column-header">
                  <div className="focus-column-header-top">
                    <span className="focus-column-title">Suggested Next</span>
                    <span className="focus-column-count">{focusSuggested.length}</span>
                  </div>
                  <div className="focus-column-bar" style={{ backgroundColor: '#d8f24a' }}></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {focusSuggested.map((t) => (
                    <div key={t._id} onClick={() => openEditTask(t)} className="focus-task-card">
                      <div className="focus-task-title">
                        {t.description}
                        {t.recurrence && (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '2px',
                            marginLeft: '6px',
                            fontSize: '8.5px',
                            color: '#6b4fbb',
                            backgroundColor: 'rgba(107, 79, 187, 0.08)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: '700',
                            verticalAlign: 'middle',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10"></polyline>
                              <polyline points="1 20 1 14 7 14"></polyline>
                              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                            {t.recurrence}
                          </span>
                        )}
                      </div>
                      <div className="focus-task-meta">
                        <span className="focus-task-project">{t.project}</span>
                        <span className="focus-task-priority">
                          <span className="focus-priority-dot" style={{ backgroundColor: urgencyColor[t.urgency] }}></span>
                          {urgencyLabel[t.urgency]}
                        </span>
                      </div>
                      {t.status === 'doing' && (
                        <div className="focus-badge-container">
                          <span className="focus-badge badge-in-progress">In progress</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Screen */}
        {view === 'tasks' && (
          <div style={{ animation: 'fadeInUp 0.45s ease' }}>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '11px',
                letterSpacing: '0.14em',
                color: 'rgba(33, 29, 58, 0.4)',
                marginBottom: '10px',
              }}
            >
              01 — ALL RECORDS
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '24px',
                flexWrap: 'wrap',
                marginBottom: '28px',
              }}
            >
              <div className="page-title">
                Tasks
              </div>
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '12px',
                  color: 'rgba(33, 29, 58, 0.45)',
                }}
              >
                {decoratedFiltered.length} OF {tasks.length} SHOWN
              </div>
            </div>
            <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '28px' }}></div>

            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
              <input
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search tasks…"
                style={{
                  flex: 1,
                  minWidth: '220px',
                  height: '42px',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(33, 29, 58, 0.16)',
                  backgroundColor: '#fff',
                  fontSize: '14px',
                  color: '#211d3a',
                  outline: 'none',
                }}
              />
              <select
                value={filters.project}
                onChange={(e) => setFilters((f) => ({ ...f, project: e.target.value }))}
                style={{
                  height: '42px',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(33, 29, 58, 0.16)',
                  backgroundColor: '#fff',
                  fontSize: '14px',
                  color: '#211d3a',
                }}
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.urgency}
                onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value }))}
                style={{
                  height: '42px',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(33, 29, 58, 0.16)',
                  backgroundColor: '#fff',
                  fontSize: '14px',
                  color: '#211d3a',
                }}
              >
                <option value="all">All Urgency</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                style={{
                  height: '42px',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(33, 29, 58, 0.16)',
                  backgroundColor: '#fff',
                  fontSize: '14px',
                  color: '#211d3a',
                }}
              >
                <option value="active">Active Tasks</option>
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="doing">Doing</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
              <select
                value={filters.type || 'all'}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                style={{
                  height: '42px',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(33, 29, 58, 0.16)',
                  backgroundColor: '#fff',
                  fontSize: '14px',
                  color: '#211d3a',
                }}
              >
                <option value="all">All Types</option>
                <option value="tasks">Tasks Only</option>
                <option value="reminders">Reminders Only</option>
              </select>
            </div>

            {/* Active Filters Warning Banner */}
            {(() => {
              const activeFilters = [];
              if (filters.project !== 'all') activeFilters.push({ key: 'project', label: `Project: ${filters.project}` });
              if (filters.urgency !== 'all') activeFilters.push({ key: 'urgency', label: `Urgency: ${filters.urgency}` });
              if (filters.status !== 'active') {
                const statusLabels = { all: 'All Status', todo: 'To Do', doing: 'Doing', blocked: 'Blocked', done: 'Done' };
                activeFilters.push({ key: 'status', label: `Status: ${statusLabels[filters.status] || filters.status}` });
              }
              if (filters.type && filters.type !== 'all') {
                const typeLabels = { tasks: 'Tasks Only', reminders: 'Reminders Only' };
                activeFilters.push({ key: 'type', label: `Type: ${typeLabels[filters.type]}` });
              }
              if (activeFilters.length === 0) return null;

              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(33, 29, 58, 0.04)',
                    border: '1px solid rgba(33, 29, 58, 0.1)',
                    marginBottom: '28px',
                    fontSize: '14px',
                    color: '#211d3a',
                    fontFamily: 'inherit',
                    animation: 'fadeInUp 0.3s ease',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', opacity: 0.65 }}>
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <span style={{ marginRight: '4px' }}>Showing filtered tasks:</span>
                    {activeFilters.map((f) => (
                      <span
                        key={f.key}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(33, 29, 58, 0.08)',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#211d3a',
                        }}
                      >
                        {f.label}
                        <button
                          onClick={() => setFilters((prev) => ({ ...prev, [f.key]: f.key === 'status' ? 'active' : 'all' }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0 2px',
                            fontSize: '12px',
                            fontWeight: '700',
                            color: '#c2542f',
                            display: 'inline-flex',
                            alignItems: 'center',
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setFilters((prev) => ({ ...prev, project: 'all', urgency: 'all', status: 'active', type: 'all' }))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#c2542f',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      transition: 'opacity 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.target.style.opacity = '0.85')}
                    onMouseLeave={(e) => (e.target.style.opacity = '1')}
                  >
                    Clear all
                  </button>
                </div>
              );
            })()}

            {/* List Table */}
            <div style={{ overflowX: 'auto' }}>
              <div className="task-table-header">
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>STATUS</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>TASK</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>PROJECT</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>URGENCY</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>DEADLINE</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>AGE</span>
              </div>
              {decoratedFiltered.map((t) => (
                <div key={t._id} onClick={() => openEditTask(t)} className={`task-row ${t.overdue ? 'overdue' : ''}`}>
                  <span style={t.statusPillStyle}>{t.statusLabelText}</span>
                  <span className="task-desc">
                    <span style={{ verticalAlign: 'middle' }}>
                      {t.dateType === 'reminder' && (
                        <svg 
                          width="14" 
                          height="14" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="#6b4fbb" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }}
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      )}
                      {t.description}
                    </span>
                    {t.recurrence && (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '3px',
                        marginLeft: '8px',
                        fontSize: '9.5px',
                        color: '#6b4fbb',
                        backgroundColor: 'rgba(107, 79, 187, 0.08)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: '700',
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <polyline points="1 20 1 14 7 14"></polyline>
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        {t.recurrence}
                      </span>
                    )}
                  </span>
                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11.5px', color: 'rgba(33, 29, 58, 0.55)' }}>{t.project}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.65)' }}>
                    <span style={t.urgencyDotStyle}></span>
                    {t.urgencyLabelText}
                  </span>
                  <span style={{ ...t.deadlineTextStyle, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    {t.dateType === 'reminder' && (
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="#6b4fbb" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        style={{ verticalAlign: 'middle' }}
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    )}
                    {t.deadlineFmt}
                  </span>
                  <span title={t.dateAddedFmt} style={{ fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.5)' }}>{t.ageFmt}</span>
                </div>
              ))}
              {decoratedFiltered.length === 0 && (
                <div
                  style={{
                    padding: '60px',
                    textAlign: 'center',
                    color: 'rgba(33, 29, 58, 0.4)',
                    fontSize: '15px',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}
                >
                  No tasks match these filters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Board Screen */}
        {view === 'board' && (
          <div style={{ animation: 'fadeInUp 0.45s ease' }}>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '11px',
                letterSpacing: '0.14em',
                color: 'rgba(33, 29, 58, 0.4)',
                marginBottom: '10px',
              }}
            >
              02 — WORKFLOW
            </div>
            <div className="page-title" style={{ marginBottom: '28px' }}>
              Board
            </div>
            <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '28px' }}></div>
            <div className="board-scroll-container">
              <div className="board-columns-container">
                {boardColumns.map((col) => (
                  <div
                    key={col.status}
                    onDragOver={allowDrop}
                    onDrop={(e) => handleDrop(e, col.status)}
                    style={{ flex: 1, minWidth: '250px' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        marginBottom: '20px',
                        paddingBottom: '8px',
                        borderBottom: `3px solid ${col.accentColor}`,
                      }}
                    >
                      <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: 600, color: '#211d3a' }}>{col.label}</span>
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '12px', fontWeight: 500, color: 'rgba(33, 29, 58, 0.4)' }}>{col.count}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
                      {col.tasks.map((t) => (
                        <div
                          key={t._id}
                          draggable
                          onDragStart={(e) => dragStart(e, t._id)}
                          onClick={() => openEditTask(t)}
                          className={`board-card ${t.overdue ? 'overdue' : ''}`}
                        >
                          <div
                            style={{
                              fontFamily: "'Source Serif 4', Georgia, serif",
                              fontSize: '15.5px',
                              fontWeight: 500,
                              color: '#211d3a',
                              marginBottom: '10px',
                              lineHeight: 1.4,
                            }}
                          >
                            <span style={{ verticalAlign: 'middle' }}>{t.description}</span>
                            {t.recurrence && (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '2px',
                                marginLeft: '6px',
                                fontSize: '8.5px',
                                color: '#6b4fbb',
                                backgroundColor: 'rgba(107, 79, 187, 0.08)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                verticalAlign: 'middle',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="23 4 23 10 17 10"></polyline>
                                  <polyline points="1 20 1 14 7 14"></polyline>
                                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                                {t.recurrence}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                            <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", fontWeight: 500, color: 'rgba(33, 29, 58, 0.4)' }}>{t.project}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={t.urgencyDotStyle}></span>
                              <span style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", 
                                fontWeight: t.overdue ? 700 : 500, 
                                color: t.overdue ? '#c2542f' : 'rgba(33, 29, 58, 0.4)',
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '5px' 
                              }}>
                                {t.dateType === 'reminder' && (
                                  <svg 
                                    width="12" 
                                    height="12" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="#6b4fbb" 
                                    strokeWidth="2.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    style={{ verticalAlign: 'middle' }}
                                  >
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                  </svg>
                                )}
                                {t.deadlineFmt}
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Projects Screen */}
        {view === 'projects' && (
          <div style={{ animation: 'fadeInUp 0.45s ease' }}>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '11px',
                letterSpacing: '0.14em',
                color: 'rgba(33, 29, 58, 0.4)',
                marginBottom: '10px',
              }}
            >
              03 — PORTFOLIO
            </div>
            <div className="page-title" style={{ marginBottom: '28px' }}>
              Projects
            </div>
            <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '32px' }}></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '24px' }}>
              {projectStats.map((p) => (
                <div key={p._id} className="project-card">
                  {editingProject && editingProject.id === p._id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
                      <div>
                        <div
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                            fontSize: '10px',
                            letterSpacing: '0.1em',
                            color: 'rgba(33, 29, 58, 0.4)',
                            marginBottom: '8px',
                          }}
                        >
                          EDIT PROJECT
                        </div>
                        <input
                          value={editingProject.name}
                          onChange={(e) => setEditingProject((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Project name"
                          style={{
                            padding: '9px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(33, 29, 58, 0.16)',
                            fontSize: '13px',
                            width: '100%',
                            fontFamily: 'inherit',
                            marginBottom: '8px',
                          }}
                        />
                        <textarea
                          value={editingProject.description}
                          onChange={(e) => setEditingProject((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Description (optional)"
                          rows={3}
                          style={{
                            padding: '9px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(33, 29, 58, 0.16)',
                            fontSize: '13px',
                            width: '100%',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        <button
                          onClick={saveProjectEdit}
                          style={{
                            flex: 1,
                            padding: '9px 10px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#211d3a',
                            color: '#f7f2e8',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingProject(null)}
                          style={{
                            flex: 1,
                            padding: '9px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(33, 29, 58, 0.16)',
                            background: 'none',
                            color: '#211d3a',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                            fontSize: '10px',
                            letterSpacing: '0.1em',
                            color: 'rgba(33, 29, 58, 0.4)',
                            marginBottom: '8px',
                          }}
                        >
                          PROJECT
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '25px', fontWeight: 600 }}>{p.name}</div>
                        {p.hasDescription && (
                          <div style={{ fontSize: '13px', color: 'rgba(33, 29, 58, 0.55)', marginTop: '6px' }}>{p.description}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(33, 29, 58, 0.55)', flexWrap: 'wrap' }}>
                        <span>{p.todo} todo</span>
                        <span>{p.doing} doing</span>
                        <span>{p.done} done</span>
                        <span>{p.blocked} blocked</span>
                        {p.overdue > 0 && (
                          <span style={{ color: '#c1493f', fontWeight: 'bold' }}>{p.overdue} overdue</span>
                        )}
                      </div>
                      <div style={{ borderTop: '1px solid rgba(33, 29, 58, 0.1)', paddingTop: '16px' }}>
                        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '44px', fontWeight: 700, lineHeight: 1 }}>
                          {p.completionRate}%
                        </div>
                        <div
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                            fontSize: '10px',
                            letterSpacing: '0.08em',
                            color: 'rgba(33, 29, 58, 0.4)',
                            marginTop: '6px',
                          }}
                        >
                          COMPLETE · {p.total} TASKS
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                        <button
                          onClick={() => goToProjectTasks(p.name)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontFamily: "'Playfair Display', Georgia, serif",
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#211d3a',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: '4px',
                          }}
                        >
                          View tasks →
                        </button>
                        <button
                          onClick={() => setEditingProject({ id: p._id, name: p.name, description: p.description || '' })}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontFamily: "'Playfair Display', Georgia, serif",
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'rgba(33, 29, 58, 0.55)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: '4px',
                          }}
                        >
                          Edit project
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              <div
                style={{
                  border: '1.5px dashed rgba(33, 29, 58, 0.25)',
                  borderRadius: '16px',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '200px',
                }}
              >
                {projectForm.show ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <input
                      value={projectForm.name}
                      onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Project name"
                      style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid rgba(33, 29, 58, 0.16)', fontSize: '13px' }}
                    />
                    <input
                      value={projectForm.description}
                      onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Description (optional)"
                      style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid rgba(33, 29, 58, 0.16)', fontSize: '13px' }}
                    />
                    <button
                      onClick={addProjectQuick}
                      style={{
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#211d3a',
                        color: '#f7f2e8',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Add project
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setProjectForm((f) => ({ ...f, show: true }))}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '15px',
                      color: 'rgba(33, 29, 58, 0.5)',
                      cursor: 'pointer',
                    }}
                  >
                    + Add project
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Screen */}
        {view === 'analytics' && (
          <div style={{ animation: 'fadeInUp 0.45s ease' }}>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '11px',
                letterSpacing: '0.14em',
                color: 'rgba(33, 29, 58, 0.4)',
                marginBottom: '10px',
              }}
            >
              04 — PERFORMANCE
            </div>
            <div className="page-title" style={{ marginBottom: '28px' }}>
              Analytics
            </div>
            <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '36px' }}></div>

            <div className="analytics-grid" style={{ marginBottom: '48px' }}>
              <div style={{ background: '#211d3a', borderRadius: '18px', padding: '32px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    background: `conic-gradient(${accent} ${ringDeg}deg, rgba(247, 242, 232, 0.15) ${ringDeg}deg)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '50%',
                      background: '#211d3a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '30px', fontWeight: 700, color: '#f7f2e8' }}>
                      {overallCompletionRate}%
                    </div>
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      fontSize: '10.5px',
                      letterSpacing: '0.08em',
                      color: 'rgba(247, 242, 232, 0.5)',
                      marginBottom: '6px',
                    }}
                  >
                    COMPLETION RATE
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', color: '#f7f2e8' }}>Across all projects</div>
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(33, 29, 58, 0.1)', borderRadius: '18px', padding: '28px' }}>
                <div
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: '10.5px',
                    letterSpacing: '0.08em',
                    color: 'rgba(33, 29, 58, 0.45)',
                    marginBottom: '18px',
                  }}
                >
                  TOTAL TASKS
                </div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '54px', fontWeight: 700, lineHeight: 1 }}>
                  {totalTasks}
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(33, 29, 58, 0.1)', borderRadius: '18px', padding: '28px' }}>
                <div
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: '10.5px',
                    letterSpacing: '0.08em',
                    color: 'rgba(33, 29, 58, 0.45)',
                    marginBottom: '18px',
                  }}
                >
                  AVG DAYS TO COMPLETE
                </div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '54px', fontWeight: 700, lineHeight: 1 }}>
                  {overallAvgDays}
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(33, 29, 58, 0.1)', borderRadius: '18px', padding: '28px' }}>
                <div
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: '10.5px',
                    letterSpacing: '0.08em',
                    color: 'rgba(33, 29, 58, 0.45)',
                    marginBottom: '18px',
                  }}
                >
                  OVERDUE TASKS
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '54px',
                    fontWeight: 700,
                    lineHeight: 1,
                    color: totalOverdue > 0 ? '#c1493f' : '#211d3a',
                  }}
                >
                  {totalOverdue}
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(33, 29, 58, 0.1)', borderRadius: '18px', padding: '28px' }}>
                <div
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: '10.5px',
                    letterSpacing: '0.08em',
                    color: 'rgba(33, 29, 58, 0.45)',
                    marginBottom: '18px',
                  }}
                >
                  BLOCKED TASKS
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '54px',
                    fontWeight: 700,
                    lineHeight: 1,
                    color: totalBlocked > 0 ? '#a83c33' : '#211d3a',
                  }}
                >
                  {totalBlocked}
                </div>
              </div>
            </div>

            {/* By Project Stats */}
            <div style={{ marginBottom: '48px' }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', fontWeight: 600, marginBottom: '20px' }}>By Project</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {projectStats.map((p) => (
                  <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    <span
                      style={{
                        width: '160px',
                        flexShrink: 0,
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: '15px',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.name}
                    </span>
                    <div style={{ flex: 1, height: '8px', background: 'rgba(33, 29, 58, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={p.barStyle}></div>
                    </div>
                    <span style={{ width: '46px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{p.completionRate}%</span>
                    <span
                      style={{
                        width: '70px',
                        textAlign: 'right',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        fontSize: '11px',
                        color: 'rgba(33, 29, 58, 0.45)',
                      }}
                    >
                      {p.total} tasks
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed by Week Bar Chart */}
            <div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', fontWeight: 600, marginBottom: '20px' }}>
                Completed by Week
              </div>
              <div className="weekly-chart-container">
                {weeklyStatsBars.map((w) => (
                  <div
                    key={w.key}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#211d3a' }}>{w.count}</span>
                    <div style={w.barStyle}></div>
                    <span
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        fontSize: '10px',
                        color: 'rgba(33, 29, 58, 0.45)',
                      }}
                    >
                      {w.shortLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Weekly Report Screen */}
        {view === 'weekly' && (
          <div style={{ animation: 'fadeInUp 0.45s ease' }}>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '11px',
                letterSpacing: '0.14em',
                color: 'rgba(33, 29, 58, 0.4)',
                marginBottom: '10px',
              }}
            >
              05 — RECORD
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              <div className="page-title">
                Weekly Report
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {weeksList.map((wKey) => {
                  const active = wKey === selectedWeekKey;
                  return (
                    <button
                      key={wKey}
                      onClick={() => setWeekKey(wKey)}
                      style={{
                        padding: '7px 13px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: active ? '#211d3a' : 'rgba(33, 29, 58, 0.07)',
                        color: active ? '#f7f2e8' : 'rgba(33, 29, 58, 0.6)',
                      }}
                    >
                      {weekLabel(wKey)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '20px' }}></div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px', color: 'rgba(33, 29, 58, 0.6)', marginBottom: '28px' }}>
              {selectedWeekKey
                ? `${weeklyReportRows.length} task(s) completed the week of ${weekLabel(selectedWeekKey)}`
                : 'No completed tasks yet'}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div
                style={{
                  minWidth: '820px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 130px 90px 90px 100px 140px 140px',
                  gap: '14px',
                  padding: '0 4px 12px',
                  borderBottom: '1px solid rgba(33, 29, 58, 0.18)',
                }}
              >
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>TASK</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>PROJECT</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>ADDED</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>STARTED</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>DONE</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>SINCE ADDED</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>SINCE STARTED</span>
              </div>
              {weeklyReportRows.map((t) => (
                <div
                  key={t._id}
                  style={{
                    minWidth: '820px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 130px 90px 90px 100px 140px 140px',
                    gap: '14px',
                    alignItems: 'center',
                    padding: '16px 4px',
                    borderBottom: '1px solid rgba(33, 29, 58, 0.08)',
                  }}
                >
                  <span style={{ fontFamily: 'inherit', fontSize: '15px' }}>{t.description}</span>
                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11.5px', color: 'rgba(33, 29, 58, 0.55)' }}>{t.project}</span>
                  <span style={{ fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.5)' }}>{t.dateAddedFmt}</span>
                  <span style={{ fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.5)' }}>{t.dateStartedFmt}</span>
                  <span style={{ fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.5)' }}>{t.dateCompletedFmt}</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700 }}>{t.sinceAddedFmt}</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700 }}>{t.sinceStartedFmt}</span>
                </div>
              ))}
              {weeklyReportRows.length === 0 && (
                <div
                  style={{
                    padding: '60px',
                    textAlign: 'center',
                    color: 'rgba(33, 29, 58, 0.4)',
                    fontSize: '15px',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}
                >
                  No tasks completed this week.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Creation / Edit Overlay Panel */}
      {panel && (
        <>
          <div
            onClick={closePanel}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(33, 29, 58, 0.4)',
              zIndex: 30,
            }}
          ></div>
          <div
            onClick={stopClick}
            className="task-panel"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '26px', fontWeight: 600 }}>
                {panel.mode === 'edit' ? 'Edit Task' : 'New Task'}
              </div>
              <button
                onClick={closePanel}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  color: 'rgba(33, 29, 58, 0.5)',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '10.5px',
                  letterSpacing: '0.08em',
                  color: 'rgba(33, 29, 58, 0.45)',
                  marginBottom: '7px',
                }}
              >
                DESCRIPTION
              </div>
              <textarea
                value={panelView.description}
                onChange={(e) => updateDraft('description', e.target.value)}
                rows="3"
                placeholder="What needs doing?"
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  borderRadius: '9px',
                  border: '1px solid rgba(33, 29, 58, 0.18)',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
              ></textarea>
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '10.5px',
                  letterSpacing: '0.08em',
                  color: 'rgba(33, 29, 58, 0.45)',
                  marginBottom: '7px',
                }}
              >
                PROJECT
              </div>
              <input
                value={panelView.project}
                onChange={(e) => updateDraft('project', e.target.value)}
                list="project-options"
                placeholder="General"
                style={{
                  width: '100%',
                  height: '41px',
                  boxSizing: 'border-box',
                  padding: '10px 13px',
                  borderRadius: '9px',
                  border: '1px solid rgba(33, 29, 58, 0.18)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <datalist id="project-options">
                {projects.map((p) => (
                  <option key={p._id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '10.5px',
                  letterSpacing: '0.08em',
                  color: 'rgba(33, 29, 58, 0.45)',
                  marginBottom: '7px',
                }}
              >
                URGENCY
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {urgencyOptions.map((opt) => (
                  <button key={opt.value} onClick={() => updateDraft('urgency', opt.value)} style={opt.style}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '7px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: '10.5px',
                    letterSpacing: '0.08em',
                    color: 'rgba(33, 29, 58, 0.45)',
                  }}
                >
                  DATE (OPTIONAL)
                </div>
                {panel.draft.deadline && (
                  <button
                    type="button"
                    onClick={() => {
                      updateDraft('deadline', '');
                      updateDraft('recurrence', null);
                      updateDraft('dateType', 'deadline');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#c1493f',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
              <input
                type="date"
                value={panelView.deadline}
                onChange={(e) => {
                  const val = e.target.value;
                  updateDraft('deadline', val);
                  if (!val) {
                    updateDraft('recurrence', null);
                  }
                }}
                style={{
                  width: '100%',
                  height: '41px',
                  boxSizing: 'border-box',
                  padding: '10px 13px',
                  borderRadius: '9px',
                  border: '1px solid rgba(33, 29, 58, 0.18)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              {panel.draft.deadline && (
                <div style={{ marginTop: '10px' }}>
                  <div
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      color: 'rgba(33, 29, 58, 0.45)',
                      marginBottom: '7px',
                    }}
                  >
                    DATE PURPOSE
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => updateDraft('dateType', 'deadline')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid ' + (panel.draft.dateType !== 'reminder' ? '#211d3a' : 'rgba(33, 29, 58, 0.18)'),
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: panel.draft.dateType !== 'reminder' ? '#211d3a' : 'transparent',
                        color: panel.draft.dateType !== 'reminder' ? '#fff' : '#211d3a',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Task Deadline
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDraft('dateType', 'reminder')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid ' + (panel.draft.dateType === 'reminder' ? '#211d3a' : 'rgba(33, 29, 58, 0.18)'),
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: panel.draft.dateType === 'reminder' ? '#211d3a' : 'transparent',
                        color: panel.draft.dateType === 'reminder' ? '#fff' : '#211d3a',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Reminder Alert
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '10.5px',
                  letterSpacing: '0.08em',
                  color: 'rgba(33, 29, 58, 0.45)',
                  marginBottom: '7px',
                }}
              >
                REPEAT (REQUIRES DATE)
              </div>
              <select
                value={panelView.recurrence || 'none'}
                disabled={!panelView.deadline}
                onChange={(e) => {
                  const val = e.target.value;
                  updateDraft('recurrence', val === 'none' ? null : val);
                }}
                style={{
                  width: '100%',
                  height: '41px',
                  boxSizing: 'border-box',
                  padding: '10px 13px',
                  borderRadius: '9px',
                  border: '1px solid rgba(33, 29, 58, 0.18)',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: panelView.deadline ? '#fff' : 'rgba(33, 29, 58, 0.05)',
                  color: panelView.deadline ? '#211d3a' : 'rgba(33, 29, 58, 0.45)',
                  cursor: panelView.deadline ? 'pointer' : 'not-allowed',
                }}
              >
                <option value="none">No Repeat</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              {!panelView.deadline && (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'rgba(33, 29, 58, 0.45)',
                    marginTop: '5px',
                    fontStyle: 'italic',
                  }}
                >
                  Set a deadline date to enable repeat options.
                </div>
              )}
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '10.5px',
                  letterSpacing: '0.08em',
                  color: 'rgba(33, 29, 58, 0.45)',
                  marginBottom: '7px',
                }}
              >
                STATUS
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {statusOptions.map((opt) => (
                  <button key={opt.value} onClick={() => updateDraft('status', opt.value)} style={opt.style}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {panel.mode === 'edit' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(33, 29, 58, 0.1)',
                }}
              >
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11px', color: 'rgba(33, 29, 58, 0.45)' }}>
                  ADDED · {panelView.addedFmt}
                </div>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11px', color: 'rgba(33, 29, 58, 0.45)' }}>
                  STARTED · {panelView.startedFmt}
                </div>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11px', color: 'rgba(33, 29, 58, 0.45)' }}>
                  COMPLETED · {panelView.completedFmt}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
              <button onClick={saveTask} className="cta-btn" style={{ flex: 1, marginTop: 0 }}>
                Save Task
              </button>
              {panel.mode === 'edit' && (
                <button
                  onClick={deleteTask}
                  style={{
                    padding: '11px 18px',
                    borderRadius: '9px',
                    border: '1.5px solid ' + secondaryAccent,
                    background: 'none',
                    color: secondaryAccent,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Active Reminders Float Toasts */}
      {activeReminders.map((r, idx) => (
        <div 
          key={r._id} 
          className="active-reminders-toast"
          style={{
            bottom: `${24 + idx * 170}px`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '8px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#d8f24a'
                }} />
              </div>
              <span style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '10.5px',
                fontWeight: '600',
                letterSpacing: '0.12em',
                color: 'rgba(247, 242, 232, 0.45)',
              }}>
                REMINDER
              </span>
            </div>
            <span style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.05em',
              color: '#d8f24a',
            }}>
              {r.project}
            </span>
          </div>

          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '19px',
            color: '#ffffff',
            lineHeight: 1.35,
            margin: '12px 0 18px 0',
            fontWeight: 500,
          }}>
            {r.description}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => saveTaskMutation({ 
                _id: r._id, 
                description: r.description, 
                project: r.project, 
                urgency: r.urgency, 
                status: r.status, 
                deadline: r.deadline, 
                recurrence: r.recurrence || null, 
                dateType: 'deadline' 
              })}
              style={{
                backgroundColor: '#d8f24a',
                color: '#211d3a',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Make task
            </button>
            <button
              onClick={() => snoozeReminder(r)}
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              Snooze
            </button>
            <button
              onClick={() => moveTaskStatus(r._id, 'done')}
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}

      {/* Update Toast */}
      {updateVersion && updateVersion !== dismissedVersion && (
        <div className="update-toast">
          <div className="update-toast-content">
            <div className="update-toast-title">Update Available</div>
            <div className="update-toast-desc">A new version of this application is available.</div>
          </div>
          <div className="update-toast-actions">
            <button className="update-toast-btn" onClick={() => window.location.reload()}>
              Refresh
            </button>
            <button 
              className="update-toast-close" 
              onClick={() => setDismissedVersion(updateVersion)} 
              title="Dismiss"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
