import axios from 'axios';
import { safeValidateUUID, validateProjectId, validateUserId, validateTaskId } from './uuidUtils';

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

// Standard notification payload structure
interface StandardNotificationPayload {
  type: string;
  title: string;
  message: string;
  recipientUserId: string;
  actorUserId: string;
  actorUserName: string;
  projectId: string;
  projectName: string;
  taskId: string;
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
  if (!task.assigneeId) {
    console.log('No assignee for overdue task:', task.id);
    return;
  }

  try {
    // Validate UUIDs before sending
    const validatedProjectId = task.projectId ? validateProjectId(task.projectId) : null;
    const validatedAssigneeId = validateUserId(task.assigneeId);
    const validatedTaskId = validateTaskId(task.id);
    
    if (!validatedProjectId) {
      console.error('Cannot send overdue notification: invalid project ID');
      return;
    }

    // Standard payload format - only essential fields
    const notificationData: StandardNotificationPayload = {
      type: "TASK_OVERDUE",
      title: "Task Overdue",
      message: `Task "${task.title}" is overdue and needs your attention`,
      recipientUserId: validatedAssigneeId,
      actorUserId: validatedAssigneeId, // Self-notification for overdue
      actorUserName: "System",
      projectId: validatedProjectId,
      projectName: task.projectName || "Unknown Project",
      taskId: validatedTaskId
    };

    console.log('📤 TASK OVERDUE: Sending notification:', notificationData);
    await axios.post(`${NOTIFICATION_API_URL}/api/notifications/create`, notificationData);
    console.log('✅ TASK OVERDUE: Notification sent successfully for task:', task.id);
  } catch (error) {
    console.error('❌ TASK OVERDUE: Failed to send notification:', error);
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
    // Validate UUIDs before sending
    const validatedProjectId = task.projectId ? validateProjectId(task.projectId) : null;
    const validatedAssigneeId = validateUserId(task.assigneeId);
    const validatedActorId = validateUserId(actorUserId);
    const validatedTaskId = validateTaskId(task.id);
    
    if (!validatedProjectId) {
      console.error('Cannot send status change notification: invalid project ID');
      return;
    }
    
    // Standard payload format - only essential fields
    const notificationData: StandardNotificationPayload = {
      type: "TASK_STATUS_CHANGED",
      title: "Task Status Changed",
      message: `${actorUserName} changed task "${task.title}" status from "${oldStatus}" to "${newStatus}"`,
      recipientUserId: validatedAssigneeId,
      actorUserId: validatedActorId,
      actorUserName: actorUserName,
      projectId: validatedProjectId,
      projectName: task.projectName || "Unknown Project",
      taskId: validatedTaskId
    };

    console.log('📤 TASK STATUS CHANGED: Sending notification:', notificationData);
    await axios.post(`${NOTIFICATION_API_URL}/api/notifications/create`, notificationData);
    console.log('✅ TASK STATUS CHANGED: Notification sent successfully');
  } catch (error) {
    console.error('❌ TASK STATUS CHANGED: Failed to send notification:', error);
  }
};

// Send task deleted notification
export const sendTaskDeletedNotification = async (
  task: Task,
  actorUserId: string,
  actorUserName: string
): Promise<void> => {
  if (!task.assigneeId) {
    console.log('No assignee for deleted task:', task.id);
    return;
  }

  try {
    // Validate UUIDs before sending
    const validatedProjectId = task.projectId ? validateProjectId(task.projectId) : null;
    const validatedAssigneeId = validateUserId(task.assigneeId);
    const validatedActorId = validateUserId(actorUserId);
    const validatedTaskId = validateTaskId(task.id);
    
    if (!validatedProjectId) {
      console.error('Cannot send task deleted notification: invalid project ID');
      return;
    }

    // Standard payload format - only essential fields  
    const notificationData: StandardNotificationPayload = {
      type: "TASK_DELETED",
      title: "Task Deleted",
      message: `${actorUserName} deleted task "${task.title}" that was assigned to you`,
      recipientUserId: validatedAssigneeId,
      actorUserId: validatedActorId,
      actorUserName: actorUserName,
      projectId: validatedProjectId,
      projectName: task.projectName || "Unknown Project",
      taskId: validatedTaskId
    };

    console.log('📤 TASK DELETED: Sending notification:', notificationData);
    await axios.post(`${NOTIFICATION_API_URL}/api/notifications/create`, notificationData);
    console.log('✅ TASK DELETED: Notification sent successfully');
  } catch (error) {
    console.error('❌ TASK DELETED: Failed to send notification:', error);
  }
}; 