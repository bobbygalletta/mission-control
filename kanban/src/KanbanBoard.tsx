import { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Check, Clock, User, ExternalLink, ChevronRight, Calendar, Target, FileText, Link2 } from 'lucide-react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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

interface TaskCardProps {
  task: Task;
  columnId: string;
  isDragging?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onViewDetail: (task: Task) => void;
}

function TaskCard({ task, columnId, isDragging, onEdit, onDelete, onViewDetail }: TaskCardProps) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging: isSortableDragging 
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDone = columnId === 'done';
  const isCurrentlyDragging = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onViewDetail(task)}
      className={cn(
        'card-glow rounded-xl border p-4 transition-all duration-200 group cursor-grab active:cursor-grabbing',
        isDone ? 'opacity-60 border-emerald-500/20' : 'border-slate-700/50',
        isCurrentlyDragging && 'opacity-30 scale-95'
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
          {/* Progress bar if set */}
          {typeof task.progress === 'number' && task.progress > 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">{task.progress}% complete</span>
            </div>
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
            <button
              onClick={(e) => { e.stopPropagation(); onViewDetail(task); }}
              className="ml-auto p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-cyan-400 transition-colors"
              title="View details"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="p-1.5 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Drag overlay card (shown while dragging)
function DragOverlayCard({ task, columnId }: { task: Task; columnId: string }) {
  const isDone = columnId === 'done';
  
  return (
    <div className="card-glow rounded-xl border p-4 w-72 shadow-2xl shadow-purple-500/30 cursor-grabbing rotate-2 scale-105">
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
      </div>
    </div>
  );
}

interface ColumnComponentProps {
  column: Column;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewDetail: (task: Task) => void;
}

function ColumnComponent({ column, onAddTask, onEditTask, onDeleteTask, onViewDetail }: ColumnComponentProps) {
  // Make this column a droppable zone
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  // Gradient class for each column
  const headerGradient = {
    'backlog': 'column-header-backlog',
    'in-progress': 'column-header-inprogress',
    'done': 'column-header-done',
  }[column.id] || 'column-header-backlog';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col bg-slate-900/50 backdrop-blur rounded-2xl p-4 min-h-[450px] w-80 flex-shrink-0 border transition-all duration-200',
        isOver ? 'border-purple-500 bg-purple-900/10 ring-2 ring-purple-500/50' : 'border-slate-800/50'
      )}
    >
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
      <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              columnId={column.id}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onViewDetail={onViewDetail}
            />
          ))}
          {column.tasks.length === 0 && (
            <div className={cn(
              'text-center text-sm py-12 border-2 border-dashed rounded-xl transition-colors',
              isOver ? 'border-purple-400 text-purple-300 bg-purple-900/10' : 'border-slate-700/50 text-slate-500'
            )}>
              <p className="text-2xl mb-2">📋</p>
              <p>Drop tasks here</p>
            </div>
          )}
        </div>
      </SortableContext>
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

interface ProjectDetailModalProps {
  task: Task;
  onEdit: (task: Task) => void;
  onClose: () => void;
}

function ProjectDetailModal({ task, onEdit, onClose }: ProjectDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl shadow-purple-900/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-900 to-slate-800/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wide', priorityBadgeClass[task.priority])}>
                  {task.priority}
                </span>
                {task.assignee && (
                  <span className="flex items-center gap-1 text-sm text-slate-400">
                    <User className="w-4 h-4" />
                    {task.assignee}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{task.title}</h2>
              {task.description && (
                <p className="text-slate-400 text-sm">{task.description}</p>
              )}
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-xl transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          <div className="space-y-6">
            {/* Progress */}
            {typeof task.progress === 'number' && (
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-slate-300">Progress</span>
                  <span className="text-sm font-bold text-white ml-auto">{task.progress}%</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Long Description */}
            {task.longDescription && (
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-slate-300">Project Details</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{task.longDescription}</p>
              </div>
            )}

            {/* Notes */}
            {task.notes && (
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-slate-300">Notes</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{task.notes}</p>
              </div>
            )}

            {/* Links */}
            {task.links && task.links.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-slate-300">Related Links</span>
                </div>
                <div className="space-y-2">
                  {task.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                    >
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {task.nextSteps && (
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-slate-300">Next Steps</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{task.nextSteps}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created {formatDate(task.createdAt)}
              </span>
              {task.completedAt && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check className="w-3 h-3" />
                  Completed {formatDate(task.completedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
          <button
            onClick={() => { onClose(); onEdit(task); }}
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Project Details
          </button>
        </div>
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
    longDescription: 'Recipe Rip needs a complete rebuild. The existing React Native app has working UI but simulated extraction only. Rex\'s spec recommends Swift/SwiftUI with JSON-LD parsing, SQLite storage, and a 3-day trial → $7 unlock flow.',
    notes: '• Existing app is Expo/React Native\n• Rex recommends Swift/SwiftUI version\n• Need to decide: keep RN (faster) or rebuild (native)?\n• Bobby to make final call',
    links: [
      { label: 'Rex\'s Brief for Cody', url: '~/Desktop/Rex/Research/SecondBrain/Projects/RecipeApp/Brief_For_Cody.md' },
      { label: 'Technical Drafts', url: '~/Desktop/Rex/Research/SecondBrain/Projects/RecipeApp/Technical_Drafts_For_Cody.md' },
    ],
    nextSteps: '1. Bobby decides: React Native vs Swift\n2. If Swift: start native iOS build\n3. If RN: add real parsing + SQLite to existing app\n4. Design trial/unlock flow',
    progress: 15,
    priority: 'high',
    assignee: 'Cody',
    createdAt: Date.now(),
  },
  {
    id: 'task-2',
    title: 'Coloring book: Define product specs',
    description: 'What is it? Theme? Page count? Target audience? Need specs before building.',
    longDescription: 'Bobby wants to build a coloring book app. We need to define what it actually is before building anything.',
    notes: '• No specs defined yet\n• Need to understand the vision first\n• What makes it different from other coloring apps?\n• Target audience?',
    nextSteps: '1. Ask Bobby: what\'s the vision?\n2. Define: theme, page count, features\n3. Research competitors\n4. Create detailed spec doc',
    progress: 5,
    priority: 'medium',
    assignee: 'Bobby',
    createdAt: Date.now(),
  },
  {
    id: 'task-3',
    title: 'OpenClaw Guide: Define scope and remaining work',
    description: 'What sections still need to be written? What is the target audience?',
    longDescription: 'The OpenClaw Guide is Bobby\'s comprehensive guide to OpenClaw. Need to define what sections remain and who the target audience is.',
    notes: '• Some sections already written\n• Need to audit what\'s complete\n• Target audience: new OpenClaw users? Power users? Developers?',
    nextSteps: '1. Audit current guide content\n2. Define target audience\n3. List remaining sections\n4. Prioritize what to write next',
    progress: 30,
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

// Find which column contains a task by task ID
function findTaskColumn(columns: Column[], taskId: string): Column | undefined {
  return columns.find(col => col.tasks.some(t => t.id === taskId));
}

export default function KanbanBoard() {
  const [board, setBoard] = useState<{ columns: Column[]; activity: ActivityEntry[] }>(buildInitialBoard);
  const [activeTask, setActiveTask] = useState<{ task: Task; columnId: string } | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; task?: Task | null; columnId?: string }>({ isOpen: false });
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  // Configure drag sensors - use pointer for smooth dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Start drag after 8px movement to allow clicks
      },
    })
  );

  // Save to localStorage whenever board changes
  useEffect(() => {
    saveBoard(board.columns, board.activity);
  }, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as string;
    const column = findTaskColumn(board.columns, taskId);
    if (column) {
      const task = column.tasks.find(t => t.id === taskId);
      if (task) {
        setActiveTask({ task, columnId: column.id });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !activeTask) {
      setActiveTask(null);
      return;
    }

    const taskId = active.id as string;
    const overId = over.id as string;
    
    // Check if dropped over a column directly (useDroppable registers column.id)
    const targetColumn = board.columns.find(col => col.id === overId);
    
    if (targetColumn) {
      // Dropped directly on column (header area or empty column)
      if (targetColumn.id !== activeTask.columnId) {
        handleMoveTask(taskId, targetColumn.id);
      }
      // If same column and dropped on empty column area, do nothing
    } else {
      // Dropped on a task - find which column that task belongs to
      const overTaskColumn = findTaskColumn(board.columns, overId);
      if (overTaskColumn) {
        if (overTaskColumn.id !== activeTask.columnId) {
          // Cross-column move
          handleMoveTask(taskId, overTaskColumn.id);
        } else {
          // Same-column reordering - find indices and reorder
          handleReorderWithinColumn(taskId, overId);
        }
      }
    }
    
    setActiveTask(null);
  };

  const handleReorderWithinColumn = (draggedTaskId: string, overTaskId: string) => {
    if (draggedTaskId === overTaskId) return;
    
    setBoard((prev) => {
      const columnId = activeTask?.columnId;
      if (!columnId) return prev;
      
      const columnIndex = prev.columns.findIndex(col => col.id === columnId);
      if (columnIndex === -1) return prev;
      
      const column = prev.columns[columnIndex];
      const oldIndex = column.tasks.findIndex(t => t.id === draggedTaskId);
      const newIndex = column.tasks.findIndex(t => t.id === overTaskId);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      // Reorder the tasks array
      const newTasks = [...column.tasks];
      const [removed] = newTasks.splice(oldIndex, 1);
      newTasks.splice(newIndex, 0, removed);
      
      const newColumns = [...prev.columns];
      newColumns[columnIndex] = { ...column, tasks: newTasks };
      
      return { ...prev, columns: newColumns };
    });
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

  const handleViewDetail = (task: Task) => {
    setDetailTask(task);
  };

  const handleCloseDetail = () => {
    setDetailTask(null);
  };

  const handleEditFromDetail = (task: Task) => {
    setModalState({ isOpen: true, task });
  };

  return (
    <div className="min-h-screen p-8">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-black gradient-text mb-2">Mission Board</h1>
            <p className="text-slate-400 text-sm mt-1">Drag cards between columns to update their status</p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {board.columns.map((column) => (
              <ColumnComponent
                key={column.id}
                column={column}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onViewDetail={handleViewDetail}
              />
            ))}
          </div>
          <ActivityLog entries={board.activity} />
        </div>
        
        <DragOverlay>
          {activeTask ? (
            <DragOverlayCard task={activeTask.task} columnId={activeTask.columnId} />
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {modalState.isOpen && (
        <TaskModal
          task={modalState.task}
          columnId={modalState.columnId}
          onSave={handleSaveTask}
          onClose={handleCloseModal}
        />
      )}

      {detailTask && (
        <ProjectDetailModal
          task={detailTask}
          onEdit={handleEditFromDetail}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
