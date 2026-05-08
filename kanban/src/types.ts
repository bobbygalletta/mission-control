export interface Task {
  id: string;
  title: string;
  description?: string;
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
