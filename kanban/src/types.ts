export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export type BoardState = {
  columns: Column[];
};
