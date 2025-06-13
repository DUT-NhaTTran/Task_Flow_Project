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
import { Search, ChevronDown, MoreHorizontal, ChevronRight, Plus, Edit, Check, Calendar, ChevronUp, Trash2, X, Archive, Filter, Users } from "lucide-react";
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
  getRoleDisplayName,
  canManageProject, 
  canDeleteProject, 
  isProjectOwner
} from "@/utils/permissions";
import TaskDetailModal, { TaskData } from "@/components/tasks/TaskDetailModal";
import { useProjectValidation } from "@/hooks/useProjectValidation";
import { TaskMigrationModal } from "@/components/sprints/TaskMigrationModal";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { checkAndNotifyOverdueSprints, resetSprintOverdueNotification } from "@/utils/taskNotifications";
import { useUser } from "@/contexts/UserContext";

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
  avatarUrl?: string; // Add this for backward compatibility
}

type CheckboxNames = 'sprintHeader' | 'backlogHeader';

interface FilterState {
  searchText: string;
  status: string[];
  assignee: string[];
  priority: string[];
  labels: string[];
  createdDateFrom: string;
  createdDateTo: string;
}

// Add constants and avatar functions after the other utility functions (around line 40)
const DEFAULT_AVATAR_URL = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

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

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    searchText: "",
    status: [],
    assignee: [],
    priority: [],
    labels: [],
    createdDateFrom: "",
    createdDateTo: ""
  });
  const [filteredTasks, setFilteredTasks] = useState<TaskData[]>([]);
  const [filteredBacklogTasks, setFilteredBacklogTasks] = useState<TaskData[]>([]);
  const [projectUsers, setProjectUsers] = useState<User[]>([]);

  // Available filter options
  const filterStatusOptions = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
  const filterPriorityOptions = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST", "BLOCKER", "BLOCK"];

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

  // Add avatar cache
  const avatarCache = useRef<Record<string, string>>({});

  // Add avatar fetching function
  const fetchUserAvatar = async (userId: string): Promise<string> => {
    if (!userId || !isValidUUID(userId)) {
      return DEFAULT_AVATAR_URL;
    }

    // Check cache first
    if (avatarCache.current[userId]) {
      return avatarCache.current[userId];
    }

    try {
      const currentUserId = userData?.account?.id || userData?.profile?.id;
      if (!currentUserId) {
        avatarCache.current[userId] = DEFAULT_AVATAR_URL;
        return DEFAULT_AVATAR_URL;
      }

      const response = await axios.get(
        `http://localhost:8086/api/users/${userId}`,
        {
          headers: { "X-User-Id": currentUserId }
        }
      );

      if (response.data?.status === "SUCCESS" && response.data.data?.avatar) {
        const avatarUrl = response.data.data.avatar;
        avatarCache.current[userId] = avatarUrl;
        return avatarUrl;
      } else {
        avatarCache.current[userId] = DEFAULT_AVATAR_URL;
        return DEFAULT_AVATAR_URL;
      }
    } catch (error) {
      console.error(`Error fetching avatar for user ${userId}:`, error);
      avatarCache.current[userId] = DEFAULT_AVATAR_URL;
      return DEFAULT_AVATAR_URL;
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return "?";
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const AvatarDisplay = ({ 
    avatarUrl, 
    displayName, 
    size = "normal" 
  }: { 
    avatarUrl?: string, 
    displayName: string, 
    size?: "small" | "normal" 
  }) => {
    const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>(avatarUrl || DEFAULT_AVATAR_URL);
    const [hasError, setHasError] = useState(false);
    
    const sizeClasses = size === "small" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
    
    useEffect(() => {
      setCurrentAvatarUrl(avatarUrl || DEFAULT_AVATAR_URL);
      setHasError(false);
    }, [avatarUrl]);

    const handleImageError = () => {
      if (!hasError) {
        setHasError(true);
        setCurrentAvatarUrl(DEFAULT_AVATAR_URL);
      }
    };

    if (!currentAvatarUrl || currentAvatarUrl === DEFAULT_AVATAR_URL || hasError) {
      return (
        <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-sm`}>
          {getInitials(displayName)}
        </div>
      );
    }

    return (
      <img 
        src={currentAvatarUrl} 
        alt={displayName} 
        className={`${sizeClasses} rounded-full object-cover border-2 border-white shadow-sm`}
        onError={handleImageError}
        onLoad={() => setHasError(false)}
      />
    );
  };

  // Fetch project users for filter (update this function)
  const fetchProjectUsers = async () => {
    if (!projectId) return;
    try {
      const userId = userData?.account?.id || userData?.profile?.id;
      if (!userId) return;

      const response = await axios.get(
        `http://localhost:8083/api/projects/${projectId}/users`,
        {
          headers: { "X-User-Id": userId }
        }
      );

      if (response.data?.status === "SUCCESS") {
        const users = response.data.data || [];
        setProjectUsers(users);
        
        // Prefetch avatars for all users
        users.forEach(async (user: User) => {
          if (user.id && isValidUUID(user.id)) {
            try {
              const avatarUrl = await fetchUserAvatar(user.id);
              user.avatarUrl = avatarUrl;
            } catch (error) {
              console.error(`Error fetching avatar for user ${user.id}:`, error);
            }
          }
        });
      }
    } catch (error: any) {
      console.error("Error fetching project users:", error);
    }
  };

  // Apply filters to tasks
  const applyFilters = () => {
    let filtered = [...tasks].filter(task => task && task.id);
    let filteredBacklog = [...backlogTasks].filter(task => task && task.id);

    // Search text filter
    if (filters.searchText.trim()) {
      const searchText = filters.searchText.toLowerCase();
      filtered = filtered.filter(task => 
        task.title?.toLowerCase().includes(searchText) ||
        task.description?.toLowerCase().includes(searchText) ||
        task.shortKey?.toLowerCase().includes(searchText)
      );
      filteredBacklog = filteredBacklog.filter(task => 
        task.title?.toLowerCase().includes(searchText) ||
        task.description?.toLowerCase().includes(searchText) ||
        task.shortKey?.toLowerCase().includes(searchText)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status.includes(task.status));
      filteredBacklog = filteredBacklog.filter(task => filters.status.includes(task.status));
    }

    // Assignee filter
    if (filters.assignee.length > 0) {
      filtered = filtered.filter(task => 
        task.assigneeId && filters.assignee.includes(task.assigneeId)
      );
      filteredBacklog = filteredBacklog.filter(task => 
        task.assigneeId && filters.assignee.includes(task.assigneeId)
      );
    }

    // Priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(task => 
        task.priority && filters.priority.includes(task.priority)
      );
      filteredBacklog = filteredBacklog.filter(task => 
        task.priority && filters.priority.includes(task.priority)
      );
    }

    // Labels filter
    if (filters.labels.length > 0) {
      filtered = filtered.filter(task => 
        task.tags && task.tags.some(tag => filters.labels.includes(tag))
      );
      filteredBacklog = filteredBacklog.filter(task => 
        task.tags && task.tags.some(tag => filters.labels.includes(tag))
      );
    }

    // Created date filter
    if (filters.createdDateFrom) {
      const fromDate = new Date(filters.createdDateFrom);
      filtered = filtered.filter(task => 
        task.createdAt && new Date(task.createdAt) >= fromDate
      );
      filteredBacklog = filteredBacklog.filter(task => 
        task.createdAt && new Date(task.createdAt) >= fromDate
      );
    }
    if (filters.createdDateTo) {
      const toDate = new Date(filters.createdDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(task => 
        task.createdAt && new Date(task.createdAt) <= toDate
      );
      filteredBacklog = filteredBacklog.filter(task => 
        task.createdAt && new Date(task.createdAt) <= toDate
      );
    }

    setFilteredTasks(filtered);
    setFilteredBacklogTasks(filteredBacklog);
  };

  // Handle filter changes
  const handleFilterChange = (filterType: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Handle array filter toggles
  const toggleArrayFilter = (filterType: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentArray = prev[filterType] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return {
        ...prev,
        [filterType]: newArray
      };
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      searchText: "",
      status: [],
      assignee: [],
      priority: [],
      labels: [],
      createdDateFrom: "",
      createdDateTo: ""
    });
    setSearchText("");
  };

  // Get unique labels from all tasks
  const availableLabels = Array.from(
    new Set(tasks.filter(task => task && task.tags).flatMap(task => task.tags || []))
  ).filter(Boolean);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return filters.searchText.trim() !== "" ||
           filters.status.length > 0 ||
           filters.assignee.length > 0 ||
           filters.priority.length > 0 ||
           filters.labels.length > 0 ||
           filters.createdDateFrom !== "" ||
           filters.createdDateTo !== "";
  };

  // Apply filters whenever filter state changes
  useEffect(() => {
    applyFilters();
  }, [filters, tasks, backlogTasks]);

  // Fetch project users when component mounts
  useEffect(() => {
    fetchProjectUsers();
  }, [projectId, userData]);

  // Initialize filtered tasks
  useEffect(() => {
    setFilteredTasks(tasks);
    setFilteredBacklogTasks(backlogTasks);
  }, [tasks, backlogTasks]);

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
      checkSprintOverdue(); // Add overdue check
    }
  }, [sprints]);

  // Check for overdue sprints and notify PO/SM
  const checkSprintOverdue = async () => {
    console.log('🔔 BACKLOG: Starting sprint overdue check...');
    console.log('🔔 BACKLOG: Project ID:', projectId);
    console.log('🔔 BACKLOG: Sprints count:', sprints.length);
    
    try {
      if (!projectId || sprints.length === 0) {
        console.log('🔔 BACKLOG: Skipping overdue check - no project ID or sprints');
        return;
      }

      // Get project details to find owner (PO) and scrum master
      const userId = userData?.account?.id || userData?.profile?.id;
      if (!userId) {
        console.log('🔔 BACKLOG: Skipping overdue check - no user ID');
        return;
      }

      console.log('🔔 BACKLOG: Fetching project details with user ID:', userId);
      const response = await axios.get(`http://localhost:8083/api/projects/${projectId}`, {
        headers: { "X-User-Id": userId }
      });

      console.log('🔔 BACKLOG: Project API response:', response.data);

      if (response.data?.status === "SUCCESS" && response.data.data) {
        const project = response.data.data;
        const ownerId = project.ownerId; // Product Owner
        const scrumMasterId = project.scrumMasterId; // Scrum Master
        const currentProjectName = project.name || "Unknown Project";

        console.log('🔔 BACKLOG: Project details:');
        console.log('  - Project name:', currentProjectName);
        console.log('  - Owner ID (PO):', ownerId);
        console.log('  - Scrum Master ID:', scrumMasterId);

        // Update sprint data with project name for notifications
        const sprintsWithProject = sprints.map(sprint => ({
          ...sprint,
          status: sprint.status || "PLANNING", // Ensure status is defined
          projectId: projectId,
          projectName: currentProjectName
        }));

        console.log('🔔 BACKLOG: Checking sprints for overdue:', sprintsWithProject.length);
        
        // Check and notify for overdue sprints
        await checkAndNotifyOverdueSprints(sprintsWithProject, ownerId, scrumMasterId);
      } else {
        console.error('🔔 BACKLOG: Failed to get project details:', response.data);
      }
    } catch (error: any) {
      console.error('🔔 BACKLOG: Error checking sprint overdue:', error);
      if (error.response) {
        console.error('🔔 BACKLOG: Error response:', error.response.data);
      }
    }
  };

  // Enhanced Create new sprint with better notifications
  const handleCreateSprint = async () => {
    if (!projectId) {
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
    // Reset overdue notification status for the sprint that was deleted/cancelled
    if (sprintToDelete) {
      resetSprintOverdueNotification(sprintToDelete.id);
      console.log(`🔄 SPRINT ${sprintToDelete.action.toUpperCase()}: Reset overdue notification for sprint ${sprintToDelete.id}`);
    }
    
    fetchSprints(); // Refresh sprints
    // Fetch tasks for this project - inline the fetch logic
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
        
        // Reset overdue notification status for completed sprint
        resetSprintOverdueNotification(sprintId);
        console.log(`🔄 SPRINT COMPLETED: Reset overdue notification for sprint ${sprintId}`);
        
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
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input 
                  className="pl-12 h-11 bg-gray-50 border-gray-200 rounded-xl placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm font-medium" 
                  placeholder="Search tasks, sprints, or assignees..." 
                  value={filters.searchText}
                  onChange={(e) => handleFilterChange("searchText", e.target.value)}
                />
                {filters.searchText && (
                  <button
                    onClick={() => handleFilterChange("searchText", "")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-3 ml-6">
                {/* Filter Toggle */}
                <div
                  onClick={() => setShowFilters(!showFilters)}
                  className={`relative group p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    showFilters 
                      ? 'bg-blue-100 text-blue-700 shadow-sm' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                  title="Toggle filters"
                >
                  <Filter className="h-5 w-5" />
                  {hasActiveFilters() && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                {/* Clear Filters */}
                {hasActiveFilters() && (
                  <div
                    onClick={clearAllFilters}
                    className="group p-3 bg-red-50 text-red-600 rounded-xl cursor-pointer hover:bg-red-100 hover:text-red-700 transition-all duration-200 shadow-sm"
                    title="Clear all filters"
                  >
                    <X className="h-5 w-5" />
                  </div>
                )}

                {/* Create Sprint Button */}
                <Button
                  onClick={handleCreateSprint}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Create Sprint
                </Button>

              
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 shadow-sm">
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                  {/* Status Filter */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-800">Status</label>
                    </div>
                    <div className="space-y-2">
                      {filterStatusOptions.map((status) => (
                        <label key={status} className="flex items-center group cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.status.includes(status)}
                            onChange={() => toggleArrayFilter("status", status)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <span className={`ml-3 text-sm px-2 py-1 rounded-md font-medium transition-all ${getStatusColorClass(status)} ${
                            filters.status.includes(status) ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                          }`}>
                            {status.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Assignee Filter */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-800">Assignee</label>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {projectUsers.map((user) => (
                        <label key={user.id} className="flex items-center group cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.assignee.includes(user.id)}
                            onChange={() => toggleArrayFilter("assignee", user.id)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                          />
                          <div className="ml-3 flex items-center gap-2">
                            <AvatarDisplay 
                              avatarUrl={user.avatarUrl}
                              displayName={user.username || user.email}
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                              {user.username || user.email}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Priority Filter */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-800">Priority</label>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {filterPriorityOptions.map((priority) => (
                        <label key={priority} className="flex items-center group cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.priority.includes(priority)}
                            onChange={() => toggleArrayFilter("priority", priority)}
                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                          />
                          <span className={`ml-3 text-sm px-3 py-1 rounded-full font-medium transition-all ${getPriorityColorClass(priority)} ${
                            filters.priority.includes(priority) ? 'ring-2 ring-orange-500 ring-opacity-50 transform scale-105' : 'group-hover:scale-105'
                          }`}>
                            {priority}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Labels Filter */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-800">Labels</label>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {availableLabels.length > 0 ? (
                        availableLabels.map((label) => (
                          <label key={label} className="flex items-center group cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.labels.includes(label)}
                              onChange={() => toggleArrayFilter("labels", label)}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                            />
                            <span className="ml-3 px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 rounded-full text-sm font-medium group-hover:from-purple-200 group-hover:to-blue-200 transition-all">
                              {label}
                            </span>
                          </label>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500 italic">No labels available</div>
                      )}
                    </div>
                  </div>

                  {/* Created Date From */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-800">Created From</label>
                    </div>
                    <Input
                      type="date"
                      value={filters.createdDateFrom}
                      onChange={(e) => handleFilterChange("createdDateFrom", e.target.value)}
                      className="w-full h-10 text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  {/* Created Date To */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-gray-800">Created To</label>
                    </div>
                    <Input
                      type="date"
                      value={filters.createdDateTo}
                      onChange={(e) => handleFilterChange("createdDateTo", e.target.value)}
                      className="w-full h-10 text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Filter Summary */}
                {hasActiveFilters() && (
                  <div className="mt-6 pt-4 border-t border-gray-300">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex flex-wrap gap-2">
                        {filters.status.length > 0 && (
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-blue-200">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Status:</span>
                            <span className="text-sm text-blue-700 font-semibold">{filters.status.join(", ")}</span>
                          </div>
                        )}
                        {filters.assignee.length > 0 && (
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-green-200">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Assignee:</span>
                            <span className="text-sm text-green-700 font-semibold">{filters.assignee.length} selected</span>
                          </div>
                        )}
                        {filters.priority.length > 0 && (
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-orange-200">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Priority:</span>
                            <span className="text-sm text-orange-700 font-semibold">{filters.priority.join(", ")}</span>
                          </div>
                        )}
                        {filters.labels.length > 0 && (
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-purple-200">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Labels:</span>
                            <span className="text-sm text-purple-700 font-semibold">{filters.labels.length} selected</span>
                          </div>
                        )}
                        {(filters.createdDateFrom || filters.createdDateTo) && (
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-indigo-200">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Date Range:</span>
                            <span className="text-sm text-indigo-700 font-semibold">
                              {filters.createdDateFrom || '...'} - {filters.createdDateTo || '...'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                          <span className="text-sm text-gray-600">Results: </span>
                          <span className="text-sm font-bold text-gray-900">
                            {filteredTasks.length + filteredBacklogTasks.length} tasks
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
                  sprints.map((sprint) => {
                    // Get filtered tasks for this sprint
                    const sprintTasks = hasActiveFilters() 
                      ? filteredTasks.filter(task => task.sprintId === sprint.id && (task.parentTaskId === null || task.parentTaskId === undefined))
                      : tasks.filter(task => task.sprintId === sprint.id && (task.parentTaskId === null || task.parentTaskId === undefined));
                    
                    // Hide sprint if no tasks match filters
                    if (hasActiveFilters() && sprintTasks.length === 0) {
                      return null;
                    }

                    return (
                      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md" key={sprint.id}>
                        <div className="flex items-center py-4 px-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                          <input 
                            type="checkbox" 
                            className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                            checked={checkboxState.sprintHeader}
                            onChange={() => handleCheckboxChange('sprintHeader')}
                          />
                          <button 
                            onClick={() => toggleSprint(sprint.id)}
                            className="flex items-center group flex-1 text-left"
                          >
                            <div className={`transition-transform duration-200 ${expandedSprint === sprint.id ? 'rotate-0' : '-rotate-90'}`}>
                              <ChevronDown className="h-5 w-5 mr-3 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <span className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                                {sprint.name}
                              </span>
                              <div className="flex items-center mt-1 text-sm text-gray-600 space-x-4">
                                {sprint.startDate && sprint.endDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {sprintTasks.length} work items
                                </span>
                                {hasActiveFilters() && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    filtered
                                  </span>
                                )}
                                {getSprintStoryPoints(sprint.id) > 0 && (
                                  <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full text-xs font-semibold">
                                    {getCompletedSprintStoryPoints(sprint.id)}/{getSprintStoryPoints(sprint.id)} SP
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                          
                          <div className="ml-auto flex items-center space-x-4">
                            {/* Status Count Badges */}
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                                <span className="text-sm font-medium text-gray-600">
                                  {sprintTasks.filter(task => task.status === "TODO").length}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                <span className="text-sm font-medium text-blue-600">
                                  {sprintTasks.filter(task => task.status === "IN_PROGRESS").length}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                                <span className="text-sm font-medium text-purple-600">
                                  {sprintTasks.filter(task => task.status === "REVIEW").length}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                <span className="text-sm font-medium text-green-600">
                                  {sprintTasks.filter(task => task.status === "DONE").length}
                                </span>
                              </div>
                            </div>
                            
                            {/* Sprint action buttons */}
                            {canStartEndSprints(userPermissions) && (
                              <div className="flex items-center space-x-2">
                                {sprint.status === "ACTIVE" ? (
                                  <Button 
                                    variant="secondary" 
                                    size="sm"
                                    onClick={() => handleCompleteSprint(sprint.id)}
                                    className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300 hover:from-orange-200 hover:to-orange-300 transition-all duration-200 font-medium"
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
                              </div>
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
                            {sprintTasks.length > 0 ? (
                              sortTasksByPriority(sprintTasks).map(task => (
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
                                    <span className={`text-sm flex-1 ${isTaskDimmed(task.priority) ? 'text-gray-400' : ''}`}>{task.title}</span>
                                    {isTaskDimmed(task.priority) && (
                                      <span className="ml-2 text-xs text-gray-500 italic">
                                        ({task.priority === 'BLOCK' ? 'Blocked' : 'Rejected'})
                                      </span>
                                    )}
                                    
                                    {/* Assignee Avatar */}
                                    {task.assigneeId && (() => {
                                      const assignee = projectUsers.find(user => user.id === task.assigneeId);
                                      const assigneeName = assignee?.username || assignee?.email || "Unknown";
                                      return (
                                        <div className="ml-2 flex items-center gap-2" title={`Assigned to: ${assigneeName}`}>
                                          <AvatarDisplay 
                                            avatarUrl={assignee?.avatarUrl}
                                            displayName={assigneeName}
                                            size="small"
                                          />
                                        </div>
                                      );
                                    })()}
                                    
                                    <div className="ml-auto flex items-center space-x-2">
                                      <Button size="sm" variant="ghost" className="h-8 w-8">
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
                                <p className="text-gray-500">
                                  {hasActiveFilters() ? "No tasks match the current filters" : "No tasks in this sprint yet. Add tasks from the backlog or create new ones."}
                                </p>
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
                    );
                  })
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
                        ({hasActiveFilters() ? filteredBacklogTasks.length : backlogTasks.length} work items)
                        {hasActiveFilters() && (
                          <span className="ml-2 text-blue-600 font-medium">filtered</span>
                        )}
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
                          {(hasActiveFilters() ? filteredBacklogTasks : backlogTasks).filter(task => task.status === "TODO").length}
                        </span>
                        <span className="flex items-center justify-center w-5 h-5 text-center bg-blue-200 rounded mx-0.5">
                          {(hasActiveFilters() ? filteredBacklogTasks : backlogTasks).filter(task => task.status === "IN_PROGRESS").length}
                        </span>
                        <span className="flex items-center justify-center w-5 h-5 text-center bg-purple-200 rounded mx-0.5">
                          {(hasActiveFilters() ? filteredBacklogTasks : backlogTasks).filter(task => task.status === "REVIEW").length}
                        </span>
                        <span className="flex items-center justify-center w-5 h-5 text-center bg-green-200 rounded mx-0.5">
                          {(hasActiveFilters() ? filteredBacklogTasks : backlogTasks).filter(task => task.status === "DONE").length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {expandedSprint === 'backlog' && (
                    <div className="ml-6 mt-2">
                      {/* Backlog Task Items - Sort by priority */}
                      {(hasActiveFilters() ? filteredBacklogTasks : backlogTasks).length > 0 ? (
                        sortTasksByPriority(hasActiveFilters() ? filteredBacklogTasks : backlogTasks).map(task => (
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
                              <span className={`text-sm flex-1 ${isTaskDimmed(task.priority) ? 'text-gray-400' : ''}`}>{task.title}</span>
                              {isTaskDimmed(task.priority) && (
                                <span className="ml-2 text-xs text-gray-500 italic">
                                  ({task.priority === 'BLOCK' ? 'Blocked' : 'Rejected'})
                                </span>
                              )}
                              
                              {/* Assignee Avatar */}
                              {task.assigneeId && (() => {
                                const assignee = projectUsers.find(user => user.id === task.assigneeId);
                                const assigneeName = assignee?.username || assignee?.email || "Unknown";
                                return (
                                  <div className="ml-2 flex items-center gap-2" title={`Assigned to: ${assigneeName}`}>
                                    <AvatarDisplay 
                                      avatarUrl={assignee?.avatarUrl}
                                      displayName={assigneeName}
                                      size="small"
                                    />
                                  </div>
                                );
                              })()}
                              
                              <div className="ml-auto flex items-center space-x-2">
                                <Button size="sm" variant="ghost" className="h-8 w-8">
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
                          <p className="text-gray-500">
                            {hasActiveFilters() ? "No backlog tasks match the current filters" : "No tasks in backlog. Create new tasks to get started."}
                          </p>
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

      {/* Task Migration Modal */}
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