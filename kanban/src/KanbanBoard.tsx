import { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, ChevronRight, Check, Clock, User } from 'lucide-react';
import { cn } from './lib/utils';
import type { Task, Column, ActivityEntry } from './types';

const STORAGE_KEY = 'kanban-board-state';

// Save to localStorage
function saveBoard(columns: Column[], activity: ActivityEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ columns, activity }));
  } catch (e) {
    console.error('Failed to save board:', e);
  }
}

// Priority badge colors - using gradient classes
const priorityBadgeClass = {
  low: 'priority-low',
  medium: 'priority-medium',
  high: 'priority-high',
};

// Format date as "May 8" or "May 8, 2024" if different year
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isThisYear = date.getFullYear() === now.getFullYear();
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    ...(isThisYear ? {} : { year: 'numeric' })
  });
}

interface MoveMenuProps {
  task: Task;
  currentColumnId: string;
  columns: Column[];
  onMove: (taskId: string, targetColumnId: string) => void;
  onClose: () => void;
}

function MoveMenu({ task, currentColumnId, columns, onMove, onClose }: MoveMenuProps) {
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div 
        className="absolute bg-slate-900 rounded-xl border border-slate-700 shadow-2xl shadow-purple-900/20 p-3 min-w-[200px]"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-2">Move to...</p>
        {columns.filter(col => col.id !== currentColumnId).map((col) => (
          <button
            key={col.id}
            onClick={() => onMove(task.id, col.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-600/20 text-sm text-left transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-purple-400" />
            <span className="text-white font-medium">{col.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  columnId: string;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onMoveClick: (task: Task, columnId: string) => void;
}

function TaskCard({ task, columnId, onEdit, onDelete, onMoveClick }: TaskCardProps) {
  const isDone = columnId === 'done';
  
  return (
    <div 
      className={cn(
        'card-glow rounded-xl border p-4 transition-all duration-300 group',
        isDone ? 'opacity-60 border-emerald-500/20' : 'border-slate-700/50'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium text-sm truncate', isDone && 'line-through text-muted-foreground')}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {task.assignee && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.assignee}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(task.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wide', priorityBadgeClass[task.priority])}>
              {task.priority}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => onMoveClick(task, columnId)}
            className="p-1.5 hover:bg-purple-600/20 rounded text-slate-500 hover:text-purple-400 transition-colors"
            title="Move to..."
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ColumnProps {
  column: Column;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveClick: (task: Task, columnId: string) => void;
}

function ColumnComponent({ column, onAddTask, onEditTask, onDeleteTask, onMoveClick }: ColumnProps) {
  // Gradient class for each column
  const headerGradient = {
    'backlog': 'column-header-backlog',
    'in-progress': 'column-header-inprogress',
    'done': 'column-header-done',
  }[column.id] || 'column-header-backlog';

  return (
    <div className="flex flex-col bg-slate-900/50 backdrop-blur rounded-2xl p-4 min-h-[450px] w-80 flex-shrink-0 border border-slate-800/50">
      <div className={cn(
        'flex items-center justify-between mb-4 px-3 py-2 rounded-xl',
        headerGradient
      )}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-white">{column.title}</h3>
          <span className="text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
            {column.tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          title="Add task"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            columnId={column.id}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onMoveClick={onMoveClick}
          />
        ))}
        {column.tasks.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-12">
            <p className="text-2xl mb-2">📋</p>
            <p>No tasks yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskModalProps {
  task?: Task | null;
  columnId?: string;
  onSave: (task: Task, columnId?: string) => void;
  onClose: () => void;
}

function TaskModal({ task, columnId, onSave, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [assignee, setAssignee] = useState(task?.assignee || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: task?.id || crypto.randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignee: assignee.trim() || undefined,
      createdAt: task?.createdAt || Date.now(),
      completedAt: task?.completedAt,
    }, columnId);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-md shadow-2xl shadow-purple-900/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">{task ? 'Edit Task' : 'Add Task'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-300 block mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-300 block mb-2">Assignee (optional)</label>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="e.g. Cody, Finn, Rex..."
              className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-300 block mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none placeholder-slate-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-300 block mb-2">Priority</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                    priority === p
                      ? p === 'low' ? 'priority-low'
                        : p === 'medium' ? 'priority-medium'
                        : 'priority-high'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
            >
              {task ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ActivityLogProps {
  entries: ActivityEntry[];
}

function ActivityLog({ entries }: ActivityLogProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 bg-slate-900/50 backdrop-blur rounded-2xl p-5 border border-slate-800/50">
      <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-slate-300">
        <Check className="w-4 h-4 text-emerald-400" />
        <span className="uppercase tracking-wider text-xs">Completed Tasks</span>
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {entries.slice(-10).reverse().map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 text-sm bg-slate-800/50 rounded-lg px-3 py-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">
              <span className="font-semibold text-white">{entry.taskTitle}</span>
              {entry.assignee && <span className="text-slate-400"> • {entry.assignee}</span>}
            </span>
            <span className="text-xs text-slate-500 ml-auto">
              {formatDate(entry.completedAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Initial tasks to show on first load
const initialTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Recipe Rip: Decide tech stack (React Native vs Swift)',
    description: 'Biggest decision - RN is faster to build, Swift is native performance. Bobby to decide.',
    priority: 'high',
    assignee: 'Cody',
    createdAt: Date.now(),
  },
  {
    id: 'task-2',
    title: 'Coloring book: Define product specs',
    description: 'What is it? Theme? Page count? Target audience? Need specs before building.',
    priority: 'medium',
    assignee: 'Bobby',
    createdAt: Date.now(),
  },
  {
    id: 'task-3',
    title: 'OpenClaw Guide: Define scope and remaining work',
    description: 'What sections still need to be written? What is the target audience?',
    priority: 'medium',
    assignee: 'Bobby',
    createdAt: Date.now(),
  },
];

// Build initial board state
function buildInitialBoard(): { columns: Column[]; activity: ActivityEntry[] } {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // If saved data has tasks, use it
      const hasTasks = parsed.columns.some((col: Column) => col.tasks.length > 0);
      if (hasTasks) return parsed;
    } catch (e) {
      console.error('Failed to parse saved board:', e);
    }
  }
  // No saved data or empty board - use initial tasks
  return {
    columns: [
      { id: 'backlog', title: 'Backlog', tasks: [...initialTasks] },
      { id: 'in-progress', title: 'In Progress', tasks: [] },
      { id: 'done', title: 'Done', tasks: [] },
    ],
    activity: [],
  };
}

export default function KanbanBoard() {
  const [board, setBoard] = useState<{ columns: Column[]; activity: ActivityEntry[] }>(buildInitialBoard);
  const [selectedTaskForMove, setSelectedTaskForMove] = useState<{ task: Task; columnId: string } | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; task?: Task | null; columnId?: string }>({ isOpen: false });

  // Save to localStorage whenever board changes
  useEffect(() => {
    saveBoard(board.columns, board.activity);
  }, [board]);

  const handleMoveClick = (task: Task, columnId: string) => {
    setSelectedTaskForMove({ task, columnId });
  };

  const handleMoveTask = (taskId: string, targetColumnId: string) => {
    setBoard((prev) => {
      // Find the task first
      let foundTask: Task | undefined;
      let sourceColumnId: string | undefined;
      
      for (const col of prev.columns) {
        const task = col.tasks.find((t) => t.id === taskId);
        if (task) {
          foundTask = task;
          sourceColumnId = col.id;
          break;
        }
      }

      if (!foundTask || !sourceColumnId) return prev;

      // If moving to Done, add completion timestamp and log activity
      const isCompleting = targetColumnId === 'done' && sourceColumnId !== 'done';
      const completedTask: Task = isCompleting
        ? { ...foundTask, completedAt: Date.now() }
        : foundTask;

      // Build new columns without the task
      const columnsWithoutTask = prev.columns.map((col) =>
        col.id === sourceColumnId
          ? { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) }
          : col
      );

      // Add task to target column
      const finalColumns = columnsWithoutTask.map((col) =>
        col.id === targetColumnId
          ? { ...col, tasks: [...col.tasks, completedTask] }
          : col
      );

      // Build activity log if completing
      const newActivity = isCompleting
        ? [
            ...prev.activity,
            {
              id: crypto.randomUUID(),
              taskTitle: completedTask.title,
              completedAt: completedTask.completedAt!,
              assignee: completedTask.assignee,
            },
          ]
        : prev.activity;

      return { columns: finalColumns, activity: newActivity };
    });

    setSelectedTaskForMove(null);
  };

  const handleAddTask = (columnId: string) => {
    setModalState({ isOpen: true, columnId });
  };

  const handleEditTask = (task: Task) => {
    setModalState({ isOpen: true, task });
  };

  const handleSaveTask = (task: Task, columnId?: string) => {
    setBoard((prev) => {
      const taskExists = prev.columns.some((col) => col.tasks.some((t) => t.id === task.id));
      
      if (taskExists) {
        // Update existing task
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            tasks: col.tasks.map((t) => (t.id === task.id ? task : t)),
          })),
        };
      } else {
        // Add new task to specified column
        return {
          ...prev,
          columns: prev.columns.map((col) => {
            if (col.id === columnId) {
              return {
                ...col,
                tasks: [...col.tasks, task],
              };
            }
            return col;
          }),
        };
      }
    });
    setModalState({ isOpen: false });
  };

  const handleDeleteTask = (taskId: string) => {
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      })),
    }));
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false });
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-black gradient-text mb-2">Mission Board</h1>
          <p className="text-slate-400 text-sm mt-1">Click the arrow on a card to move it between columns</p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.columns.map((column) => (
            <ColumnComponent
              key={column.id}
              column={column}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onMoveClick={handleMoveClick}
            />
          ))}
        </div>
        <ActivityLog entries={board.activity} />
      </div>
      {modalState.isOpen && (
        <TaskModal
          task={modalState.task}
          columnId={modalState.columnId}
          onSave={handleSaveTask}
          onClose={handleCloseModal}
        />
      )}
      {selectedTaskForMove && (
        <MoveMenu
          task={selectedTaskForMove.task}
          currentColumnId={selectedTaskForMove.columnId}
          columns={board.columns}
          onMove={handleMoveTask}
          onClose={() => setSelectedTaskForMove(null)}
        />
      )}
    </div>
  );
}
