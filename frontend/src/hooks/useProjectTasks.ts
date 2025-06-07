import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useUserStorage } from '@/hooks/useUserStorage';

// Task interface matching the one used in project pages
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
  projectName?: string; // Add this field for notifications
  sprintId?: string;
  dueDate?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  parentTaskId?: string | null;
  tags?: string[] | null;
  createdBy?: string; // Add this field for notifications
}

// Type for API error responses
interface ErrorResponse {
  message: string;
}

// API base URL
const API_BASE_URL = 'http://localhost:8085';
const NOTIFICATION_API_URL = 'http://localhost:8089';

export const useProjectTasks = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useUserStorage();

  // Helper function to send task status change notifications
  const sendTaskStatusChangeNotification = async (
    task: Task, 
    oldStatus: Task["status"], 
    newStatus: Task["status"]
  ): Promise<void> => {
    // Only send notifications on client-side when user data is available
    if (typeof window === 'undefined' || !userData) {
      console.log('⚠️ Skipping notification - not on client side or no user data');
      return;
    }

    try {
      const actorUserId = userData.profile?.id || userData.account?.id;
      const actorUserName = userData.profile?.username || userData.profile?.firstName || 'User';

      if (!actorUserId) {
        console.warn('⚠️ No actor user ID available for notification');
        return;
      }

      console.log('🔍 DEBUG: Task info for notifications:', {
        taskId: task.id,
        assigneeId: task.assigneeId,
        createdBy: task.createdBy,
        projectId: task.projectId,
        actorUserId: actorUserId
      });

      const baseNotificationData = {
        type: "TASK_STATUS_CHANGED",
        title: "Task status changed",
        message: `${actorUserName} changed task "${task.title}" status from "${getStatusDisplayName(oldStatus)}" to "${getStatusDisplayName(newStatus)}"`,
        actorUserId: actorUserId,
        actorUserName: actorUserName,
        projectId: task.projectId,
        projectName: task.projectName || "TaskFlow Project",
        taskId: task.id
      };

      const recipients = [];

      // 1. Add assignee if exists and different from actor
      if (task.assigneeId && task.assigneeId !== actorUserId) {
        recipients.push(task.assigneeId);
        console.log('✅ Added assignee to recipients:', task.assigneeId);
      } else {
        console.log('❌ Assignee not added:', { 
          assigneeId: task.assigneeId, 
          actorUserId: actorUserId, 
          same: task.assigneeId === actorUserId 
        });
      }

      // 2. Add task creator if exists and different from actor and assignee
      if (task.createdBy && task.createdBy !== actorUserId && task.createdBy !== task.assigneeId) {
        recipients.push(task.createdBy);
        console.log('✅ Added task creator to recipients:', task.createdBy);
      } else {
        console.log('❌ Task creator not added:', { 
          createdBy: task.createdBy, 
          actorUserId: actorUserId, 
          assigneeId: task.assigneeId,
          sameAsActor: task.createdBy === actorUserId,
          sameAsAssignee: task.createdBy === task.assigneeId
        });
      }

      // 3. Add scrum master - we need to fetch this from project API
      let scrumMasterId = null;
      try {
        if (task.projectId) {
          console.log('🔍 Fetching project info for scrum master...', task.projectId);
          const projectResponse = await axios.get(`http://localhost:8086/api/projects/${task.projectId}`);
          console.log('🔍 Project API response:', projectResponse.data);
          
          if (projectResponse.data?.status === "SUCCESS" && projectResponse.data?.data?.scrumMasterId) {
            scrumMasterId = projectResponse.data.data.scrumMasterId;
            if (scrumMasterId !== actorUserId && scrumMasterId !== task.assigneeId && scrumMasterId !== task.createdBy) {
              recipients.push(scrumMasterId);
              console.log('✅ Added scrum master to recipients:', scrumMasterId);
            } else {
              console.log('❌ Scrum master not added (duplicate):', { 
                scrumMasterId: scrumMasterId, 
                actorUserId: actorUserId, 
                assigneeId: task.assigneeId,
                createdBy: task.createdBy
              });
            }
          } else {
            console.log('❌ No scrum master found in project data:', projectResponse.data?.data);
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch scrum master info:', error);
      }

      // Debug: Log all potential recipients before deduplication
      console.log('🔍 All recipients before deduplication:', recipients);

      // 🔧 TEMPORARY FIX: Add mock recipients if none found (for testing)
      if (recipients.length === 0) {
        console.log('⚠️ No real recipients found, adding mock recipients for testing...');
        
        // Add mock assignee if task has no real assignee
        if (!task.assigneeId) {
          recipients.push('mock-assignee-123');
          console.log('📝 Added mock assignee');
        }
        
        // Add mock creator if task has no real creator  
        if (!task.createdBy) {
          recipients.push('mock-creator-456');
          console.log('📝 Added mock creator');
        }
        
        // Add mock scrum master if no real scrum master found
        if (!scrumMasterId) {
          recipients.push('mock-scrum-master-789');
          console.log('📝 Added mock scrum master');
        }
      }

      // Send notifications to all unique recipients
      const uniqueRecipients = [...new Set(recipients)];
      console.log(`📤 Final unique recipients (${uniqueRecipients.length}):`, uniqueRecipients);

      if (uniqueRecipients.length === 0) {
        console.log('⚠️ No recipients found for notifications');
        return;
      }

      // Create notification promises for each recipient
      const notificationPromises = uniqueRecipients.map(async (recipientId, index) => {
        const notificationData = {
          ...baseNotificationData,
          recipientUserId: recipientId
        };

        console.log(`📤 Sending notification ${index + 1}/${uniqueRecipients.length} to:`, recipientId);
        console.log('📤 Notification data:', notificationData);
        
        try {
          const response = await axios.post(`http://localhost:8089/api/notifications/create`, notificationData);
          console.log(`✅ Notification ${index + 1} sent successfully:`, response.status);
          return response;
        } catch (error) {
          console.error(`❌ Failed to send notification ${index + 1}:`, error);
          throw error;
        }
      });

      const results = await Promise.allSettled(notificationPromises);
      
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.filter(result => result.status === 'rejected').length;
      
      console.log(`📊 Notification results: ${successCount} success, ${failedCount} failed`);
      
      if (failedCount > 0) {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`❌ Notification ${index + 1} failed:`, result.reason);
          }
        });
      }

      console.log(`✅ Task status change notifications completed: ${successCount}/${uniqueRecipients.length} sent successfully`);
      
    } catch (notifError) {
      console.error('❌ Failed to send task status change notification:', notifError);
      // Don't fail the main operation if notification fails
    }
  };

  const updateTaskStatus = async (task: Task, newStatus: Task["status"], oldStatus?: Task["status"]): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedTask = {
        ...task,
        status: newStatus,
        completedAt: newStatus === "DONE" ? new Date().toISOString() : null
      };

      // Get user data for header - only use if available (client-side)
      const actorUserId = userData?.profile?.id || userData?.account?.id;
      
      const response = await axios.put(
        `${API_BASE_URL}/api/tasks/${task.id}`,
        updatedTask,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(actorUserId && { 'X-User-Id': actorUserId }), // Send user ID in header for notifications
          },
        }
      );
      
      if (response.status === 200) {
        // Send notification for task status change using our notification function
        const previousStatus = oldStatus || task.status;
        await sendTaskStatusChangeNotification(task, previousStatus, newStatus);
        
        console.log('✅ Task status updated successfully');
        return true;
      }
      return false;
    } catch (err: any) {
      const error = err as AxiosError<ErrorResponse>;
      const errorMessage = error.response?.data?.message || 'Failed to update task status';
      setError(errorMessage);
      console.error('Error updating task status:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert status enum to display name
  const getStatusDisplayName = (status: string): string => {
    switch (status) {
      case "TODO":
        return "To Do";
      case "IN_PROGRESS":
        return "In Progress";
      case "REVIEW":
        return "Review";
      case "DONE":
        return "Done";
      default:
        return status;
    }
  };

  return {
    updateTaskStatus,
    sendTaskStatusChangeNotification, // Export this for direct use
    loading,
    error
  };
}; 