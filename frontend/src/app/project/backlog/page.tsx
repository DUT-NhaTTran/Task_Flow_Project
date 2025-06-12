"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/drop-down";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { useNavigation } from "@/contexts/NavigationContext";
import { Search, ChevronDown, MoreHorizontal, ChevronRight, Plus, Edit, Check, Calendar, ChevronUp, Trash2, X, Archive } from "lucide-react";
import { useUserStorage } from "@/hooks/useUserStorage";
import { sendTaskOverdueNotification } from "@/utils/taskNotifications";
import { safeValidateUUID, validateProjectId, validateSprintId, generateMockUUID, isValidUUID } from "@/utils/uuidUtils";
import { 
  getUserPermissions, 
  canCreateSprint, 
  canManageSprints, 
  canStartEndSprints,
  canDeleteTask,
  canAssignTasks,
  canManageAnyTask,
  canEditTask,
  canTrainAI,
  UserPermissions,
  getRoleDisplayName
} from "@/utils/permissions";
import TaskDetailModal, { TaskData } from "@/components/tasks/TaskDetailModal";
import { useProjectValidation } from "@/hooks/useProjectValidation";
import { TaskMigrationModal } from "@/components/sprints/TaskMigrationModal";

interface SprintOption {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  goal?: string;
  projectId?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  avatar?: string;
}

type CheckboxNames = 'sprintHeader' | 'backlogHeader';

export default function BacklogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProjectId, setCurrentProjectId } = useNavigation();
  const { userData } = useUserStorage();
  
  // Ưu tiên projectId từ context (từ board), sau đó mới lấy từ URL
  const urlProjectId = searchParams?.get("projectId");
  const projectId = currentProjectId || urlProjectId;
  
  // Chỉ cập nhật context nếu có URL projectId nhưng context chưa có (backward compatibility)
  useEffect(() => {
    if (urlProjectId && !currentProjectId) {
      setCurrentProjectId(urlProjectId);
    }
  }, [urlProjectId, currentProjectId, setCurrentProjectId]);

  // Permission state
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null);
  const [checkboxState, setCheckboxState] = useState({
    sprintHeader: false,
    backlogHeader: false
  });
  const [backlogTasks, setBacklogTasks] = useState<TaskData[]>([]);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [currentSprint, setCurrentSprint] = useState<SprintOption | null>(null);
  const [isEditingSprint, setIsEditingSprint] = useState(false);
  const [openSprintMenu, setOpenSprintMenu] = useState<string | null>(null);
  
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const sprintMenuRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ✅ NEW: Task migration modal state
  const [showTaskMigrationModal, setShowTaskMigrationModal] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState<{
    id: string;
    name: string;
    action: "cancel" | "delete";
  } | null>(null);

  // Validate project exists and handle redirection if not
  useProjectValidation({ 
    projectId: projectId || null,
    onProjectNotFound: () => {
      setIsLoading(false); // Stop loading if project doesn't exist
    }
  });

  // Fetch user permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      if (userData?.account?.id && projectId) {
        setPermissionsLoading(true);
        try {
          const permissions = await getUserPermissions(userData.account.id, projectId);
          console.log('🔐 PERMISSION DEBUG:', {
            userId: userData.account.id,
            projectId,
            permissions,
            role: permissions?.role,
            isScrumMaster: permissions?.isScrumMaster,
            canManageSprints: permissions?.canManageSprints,
            canStartEndSprints: canStartEndSprints(permissions)
          });
          setUserPermissions(permissions);
        } catch (error) {
          console.error('Error fetching permissions:', error);
          setUserPermissions(null);
        } finally {
          setPermissionsLoading(false);
        }
      } else {
        setPermissionsLoading(false);
      }
    };

    fetchPermissions();
  }, [userData?.account?.id, projectId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setOpenStatusDropdown(null);
      }
      if (sprintMenuRef.current && !sprintMenuRef.current.contains(event.target as Node)) {
        setOpenSprintMenu(null);
      }
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && event.target instanceof Element && !event.target.closest('.sprint-edit-button')) {
        setShowSprintModal(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch tasks and sprints
  useEffect(() => {
    if (!projectId) {
      toast.error("No project ID provided");
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch tasks for this project
        const tasksResponse = await axios.get(`http://localhost:8085/api/tasks/project/${projectId}`);
        if (tasksResponse.data) {
          const allTasks = tasksResponse.data || [];
          setTasks(allTasks);
          
          // Filter out tasks that are not assigned to any sprint (backlog tasks) và chỉ hiển thị parent tasks
          const backlogTasksList = allTasks.filter((task: TaskData) => !task.sprintId && (task.parentTaskId === null || task.parentTaskId === undefined));
          setBacklogTasks(backlogTasksList);
        } else {
          console.error("Failed to fetch tasks:", tasksResponse.data);
          toast.error("Failed to load tasks");
        }

        // Fetch sprints for this project
        const sprintsResponse = await axios.get(`http://localhost:8084/api/sprints/project/${projectId}`);
        console.log("Sprint response:", sprintsResponse.data); // For debugging
        
        // Check if the API returns {data: [...]} structure
        if (sprintsResponse.data && sprintsResponse.data.data) {
          const sprintsData = Array.isArray(sprintsResponse.data.data) ? sprintsResponse.data.data : [];
          setSprints(sprintsData);
          
          // Expand the first sprint by default if available
          if (sprintsData.length > 0) {
            setExpandedSprint(sprintsData[0].id);
          } else {
            // If no sprints, expand the backlog by default
            setExpandedSprint('backlog');
          }
        } else if (sprintsResponse.data) {
          // If the API returns the array directly in the data property
          const sprintsData = Array.isArray(sprintsResponse.data) ? sprintsResponse.data : [];
          setSprints(sprintsData);
          
          // Expand the first sprint by default if available
          if (sprintsData.length > 0) {
            setExpandedSprint(sprintsData[0].id);
          } else {
            // If no sprints, expand the backlog by default
            setExpandedSprint('backlog');
          }
        } else {
          console.error("Failed to fetch sprints:", sprintsResponse.data);
          toast.error("Failed to load sprints");
          setSprints([]); // Ensure sprints is always an array
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error loading data");
        setSprints([]); // Ensure sprints is always an array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Handle the creation of a new task
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.error("Task title cannot be empty");
      return;
    }
    
    if (!projectId) {
      toast.error("No project ID provided");
      return;
    }
    
    setIsCreating(true);
    
    try {
      const newTask: Partial<TaskData> = {
        title: newTaskTitle,
        status: "TODO",
        projectId: projectId,
        description: "",
        storyPoint: 0,
        // If we're creating in a specific sprint, add that sprintId
        sprintId: expandedSprint !== 'backlog' && expandedSprint !== null ? expandedSprint : undefined
      };
      
      // Include user ID in headers
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (userData?.account?.id) {
        headers['X-User-Id'] = userData.account.id;
      }
      
      const response = await axios.post("http://localhost:8085/api/tasks", newTask, { headers });
      
      // Check if the response contains data (success)
      if (response.data) {
        toast.success("Task created successfully");
        
        // Reload tasks to get the new one with proper ID
        const tasksResponse = await axios.get(`http://localhost:8085/api/tasks/project/${projectId}`);
        if (tasksResponse.data) {
          const allTasks = tasksResponse.data || [];
          setTasks(allTasks);
          
          // Update backlog tasks
          const backlogTasksList = allTasks.filter((task: TaskData) => !task.sprintId && (task.parentTaskId === null || task.parentTaskId === undefined));
          setBacklogTasks(backlogTasksList);
        }
        
        setNewTaskTitle(""); // Reset input field
      } else {
        toast.error("Failed to create task");
        console.error("API returned error:", response.data);
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setIsCreating(false);
    }
  };

  // Handle status change of a task
  const handleStatusChange = async (taskId: string, newStatus: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE") => {
    try {
      // Find the task to update
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) {
        toast.error("Task not found");
        return;
      }
      
      const oldStatus = taskToUpdate.status;
      
      // Update the task status
      const updatedTask = { ...taskToUpdate, status: newStatus };
      
      // Get user ID from userData
      const userIdForHeader = userData?.profile?.id || userData?.account?.id || '';
      
      const response = await axios.put(`http://localhost:8085/api/tasks/${taskId}`, updatedTask, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userIdForHeader,
        },
      });
      
      // Check if the response contains data (success)
      if (response.data) {
        // Update local state
        const updatedTasks = tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        );
        setTasks(updatedTasks);
        
        // Update backlog tasks if needed
        if (!taskToUpdate.sprintId) {
          const updatedBacklogTasks = backlogTasks.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
          );
          setBacklogTasks(updatedBacklogTasks);
        }
        
        // Send status change notification if user data is available
        if (userData && oldStatus !== newStatus) {
          try {
            const actorUserId = userData.profile?.id || userData.account?.id;
            const actorUserName = userData.profile?.username || userData.profile?.firstName || 'User';
            
            // Helper function to convert status to display name
            const getStatusDisplayName = (status: string): string => {
              switch (status) {
                case "TODO": return "To Do";
                case "IN_PROGRESS": return "In Progress";
                case "REVIEW": return "Review";
                case "DONE": return "Done";
                default: return status;
              }
            };

            const baseNotificationData = {
              type: "TASK_STATUS_CHANGED",
              title: "Task status changed",
              message: `${actorUserName} changed task "${taskToUpdate.title}" status from "${getStatusDisplayName(oldStatus)}" to "${getStatusDisplayName(newStatus)}"`,
              actorUserId: actorUserId,
              actorUserName: actorUserName,
              projectId: taskToUpdate.projectId,
              projectName: "TaskFlow Project", // You can enhance this to get actual project name
              taskId: taskToUpdate.id
            };

            const recipients = [];

            // 1. Add assignee if exists and different from actor
            if (taskToUpdate.assigneeId && taskToUpdate.assigneeId !== actorUserId) {
              recipients.push(taskToUpdate.assigneeId);
            }

            // 2. Add task creator if exists and different from actor and assignee
            if (taskToUpdate.createdBy && taskToUpdate.createdBy !== actorUserId && taskToUpdate.createdBy !== taskToUpdate.assigneeId) {
              recipients.push(taskToUpdate.createdBy);
            }

            // 3. Add scrum master - fetch from project API
            try {
              if (taskToUpdate.projectId) {
                const projectResponse = await axios.get(`http://localhost:8083/api/projects/${taskToUpdate.projectId}`);
                if (projectResponse.data?.status === "SUCCESS" && projectResponse.data?.data?.scrumMasterId) {
                  const scrumMasterId = projectResponse.data.data.scrumMasterId;
                  if (scrumMasterId !== actorUserId && scrumMasterId !== taskToUpdate.assigneeId && scrumMasterId !== taskToUpdate.createdBy) {
                    recipients.push(scrumMasterId);
                  }
                }
              }
            } catch (error) {
              console.warn('⚠️ Failed to fetch scrum master info:', error);
            }

            // Send notifications to all unique recipients
            const uniqueRecipients = [...new Set(recipients)];
            console.log(`📤 BACKLOG: Sending status change notifications to ${uniqueRecipients.length} recipients:`, uniqueRecipients);

            if (uniqueRecipients.length > 0) {
              const notificationPromises = uniqueRecipients.map(async (recipientId) => {
                const statusNotificationData = {
                  ...baseNotificationData,
                  recipientUserId: recipientId
                };

                console.log('📤 BACKLOG: Sending notification to:', recipientId);
                return axios.post('http://localhost:8089/api/notifications/create', statusNotificationData);
              });

              await Promise.all(notificationPromises);
              console.log(`✅ BACKLOG: ${uniqueRecipients.length} status change notifications sent successfully`);
            }
          } catch (notificationError) {
            console.error('❌ BACKLOG: Failed to send task status change notification:', notificationError);
            // Don't fail the main operation if notification fails
          }
        }
        
        toast.success("Task status updated");
      } else {
        toast.error("Failed to update task status");
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    }
  };

  // Assign task to sprint (move from backlog to sprint)
  const assignTaskToSprint = async (taskId: string, sprintId: string) => {
    try {
      // Find the task to update
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) {
        toast.error("Task not found");
        return;
      }
      
      // Update the task with sprint ID
      const updatedTask = { ...taskToUpdate, sprintId: sprintId };
      
      const response = await axios.put(`http://localhost:8085/api/tasks/${taskId}`, updatedTask);
      
      if (response.data) {
        // Update local state
        const updatedTasks = tasks.map((task) =>
          task.id === taskId ? { ...task, sprintId: sprintId } : task
        );
        setTasks(updatedTasks);
        
        // Remove from backlog
        setBacklogTasks(backlogTasks.filter(task => task.id !== taskId));
        
        toast.success("Task assigned to sprint");
      } else {
        toast.error("Failed to assign task to sprint");
      }
    } catch (error) {
      console.error("Error assigning task to sprint:", error);
      toast.error("Failed to assign task to sprint");
    }
  };

  // Toggle sprint expansion
  const toggleSprint = (sprintId: string) => {
    if (expandedSprint === sprintId) {
      setExpandedSprint(null);
    } else {
      setExpandedSprint(sprintId);
    }
  };

  const handleCheckboxChange = (name: CheckboxNames) => {
    setCheckboxState(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Get status color class
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "TODO":
        return "bg-gray-200";
      case "IN_PROGRESS":
        return "bg-blue-200";
      case "REVIEW":
        return "bg-purple-200";
      case "DONE":
        return "bg-green-200";
      default:
        return "bg-gray-200";
    }
  };

  // Status dropdown options
  const statusOptions: { value: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE"; label: string }[] = [
    { value: "TODO", label: "To Do" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "REVIEW", label: "Review" },
    { value: "DONE", label: "Done" }
  ];

  // Fetch project members for notifications
  const fetchProjectMembers = async (): Promise<User[]> => {
    try {
      if (!projectId) {
        console.warn("No project ID available for fetching members");
        return [];
      }

      const response = await axios.get(`http://localhost:8083/api/projects/${projectId}/users`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.data && response.data.status === "SUCCESS" && Array.isArray(response.data.data)) {
        return response.data.data;
      } else {
        console.warn("Unexpected response format for project members:", response.data);
        return [];
      }
    } catch (error) {
      console.error("Error fetching project members:", error);
      return [];
    }
  };

  // Enhanced sprint notification function to handle all sprint events
  const sendSprintNotificationToMembers = async (
    notificationType: "SPRINT_CREATED" | "SPRINT_UPDATED" | "SPRINT_STARTED" | "SPRINT_ENDED" | "SPRINT_COMPLETED" | "SPRINT_GOAL_UPDATED",
    sprint: SprintOption,
    actionDescription: string,
    additionalInfo?: string
  ) => {
    try {
      console.log(`🔔 SPRINT NOTIFICATION: Starting ${notificationType} notification process...`);
      
      // Validate projectId before proceeding
      if (!projectId) {
        console.error('❌ SPRINT NOTIFICATION: No project ID available');
        return;
      }
      
      let validatedProjectId: string;
      let validatedSprintId: string | null = null;
      
      try {
        validatedProjectId = validateProjectId(projectId);
      } catch (error) {
        console.error('❌ SPRINT NOTIFICATION: Invalid project ID format:', error);
        return;
      }
      
      try {
        validatedSprintId = validateSprintId(sprint.id);
      } catch (error) {
        console.error('❌ SPRINT NOTIFICATION: Invalid sprint ID format:', error);
        return;
      }
      
      if (!validatedSprintId) {
        console.error('❌ SPRINT NOTIFICATION: Sprint ID is required for notifications');
        return;
      }
      
      // Get current user data
      if (!userData?.account?.id && !userData?.profile?.id) {
        console.warn("No current user data available for notifications");
        return;
      }
      
      const currentUserId = userData.account?.id || userData.profile?.id;
      const currentUserName = userData.profile?.username || userData.profile?.firstName || userData.account?.email || 'User';

      console.log(`🔔 SPRINT NOTIFICATION: Starting ${notificationType} for sprint "${sprint.name}"`);

      // Fetch project members
      const projectMembers = await fetchProjectMembers();
      console.log(`👥 SPRINT NOTIFICATION: Found ${projectMembers.length} project members`);

      // Fetch project details to get scrum master
      let scrumMasterId: string | null = null;
      let projectName = "TaskFlow Project";
      
      try {
        const projectResponse = await axios.get(`http://localhost:8083/api/projects/${validatedProjectId}`);
        if (projectResponse.data?.status === "SUCCESS" && projectResponse.data?.data) {
          scrumMasterId = projectResponse.data.data.scrumMasterId;
          projectName = projectResponse.data.data.name || projectName;
          console.log(`📋 SPRINT NOTIFICATION: Project details - Name: "${projectName}", Scrum Master: ${scrumMasterId}`);
        }
      } catch (error) {
        console.warn('⚠️ SPRINT NOTIFICATION: Failed to fetch project details:', error);
      }

      // Create comprehensive recipient list
      const allRecipients = new Set<string>();
      
      // Add all project members
      projectMembers.forEach(member => {
        if (member.id !== currentUserId) { // Exclude current user
          allRecipients.add(member.id);
        }
      });
      
      // Add scrum master if not already included and not current user
      if (scrumMasterId && scrumMasterId !== currentUserId && !allRecipients.has(scrumMasterId)) {
        allRecipients.add(scrumMasterId);
        console.log(`➕ SPRINT NOTIFICATION: Added scrum master ${scrumMasterId} to recipients`);
      }

      const recipientIds = Array.from(allRecipients);
      console.log(`📝 SPRINT NOTIFICATION: Total recipients (excluding current user): ${recipientIds.length}`);
      console.log(`📋 SPRINT NOTIFICATION: Recipients: ${recipientIds.join(', ')}`);

      if (recipientIds.length === 0) {
        console.log("No recipients to notify (current user is the only member or no members found)");
        return;
      }

      // Determine notification title and message based on type
      let notificationTitle = "";
      let notificationMessage = "";
      
      switch (notificationType) {
        case "SPRINT_CREATED":
          notificationTitle = "New Sprint Created";
          notificationMessage = `${currentUserName} created a new sprint "${sprint.name}"`;
          break;
        case "SPRINT_UPDATED":
          notificationTitle = "Sprint Updated";
          notificationMessage = `${currentUserName} updated sprint "${sprint.name}"${additionalInfo ? `: ${additionalInfo}` : ''}`;
          break;
        case "SPRINT_GOAL_UPDATED":
          notificationTitle = "Sprint Goal Updated";
          notificationMessage = `${currentUserName} updated the goal for sprint "${sprint.name}"`;
          break;
        case "SPRINT_STARTED":
          notificationTitle = "Sprint Started";
          notificationMessage = `${currentUserName} started sprint "${sprint.name}"`;
          break;
        case "SPRINT_ENDED":
          notificationTitle = "Sprint Ended";
          notificationMessage = `Sprint "${sprint.name}" has ended`;
          break;
        case "SPRINT_COMPLETED":
          notificationTitle = "Sprint Completed";
          notificationMessage = `${currentUserName} completed sprint "${sprint.name}"`;
          break;
        default:
          notificationTitle = "Sprint Notification";
          notificationMessage = `Sprint "${sprint.name}" was ${actionDescription.toLowerCase()}`;
      }

      // Create notification data with all required fields
      const baseNotificationData = {
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        actorUserId: currentUserId,
        actorUserName: currentUserName,
        projectId: validatedProjectId,
        projectName: projectName,
        sprintId: validatedSprintId,
        actionUrl: `/project/backlog?projectId=${validatedProjectId}&sprintId=${validatedSprintId}`
      };

      console.log(`🔍 SPRINT NOTIFICATION: Base notification data:`, baseNotificationData);

      // Send notifications to all recipients
      const notificationPromises = recipientIds.map(async (recipientId, index) => {
        const notificationData = {
          ...baseNotificationData,
          recipientUserId: recipientId
        };

        console.log(`📤 SPRINT NOTIFICATION: Sending ${notificationType} notification ${index + 1}/${recipientIds.length} to user: ${recipientId}`);
        console.log(`📋 SPRINT NOTIFICATION: Payload ${index + 1}:`, JSON.stringify(notificationData, null, 2));

        try {
          const response = await axios.post('http://localhost:8089/api/notifications/create', notificationData, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
          console.log(`✅ SPRINT NOTIFICATION: Successfully sent to ${recipientId}`);
          return response;
        } catch (error) {
          console.error(`❌ SPRINT NOTIFICATION: Failed to send to ${recipientId}:`, error);
          if (axios.isAxiosError(error) && error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, error.response.data);
          }
          throw error; // Re-throw to be handled by Promise.allSettled
        }
      });

      const results = await Promise.allSettled(notificationPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`📊 SPRINT NOTIFICATION: Results - ${successful} successful, ${failed} failed out of ${recipientIds.length} total`);

      if (successful > 0) {
        console.log(`✅ SPRINT NOTIFICATION: ${successful} ${notificationType} notifications sent successfully`);
      }
      if (failed > 0) {
        console.warn(`❌ SPRINT NOTIFICATION: ${failed} notifications failed to send`);
      }

    } catch (error) {
      console.error(`❌ SPRINT NOTIFICATION: Failed to send ${notificationType} notifications:`, error);
      // Don't fail the main operation if notification fails
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Check for sprint end dates and send notifications
  const checkSprintEndDates = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      
      for (const sprint of sprints) {
        if (sprint.endDate && sprint.status === "ACTIVE") {
          const endDate = new Date(sprint.endDate);
          endDate.setHours(0, 0, 0, 0);
          
          // Check if sprint ended today
          if (endDate.getTime() === today.getTime()) {
            console.log(`📅 Sprint "${sprint.name}" ended today, sending notifications...`);
            
            // Send SPRINT_ENDED notification
            await sendSprintNotificationToMembers(
              "SPRINT_ENDED", 
              sprint, 
              "Ended", 
              "Sprint has reached its end date"
            );
          }
        }
      }
    } catch (error) {
      console.error("Error checking sprint end dates:", error);
    }
  };

  // Auto-check sprint end dates when sprints data loads
  useEffect(() => {
    if (sprints.length > 0) {
      checkSprintEndDates();
    }
  }, [sprints]);

  // Enhanced Create new sprint with better notifications
  const handleCreateSprint = async () => {
    if (!projectId) {
      toast.error("No project ID provided");
      return;
    }

    try {
      // Get current date for start date
      const startDate = new Date();
      // Format date as "YYYY-MM-DD"
      const formattedStartDate = startDate.toISOString().split('T')[0];
      
      // Add 2 weeks for end date
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);
      const formattedEndDate = endDate.toISOString().split('T')[0];

      // Format the request body according to the API requirements (without ID - let DB generate)
      const newSprint = {
        name: "New Sprint",
        goal: "",
        projectId: projectId,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        status: "NOT_STARTED"
      };

      console.log("Creating sprint with data:", newSprint);
      
      const response = await axios.post("http://localhost:8084/api/sprints", newSprint);

      console.log("Sprint creation response:", response.data);

      if (response.data) {
        toast.success("Sprint created successfully");
        
        // Extract sprint data from response - handle different response structures
        let createdSprint: SprintOption;
        
        if (response.data.data && response.data.data.id) {
          // ResponseDataAPI structure with nested data
          createdSprint = {
            id: response.data.data.id,
            name: response.data.data.name || newSprint.name,
            startDate: response.data.data.startDate || newSprint.startDate,
            endDate: response.data.data.endDate || newSprint.endDate,
            status: response.data.data.status || newSprint.status,
            goal: response.data.data.goal || newSprint.goal,
            projectId: response.data.data.projectId || newSprint.projectId
          };
        } else if (response.data.id) {
          // Direct sprint object structure
          createdSprint = {
            id: response.data.id,
            name: response.data.name || newSprint.name,
            startDate: response.data.startDate || newSprint.startDate,
            endDate: response.data.endDate || newSprint.endDate,
            status: response.data.status || newSprint.status,
            goal: response.data.goal || newSprint.goal,
            projectId: response.data.projectId || newSprint.projectId
          };
        } else {
          // If no ID in response, fetch sprints again to get the latest created one
          console.warn("No sprint ID in response, fetching sprints to get the newly created one");
          await fetchSprints();
          toast.success("Sprint created successfully");
          return;
        }

        console.log("Extracted sprint for notification:", createdSprint);
        
        // Send SPRINT_CREATED notifications to ALL project members including scrum master
        try {
          if (createdSprint.id && isValidUUID(createdSprint.id)) {
            await sendSprintNotificationToMembers("SPRINT_CREATED", createdSprint, "Created");
          } else {
            console.warn("⚠️ Sprint created but ID is not a valid UUID:", createdSprint.id);
            toast.warning("Sprint created successfully, but notifications were skipped due to invalid sprint ID format");
          }
        } catch (notificationError) {
          console.error("Failed to send sprint creation notifications:", notificationError);
          // Don't fail the main operation if notification fails
          toast.warning("Sprint created successfully, but notifications may have failed");
        }
        
        // Reload sprints to get the new one with proper ID from database
        await fetchSprints();
        
        // Expand the newly created sprint if we have valid ID
        if (createdSprint.id && isValidUUID(createdSprint.id)) {
          setExpandedSprint(createdSprint.id);
        }
      } else {
        toast.error("Failed to create sprint");
        console.error("API returned error:", response.data);
      }
    } catch (error) {
      console.error("Error creating sprint:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Sprint creation error details:", {
          status: error.response.status,
          data: error.response.data
        });
        toast.error(`Failed to create sprint: ${error.response.status} ${error.response.statusText}`);
      } else {
        toast.error("Failed to create sprint");
      }
    }
  };

  // Fetch sprints
  const fetchSprints = async () => {
    if (!projectId) return;
    
    try {
      const sprintsResponse = await axios.get(`http://localhost:8084/api/sprints/project/${projectId}`);
      console.log("Sprint response:", sprintsResponse.data);
      
      // Check if the API returns {data: [...]} structure
      if (sprintsResponse.data && sprintsResponse.data.data) {
        const sprintsData = Array.isArray(sprintsResponse.data.data) ? sprintsResponse.data.data : [];
        setSprints(sprintsData);
      } else if (sprintsResponse.data) {
        // If the API returns the array directly in the data property
        const sprintsData = Array.isArray(sprintsResponse.data) ? sprintsResponse.data : [];
        setSprints(sprintsData);
      } else {
        setSprints([]); // Ensure sprints is always an array
      }
    } catch (error) {
      console.error("Error fetching sprints:", error);
      setSprints([]); // Ensure sprints is always an array on error
    }
  };

  // Edit sprint
  const handleEditSprint = (sprint: SprintOption) => {
    setCurrentSprint(sprint);
    setIsEditingSprint(true);
    setShowSprintModal(true);
  };

  // Update sprint
  const handleUpdateSprint = async () => {
    if (!currentSprint || !currentSprint.id) {
      toast.error("No sprint selected");
      return;
    }

    try {
      // Get original sprint for comparison
      const originalSprint = sprints.find(s => s.id === currentSprint.id);
      
      // Create a copy of the sprint object with only the fields that should be updated
      const sprintUpdate = {
        name: currentSprint.name,
        startDate: currentSprint.startDate,
        endDate: currentSprint.endDate,
        goal: currentSprint.goal,
        status: currentSprint.status,
        projectId: currentSprint.projectId
      };

      console.log("Updating sprint with data:", sprintUpdate);
      
      // Use PUT method as configured in the backend
      const response = await axios.put(`http://localhost:8084/api/sprints/${currentSprint.id}`, sprintUpdate);

      if (response.data && response.data.status === "SUCCESS") {
        toast.success("Sprint updated successfully");
        
        // Check what was updated and send appropriate notifications
        if (originalSprint) {
          // Check if goal was updated
          if (originalSprint.goal !== currentSprint.goal) {
            await sendSprintNotificationToMembers(
              "SPRINT_GOAL_UPDATED", 
              currentSprint, 
              "Updated Goal",
              currentSprint.goal || "No goal set"
            );
          } else {
            // Send general sprint updated notification
            await sendSprintNotificationToMembers("SPRINT_UPDATED", currentSprint, "Updated");
          }
        } else {
          // Fallback: send general update notification
          await sendSprintNotificationToMembers("SPRINT_UPDATED", currentSprint, "Updated");
        }
        
        setShowSprintModal(false);
        await fetchSprints();
      } else {
        toast.error("Failed to update sprint");
      }
    } catch (error) {
      console.error("Error updating sprint:", error);
      toast.error("Failed to update sprint");
    }
  };

  // Delete sprint
  const handleDeleteSprint = async (sprintId: string) => {
    const sprint = sprints.find(s => s.id === sprintId);
    if (!sprint) return;
    
    // ✅ NEW: Use TaskMigrationModal for soft delete with task migration
    setSprintToDelete({
      id: sprintId,
      name: sprint.name,
      action: "delete"
    });
    setShowTaskMigrationModal(true);
  };

  // ✅ NEW: Handle sprint cancellation
  const handleCancelSprint = async (sprintId: string) => {
    const sprint = sprints.find(s => s.id === sprintId);
    if (!sprint) return;
    
    setSprintToDelete({
      id: sprintId,
      name: sprint.name,
      action: "cancel"
    });
    setShowTaskMigrationModal(true);
  };

  // ✅ NEW: Handle task migration completion
  const handleMigrationComplete = () => {
    fetchSprints(); // Refresh sprints
    // Fetch tasks for this project - inline the fetch logic
    const refreshTasks = async () => {
      if (!projectId) return;
      
      try {
        const tasksResponse = await axios.get(`http://localhost:8085/api/tasks/project/${projectId}`);
        if (tasksResponse.data) {
          const allTasks = tasksResponse.data || [];
          setTasks(allTasks);
          
          // Filter out tasks that are not assigned to any sprint (backlog tasks)
          const backlogTasksList = allTasks.filter((task: TaskData) => !task.sprintId && (task.parentTaskId === null || task.parentTaskId === undefined));
          setBacklogTasks(backlogTasksList);
        }
      } catch (error) {
        console.error("Error refreshing tasks:", error);
      }
    };
    
    refreshTasks();
    setSprintToDelete(null);
  };

  // Move task to backlog
  const handleMoveTaskToBacklog = async (taskId: string) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) {
        toast.error("Task not found");
        return;
      }
      
      const updatedTask = { ...taskToUpdate, sprintId: undefined };
      
      const response = await axios.put(`http://localhost:8085/api/tasks/${taskId}`, updatedTask);
      
      if (response.data) {
        // Update local state
        const updatedTasks = tasks.map((task) =>
          task.id === taskId ? { ...task, sprintId: undefined } : task
        );
        setTasks(updatedTasks);
        
        // Add to backlog
        const updatedBacklogTask = { ...taskToUpdate, sprintId: undefined };
        setBacklogTasks([...backlogTasks, updatedBacklogTask]);
        
        toast.success("Task moved to backlog");
      } else {
        toast.error("Failed to move task to backlog");
      }
    } catch (error) {
      console.error("Error moving task to backlog:", error);
      toast.error("Failed to move task to backlog");
    }
  };

  // Move sprint position (up or down)
  const handleMoveSprint = async (sprintId: string, direction: 'up' | 'down') => {
    // This would normally be handled by a server API
    // For now, we'll just update the local state to simulate the move
    const sprintIndex = sprints.findIndex(sprint => sprint.id === sprintId);
    
    if (sprintIndex === -1) return;
    
    if (direction === 'up' && sprintIndex > 0) {
      // Move up (swap with previous sprint)
      const newSprints = [...sprints];
      [newSprints[sprintIndex], newSprints[sprintIndex - 1]] = [newSprints[sprintIndex - 1], newSprints[sprintIndex]];
      setSprints(newSprints);
      toast.success("Sprint moved up");
    } else if (direction === 'down' && sprintIndex < sprints.length - 1) {
      // Move down (swap with next sprint)
      const newSprints = [...sprints];
      [newSprints[sprintIndex], newSprints[sprintIndex + 1]] = [newSprints[sprintIndex + 1], newSprints[sprintIndex]];
      setSprints(newSprints);
      toast.success("Sprint moved down");
    }
    
    setOpenSprintMenu(null);
  };

  // Move task to sprint
  const handleMoveTaskToSprint = async (taskId: string, sprintId: string) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) {
        toast.error("Task not found");
        return;
      }
      
      const updatedTask = { ...taskToUpdate, sprintId: sprintId };
      
      const response = await axios.put(`http://localhost:8085/api/tasks/${taskId}`, updatedTask);
      
      if (response.data) {
        // Update local state
        const updatedTasks = tasks.map((task) =>
          task.id === taskId ? { ...task, sprintId: sprintId } : task
        );
        setTasks(updatedTasks);
        
        // Remove from backlog if it was there
        if (backlogTasks.some(task => task.id === taskId)) {
          setBacklogTasks(backlogTasks.filter(task => task.id !== taskId));
        }
        
        toast.success("Task moved to sprint");
      } else {
        toast.error("Failed to move task to sprint");
      }
    } catch (error) {
      console.error("Error moving task to sprint:", error);
      toast.error("Failed to move task to sprint");
    }
  };

  // Calculate total story points for a sprint
  const getSprintStoryPoints = (sprintId: string) => {
    const sprintTasks = tasks.filter(task => 
      task.sprintId === sprintId && 
      (task.parentTaskId === null || task.parentTaskId === undefined)
    );
    
    const totalPoints = sprintTasks.reduce((total, task) => {
      return total + (task.storyPoint || 0);
    }, 0);
    
    return totalPoints;
  };

  // Calculate completed story points for a sprint
  const getCompletedSprintStoryPoints = (sprintId: string) => {
    const completedTasks = tasks.filter(task => 
      task.sprintId === sprintId && 
      task.status === "DONE" &&
      (task.parentTaskId === null || task.parentTaskId === undefined)
    );
    
    const completedPoints = completedTasks.reduce((total, task) => {
      return total + (task.storyPoint || 0);
    }, 0);
    
    return completedPoints;
  };

  // Calculate total story points for backlog
  const getBacklogStoryPoints = () => {
    const totalPoints = backlogTasks.reduce((total, task) => {
      return total + (task.storyPoint || 0);
    }, 0);
    
    return totalPoints;
  };

  // Calculate completed story points for backlog
  const getCompletedBacklogStoryPoints = () => {
    const completedTasks = backlogTasks.filter(task => task.status === "DONE");
    
    const completedPoints = completedTasks.reduce((total, task) => {
      return total + (task.storyPoint || 0);
    }, 0);
    
    return completedPoints;
  };

  // Handle starting a sprint
  const handleStartSprint = async (sprintId: string) => {
    try {
      const response = await axios.post(`http://localhost:8084/api/sprints/${sprintId}/start`);
      
      if (response.data && response.data.status === "SUCCESS") {
        toast.success("Sprint started successfully");
        
        // Find the sprint that was started for notification
        const startedSprint = sprints.find(s => s.id === sprintId);
        if (startedSprint) {
          // Send SPRINT_STARTED notifications to project members
          await sendSprintNotificationToMembers("SPRINT_STARTED", startedSprint, "Started");
        }
        
        await fetchSprints(); // Reload sprints to get updated status
      } else {
        toast.error("Failed to start sprint");
      }
    } catch (error) {
      console.error("Error starting sprint:", error);
      toast.error("Failed to start sprint");
    }
  };
  
  // Handle completing a sprint
  const handleCompleteSprint = async (sprintId: string) => {
    try {
      const response = await axios.post(`http://localhost:8084/api/sprints/${sprintId}/complete`);
      
      if (response.data && response.data.status === "SUCCESS") {
        toast.success("Sprint completed successfully");
        
        // Find the sprint that was completed for notification
        const completedSprint = sprints.find(s => s.id === sprintId);
        if (completedSprint) {
          // Send SPRINT_COMPLETED notifications to project members
          await sendSprintNotificationToMembers("SPRINT_COMPLETED", completedSprint, "Completed");
        }
        
        await fetchSprints(); // Reload sprints to get updated status
      } else {
        toast.error("Failed to complete sprint");
      }
    } catch (error) {
      console.error("Error completing sprint:", error);
      toast.error("Failed to complete sprint");
    }
  };

  // AI Estimation function
  const estimateStoryPoints = async (taskId: string) => {
    try {
      const response = await axios.post(`http://localhost:8085/api/tasks/${taskId}/estimate-story-points`);
      
      if (response.data && response.data.success) {
        const { estimatedStoryPoints, confidence } = response.data.data;
        
        toast.success(
          `AI suggests ${estimatedStoryPoints} story points (${Math.round(confidence * 100)}% confidence)`
        );
        
        // Refresh tasks to show updated estimation
        const tasksResponse = await axios.get(`http://localhost:8085/api/tasks/project/${projectId}`);
        if (tasksResponse.data) {
          const allTasks = tasksResponse.data || [];
          setTasks(allTasks);
          
          // Update backlog tasks
          const backlogTasksList = allTasks.filter((task: TaskData) => !task.sprintId && (task.parentTaskId === null || task.parentTaskId === undefined));
          setBacklogTasks(backlogTasksList);
        }
        
        return estimatedStoryPoints;
      } else {
        toast.error("Failed to estimate story points");
        return null;
      }
    } catch (error) {
      console.error("Error estimating story points:", error);
      toast.error("Error estimating story points");
      return null;
    }
  };

  // Train AI Model function
  const trainAIModel = async () => {
    try {
      toast.info("Training AI model... This may take a few minutes.");
      
      const response = await axios.post(`http://localhost:8085/api/tasks/train-ai-model`);
      
      if (response.data && response.data.success) {
        toast.success("AI model trained successfully!");
      } else {
        toast.error("Failed to train AI model");
      }
    } catch (error) {
      console.error("Error training AI model:", error);
      toast.error("Error training AI model");
    }
  };

  // Add priority sorting function
  const sortTasksByPriority = (tasks: TaskData[]): TaskData[] => {
    const priorityOrder = {
      'BLOCKER': 6,
      'HIGHEST': 5,
      'HIGH': 4,
      'MEDIUM': 3,
      'LOW': 2,
      'LOWEST': 1,
      'BLOCK': 0     // ✅ NEW: Very low priority, hidden from main board
    };

    return [...tasks].sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'MEDIUM'];
      const bPriority = priorityOrder[b.priority || 'MEDIUM'];
      
      // Sort by priority first (highest to lowest)
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // If priorities are equal, sort by created date (newest first)
      const aDate = new Date(a.createdAt || '').getTime();
      const bDate = new Date(b.createdAt || '').getTime();
      return bDate - aDate;
    });
  };

  // Get priority icon and color
  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'BLOCKER': return '🚨';
      case 'HIGHEST': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      case 'LOWEST': return '🔵';
      case 'BLOCK': return '🚫';
      case 'REJECT': return '❌';
      default: return '🟡';
    }
  };

  const getPriorityColorClass = (priority?: string) => {
    switch (priority) {
      case 'BLOCKER': return 'bg-red-200 text-red-900 border-red-400';
      case 'HIGHEST': return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-300';
      case 'LOWEST': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'BLOCK': return 'bg-gray-200 text-gray-700 border-gray-400';
      case 'REJECT': return 'bg-gray-300 text-gray-800 border-gray-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // ✅ NEW: Check if task should be dimmed (BLOCK or REJECT priority)
  const isTaskDimmed = (priority?: string) => {
    return priority === 'BLOCK' || priority === 'REJECT';
  };

  const isAuditVisible = userPermissions?.isOwner || userPermissions?.isScrumMaster;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar projectId={projectId || undefined} />
      <div className="flex-1 flex flex-col">
        <TopNavigation />
        <div className="flex-1 overflow-y-auto">
          {/* Search and Controls Header */}
          <div className="py-3 px-4 flex items-center border-b">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10 h-9" 
                placeholder="Search backlog" 
              />
            </div>
            <div className="flex items-center ml-4 space-x-3">
              {canCreateSprint(userPermissions) && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleCreateSprint}
                  className="h-9 bg-blue-500 text-white hover:bg-blue-600"
                >
                  Create Sprint
                </Button>
              )}
              {canTrainAI(userPermissions) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={trainAIModel}
                  className="h-9 border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  🤖 Train AI Model
                </Button>
              )}
              <Button variant="outline" className="h-9 border-gray-300 flex items-center gap-1">
                Epic <ChevronDown className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <Button size="icon" variant="ghost" className="h-9 w-9">
                  <span className="sr-only">Timeline view</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 9H22M2 15H22M8 3V21M16 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9">
                  <span className="sr-only">Board view</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M3 9H21M12 3V21" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>
              {isAuditVisible && projectId && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-blue-300 text-blue-700 hover:bg-blue-50"
                  title="View Audit Log"
                  onClick={() => router.push(`/project/audit?projectId=${projectId}`)}
                >
                  <Archive className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Sprint Section */}
          <div className="px-4 py-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            ) : (
              <>
                {/* Sprint Rows - Dynamic from API */}
                {Array.isArray(sprints) && sprints.length > 0 ? (
                  sprints.map((sprint) => (
                    <div className="mb-6" key={sprint.id}>
                      <div className="flex items-center py-2">
                        <input 
                          type="checkbox" 
                          className="mr-2" 
                          checked={checkboxState.sprintHeader}
                          onChange={() => handleCheckboxChange('sprintHeader')}
                        />
                        <button 
                          onClick={() => toggleSprint(sprint.id)}
                          className="flex items-center"
                        >
                          {expandedSprint === sprint.id ? 
                            <ChevronDown className="h-4 w-4 mr-2" /> : 
                            <ChevronRight className="h-4 w-4 mr-2" />
                          }
                          <span className="font-medium">{sprint.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {sprint.startDate && sprint.endDate ? 
                              `${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}` : 
                              ''
                            }
                            ({tasks.filter(task => task.sprintId === sprint.id && (task.parentTaskId === null || task.parentTaskId === undefined)).length} work items)
                            {getSprintStoryPoints(sprint.id) > 0 && (
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {getCompletedSprintStoryPoints(sprint.id)}/{getSprintStoryPoints(sprint.id)} SP
                              </span>
                            )}
                          </span>
                        </button>
                        <div className="ml-auto flex space-x-2">
                          <div className="flex items-center text-xs">
                            <span className="flex items-center justify-center w-5 h-5 text-center bg-gray-200 rounded mx-0.5">
                              {tasks.filter(task => task.sprintId === sprint.id && task.status === "TODO" && (task.parentTaskId === null || task.parentTaskId === undefined)).length}
                            </span>
                            <span className="flex items-center justify-center w-5 h-5 text-center bg-blue-200 rounded mx-0.5">
                              {tasks.filter(task => task.sprintId === sprint.id && task.status === "IN_PROGRESS" && (task.parentTaskId === null || task.parentTaskId === undefined)).length}
                            </span>
                            <span className="flex items-center justify-center w-5 h-5 text-center bg-purple-200 rounded mx-0.5">
                              {tasks.filter(task => task.sprintId === sprint.id && task.status === "REVIEW" && (task.parentTaskId === null || task.parentTaskId === undefined)).length}
                            </span>
                            <span className="flex items-center justify-center w-5 h-5 text-center bg-green-200 rounded mx-0.5">
                              {tasks.filter(task => task.sprintId === sprint.id && task.status === "DONE" && (task.parentTaskId === null || task.parentTaskId === undefined)).length}
                            </span>
                          </div>
                          {(() => {
                            const canStart = canStartEndSprints(userPermissions);
                            console.log('🔍 SPRINT BUTTON DEBUG:', {
                              sprintId: sprint.id,
                              sprintStatus: sprint.status,
                              userPermissions,
                              canStartEndSprints: canStart,
                              canManageSprints: userPermissions?.canManageSprints,
                              isScrumMaster: userPermissions?.isScrumMaster,
                              role: userPermissions?.role
                            });
                            return canStart;
                          })() && (
                            <>
                              {sprint.status === "ACTIVE" ? (
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  onClick={() => handleCompleteSprint(sprint.id)}
                                  className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
                                >
                                  Complete sprint
                                </Button>
                              ) : sprint.status === "COMPLETED" ? (
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  disabled
                                  className="bg-green-100 text-green-700 border-green-200"
                                >
                                  Completed
                                </Button>
                              ) : (
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  onClick={() => handleStartSprint(sprint.id)}
                                >
                                  Start sprint
                                </Button>
                              )}
                            </>
                          )}
                          {canManageSprints(userPermissions) && (
                            <div className="relative">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 sprint-edit-button"
                                onClick={() => setOpenSprintMenu(openSprintMenu === sprint.id ? null : sprint.id)}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                              
                              {openSprintMenu === sprint.id && (
                                <div 
                                  ref={sprintMenuRef}
                                  className="absolute right-0 top-full mt-1 w-48 bg-white rounded shadow-lg z-10 py-1 border"
                                >
                                  <button
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                    onClick={() => handleMoveSprint(sprint.id, 'up')}
                                  >
                                    <ChevronUp className="h-4 w-4 mr-2" />
                                    Move up
                                  </button>
                                  <button
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                    onClick={() => handleMoveSprint(sprint.id, 'down')}
                                  >
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    Move down
                                  </button>
                                  <button
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                    onClick={() => handleEditSprint(sprint)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </button>
                                  
                                  {/* Show different actions based on sprint status */}
                                  {sprint.status === "ACTIVE" ? (
                                    <button
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center text-yellow-600"
                                      onClick={() => handleCancelSprint(sprint.id)}
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Cancel Sprint
                                    </button>
                                  ) : sprint.status === "NOT_STARTED" ? (
                                    <button
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center text-red-600"
                                      onClick={() => handleDeleteSprint(sprint.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </button>
                                  ) : sprint.status === "COMPLETED" || sprint.status === "ARCHIVED" ? (
                                    <div className="px-3 py-2 text-sm text-gray-400 italic">
                                      Cannot modify completed sprint
                                    </div>
                                  ) : (
                                    <button
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center text-red-600"
                                      onClick={() => handleDeleteSprint(sprint.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {expandedSprint === sprint.id && (
                        <div className="ml-6 mt-2">
                          {/* Task Items - Sort by priority */}
                          {tasks.filter(task => task.sprintId === sprint.id && (task.parentTaskId === null || task.parentTaskId === undefined)).length > 0 ? (
                            sortTasksByPriority(tasks.filter(task => task.sprintId === sprint.id && (task.parentTaskId === null || task.parentTaskId === undefined))).map(task => (
                              <div className={`border rounded-sm mb-2 ${isTaskDimmed(task.priority) ? 'opacity-50' : ''}`} key={task.id}>
                                <div className="flex items-center p-3">
                                  <input 
                                    type="checkbox" 
                                    className="mr-3" 
                                    checked={task.status === "DONE"}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        handleStatusChange(task.id, "DONE");
                                      } else {
                                        handleStatusChange(task.id, "TODO");
                                      }
                                    }} 
                                    disabled={isTaskDimmed(task.priority)}
                                  />
                                  
                                  {/* Priority indicator */}
                                  <div className={`w-6 h-6 rounded text-xs flex items-center justify-center mr-2 border ${getPriorityColorClass(task.priority)}`}>
                                    {getPriorityIcon(task.priority)}
                                  </div>
                                  
                                  <span className={`text-blue-600 font-medium text-sm mr-2 ${isTaskDimmed(task.priority) ? 'text-gray-400' : ''}`}>{task.shortKey || task.id.substring(0, 8)}</span>
                                  <span className={`text-sm ${isTaskDimmed(task.priority) ? 'text-gray-400' : ''}`}>{task.title}</span>
                                  {isTaskDimmed(task.priority) && (
                                    <span className="ml-2 text-xs text-gray-500 italic">
                                      ({task.priority === 'BLOCK' ? 'Blocked' : 'Rejected'})
                                    </span>
                                  )}
                                  {task.label && (
                                    <div className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${isTaskDimmed(task.priority) ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-800'}`}>
                                      {task.label}
                                    </div>
                                  )}
                                  <div className="ml-auto flex items-center space-x-2">
                                    <div className="relative">
                                      <button 
                                        className={`px-2 py-1 ${getStatusColorClass(task.status)} rounded text-sm flex items-center`}
                                        onClick={() => setOpenStatusDropdown(openStatusDropdown === task.id ? null : task.id)}
                                      >
                                        {task.status} <ChevronDown className="h-3 w-3 ml-1" />
                                      </button>
                                      
                                      {openStatusDropdown === task.id && (
                                        <div 
                                          ref={statusDropdownRef}
                                          className="absolute right-0 mt-1 w-36 bg-white rounded shadow-lg z-10 py-1 border"
                                        >
                                          {statusOptions.map(option => (
                                            <button
                                              key={option.value}
                                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center ${option.value === task.status ? 'font-medium' : ''}`}
                                              onClick={() => {
                                                handleStatusChange(task.id, option.value);
                                                setOpenStatusDropdown(null);
                                              }}
                                            >
                                              <div className={`h-3 w-3 rounded-full ${getStatusColorClass(option.value)} mr-2`}></div>
                                              {option.label}
                                              {option.value === task.status && (
                                                <Check className="h-3 w-3 ml-auto" />
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-8 w-8">
                                      <span className="sr-only">Assign</span>
                                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                                        <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M3 17C3 13.6863 6.13401 11 10 11C13.866 11 17 13.6863 17 17" stroke="currentColor" strokeWidth="2"/>
                                      </svg>
                                    </Button>
                                    <span className="h-5 w-5 flex items-center justify-center">
                                      {task.storyPoint || "-"}
                                    </span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 w-8 text-purple-600 hover:bg-purple-50"
                                      onClick={() => estimateStoryPoints(task.id)}
                                      title="AI Estimate Story Points"
                                    >
                                      🤖
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 border border-dashed rounded-md text-center">
                              <p className="text-gray-500">No tasks in this sprint yet. Add tasks from the backlog or create new ones.</p>
                            </div>
                          )}

                          {/* Create new task input */}
                          <div className="border border-blue-300 rounded-sm p-3 flex items-center mt-3">
                            <input type="checkbox" className="mr-3" disabled />
                            <ChevronDown className="h-4 w-4 mr-2 text-gray-400" />
                            <Input 
                              className="border-none text-sm h-7 flex-1"
                              placeholder="What needs to be done?"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isCreating) {
                                  handleCreateTask();
                                }
                              }}
                            />
                            {isCreating && <div className="ml-2 animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>}
                            {newTaskTitle && !isCreating && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="ml-2 text-blue-500"
                                onClick={handleCreateTask}
                              >
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="mb-6 p-6 border border-dashed rounded text-center">
                    <p className="text-gray-500 mb-2">No sprints found for this project.</p>
                    {canCreateSprint(userPermissions) ? (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={handleCreateSprint}
                      >
                        Create Sprint
                      </Button>
                    ) : (
                      <p className="text-sm text-gray-400">Only project owners and scrum masters can create sprints.</p>
                    )}
                  </div>
                )}

                {/* Backlog Section */}
                <div className="mb-6">
                  <div className="flex items-center py-2">
                    <input 
                      type="checkbox" 
                      className="mr-2" 
                      checked={checkboxState.backlogHeader}
                      onChange={() => handleCheckboxChange('backlogHeader')}
                    />
                    <button 
                      onClick={() => toggleSprint('backlog')}
                      className="flex items-center"
                    >
                      {expandedSprint === 'backlog' ? 
                        <ChevronDown className="h-4 w-4 mr-2" /> : 
                        <ChevronRight className="h-4 w-4 mr-2" />
                      }
                      <span className="font-medium">Backlog</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({backlogTasks.length} work items)
                        {getBacklogStoryPoints() > 0 && (
                          <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            {getCompletedBacklogStoryPoints()}/{getBacklogStoryPoints()} SP
                          </span>
                        )}
                      </span>
                    </button>
                    <div className="ml-auto flex space-x-2">
                      <div className="flex items-center text-xs">
                        <span className="flex items-center justify-center w-5 h-5 text-center bg-gray-200 rounded mx-0.5">
                          {backlogTasks.filter(task => task.status === "TODO").length}
                        </span>
                        <span className="flex items-center justify-center w-5 h-5 text-center bg-blue-200 rounded mx-0.5">
                          {backlogTasks.filter(task => task.status === "IN_PROGRESS").length}
                        </span>
                        <span className="flex items-center justify-center w-5 h-5 text-center bg-purple-200 rounded mx-0.5">
                          {backlogTasks.filter(task => task.status === "REVIEW").length}
                        </span>
                        <span className="flex items-center justify-center w-5 h-5 text-center bg-green-200 rounded mx-0.5">
                          {backlogTasks.filter(task => task.status === "DONE").length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {expandedSprint === 'backlog' && (
                    <div className="ml-6 mt-2">
                      {/* Backlog Task Items - Sort by priority */}
                      {backlogTasks.length > 0 ? (
                        sortTasksByPriority(backlogTasks).map(task => (
                          <div className={`border rounded-sm mb-2 ${isTaskDimmed(task.priority) ? 'opacity-50' : ''}`} key={task.id}>
                            <div className="flex items-center p-3">
                              <input 
                                type="checkbox" 
                                className="mr-3" 
                                checked={task.status === "DONE"}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleStatusChange(task.id, "DONE");
                                  } else {
                                    handleStatusChange(task.id, "TODO");
                                  }
                                }} 
                                disabled={isTaskDimmed(task.priority)}
                              />
                              
                              {/* Priority indicator */}
                              <div className={`w-6 h-6 rounded text-xs flex items-center justify-center mr-2 border ${getPriorityColorClass(task.priority)}`}>
                                {getPriorityIcon(task.priority)}
                              </div>
                              
                              <span className={`text-blue-600 font-medium text-sm mr-2 ${isTaskDimmed(task.priority) ? 'text-gray-400' : ''}`}>{task.shortKey || task.id.substring(0, 8)}</span>
                              <span className={`text-sm ${isTaskDimmed(task.priority) ? 'text-gray-400' : ''}`}>{task.title}</span>
                              {isTaskDimmed(task.priority) && (
                                <span className="ml-2 text-xs text-gray-500 italic">
                                  ({task.priority === 'BLOCK' ? 'Blocked' : 'Rejected'})
                                </span>
                              )}
                              {task.label && (
                                <div className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${isTaskDimmed(task.priority) ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-800'}`}>
                                  {task.label}
                                </div>
                              )}
                              <div className="ml-auto flex items-center space-x-2">
                                <div className="relative">
                                  <button 
                                    className={`px-2 py-1 ${getStatusColorClass(task.status)} rounded text-sm flex items-center`}
                                    onClick={() => setOpenStatusDropdown(openStatusDropdown === task.id ? null : task.id)}
                                  >
                                    {task.status} <ChevronDown className="h-3 w-3 ml-1" />
                                  </button>
                                  
                                  {openStatusDropdown === task.id && (
                                    <div 
                                      ref={statusDropdownRef}
                                      className="absolute right-0 mt-1 w-36 bg-white rounded shadow-lg z-10 py-1 border"
                                    >
                                      {statusOptions.map(option => (
                                        <button
                                          key={option.value}
                                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center ${option.value === task.status ? 'font-medium' : ''}`}
                                          onClick={() => {
                                            handleStatusChange(task.id, option.value);
                                            setOpenStatusDropdown(null);
                                          }}
                                        >
                                          <div className={`h-3 w-3 rounded-full ${getStatusColorClass(option.value)} mr-2`}></div>
                                          {option.label}
                                          {option.value === task.status && (
                                            <Check className="h-3 w-3 ml-auto" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Sprint assignment dropdown */}
                                <div className="relative">
                                  <button className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
                                    Move to Sprint
                                  </button>
                                </div>
                                
                                <Button size="sm" variant="ghost" className="h-8 w-8">
                                  <span className="sr-only">Assign</span>
                                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                                    <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M3 17C3 13.6863 6.13401 11 10 11C13.866 11 17 13.6863 17 17" stroke="currentColor" strokeWidth="2"/>
                                  </svg>
                                </Button>
                                <span className="h-5 w-5 flex items-center justify-center">
                                  {task.storyPoint || "-"}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 text-purple-600 hover:bg-purple-50"
                                  onClick={() => estimateStoryPoints(task.id)}
                                  title="AI Estimate Story Points"
                                >
                                  🤖
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 border border-dashed rounded-md text-center">
                          <p className="text-gray-500">No tasks in backlog. Create new tasks to get started.</p>
                        </div>
                      )}

                      {/* Create new task input for backlog */}
                      <div className="border border-blue-300 rounded-sm p-3 flex items-center mt-3">
                        <input type="checkbox" className="mr-3" disabled />
                        <ChevronDown className="h-4 w-4 mr-2 text-gray-400" />
                        <Input 
                          className="border-none text-sm h-7 flex-1"
                          placeholder="What needs to be done?"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isCreating) {
                              handleCreateTask();
                            }
                          }}
                        />
                        {isCreating && <div className="ml-2 animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>}
                        {newTaskTitle && !isCreating && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2 text-blue-500"
                            onClick={handleCreateTask}
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sprint Edit Modal */}
      {showSprintModal && currentSprint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div 
            ref={modalRef}
            className="bg-white rounded-lg shadow-xl w-[60%] max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-6">
                {isEditingSprint ? `Edit sprint: ${currentSprint.name}` : 'Create new sprint'}
              </h2>
              
              <p className="text-sm text-gray-600 mb-6">Required fields are marked with an asterisk <span className="text-red-500">*</span></p>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Sprint name <span className="text-red-500">*</span>
                </label>
                <Input 
                  value={currentSprint.name} 
                  onChange={(e) => setCurrentSprint({...currentSprint, name: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
            
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">Start date</label>
                <Input 
                  type="date"
                  value={currentSprint.startDate ? new Date(currentSprint.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setCurrentSprint({...currentSprint, startDate: new Date(e.target.value).toISOString()})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">End date</label>
                <Input 
                  type="date"
                  value={currentSprint.endDate ? new Date(currentSprint.endDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setCurrentSprint({...currentSprint, endDate: new Date(e.target.value).toISOString()})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">Sprint goal</label>
                <textarea 
                  value={currentSprint.goal || ''}
                  onChange={(e) => setCurrentSprint({...currentSprint, goal: e.target.value})}
                  className="w-full p-2 border rounded h-32"
                />
              </div>
              
              <div className="flex justify-end mt-6 space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowSprintModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateSprint}
                >
                  {isEditingSprint ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Task Migration Modal */}
      {showTaskMigrationModal && sprintToDelete && (
        <TaskMigrationModal
          isOpen={showTaskMigrationModal}
          onClose={() => {
            setShowTaskMigrationModal(false);
            setSprintToDelete(null);
          }}
          sprintId={sprintToDelete.id}
          sprintName={sprintToDelete.name}
          projectId={projectId || ''}
          onComplete={handleMigrationComplete}
          action={sprintToDelete.action}
        />
      )}
    </div>
  );
}
