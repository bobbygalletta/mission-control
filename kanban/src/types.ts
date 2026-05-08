export interface Link {
  label: string;
  url: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  // Project detail fields
  longDescription?: string;
  notes?: string;
  links?: Link[];
  nextSteps?: string;
  progress?: number; // 0-100
  // Standard fields
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  createdAt: number;
  completedAt?: number;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export interface ActivityEntry {
  id: string;
  taskTitle: string;
  completedAt: number;
  assignee?: string;
}

export type BoardState = {
  columns: Column[];
  activity: ActivityEntry[];
};
