import axios from 'axios';

const NOTIFICATION_API_URL = 'http://localhost:8089';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  storyPoint?: number;
  assigneeId?: string | null;
  assigneeName?: string;
  shortKey?: string;
  projectId?: string;
  projectName?: string;
  sprintId?: string;
  dueDate?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  parentTaskId?: string | null;
  tags?: string[] | null;
}

// Check if a task is overdue
export const isTaskOverdue = (task: Task): boolean => {
  if (!task.dueDate || task.status === "DONE") {
    return false;
  }
  
  const dueDate = new Date(task.dueDate);
  const now = new Date();
  
  // Remove time part for date comparison
  dueDate.setHours(23, 59, 59, 999); // End of due date
  
  return now > dueDate;
};

// Send task overdue notification
export const sendTaskOverdueNotification = async (task: Task): Promise<void> => {
  try {
    await axios.post(`${NOTIFICATION_API_URL}/api/notifications/task-overdue`, {
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
      projectName: task.projectName || "Unknown Project",
      assigneeUserId: task.assigneeId
    });
    console.log('Task overdue notification sent for task:', task.id);
  } catch (error) {
    console.error('Failed to send task overdue notification:', error);
  }
};

// Check all tasks for overdue status and send notifications
export const checkAndNotifyOverdueTasks = async (tasks: Task[]): Promise<void> => {
  for (const task of tasks) {
    if (isTaskOverdue(task)) {
      await sendTaskOverdueNotification(task);
    }
  }
};

// Send task status changed notification
export const sendTaskStatusChangedNotification = async (
  task: Task,
  actorUserId: string,
  actorUserName: string,
  oldStatus: string,
  newStatus: string
): Promise<void> => {
  if (!task.assigneeId || task.assigneeId === actorUserId) {
    return; // Don't send if no assignee or user changed their own task
  }
  
  try {
    await axios.post(`${NOTIFICATION_API_URL}/api/notifications/task-status-changed`, {
      recipientUserId: task.assigneeId,
      actorUserId,
      actorUserName,
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
      projectName: task.projectName || "Unknown Project",
      oldStatus,
      newStatus
    });
    console.log('Task status change notification sent');
  } catch (error) {
    console.error('Failed to send task status change notification:', error);
  }
};

// Send task deleted notification
export const sendTaskDeletedNotification = async (
  task: Task,
  actorUserId: string,
  actorUserName: string
): Promise<void> => {
  try {
    await axios.post(`${NOTIFICATION_API_URL}/api/notifications/task-deleted`, {
      actorUserId,
      actorUserName,
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
      projectName: task.projectName || "Unknown Project",
      assigneeUserId: task.assigneeId
    });
    console.log('Task deleted notification sent');
  } catch (error) {
    console.error('Failed to send task deleted notification:', error);
  }
}; 