export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW = "REVIEW", 
  DONE = "DONE"
}

export interface Tag {
  text: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  tag: Tag;
  assigneeId?: string;
  storyPoints?: number;
  projectId?: string;
}

export interface BoardData {
  [TaskStatus.TODO]: Task[];
  [TaskStatus.IN_PROGRESS]: Task[];
  [TaskStatus.REVIEW]: Task[];
  [TaskStatus.DONE]: Task[];
} 