import { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, GripVertical } from 'lucide-react';
import { cn } from './lib/utils';
import type { Task, Column } from './types';

const STORAGE_KEY = 'kanban-board-state';

// Default columns
const defaultColumns: Column[] = [
  { id: 'todo', title: 'To Do', tasks: [] },
  { id: 'in-progress', title: 'In Progress', tasks: [] },
  { id: 'done', title: 'Done', tasks: [] },
];

// Load from localStorage
function loadBoard(): Column[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load board:', e);
  }
  return defaultColumns;
}

// Save to localStorage
function saveBoard(columns: Column[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
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

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}

function TaskCard({ task, onEdit, onDelete, onDragStart }: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className="bg-card text-card-foreground rounded-lg border border-border p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', priorityColors[task.priority])}>
              {task.priority}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1 hover:bg-accent rounded"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
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
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  isDragOver: boolean;
}

function ColumnComponent({ column, onAddTask, onEditTask, onDeleteTask, onDragOver, onDrop, onDragStart, isDragOver }: ColumnProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
      className={cn(
        'flex flex-col bg-secondary/50 rounded-xl p-3 min-h-[500px] w-72 flex-shrink-0 transition-colors',
        isDragOver && 'bg-primary/10 ring-2 ring-primary/30'
      )}
    >
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
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onDragStart={onDragStart}
          />
        ))}
        {column.tasks.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            No tasks yet
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskModalProps {
  task?: Task | null;
  onSave: (task: Task) => void;
  onClose: () => void;
}

function TaskModal({ task, onSave, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: task?.id || crypto.randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      createdAt: task?.createdAt || Date.now(),
    });
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
            <label className="text-sm font-medium block mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
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

export default function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(loadBoard);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; task?: Task | null; columnId?: string }>({ isOpen: false });

  // Save to localStorage whenever columns change
  useEffect(() => {
    saveBoard(columns);
  }, [columns]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (columnId: string) => {
    setDragOverColumnId(columnId);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);

    if (!draggedTask) return;

    // Remove task from its current column
    setColumns((prev) => {
      const newColumns = prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== draggedTask.id),
      }));

      // Add task to target column
      return newColumns.map((col) => {
        if (col.id === targetColumnId) {
          return {
            ...col,
            tasks: [...col.tasks, draggedTask],
          };
        }
        return col;
      });
    });

    setDraggedTask(null);
  };

  const handleAddTask = (columnId: string) => {
    setModalState({ isOpen: true, columnId });
  };

  const handleEditTask = (task: Task) => {
    setModalState({ isOpen: true, task });
  };

  const handleSaveTask = (task: Task) => {
    setColumns((prev) =>
      prev.map((col) => {
        // If the task exists in a column, update it
        const taskExists = col.tasks.some((t) => t.id === task.id);
        if (taskExists) {
          return {
            ...col,
            tasks: col.tasks.map((t) => (t.id === task.id ? task : t)),
          };
        }
        // Otherwise, add it to the specified column (from modalState.columnId)
        if (modalState.columnId && col.id === modalState.columnId) {
          return {
            ...col,
            tasks: [...col.tasks, task],
          };
        }
        return col;
      })
    );
    setModalState({ isOpen: false });
  };

  const handleDeleteTask = (taskId: string) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }))
    );
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Mission Board</h1>
          <p className="text-muted-foreground text-sm mt-1">Drag tasks between columns to update status</p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div
              key={column.id}
              onDragEnter={() => handleDragEnter(column.id)}
            >
              <ColumnComponent
                column={column}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                isDragOver={dragOverColumnId === column.id}
              />
            </div>
          ))}
        </div>
      </div>
      {modalState.isOpen && (
        <TaskModal
          task={modalState.task}
          onSave={handleSaveTask}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
