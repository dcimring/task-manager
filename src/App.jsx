import { useState, useMemo } from 'react';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from './hooks/useAuth.jsx';
import { useUpdateChecker } from './hooks/useUpdateChecker.js';
import { fmtDate, daysBetween } from './lib/dates.js';
import { accent } from './lib/constants.js';
import {
  decorate,
  getFilteredTasks,
  getProjectStats,
  getWeeklyStatsRaw,
  getWeeksWithCompletions,
  getWeeklyReportTasksRaw,
  getFocusTasks,
  getBoardColumns,
} from './lib/taskDerivations.js';
import LoginScreen from './components/LoginScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import FocusView from './components/FocusView.jsx';
import TasksView from './components/TasksView.jsx';
import BoardView from './components/BoardView.jsx';
import ProjectsView from './components/ProjectsView.jsx';
import AnalyticsView from './components/AnalyticsView.jsx';
import WeeklyReportView from './components/WeeklyReportView.jsx';
import TaskPanel from './components/TaskPanel.jsx';
import ReminderToasts from './components/ReminderToasts.jsx';
import UpdateToast from './components/UpdateToast.jsx';

export default function App() {
  const localDateStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
  const [view, setView] = useState('focus');
  const [filters, setFilters] = useState({ search: '', project: 'all', urgency: 'all', status: 'active', type: 'all' });
  const [panel, setPanel] = useState(null); // null or { mode: 'new' | 'edit', draft: { ... } }
  const [projectForm, setProjectForm] = useState({ show: false, name: '', description: '' });
  const [editingProject, setEditingProject] = useState(null); // null or { id, name, description }
  const [weekKey, setWeekKey] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { updateVersion, dismissedVersion, setDismissedVersion } = useUpdateChecker();

  // Auth: session comes from GoogleAuthProvider; the backend independently
  // verifies the Google ID token on every Convex call.
  const { session: user, authError, signInButtonRef, signOut } = useAuth();
  const { isAuthenticated } = useConvexAuth();

  // Load state from Convex (skip until the auth token is attached)
  const tasks = useQuery(api.tasks.get, isAuthenticated ? {} : 'skip') ?? [];
  const projects = useQuery(api.projects.get, isAuthenticated ? {} : 'skip') ?? [];

  // Convex mutations
  const saveTaskMutation = useMutation(api.tasks.save);
  const removeTaskMutation = useMutation(api.tasks.remove);
  const moveTaskStatusMutation = useMutation(api.tasks.moveStatus);
  const createProjectMutation = useMutation(api.projects.create);
  const updateProjectMutation = useMutation(api.projects.update);

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

  // Derived data (memoized so a keystroke in the search box, or any other
  // unrelated state change, doesn't re-run these over every task/project).
  const decoratedFiltered = useMemo(
    () => getFilteredTasks(tasks, filters).map((t) => decorate(t, localDateStr)),
    [tasks, filters, localDateStr]
  );

  const { overdue: focusOverdue, upcoming: focusUpcoming, blocked: focusBlocked, suggested: focusSuggested } = useMemo(
    () => getFocusTasks(tasks, localDateStr),
    [tasks, localDateStr]
  );

  const activeReminders = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'done' && t.dateType === 'reminder' && t.deadline && t.deadline.slice(0, 10) <= localDateStr)
        .map((t) => decorate(t, localDateStr)),
    [tasks, localDateStr]
  );

  const boardColumns = useMemo(() => getBoardColumns(tasks, localDateStr), [tasks, localDateStr]);

  const projectStats = useMemo(
    () =>
      getProjectStats(tasks, projects, localDateStr).map((p) => ({
        ...p,
        hasDescription: !!p.description,
        barStyle: {
          height: '100%',
          borderRadius: '4px',
          backgroundColor: '#211d3a',
          width: `${p.completionRate}%`,
        },
      })),
    [tasks, projects, localDateStr]
  );

  const weeklyStatsBars = useMemo(() => {
    const weeklyRaw = getWeeklyStatsRaw(tasks);
    const maxWeek = Math.max(1, ...weeklyRaw.map((w) => w.count));
    return weeklyRaw.map((w) => ({
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
  }, [tasks]);

  const weeksList = useMemo(() => getWeeksWithCompletions(tasks), [tasks]);
  const selectedWeekKey = weekKey && weeksList.includes(weekKey) ? weekKey : weeksList[0] || null;

  const weeklyReportRows = useMemo(
    () =>
      selectedWeekKey
        ? getWeeklyReportTasksRaw(tasks, selectedWeekKey).map((t) => ({
            ...t,
            dateAddedFmt: fmtDate(t.dateAdded),
            dateStartedFmt: fmtDate(t.dateStarted),
            dateCompletedFmt: fmtDate(t.dateCompleted),
            sinceAddedFmt: t.sinceAdded + 'd',
            sinceStartedFmt: t.sinceStarted != null ? t.sinceStarted + 'd' : '—',
          }))
        : [],
    [tasks, selectedWeekKey]
  );

  const analyticsStats = useMemo(() => {
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
    return { totalTasks, totalOverdue, totalBlocked, overallCompletionRate, overallAvgDays };
  }, [tasks, localDateStr]);

  const tabLabels = {
    focus: 'Focus',
    tasks: 'Tasks',
    board: 'Board',
    projects: 'Projects',
    analytics: 'Analytics',
    weekly: 'Weekly Report',
  };
  const tabs = ['focus', 'tasks', 'board', 'projects', 'analytics', 'weekly'].map((v) => ({
    key: v,
    label: tabLabels[v],
    active: view === v,
  }));

  const ringDeg = Math.round((analyticsStats.overallCompletionRate / 100) * 360);

  if (!user) {
    return <LoginScreen authError={authError} signInButtonRef={signInButtonRef} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        tabs={tabs}
        setView={setView}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        openNewTask={openNewTask}
        signOut={signOut}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {view === 'focus' && (
          <FocusView
            focusOverdue={focusOverdue}
            focusUpcoming={focusUpcoming}
            focusBlocked={focusBlocked}
            focusSuggested={focusSuggested}
            openEditTask={openEditTask}
          />
        )}

        {view === 'tasks' && (
          <TasksView
            filters={filters}
            setFilters={setFilters}
            decoratedFiltered={decoratedFiltered}
            tasks={tasks}
            projects={projects}
            openEditTask={openEditTask}
          />
        )}

        {view === 'board' && (
          <BoardView
            boardColumns={boardColumns}
            dragStart={dragStart}
            allowDrop={allowDrop}
            handleDrop={handleDrop}
            openEditTask={openEditTask}
          />
        )}

        {view === 'projects' && (
          <ProjectsView
            projectStats={projectStats}
            editingProject={editingProject}
            setEditingProject={setEditingProject}
            saveProjectEdit={saveProjectEdit}
            goToProjectTasks={goToProjectTasks}
            projectForm={projectForm}
            setProjectForm={setProjectForm}
            addProjectQuick={addProjectQuick}
          />
        )}

        {view === 'analytics' && (
          <AnalyticsView
            ringDeg={ringDeg}
            overallCompletionRate={analyticsStats.overallCompletionRate}
            totalTasks={analyticsStats.totalTasks}
            overallAvgDays={analyticsStats.overallAvgDays}
            totalOverdue={analyticsStats.totalOverdue}
            totalBlocked={analyticsStats.totalBlocked}
            projectStats={projectStats}
            weeklyStatsBars={weeklyStatsBars}
          />
        )}

        {view === 'weekly' && (
          <WeeklyReportView
            weeksList={weeksList}
            selectedWeekKey={selectedWeekKey}
            setWeekKey={setWeekKey}
            weeklyReportRows={weeklyReportRows}
          />
        )}
      </div>

      {panel && (
        <TaskPanel
          panel={panel}
          projects={projects}
          updateDraft={updateDraft}
          closePanel={closePanel}
          saveTask={saveTask}
          deleteTask={deleteTask}
        />
      )}

      <ReminderToasts
        activeReminders={activeReminders}
        saveTaskMutation={saveTaskMutation}
        snoozeReminder={snoozeReminder}
        moveTaskStatus={moveTaskStatus}
      />

      <UpdateToast
        updateVersion={updateVersion}
        dismissedVersion={dismissedVersion}
        setDismissedVersion={setDismissedVersion}
      />
    </div>
  );
}
