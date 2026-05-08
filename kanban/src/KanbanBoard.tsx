import { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, ChevronRight, Check, Clock, User } from 'lucide-react';
import { cn } from './lib/utils';
import type { Task, Column, ActivityEntry } from './types';

const STORAGE_KEY = 'kanban-board-state';

const defaultColumns: Column[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    tasks: [
      {
        id: `task-${Date.now()}-1`,
        title: 'Recipe Rip: Decide tech stack (React Native vs Swift)',
        description: 'Biggest decision - RN is faster to build, Swift is native performance. Bobby to decide.',
        priority: 'high',
        assignee: 'Cody',
        createdAt: Date.now(),
      },
      {
        id: `task-${Date.now()}-2`,
        title: 'Coloring book: Define product specs',
        description: 'What is it? Theme? Page count? Target audience? Need specs before building.',
        priority: 'medium',
        assignee: 'Bobby',
        createdAt: Date.now(),
      },
      {
        id: `task-${Date.now()}-3`,
        title: 'OpenClaw Guide: Define scope and remaining work',
        description: 'What sections still need to be written? What is the target audience?',
        priority: 'medium',
        assignee: 'Bobby',
        createdAt: Date.now(),
      },
    ],
  },
  { id: 'in-progress', title: 'In Progress', tasks: [] },
  { id: 'done', title: 'Done', tasks: [] },
];

const defaultActivity: ActivityEntry[] = [];

// Load from localStorage
function loadBoard(): { columns: Column[]; activity: ActivityEntry[] } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // If all columns are empty, use defaults so initial tasks show
      const allColumnsEmpty = parsed.columns.every((col: Column) => col.tasks.length === 0);
      if (!allColumnsEmpty) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load board:', e);
  }
  return { columns: defaultColumns, activity: defaultActivity };
}

// Save to localStorage
function saveBoard(columns: Column[], activity: ActivityEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ columns, activity }));
  } catch (e) {
    console.error('Failed to save board:', e);
  }
}

// Priority badge colors
const priorityColors = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
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
        className="absolute bg-card rounded-lg border border-border shadow-lg p-2 min-w-[180px]"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">Move to...</p>
        {columns.filter(col => col.id !== currentColumnId).map((col) => (
          <button
            key={col.id}
            onClick={() => onMove(task.id, col.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm text-left"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span>{col.title}</span>
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
        'bg-card rounded-lg border border-border p-3 hover:border-primary/30 transition-colors group',
        isDone && 'opacity-75'
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
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', priorityColors[task.priority])}>
              {task.priority}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => onMoveClick(task, columnId)}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Move to..."
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(task)}
            className="p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
  return (
    <div className="flex flex-col bg-secondary/30 rounded-xl p-3 min-h-[400px] w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
            {column.tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="p-1 hover:bg-accent rounded"
          title="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
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
          <div className="text-center text-muted-foreground text-sm py-8">
            No tasks
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{task ? 'Edit Task' : 'Add Task'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Assignee (optional)</label>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="e.g. Cody, Finn, Rex..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Priority</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    priority === p
                      ? p === 'low' ? 'bg-green-500 text-white'
                        : p === 'medium' ? 'bg-yellow-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
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
    <div className="mt-6 bg-secondary/30 rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Check className="w-4 h-4 text-green-600" />
        Activity
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {entries.slice(-10).reverse().map((entry) => (
          <div key={entry.id} className="flex items-center gap-2 text-sm">
            <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{entry.taskTitle}</span>
              {entry.assignee && ` • ${entry.assignee}`}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatDate(entry.completedAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const [board, setBoard] = useState<{ columns: Column[]; activity: ActivityEntry[] }>(loadBoard);
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Mission Board</h1>
          <p className="text-muted-foreground text-sm mt-1">Click the arrow on a card to move it between columns</p>
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
