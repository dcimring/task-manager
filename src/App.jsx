import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

export default function App() {
  const [view, setView] = useState('focus');
  const [filters, setFilters] = useState({ search: '', project: 'all', urgency: 'all', status: 'all' });
  const [panel, setPanel] = useState(null); // null or { mode: 'new' | 'edit', draft: { ... } }
  const [projectForm, setProjectForm] = useState({ show: false, name: '', description: '' });
  const [editingProject, setEditingProject] = useState(null); // null or { id, name, description }
  const [weekKey, setWeekKey] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth State & Google Identity Services integration
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('task_manager_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [authError, setAuthError] = useState(null);

  const decodeJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const handleLoginEmail = (email, name) => {
    const allowedEmail = 'dcimring@gmail.com';
    if (email.trim().toLowerCase() === allowedEmail) {
      const userData = { email, name };
      setUser(userData);
      localStorage.setItem('task_manager_user', JSON.stringify(userData));
      setAuthError(null);
    } else {
      setAuthError('Access Restricted: This account is not authorized to access this application.');
    }
  };



  useEffect(() => {
    if (user) return;

    const id = 'google-gsi-script';
    let script = document.getElementById(id);
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const initGoogleSignIn = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        setAuthError("Google Client ID is not configured. Please define VITE_GOOGLE_CLIENT_ID in your environment.");
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
        });

        // Small delay to make sure target container is rendered in DOM
        setTimeout(() => {
          const btnElement = document.getElementById('google-signin-btn');
          if (btnElement) {
            window.google.accounts.id.renderButton(btnElement, {
              theme: 'outline',
              size: 'large',
              width: '280',
            });
          }
        }, 100);
      } catch (err) {
        console.error("Failed to initialize Google Sign-In:", err);
      }
    };

    const handleCredentialResponse = (response) => {
      try {
        const decoded = decodeJwt(response.credential);
        if (decoded && decoded.email) {
          handleLoginEmail(decoded.email, decoded.name || 'User');
        } else {
          setAuthError('Failed to parse Google login token.');
        }
      } catch (err) {
        setAuthError('Authentication failed.');
      }
    };

    script.onload = () => {
      if (window.google?.accounts?.id) {
        initGoogleSignIn();
      } else {
        setTimeout(() => {
          if (window.google?.accounts?.id) initGoogleSignIn();
        }, 150);
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleSignIn();
    }
  }, [user]);

  // Load state from Convex
  const tasks = useQuery(api.tasks.get) ?? [];
  const projects = useQuery(api.projects.get) ?? [];

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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        if (filters.status !== 'all' && t.status !== filters.status) return false;
        if (filters.search && !t.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  };

  const getProjectStats = () => {
    const now = new Date();
    return projects.map((p) => {
      const pt = tasks.filter((t) => t.project === p.name);
      const total = pt.length;
      const todo = pt.filter((t) => t.status === 'todo').length;
      const doing = pt.filter((t) => t.status === 'doing').length;
      const done = pt.filter((t) => t.status === 'done').length;
      const blocked = pt.filter((t) => t.status === 'blocked').length;
      const overdue = pt.filter((t) => t.deadline && t.status !== 'done' && new Date(t.deadline) < now).length;
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
      draft: { description: '', project: '', urgency: 'medium', deadline: '', status: 'todo' },
    });
  };

  const openEditTask = (task) => {
    setPanel({
      mode: 'edit',
      draft: { ...task, deadline: task.deadline ? task.deadline.slice(0, 10) : '' },
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
    const project = (draft.project || '').trim() || 'General';
    const deadline = draft.deadline ? new Date(draft.deadline).toISOString() : null;

    await saveTaskMutation({
      _id: panel.mode === 'edit' ? draft._id : undefined,
      description: draft.description,
      project,
      urgency: draft.urgency,
      status: draft.status,
      deadline,
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
    setFilters((f) => ({ ...f, project: name, status: 'all', urgency: 'all', search: '' }));
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
    const overdue = !!(t.deadline && t.status !== 'done' && new Date(t.deadline) < now);
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
    const now = new Date();
    
    // 1. Overdue tasks (active, deadline has passed)
    const overdue = tasks
      .filter((t) => t.status !== 'done' && t.deadline && new Date(t.deadline) < now)
      .map(decorate)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); // Most overdue first

    // 2. Upcoming tasks (active, deadline in the next 7 days)
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const upcoming = tasks
      .filter((t) => {
        if (t.status === 'done' || !t.deadline) return false;
        const dl = new Date(t.deadline);
        return dl >= now && dl <= next7Days;
      })
      .map(decorate)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); // Soonest first

    // 3. Suggested tasks (up to 3 active, non-overdue tasks, prioritized)
    const suggestedCandidates = tasks
      .filter((t) => {
        if (t.status === 'done') return false;
        const isOverdue = t.deadline && new Date(t.deadline) < now;
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
        const diffTime = new Date(t.deadline) - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

    return { overdue, upcoming, suggested };
  };

  const { overdue: focusOverdue, upcoming: focusUpcoming, suggested: focusSuggested } = getFocusTasks();

  const boardAccent = { todo: 'rgba(33,29,58,0.2)', doing: '#3f5f9e', done: '#357a55', blocked: secondaryAccent };
  const boardColumns = ['todo', 'doing', 'blocked', 'done'].map((status) => ({
    status,
    label: statusMeta[status].label,
    count: tasks.filter((t) => t.status === status).length,
    accentColor: boardAccent[status],
    tasks: tasks.filter((t) => t.status === status).map(decorate),
  }));

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
  const totalOverdue = tasks.filter((t) => t.deadline && t.status !== 'done' && new Date(t.deadline) < new Date()).length;
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
        addedFmt: panel.mode === 'edit' ? fmtDate(panel.draft.dateAdded) : null,
        startedFmt: panel.mode === 'edit' ? fmtDate(panel.draft.dateStarted) : null,
        completedFmt: panel.mode === 'edit' ? fmtDate(panel.draft.dateCompleted) : null,
      }
    : { description: '', project: '', deadline: '' };

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
            <div id="google-signin-btn"></div>
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
          onClick={() => {
            localStorage.removeItem('task_manager_user');
            setUser(null);
          }}
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
              <div className="focus-column" style={{ borderTop: '3px solid #c1493f' }}>
                <div className="focus-column-header">
                  <div className="focus-column-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c1493f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Overdue
                  </div>
                  <span
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#c1493f',
                      backgroundColor: 'rgba(193, 73, 63, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {focusOverdue.length}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {focusOverdue.map((t) => (
                    <div key={t._id} onClick={() => openEditTask(t)} className="focus-task-card">
                      <div style={{ fontSize: '15px', fontWeight: 500, color: '#211d3a', marginBottom: '8px', lineHeight: 1.4 }}>
                        {t.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11px', color: 'rgba(33, 29, 58, 0.5)' }}>
                          {t.project}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#c1493f' }}>
                          Overdue: {t.deadlineFmt}
                        </span>
                      </div>
                    </div>
                  ))}
                  {focusOverdue.length === 0 && (
                    <div
                      style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        color: 'rgba(33, 29, 58, 0.4)',
                        fontSize: '14px',
                        fontStyle: 'italic',
                        backgroundColor: 'rgba(75, 143, 106, 0.04)',
                        border: '1px dashed rgba(75, 143, 106, 0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                      }}
                    >
                      <span style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</span>
                      No overdue tasks!
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Column */}
              <div className="focus-column" style={{ borderTop: '3px solid #c68a2e' }}>
                <div className="focus-column-header">
                  <div className="focus-column-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c68a2e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Upcoming (7d)
                  </div>
                  <span
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#c68a2e',
                      backgroundColor: 'rgba(198, 138, 46, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {focusUpcoming.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {focusUpcoming.map((t) => (
                    <div key={t._id} onClick={() => openEditTask(t)} className="focus-task-card">
                      <div style={{ fontSize: '15px', fontWeight: 500, color: '#211d3a', marginBottom: '8px', lineHeight: 1.4 }}>
                        {t.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11px', color: 'rgba(33, 29, 58, 0.5)' }}>
                          {t.project}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#c68a2e' }}>
                          Due: {t.deadlineFmt}
                        </span>
                      </div>
                    </div>
                  ))}
                  {focusUpcoming.length === 0 && (
                    <div
                      style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        color: 'rgba(33, 29, 58, 0.4)',
                        fontSize: '14px',
                        fontStyle: 'italic',
                        backgroundColor: 'rgba(33, 29, 58, 0.02)',
                        border: '1px dashed rgba(33, 29, 58, 0.1)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                      }}
                    >
                      <span style={{ fontSize: '24px', marginBottom: '8px' }}>☕</span>
                      No tasks due in next 7 days.
                    </div>
                  )}
                </div>
              </div>

              {/* Suggested Column */}
              <div className="focus-column" style={{ borderTop: '3px solid #6b4fbb' }}>
                <div className="focus-column-header">
                  <div className="focus-column-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b4fbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                    </svg>
                    Suggested Next
                  </div>
                  <span
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#6b4fbb',
                      backgroundColor: 'rgba(107, 79, 187, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {focusSuggested.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {focusSuggested.map((t) => (
                    <div key={t._id} onClick={() => openEditTask(t)} className="focus-task-card">
                      <div style={{ fontSize: '15px', fontWeight: 500, color: '#211d3a', marginBottom: '8px', lineHeight: 1.4 }}>
                        {t.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11px', color: 'rgba(33, 29, 58, 0.5)' }}>
                          {t.project}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <span style={t.urgencyDotStyle}></span>
                          <span style={{ fontSize: '11px', color: 'rgba(33, 29, 58, 0.65)' }}>{t.urgencyLabelText}</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <span style={t.suggestionReasonStyle}>
                          {t.suggestionReason}
                        </span>
                      </div>
                    </div>
                  ))}
                  {focusSuggested.length === 0 && (
                    <div
                      style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        color: 'rgba(33, 29, 58, 0.4)',
                        fontSize: '14px',
                        fontStyle: 'italic',
                        backgroundColor: 'rgba(33, 29, 58, 0.02)',
                        border: '1px dashed rgba(33, 29, 58, 0.1)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                      }}
                    >
                      <span style={{ fontSize: '24px', marginBottom: '8px' }}>☀️</span>
                      Active queue is clear!
                    </div>
                  )}
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
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="doing">Doing</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Active Filters Warning Banner */}
            {(() => {
              const activeFilters = [];
              if (filters.project !== 'all') activeFilters.push({ key: 'project', label: `Project: ${filters.project}` });
              if (filters.urgency !== 'all') activeFilters.push({ key: 'urgency', label: `Urgency: ${filters.urgency}` });
              if (filters.status !== 'all') {
                const statusLabels = { todo: 'To Do', doing: 'Doing', blocked: 'Blocked', done: 'Done' };
                activeFilters.push({ key: 'status', label: `Status: ${statusLabels[filters.status] || filters.status}` });
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
                    <span style={{ fontSize: '16px' }}>🔍</span>
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
                          onClick={() => setFilters((prev) => ({ ...prev, [f.key]: 'all' }))}
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
                    onClick={() => setFilters((prev) => ({ ...prev, project: 'all', urgency: 'all', status: 'all' }))}
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
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>ADDED</span>
              </div>
              {decoratedFiltered.map((t) => (
                <div key={t._id} onClick={() => openEditTask(t)} className={`task-row ${t.overdue ? 'overdue' : ''}`}>
                  <span style={t.statusPillStyle}>{t.statusLabelText}</span>
                  <span className="task-desc">
                    {t.description}
                  </span>
                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11.5px', color: 'rgba(33, 29, 58, 0.55)' }}>{t.project}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.65)' }}>
                    <span style={t.urgencyDotStyle}></span>
                    {t.urgencyLabelText}
                  </span>
                  <span style={t.deadlineTextStyle}>{t.deadlineFmt}</span>
                  <span style={{ fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.5)' }}>{t.dateAddedFmt}</span>
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
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        paddingBottom: '10px',
                        borderBottom: `2px solid ${col.accentColor}`,
                      }}
                    >
                      <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '17px', fontWeight: 600 }}>{col.label}</span>
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11px', color: 'rgba(33, 29, 58, 0.4)' }}>{col.count}</span>
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
                              fontFamily: 'inherit',
                              fontSize: '14.5px',
                              color: '#211d3a',
                              marginBottom: '10px',
                              lineHeight: 1.4,
                            }}
                          >
                            {t.description}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContext: 'space-between', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', color: 'rgba(33, 29, 58, 0.5)' }}>{t.project}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={t.urgencyDotStyle}></span>
                              <span style={t.deadlineTextStyle}>{t.deadlineFmt}</span>
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
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '10.5px',
                  letterSpacing: '0.08em',
                  color: 'rgba(33, 29, 58, 0.45)',
                  marginBottom: '7px',
                }}
              >
                DEADLINE (OPTIONAL)
              </div>
              <input
                type="date"
                value={panelView.deadline}
                onChange={(e) => updateDraft('deadline', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 13px',
                  borderRadius: '9px',
                  border: '1px solid rgba(33, 29, 58, 0.18)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
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
    </div>
  );
}
