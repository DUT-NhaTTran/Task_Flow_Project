"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { NavigationProgress } from "@/components/ui/LoadingScreen";
import { useNavigation } from "@/contexts/NavigationContext";
import TaskDetailModal, { TaskData, SprintOption } from "@/components/tasks/TaskDetailModal";
import { FaSearch } from "react-icons/fa";
import {
  DndContext,
  DragOverlay,
  type DragStartEvent, 
  type DragEndEvent 
} from '@dnd-kit/core';
import { DraggableProjectTaskCard } from "@/components/ui/draggable-project-task-card";
import { DroppableProjectColumn } from "@/components/ui/droppable-project-column";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { checkAndNotifyOverdueTasks } from "@/utils/taskNotifications";
import { useUserStorage } from "@/hooks/useUserStorage"; // Add this import

// Interface definitions
interface Project {
  id: string;
  name: string;
  key: string;
  description?: string;
  avatarUrl?: string;
  projectType?: string;
  access?: string;
  createdAt?: string;
  ownerId?: string;
  deadline?: string;
}

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
  sprintId?: string;
  dueDate?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  parentTaskId?: string | null;
  tags?: string[] | null;
  createdBy?: string; // Add createdBy field for notifications
}

interface User {
  id: string;
  fullname: string;
  email: string;
}

interface Sprint {
  id: string;
  name?: string;
  number?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  projectId?: string;
}

interface ProjectUser {
  id: string;
  name?: string;      // For backward compatibility
  username?: string;  // New field from API
  email?: string;     // New field from API
  userRole?: string;  // New field from API
  avatar?: string;    // New field from API
  avatarUrl?: string; // For backward compatibility
}

export default function ProjectBoardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProjectId, setCurrentProjectId } = useNavigation();
  const { userData } = useUserStorage(); // Add this line
  
  // Get projectId from URL or context
  const urlProjectId = searchParams?.get("projectId")
  const projectId = urlProjectId || currentProjectId
  
  // Get taskId from URL params
  const urlTaskId = searchParams?.get("taskId")
  
  // Update context if projectId from URL
  useEffect(() => {
    if (urlProjectId && urlProjectId !== currentProjectId) {
      setCurrentProjectId(urlProjectId)
    }
  }, [urlProjectId, currentProjectId, setCurrentProjectId])
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [latestSprintId, setLatestSprintId] = useState<string | null>(null);
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [newTasks, setNewTasks] = useState({
    TODO: "",
    IN_PROGRESS: "",
    REVIEW: "",
    DONE: "",
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTaskFromUrl, setLoadingTaskFromUrl] = useState(false); // New state for URL task loading
  const [searchProject, setSearchProject] = useState("");
  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userAvatarFetchErrors = useRef<Set<string>>(new Set());
  // Cache cho avatar đã tải để tránh tải lại nhiều lần
  const avatarCache = useRef<Record<string, string>>({});
  // Drag and drop state and handlers
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { updateTaskStatus, loading: apiLoading } = useProjectTasks();

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task;
    setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = active.data.current?.task as Task;
    const newStatus = over.id as Task["status"];
    const oldStatus = task.status;

    // If dropping in same column and same position, do nothing
    if (task.status === newStatus && active.id === over.id) return;

    // Get current tasks in the target column - chỉ xử lý parent tasks
    const tasksInColumn = tasks.filter(t => t.status === newStatus && (t.parentTaskId === null || t.parentTaskId === undefined));
    
    // Find the index where the task was dropped
    const overTaskIndex = tasksInColumn.findIndex(t => t.id === over.id);
    
    // Create new tasks array with updated order
    const updatedTasks = [...tasks];
    const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
    const taskToMove = updatedTasks[taskIndex];
    
    // Remove task from its current position
    updatedTasks.splice(taskIndex, 1);
    
    // If dropping on another task in same column, insert at that position
    if (task.status === newStatus && overTaskIndex !== -1) {
      const insertIndex = updatedTasks.findIndex(t => t.id === over.id);
      updatedTasks.splice(insertIndex, 0, { ...taskToMove, status: newStatus });
    } else {
      // If dropping in a different column, add to end of that column
      const insertIndex = updatedTasks.findIndex(t => t.status === newStatus);
      updatedTasks.splice(insertIndex === -1 ? updatedTasks.length : insertIndex, 0, { ...taskToMove, status: newStatus });
    }

    // Optimistically update UI
    setTasks(updatedTasks);

    try {
      // 1. Update task status in database first
      console.log('🔄 DRAG&DROP: Updating task status in database...');
      const response = await axios.put(`http://localhost:8085/api/tasks/${task.id}`, {
        ...task,
        status: newStatus,
        completedAt: newStatus === "DONE" ? new Date().toISOString() : null
      });

      if (response.status === 200) {
        console.log('✅ DRAG&DROP: Task status updated successfully');
        
        // 2. Now send 3 notifications - CRITICAL PART
        await send3StatusChangeNotifications(task, oldStatus, newStatus);
        
        toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
      } else {
        throw new Error('Failed to update task status');
      }
    } catch (error) {
      console.error('❌ DRAG&DROP: Failed to update task:', error);
      
      // Revert optimistic update on failure
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: task.status } : t
      ));
      toast.error('Failed to update task status');
    }
  };

  // Helper function to send 3 notifications with different recipients
  const send3StatusChangeNotifications = async (
    task: Task, 
    oldStatus: Task["status"], 
    newStatus: Task["status"]
  ) => {
    console.log('🔔 DRAG&DROP: Starting to send notifications (with deduplication)...');
    
    try {
      // Get current user info
      const actorUserId = userData?.profile?.id || userData?.account?.id;
      const actorUserName = userData?.profile?.username || userData?.profile?.firstName || 'User';

      if (!actorUserId) {
        console.warn('⚠️ DRAG&DROP: No current user ID found');
        return;
      }

      console.log('🔍 DRAG&DROP: Current user:', { actorUserId, actorUserName });

      // 1. FIRST: Fetch complete task details to get created_by
      let taskWithCreatedBy = task;
      try {
        console.log('🔍 DRAG&DROP: Fetching complete task details for created_by...');
        const taskDetailResponse = await axios.get(`http://localhost:8085/api/tasks/${task.id}`);
        
        if (taskDetailResponse.data?.status === "SUCCESS" && taskDetailResponse.data?.data) {
          taskWithCreatedBy = {
            ...task,
            ...taskDetailResponse.data.data
          };
          console.log('✅ DRAG&DROP: Retrieved task with created_by:', {
            taskId: taskWithCreatedBy.id,
            createdBy: taskWithCreatedBy.createdBy,
            assigneeId: taskWithCreatedBy.assigneeId
          });
        } else {
          console.warn('⚠️ DRAG&DROP: Could not fetch task details, using original task data');
        }
      } catch (taskFetchError) {
        console.warn('⚠️ DRAG&DROP: Failed to fetch task details:', taskFetchError);
      }

      console.log('🔍 DRAG&DROP: Final task info for notifications:', {
        id: taskWithCreatedBy.id,
        title: taskWithCreatedBy.title,
        assigneeId: taskWithCreatedBy.assigneeId,
        createdBy: taskWithCreatedBy.createdBy,
        projectId: taskWithCreatedBy.projectId
      });

      // Helper function to get status display name
      const getStatusDisplayName = (status: string): string => {
        switch (status) {
          case "TODO": return "To Do";
          case "IN_PROGRESS": return "In Progress";
          case "REVIEW": return "Review";
          case "DONE": return "Done";
          default: return status;
        }
      };

      // 2. COLLECT USER ROLES - Map each user to their roles
      const userRoles = new Map<string, string[]>();

      // Add Assignee
      let assigneeId = taskWithCreatedBy.assigneeId;
      if (assigneeId && assigneeId.trim() !== '') {
        if (!userRoles.has(assigneeId)) {
          userRoles.set(assigneeId, []);
        }
        userRoles.get(assigneeId)!.push('Assignee');
        console.log('✅ DRAG&DROP: Added assignee role for user:', assigneeId);
      } else {
        console.log('⚠️ DRAG&DROP: No assignee found');
      }
      
      // Add Creator
      let creatorId = taskWithCreatedBy.createdBy;
      if (creatorId && creatorId.trim() !== '') {
        if (!userRoles.has(creatorId)) {
          userRoles.set(creatorId, []);
        }
        userRoles.get(creatorId)!.push('Creator');
        console.log('✅ DRAG&DROP: Added creator role for user:', creatorId);
      } else {
        console.log('⚠️ DRAG&DROP: No creator found');
      }

      // Add Scrum Master
      let scrumMasterId = null;
      try {
        const projectApiId = taskWithCreatedBy.projectId || projectId;
        if (projectApiId) {
          console.log('🔍 DRAG&DROP: Fetching scrum master for project:', projectApiId);
          
          const scrumMasterResponse = await axios.get(`http://localhost:8083/api/projects/${projectApiId}/scrum_master_id`);
          console.log('🔍 DRAG&DROP: Scrum Master API response:', scrumMasterResponse.data);
          
          if (scrumMasterResponse.data?.status === "SUCCESS" && scrumMasterResponse.data?.data) {
            scrumMasterId = scrumMasterResponse.data.data;
            
            if (!userRoles.has(scrumMasterId)) {
              userRoles.set(scrumMasterId, []);
            }
            userRoles.get(scrumMasterId)!.push('Scrum Master');
            console.log('✅ DRAG&DROP: Added scrum master role for user:', scrumMasterId);
          } else {
            console.log('❌ DRAG&DROP: No scrum master found in API response');
          }
        } else {
          console.log('❌ DRAG&DROP: No project ID available for scrum master lookup');
        }
      } catch (projectError) {
        console.warn('⚠️ DRAG&DROP: Failed to fetch scrum master:', projectError);
      }

      // 3. REMOVE ACTOR FROM NOTIFICATIONS (don't notify the person who made the change)
      if (userRoles.has(actorUserId)) {
        console.log(`🚫 DRAG&DROP: Removing actor (${actorUserId}) from notifications - don't notify the person who made the change`);
        userRoles.delete(actorUserId);
      }

      console.log(`🎯 DRAG&DROP: User roles after deduplication:`);
      userRoles.forEach((roles, userId) => {
        console.log(`  User ${userId}: ${roles.join(', ')}`);
      });

      // If no users to notify, skip
      if (userRoles.size === 0) {
        console.log('⚠️ DRAG&DROP: No users to notify after removing actor and deduplication');
        return;
      }

      // Base notification data
      const baseNotificationData = {
        type: "TASK_STATUS_CHANGED",
        title: "Task status changed",
        actorUserId: actorUserId,
        actorUserName: actorUserName,
        projectId: taskWithCreatedBy.projectId || projectId,
        projectName: project?.name || "TaskFlow Project",
        taskId: taskWithCreatedBy.id
      };

      // 4. CREATE NOTIFICATIONS - One per unique user with combined roles
      const notifications: any[] = [];
      
      userRoles.forEach((roles, userId) => {
        const roleText = roles.length > 1 
          ? `${roles.slice(0, -1).join(', ')} and ${roles[roles.length - 1]}`
          : roles[0];
        
        const notification = {
          ...baseNotificationData,
          recipientUserId: userId,
          message: `${actorUserName} changed task "${taskWithCreatedBy.title}" status from "${getStatusDisplayName(oldStatus)}" to "${getStatusDisplayName(newStatus)}" (You are the ${roleText})`
        };
        
        notifications.push(notification);
      });

      console.log(`🎯 DRAG&DROP: Prepared ${notifications.length} deduplicated notifications:`);
      notifications.forEach((notification, index) => {
        const userRolesList = userRoles.get(notification.recipientUserId) || [];
        console.log(`  ${index + 1}. User ${notification.recipientUserId}: ${userRolesList.join(' + ')}`);
      });
      
      // 5. LOG ALL PAYLOADS BEFORE SENDING
      console.log('');
      console.log('🔍 ===== DEDUPLICATED NOTIFICATION PAYLOADS =====');
      notifications.forEach((notification, index) => {
        const userRolesList = userRoles.get(notification.recipientUserId) || [];
        console.log(`📋 PAYLOAD ${index + 1}/${notifications.length} - USER (${userRolesList.join(' + ')}):`);
        console.log(JSON.stringify(notification, null, 2));
        console.log('');
      });
      console.log('🔍 ================================================');
      console.log('');
      
      // 6. SEND ALL NOTIFICATIONS
      console.log(`📤 DRAG&DROP: Sending ${notifications.length} deduplicated notifications...`);
      
      const notificationPromises = notifications.map(async (notification, index) => {
        const userRolesList = userRoles.get(notification.recipientUserId) || [];
        const roleDisplay = userRolesList.join(' + ');
        
        console.log(`📤 DRAG&DROP: Sending notification ${index + 1}/${notifications.length} to ${roleDisplay}:`, notification.recipientUserId);
        
        try {
          const response = await axios.post(`http://localhost:8089/api/notifications/create`, notification);
          console.log(`✅ DRAG&DROP: Notification ${index + 1} sent successfully to ${roleDisplay}`);
          console.log(`   Response status: ${response.status}`);
          console.log(`   Response data:`, response.data);
          return { success: true, recipient: roleDisplay, userId: notification.recipientUserId };
        } catch (error) {
          console.error(`❌ DRAG&DROP: Failed to send notification ${index + 1} to ${roleDisplay}:`, error);
          if (axios.isAxiosError(error) && error.response) {
            console.error(`   Error status: ${error.response.status}`);
            console.error(`   Error data:`, error.response.data);
          }
          return { success: false, recipient: roleDisplay, userId: notification.recipientUserId, error };
        }
      });

      const results = await Promise.allSettled(notificationPromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

      console.log(`📊 DRAG&DROP: Notification results summary:`);
      console.log(`  ✅ Successful: ${successful}`);
      console.log(`  ❌ Failed: ${failed}`);
      console.log(`  🎯 Total unique users notified: ${successful}/${notifications.length}`);
      
      // Log detailed results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            console.log(`  ✅ ${index + 1}. ${result.value.recipient} (${result.value.userId}): SUCCESS`);
          } else {
            console.log(`  ❌ ${index + 1}. ${result.value.recipient} (${result.value.userId}): FAILED`);
          }
        } else {
          console.log(`  ❌ ${index + 1}. Promise rejected:`, result.reason);
        }
      });
      
      if (successful > 0) {
        console.log(`🎉 DRAG&DROP: Successfully sent ${successful} deduplicated notifications!`);
      } else {
        console.warn(`⚠️ DRAG&DROP: No notifications were sent successfully`);
      }

    } catch (error) {
      console.error('❌ DRAG&DROP: Failed to send status change notifications:', error);
    }
  };

  // Debug searchResults khi nó thay đổi
  useEffect(() => {
    console.log("🔄 searchResults state changed:", searchResults);
    console.log("🔄 searchResults length:", searchResults.length);
    console.log("🔄 showSearchResults state:", showSearchResults);
  }, [searchResults, showSearchResults]);

  // Debug state changes
  useEffect(() => {
    console.log("🔄 ===== STATE CHANGE DETECTED =====");
    console.log("🔄 searchResults:", searchResults);
    console.log("🔄 showSearchResults:", showSearchResults);
    console.log("🔄 isSearching:", isSearching);
    console.log("🔄 searchProject:", searchProject);
  }, [searchResults, showSearchResults, isSearching, searchProject]);

  // Ensure tasks is always initialized
  useEffect(() => {
    if (!tasks) {
      setTasks([]);
    }
  }, [tasks]);

  // Improved taskId handling from URL - with better error handling and loading states
  useEffect(() => {
    if (!urlTaskId) return;

    console.log("🔗 TaskId found in URL:", urlTaskId);
    
    const handleTaskFromUrl = async () => {
      setLoadingTaskFromUrl(true);
      
      try {
        // First, try to find task in current tasks (if they're loaded)
        if (tasks.length > 0) {
          const foundTask = tasks.find(task => task.id === urlTaskId);
          
          if (foundTask) {
            console.log("✅ Task found in current tasks, opening modal:", foundTask.title);
            setSelectedTask(foundTask);
            setLoadingTaskFromUrl(false);
            return;
          }
        }
        
        // If not found in current tasks, fetch from API
        console.log("⚠️ Task not found in current tasks, fetching from API...");
        
        const response = await axios.get(`http://localhost:8085/api/tasks/${urlTaskId}`);
        
        if (response.data?.data) {
          const fetchedTask = response.data.data;
          console.log("✅ Task fetched from API:", fetchedTask.title);
          
          // Show success message
          toast.success(`Opened task: ${fetchedTask.title}`, {
            description: "Task may be from a different sprint"
          });
          
          setSelectedTask(fetchedTask);
        } else {
          throw new Error("Task data not found in response");
        }
        
      } catch (error) {
        console.error("❌ Error fetching task from API:", error);
        
        // Show user-friendly error message
        toast.error("Task not found or you don't have access", {
          description: `Could not open task ${urlTaskId}`,
          action: {
            label: "Browse tasks",
            onClick: () => {
              // Remove taskId from URL and stay on project page
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('taskId');
              window.history.replaceState({}, '', newUrl.toString());
            }
          }
        });
        
        // Remove taskId from URL
        setTimeout(() => {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('taskId');
          window.history.replaceState({}, '', newUrl.toString());
        }, 3000);
      } finally {
        setLoadingTaskFromUrl(false);
      }
    };

    // Add a small delay to ensure other data is loaded first
    const timeoutId = setTimeout(handleTaskFromUrl, 500);
    
    return () => clearTimeout(timeoutId);
  }, [urlTaskId, tasks.length]); // Depend on tasks.length to retry when tasks are loaded

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Hàm cũ đã bị xóa và thay thế bằng phiên bản mới ở dưới

  const handleSelectProject = (projectId: string) => {
    setShowSearchResults(false);
    setSearchProject("");
    router.push(`/project/project_homescreen?projectId=${projectId}`);
  };

  // Tìm kiếm project theo tên - chỉ hiển thị projects mà user hiện tại là member
  const searchBoardsByName = async (term: string) => {
    console.log("🔍 ===== SEARCH BOARDS BY NAME =====");
    console.log("🔍 Search term:", term);
    
    try {
      // Get user ID from user storage service instead of localStorage
      let currentUserId = userData?.profile?.id || userData?.account?.id;
      
      if (!currentUserId) {
        console.error("❌ No userId found in user storage. Please ensure user is logged in.");
        // TEMPORARY: Use hardcoded userId for testing
        currentUserId = "d90e8bd8-72e2-47cc-b9f0-edb92fe60c5a";
        console.log("🔧 TESTING: Using hardcoded userId:", currentUserId);
      }

      // Sử dụng API search/member với userId của người dùng hiện tại
      const apiUrl = `http://localhost:8083/api/projects/search/member?keyword=${encodeURIComponent(term)}&userId=${currentUserId}`;
      console.log("🔍 Making API call to:", apiUrl);
      
      const res = await axios.get(apiUrl);
      
      console.log("🔍 ===== API RESPONSE =====");
      console.log("🔍 API response:", res.data);
      
      if (res.data?.data) {
        const matchedProjects = res.data.data.map((project: any) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          key: project.key,
          projectType: project.projectType,
          access: project.access,
          createdAt: project.createdAt,
          ownerId: project.ownerId,
          deadline: project.deadline
        }));
        
        console.log("🔍 Processed projects:", matchedProjects);
        return matchedProjects;
      }
      
      console.log("⚠️ No data in API response - returning empty array");
      return [];
    } catch (err) {
      console.error("❌ Error searching projects:", err);
      if (axios.isAxiosError(err)) {
        console.error("❌ Axios error details:", {
          status: err.response?.status,
          data: err.response?.data
        });
      }
      return [];
    }
  };

  const handleSearchProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    console.log("🔍 ===== HANDLE SEARCH PROJECT =====");
    console.log("🔍 Search term:", term);
    setSearchProject(term);
    
    if (term.trim().length > 0) {
      try {
        console.log("🔍 Starting search with term:", term);
        
        // Show loading state
        setIsSearching(true);
        setSearchResults([]);
        setShowSearchResults(true);
        
        // Tìm project theo tên - chỉ hiển thị projects mà user là member
        console.log("🔍 Calling searchBoardsByName...");
        const results = await searchBoardsByName(term);
        console.log("🔍 ===== SEARCH RESULTS =====");
        console.log("🔍 Raw results:", results);
        console.log("🔍 Results length:", results.length);
        console.log("🔍 First result sample:", results[0]);
        
        // Update state with results
        setSearchResults(results);
        setShowSearchResults(true);
        setIsSearching(false);
        
        // Debug state updates
        console.log("🔍 State updates:", {
          searchResults: results,
          showSearchResults: true,
          isSearching: false,
          searchTerm: term
        });
        
      } catch (err) {
        console.error("❌ Error in handleSearchProject:", err);
        setSearchResults([]);
        setShowSearchResults(true);
        setIsSearching(false);
        toast.error("Failed to search boards. Please try again.");
      }
    } else {
      console.log("🔍 Empty search term, clearing results");
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Nếu đã có kết quả tìm kiếm, sử dụng kết quả đầu tiên
    if (searchResults.length > 0) {
      const selectedProject = searchResults[0];
      
      if (selectedProject && selectedProject.id) {
        console.log("Selected board:", selectedProject);
        
        // Chuyển đến project được chọn
        router.push(`/project/project_homescreen?projectId=${selectedProject.id}`);
        setShowSearchResults(false);
        setSearchProject("");
      }
    } else if (searchProject.trim()) {
      // Nếu không có kết quả nhưng có từ khóa tìm kiếm, thử tìm kiếm lại
      const results = await searchBoardsByName(searchProject);
      
      if (results.length > 0) {
        const selectedProject = results[0];
        
        // Chuyển đến project được chọn
        router.push(`/project/project_homescreen?projectId=${selectedProject.id}`);
        setShowSearchResults(false);
        setSearchProject("");
      } else {
        // Không tìm thấy, hiển thị thông báo
        toast.info(`No boards found matching "${searchProject}"`);
      }
    }
    
    setLoading(false);
  };

  const fetchTasksForLatestSprint = async (
    projectId: string,
    sprintId: string
  ) => {
    try {
      setLoading(true);
      console.log("🔄 Bắt đầu tải tasks...");
      const statuses: Task["status"][] = [
        "TODO",
        "IN_PROGRESS",
        "REVIEW",
        "DONE",
      ];
      
      try {
        const promises = statuses.map((status) =>
          axios.get(`http://localhost:8085/api/tasks/filter_details`, {
            params: { status, projectId, sprintId },
          })
        );

        const responses = await Promise.all(promises);
        
        const allTasks = responses.flatMap((res, index) => {
          const statusTasks = res.data?.data || [];
          console.log(`📋 Tasks cho ${statuses[index]}:`, statusTasks);
          return statusTasks;
        });

        console.log("📦 Tất cả tasks từ API:", allTasks);
        
        if (allTasks.length === 0) {
          console.log("⚠️ Không tìm thấy task nào");
          setTasks([]);
          setLoading(false);
          return;
        }

        const formattedTasks = allTasks.map((task: any) => ({
          ...task,
          status: task.status?.toUpperCase().replace(" ", "_") as Task["status"],
        }));

        console.log("🎯 Tasks đã format:", formattedTasks);
        console.log(`🔢 Tổng số tasks: ${formattedTasks.length}`);
        
        const todoCount = formattedTasks.filter(t => t.status === "TODO").length;
        const inProgressCount = formattedTasks.filter(t => t.status === "IN_PROGRESS").length;
        const reviewCount = formattedTasks.filter(t => t.status === "REVIEW").length;
        const doneCount = formattedTasks.filter(t => t.status === "DONE").length;
        
        console.log(`📊 Phân bố tasks: TODO(${todoCount}), IN_PROGRESS(${inProgressCount}), REVIEW(${reviewCount}), DONE(${doneCount})`);
        
        setTasks(formattedTasks);
        console.log("✅ Đã cập nhật state tasks");
        
        // Check for overdue tasks and send notifications
        try {
          const tasksWithProjectName = formattedTasks.map(task => ({
            ...task,
            projectName: project?.name || "Unknown Project"
          }));
          await checkAndNotifyOverdueTasks(tasksWithProjectName);
          console.log("✅ Overdue tasks check completed");
        } catch (overdueError) {
          console.error("❌ Error checking overdue tasks:", overdueError);
          // Don't fail the main operation if overdue check fails
        }
      } catch (error) {
        console.error("❌ Lỗi khi tải tasks từ API:", error);
        toast.error("Error loading tasks from API");
        // Set empty tasks array to ensure the UI renders properly
        setTasks([]);
      }
    } catch (err) {
      console.error("❌ Lỗi khi tải tasks:", err);
      toast.error("Failed to load tasks");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;

    console.log("Loading data for project ID:", projectId);

    axios
      .get(`http://localhost:8083/api/projects/${projectId}`)
      .then((res) => {
        const projectData = res.data?.data;
        console.log("Project data:", projectData);
        setProject(projectData);
      })
      .catch((err) => {
        console.error("Error fetching project:", err);
        toast.error("Failed to load project details");
      });

    axios
      .get(`http://localhost:8083/api/projects/${projectId}/users`)
      .then((res) => {
        const users = res.data?.data || [];
        console.log("Project users:", users);
        setProjectUsers(users);
      })
      .catch((err) => {
        console.error("Error fetching project users:", err);
        toast.error("Failed to load project users");
      });

    axios
      .get(`http://localhost:8084/api/sprints/project/${projectId}`)
      .then((res) => {
        const sprintsData = res.data?.data || [];
        console.log("Sprints data:", sprintsData);
        
        const formattedSprints = sprintsData.map((sprint: {id: string, name?: string, number?: number}) => ({
          id: sprint.id,
          name: sprint.name || `Sprint ${sprint.number || ''}`,
        }));
        
        setSprints(formattedSprints);
        
        fetchLatestSprint();
      })
      .catch((err) => {
        console.error("Error fetching sprints:", err);
        toast.error("Failed to load sprints");
        fetchLatestSprint();
      });
  }, [projectId]);

  const fetchLatestSprint = () => {
    if (!projectId) return;
    
    axios
      .get(`http://localhost:8084/api/sprints/project/${projectId}/active`)
      .then((res) => {
        const sprint = res.data;
        console.log("Active sprint:", sprint);

        if (!sprint || !sprint.id) {
          console.log("No active sprint found or invalid sprint data");
          fetchLatestNonCompletedSprint();
          return;
        }

        const sprintId = sprint.id;
        console.log("Using active sprint ID:", sprintId);
        setLatestSprintId(sprintId);

        fetchTasksForLatestSprint(projectId, sprintId);
      })
      .catch((err) => {
        console.error("Error fetching active sprint:", err);
        fetchLatestNonCompletedSprint();
      });
  };

  const fetchLatestNonCompletedSprint = () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    
    axios
      .get(`http://localhost:8084/api/sprints/project/${projectId}`)
      .then((res) => {
        const sprintsData = res.data?.data || [];
        console.log("All sprints:", sprintsData);
        
        // Tìm sprint chưa hoàn thành
        const nonCompletedSprints = sprintsData.filter(
          (sprint: any) => sprint.status === "NOT_STARTED"
        );
        
        if (nonCompletedSprints.length > 0) {
          nonCompletedSprints.sort((a: any, b: any) => 
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
          
          const latestSprint = nonCompletedSprints[0];
          console.log("Using latest non-completed sprint:", latestSprint);
          
          if (latestSprint && latestSprint.id) {
            setLatestSprintId(latestSprint.id);
            fetchTasksForLatestSprint(projectId, latestSprint.id);
            return;
          }
        }
        
        // Nếu không tìm thấy sprint chưa hoàn thành, tìm sprint gần đây nhất theo ngày
        if (sprintsData.length > 0) {
          // Sắp xếp tất cả sprint theo ngày gần nhất
          sprintsData.sort((a: any, b: any) => 
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
          
          const mostRecentSprint = sprintsData[0];
          console.log("Using most recent sprint:", mostRecentSprint);
          
          if (mostRecentSprint && mostRecentSprint.id) {
            setLatestSprintId(mostRecentSprint.id);
            fetchTasksForLatestSprint(projectId, mostRecentSprint.id);
            return;
          }
        }
        
        console.log("No sprints found at all. Showing empty board.");
        setTasks([]);
        setLoading(false);
        toast.info("No active sprint found. Board is empty.", {
          description: "You can create tasks that will be added to the backlog."
        });
      })
      .catch((err) => {
        console.error("Error fetching all sprints:", err);
        toast.error("Failed to load sprint details");
        setLoading(false);
      });
  };

  const handleCreateTaskByStatus = async (status: Task["status"]) => {
    const title = newTasks[status];
    if (!title.trim() || !projectId || !latestSprintId) {
      toast.error("Missing required information to create task");
      return;
    }

    try {
      setLoading(true);
      console.log("🔄 Đang tạo task mới:", {
        title,
        status,
        projectId,
        sprintId: latestSprintId,
      });

      const tempTask: Task = {
        id: `temp-${Date.now()}`,
        title: title,
        status: status,
        shortKey: `T-${Math.floor(Math.random() * 1000)}`,
        description: "",
        storyPoint: 0,
        assigneeId: null,
        assigneeName: "Unassigned",
        projectId: projectId,
        sprintId: latestSprintId,
      };

      console.log("Thêm task tạm thời vào state:", tempTask);
      setTasks((prev) => [...prev, tempTask]);
      
      setNewTasks((prev) => ({ ...prev, [status]: "" }));

      const res = await axios.post("http://localhost:8085/api/tasks", {
        title,
        content: title,
        status,
        projectId,
        sprintId: latestSprintId,
        description: "",
        storyPoint: 0,
        assigneeId: null,
        dueDate: null,
        completedAt: null,
        parentTaskId: null,
        tags: null,
      });

      const newTask = res.data?.data;
      console.log("✅ Task mới đã được tạo từ API:", newTask);

      if (newTask) {
        toast.success("Task created successfully");
        
        setTimeout(async () => {
          if (projectId && latestSprintId) {
            console.log("🔄 Tải lại toàn bộ tasks sau khi tạo task mới");
            await fetchTasksForLatestSprint(projectId, latestSprintId);
          }
        }, 2000);
      }
    } catch (err) {
      console.error("❌ Lỗi khi tạo task:", err);
      toast.error("Failed to create task");
      setTasks((prev) => prev.filter(task => !task.id.startsWith('temp-')));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (updatedTask: TaskData) => {
    try {
      console.log("🔄 Đang cập nhật task:", updatedTask);
      
      // Update the selected task in the state first for immediate UI update
      setSelectedTask(updatedTask);
      
      const res = await axios.put(`http://localhost:8085/api/tasks/${updatedTask.id}`, updatedTask);
      
      if (res.data?.status === "SUCCESS") {
        toast.success("Task updated successfully");
        
        // Update the task in the tasks list
        setTasks(prev => 
          prev.map(task => 
            task.id === updatedTask.id ? { ...updatedTask as Task } : task
          )
        );
        
        // Don't close the modal automatically to allow viewing the changes
        // setSelectedTask(null);
        
        setTimeout(async () => {
          if (projectId && latestSprintId) {
            console.log("🔄 Tải lại toàn bộ tasks sau khi cập nhật");
            await fetchTasksForLatestSprint(projectId, latestSprintId);
          }
        }, 2000);
      }
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật task:", err);
      toast.error("Failed to update task");
    }
  };

  // Hàm để kiểm tra xem một URL có phải là URL Cloudinary không
  // const isCloudinaryUrl = (url: string): boolean => {
  //   if (!url || typeof url !== 'string') return false;
  //   return url.includes('cloudinary.com') && 
  //          (url.includes('/image/upload/') || url.includes('/image/upload'));
  // };

  // Hàm để lấy public_id từ URL Cloudinary
  // const getPublicIdFromCloudinaryUrl = (url: string): string | null => {
  //   try {
  //     // URL mẫu: https://res.cloudinary.com/dwmospuhh/image/upload/v1747715204/avatars/b76b87ab-4bc4-4bec-ab37-d410487927ab.jpg
  //     const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  //     if (match && match[1]) {
  //       return match[1]; // Trả về phần "avatars/b76b87ab-4bc4-4bec-ab37-d410487927ab"
  //     }
  //   } catch (error) {
  //     console.error("Error parsing Cloudinary URL:", error);
  //   }
  //   return null;
  // };

  const fetchUserAvatar = async (userId: string): Promise<string | undefined> => {
    if (!userId || userId.trim() === '') {
      return DEFAULT_AVATAR_URL;
    }
    
    // Kiểm tra cache trước
    if (avatarCache.current[userId]) {
      return avatarCache.current[userId];
    }
    
    // Check if we've already tried to fetch this avatar and got a 404
    if (userAvatarFetchErrors.current.has(userId)) {
      return DEFAULT_AVATAR_URL;
    }
    
    // Kiểm tra xem user có trong projectUsers không, để tránh gọi API
    const userInProject = projectUsers.find(u => u.id === userId);
    if (userInProject) {
      let avatarUrl = DEFAULT_AVATAR_URL;
      
      if (userInProject.avatar) {
        // Nếu avatar là URL đầy đủ
        if (userInProject.avatar.startsWith('http') || userInProject.avatar.startsWith('https')) {
          avatarUrl = userInProject.avatar;
        }
        // Nếu avatar là dữ liệu Base64
        else if (userInProject.avatar.startsWith('/9j/') || userInProject.avatar.startsWith('data:image')) {
          avatarUrl = userInProject.avatar;
        }
        // Tạo URL Cloudinary từ avatar value
        else {
          avatarUrl = `https://res.cloudinary.com/dwmospuhh/image/upload/avatars/${userInProject.avatar}`;
        }
      }
      
      // Lưu vào cache
      avatarCache.current[userId] = avatarUrl;
      return avatarUrl;
    }
    
    // Nếu không tìm thấy user trong projectUsers, gọi API
    try {
      // Gọi API để lấy thông tin user
      const response = await axios.get(`http://localhost:8086/api/users/${userId}`);
      const userData = response.data?.data;
      
      if (!userData) {
        userAvatarFetchErrors.current.add(userId);
        avatarCache.current[userId] = DEFAULT_AVATAR_URL;
        return DEFAULT_AVATAR_URL;
      }
      
      let avatarUrl = DEFAULT_AVATAR_URL;
      
      if (userData.avatar) {
        // Nếu avatar là URL đầy đủ
        if (userData.avatar.startsWith('http') || userData.avatar.startsWith('https')) {
          avatarUrl = userData.avatar;
        }
        // Nếu avatar là dữ liệu Base64
        else if (userData.avatar.startsWith('/9j/') || userData.avatar.startsWith('data:image')) {
          avatarUrl = userData.avatar;
        }
        // Tạo URL Cloudinary
        else {
          avatarUrl = `https://res.cloudinary.com/dwmospuhh/image/upload/avatars/${userData.avatar}`;
        }
      }
      
      // Lưu vào cache
      avatarCache.current[userId] = avatarUrl;
      return avatarUrl;
    } catch (err) {
      // Store the userId that resulted in a 404 to avoid future requests
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        userAvatarFetchErrors.current.add(userId);
      }
      
      avatarCache.current[userId] = DEFAULT_AVATAR_URL;
      return DEFAULT_AVATAR_URL;
    }
  };

  const getInitials = (name: string): string => {
    if (!name || name === "Unassigned") return "?";
    return name.split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // Thêm hàm kiểm tra và tạo nguồn từ dữ liệu Base64 hoặc URL
  const getImageSource = (avatarData: string | undefined): string => {
    if (!avatarData) return '';
    
    // Log để debug
    console.log("Processing avatar data:", avatarData);
    
    // Kiểm tra xem đây có phải là dữ liệu Base64 không
    if (avatarData.startsWith('/9j/') || avatarData.startsWith('data:image')) {
      // Nếu đã có định dạng data:image thì giữ nguyên, nếu không thêm vào
      const result = avatarData.startsWith('data:image') 
        ? avatarData 
        : `data:image/jpeg;base64,${avatarData}`;
      console.log("Converted Base64 data to image source");
      return result;
    }
    
    // Nếu là URL Cloudinary, kiểm tra và xử lý phù hợp
    if (avatarData.includes('cloudinary.com')) {
      // Phân tích URL để xem có phần mở rộng không
      const hasExtension = /\.(jpg|jpeg|png|webp|gif)$/i.test(avatarData);
      
      // Tạo base URL, thêm phần mở rộng nếu chưa có
      let processedUrl = avatarData;
      if (!hasExtension) {
        // Nếu URL không có phần mở rộng, thử với jpg
        processedUrl = `${avatarData}.jpg`;
        console.log("Added .jpg extension to Cloudinary URL:", processedUrl);
      }
      
      // Thêm cache-busting để tránh bị cache
      const separator = processedUrl.includes('?') ? '&' : '?';
      const result = `${processedUrl}${separator}_t=${Date.now()}`;
      console.log("Using Cloudinary URL with cache-busting:", result);
      return result;
    }
    
    // Nếu là URL khác, giữ nguyên
    if (avatarData.startsWith('http') || avatarData.startsWith('https')) {
      console.log("Using direct URL:", avatarData);
      return avatarData;
    }
    
    // Trường hợp còn lại
    return avatarData;
  };

  // Default avatar URL sẽ được sử dụng khi không có avatar hoặc avatar không tải được
  const DEFAULT_AVATAR_URL = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

  // Hàm tạo component hiển thị avatar với xử lý lỗi
  const AvatarDisplay = ({ 
    avatarUrl, 
    displayName, 
    size = "normal" 
  }: { 
    avatarUrl?: string, 
    displayName: string, 
    size?: "small" | "normal" 
  }) => {
    const [imageError, setImageError] = useState(false);
    const [isCheckingImage, setIsCheckingImage] = useState(false);
    const [currentUrlToTry, setCurrentUrlToTry] = useState(avatarUrl);
    
    // Extensions to try when the original URL fails
    const extensionsToTry = ['.jpg', '.jpeg', '.png', '.webp'];
    const [currentExtensionIndex, setCurrentExtensionIndex] = useState(-1);
    
    useEffect(() => {
      // Reset states when avatarUrl changes
      setImageError(false);
      setIsCheckingImage(false);
      setCurrentUrlToTry(avatarUrl);
      setCurrentExtensionIndex(-1);
    }, [avatarUrl]);
    
    useEffect(() => {
      // Skip validation for non-Cloudinary URLs or base64 data
      if (!currentUrlToTry || 
          currentUrlToTry === DEFAULT_AVATAR_URL || 
          currentUrlToTry.startsWith('data:image') || 
          !currentUrlToTry.includes('cloudinary.com')) {
        return;
      }
      
      setIsCheckingImage(true);
      
      // Tạo một Image object để kiểm tra xem ảnh có tồn tại không
      const img = new Image();
      
      img.onload = () => {
        console.log("Image exists and loaded successfully:", currentUrlToTry);
        setIsCheckingImage(false);
      };
      
      img.onerror = () => {
        console.error("Image doesn't exist or cannot be loaded:", currentUrlToTry);
        
        // Try next extension if this is a Cloudinary URL
        if (currentUrlToTry.includes('cloudinary.com')) {
          const nextExtensionIndex = currentExtensionIndex + 1;
          
          if (nextExtensionIndex < extensionsToTry.length) {
            // Get base URL without any existing extension
            let baseUrl = currentUrlToTry;
            const extensionMatch = baseUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i);
            if (extensionMatch) {
              baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('.'));
            }
            
            const nextUrl = `${baseUrl}${extensionsToTry[nextExtensionIndex]}`;
            console.log(`Trying with ${extensionsToTry[nextExtensionIndex]} extension:`, nextUrl);
            
            setCurrentExtensionIndex(nextExtensionIndex);
            setCurrentUrlToTry(nextUrl);
            return;
          }
          
          // Try without version number if all extensions fail
          if (currentUrlToTry.includes('/v')) {
            const urlParts = currentUrlToTry.split('/');
            const versionIndex = urlParts.findIndex(part => part.startsWith('v') && /^v\d+$/.test(part));
            
            if (versionIndex !== -1) {
              urlParts.splice(versionIndex, 1);
              const urlWithoutVersion = urlParts.join('/');
              console.log("Trying without version number:", urlWithoutVersion);
              
              setCurrentExtensionIndex(-1);
              setCurrentUrlToTry(urlWithoutVersion);
              return;
            }
          }
        }
        
        // If all attempts fail, show fallback
        console.error("All image loading attempts failed");
        setImageError(true);
        setIsCheckingImage(false);
      };
      
      // Add cache busting parameter to avoid browser caching of failed requests
      const cacheBuster = `?t=${Date.now()}`;
      img.src = `${currentUrlToTry}${cacheBuster}`;
    }, [currentUrlToTry, currentExtensionIndex]);
    
    // Xác định kích thước dựa trên tham số size
    const containerClass = size === "small" 
      ? "w-6 h-6" 
      : "w-8 h-8";
    
    // Đang kiểm tra trạng thái ảnh
    if (isCheckingImage) {
      return (
        <div className={`${containerClass} flex items-center justify-center bg-gray-200 text-gray-500 text-xs font-medium rounded-full animate-pulse`}>
          {getInitials(displayName)}
        </div>
      );
    }
    
    // Nếu không có URL hoặc đã có lỗi, hiển thị default avatar
    if (!avatarUrl || imageError) {
      return (
        <div className={`${containerClass} relative rounded-full overflow-hidden`}>
          <img 
            src={DEFAULT_AVATAR_URL}
            alt={displayName} 
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error("Default avatar failed to load, showing initials instead");
              // Nếu default avatar cũng không tải được, hiện chữ cái đầu
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.classList.add('bg-blue-500', 'text-white', 'flex', 'items-center', 'justify-center', 'text-xs', 'font-medium');
              (e.target as HTMLImageElement).parentElement!.innerHTML = getInitials(displayName);
            }}
          />
        </div>
      );
    }
    
    // The URL is handled by the effect that tries different formats, we don't need to modify it here
    const finalUrl = avatarUrl;
    
    // Nếu có URL, hiển thị ảnh với xử lý lỗi
    return (
      <div className={`${containerClass} relative rounded-full overflow-hidden`}>
        {imageError ? (
          // Show initials when all image attempts have failed
          <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-medium">
            {getInitials(displayName)}
          </div>
        ) : (
          <img 
            src={getImageSource(isCheckingImage ? currentUrlToTry : finalUrl)} 
            alt={displayName} 
            className="w-full h-full object-cover" 
            onError={() => {
              console.error("Avatar load error in render:", isCheckingImage ? currentUrlToTry : finalUrl);
              
              // If we're already in the process of checking different URLs, don't interfere
              if (!isCheckingImage) {
                setImageError(true);
              }
            }}
          />
        )}
      </div>
    );
  };

  function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [userList, setUserList] = useState<ProjectUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const avatarRef = useRef<HTMLDivElement>(null);
    const [assigneeAvatarUrl, setAssigneeAvatarUrl] = useState<string | undefined>(DEFAULT_AVATAR_URL);
    // State để lưu trữ các avatar URL đã fetch
    const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
    const hasFetchedUsers = useRef(false);
    const [validAssignee, setValidAssignee] = useState(false);

    useEffect(() => {
      console.log("Current task:", task);
      console.log("AssigneeId:", task.assigneeId || "No assignee");
      
      // Kiểm tra xem assigneeId có phải là null, undefined hoặc chuỗi rỗng không
      const hasValidAssigneeId = !!task.assigneeId && task.assigneeId.trim().length > 0;
      setValidAssignee(hasValidAssigneeId);
      
      if (!hasValidAssigneeId) {
        setAssigneeAvatarUrl(DEFAULT_AVATAR_URL);
      }
    }, [task]);

    // Chỉ tìm assignee nếu có assigneeId hợp lệ
    const assignee = (validAssignee && task.assigneeId) 
      ? projectUsers.find(u => u.id === task.assigneeId) 
      : null;
    
    useEffect(() => {
      console.log("Found assignee:", assignee || "None");
    }, [assignee]);

    useEffect(() => {
      // Nếu không có assigneeId hợp lệ, sử dụng avatar mặc định
      if (!validAssignee || !task.assigneeId) {
        setAssigneeAvatarUrl(DEFAULT_AVATAR_URL);
        return;
      }
      
      // Kiểm tra cache trước khi fetch
      if (avatarCache.current[task.assigneeId]) {
        setAssigneeAvatarUrl(avatarCache.current[task.assigneeId]);
        return;
      }
      
      // Fetch avatar nếu không có trong cache
      fetchUserAvatar(task.assigneeId).then(url => {
        if (url) {
          setAssigneeAvatarUrl(url);
        } else {
          setAssigneeAvatarUrl(DEFAULT_AVATAR_URL);
        }
      }).catch(() => {
        setAssigneeAvatarUrl(DEFAULT_AVATAR_URL);
      });
    }, [task.assigneeId, validAssignee]);

    const fetchProjectUsers = async () => {
      if (!projectId) return;
      
      // Nếu đã fetch users trước đó, chỉ sử dụng lại kết quả
      if (hasFetchedUsers.current) {
        return;
      }
      
      try {
        setLoadingUsers(true);
        const res = await axios.get(`http://localhost:8086/api/users/project/${projectId}`);
        const users = res.data?.data || [];
        
        // Cập nhật danh sách users
        setUserList(users);
        
        // Cập nhật cache avatars cho mỗi user
        users.forEach((user: ProjectUser) => {
          if (user.id) {
            if (user.avatar) {
              // Xử lý avatar URL và đưa vào cache
              if (user.avatar.startsWith('http') || user.avatar.startsWith('https') || 
                  user.avatar.startsWith('/9j/') || user.avatar.startsWith('data:image')) {
                avatarCache.current[user.id] = user.avatar;
              } else {
                // Tạo Cloudinary URL cho avatar
                const cloudinaryUrl = `https://res.cloudinary.com/dwmospuhh/image/upload/avatars/${user.avatar}`;
                avatarCache.current[user.id] = cloudinaryUrl;
              }
            } else {
              // Không có avatar, sử dụng mặc định
              avatarCache.current[user.id] = DEFAULT_AVATAR_URL;
            }
          }
        });
        
        // Đánh dấu đã fetch users
        hasFetchedUsers.current = true;
      } catch (err) {
        console.error("Error fetching project users:", err);
        // Khởi tạo danh sách rỗng nếu có lỗi
        setUserList([]);
        hasFetchedUsers.current = true;
      } finally {
        setLoadingUsers(false);
      }
    };

    const handleShowDropdown = async (e: React.MouseEvent) => {
      e.stopPropagation();
      
      if (!showDropdown) {
        await fetchProjectUsers();
      }
      
      setShowDropdown(!showDropdown);
    };

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
          setShowDropdown(false);
        }
      }
      if (showDropdown) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showDropdown]);

    const handleAssignUser = async (userId: string, userName: string) => {
      try {
        console.log("Assigning user:", userId || "none", userName);
        
        // Set validAssignee state based on whether userId exists
        const isValid = !!userId && userId.trim().length > 0;
        setValidAssignee(isValid);
        
        // Store previous assignee info for notification purposes
        const previousAssigneeId = task.assigneeId;
        const isReassignment = previousAssigneeId && previousAssigneeId !== userId;
        
        await axios.put(`http://localhost:8085/api/tasks/${task.id}`, {
          ...task,
          assigneeId: userId || null,
          assigneeName: isValid ? userName : "Unassigned"
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': localStorage.getItem("ownerId") || localStorage.getItem("userId") || '',
          },
        });
        
        if (isValid) {
          toast.success(`Assigned to ${userName}`);
        } else {
          toast.success(`Task unassigned`);
        }
        
        setTasks(prev =>
          prev.map(t =>
            t.id === task.id ? { 
              ...t, 
              assigneeId: userId || null, 
              assigneeName: isValid ? userName : "Unassigned"
            } : t
          )
        );
        
        // Reset avatar URL for unassigned tasks
        if (!isValid) {
          setAssigneeAvatarUrl(DEFAULT_AVATAR_URL);
        }
        
        // Send notification when assigning to a user (not when unassigning)
        if (isValid && userId) {
          try {
            // Get current user info from localStorage with detailed logging
            const currentUserId = localStorage.getItem("ownerId") || localStorage.getItem("userId");
            const currentUserName = localStorage.getItem("username") || localStorage.getItem("fullname") || "Unknown User";
            
            console.log("🔍 Current user info:", {
              currentUserId,
              currentUserName,
              localStorage: {
                ownerId: localStorage.getItem("ownerId"),
                userId: localStorage.getItem("userId"),
                username: localStorage.getItem("username"),
                fullname: localStorage.getItem("fullname")
              }
            });
            
            // Don't send notification if user assigns task to themselves
            if (currentUserId && currentUserId !== userId) {
              console.log("🔔 Sending notification for task assignment:", {
                fromUser: currentUserId,
                fromName: currentUserName,
                toUser: userId,
                toName: userName,
                isReassignment,
                previousAssignee: previousAssigneeId
              });
              
              const notificationData = {
                type: isReassignment ? "TASK_REASSIGNED" : "TASK_ASSIGNED",
                title: isReassignment ? "Task reassigned" : "Task assigned",
                message: `You have been ${isReassignment ? 'reassigned to' : 'assigned to'} task "${task.title}"`,
                recipientUserId: userId,
                actorUserId: currentUserId,
                actorUserName: currentUserName,
                projectId: task.projectId || projectId,
                taskId: task.id,
                actionUrl: `/project/board?projectId=${task.projectId || projectId}&taskId=${task.id}`
              };
              
              console.log("📤 Notification data to be sent:", notificationData);
              
              try {
                const notificationResponse = await axios.post(
                  "http://localhost:8089/api/notifications/create", 
                  notificationData,
                  {
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  }
                );
                
                if (notificationResponse.data) {
                  console.log("✅ Notification created successfully:", notificationResponse.data);
                  toast.success(`${isReassignment ? 'Reassignment' : 'Assignment'} notification sent to ${userName}`);
                } else {
                  console.error("❌ Empty response from notification service");
                  throw new Error("No data in notification response");
                }
              } catch (apiError) {
                console.error("❌ Notification API error:", {
                  error: apiError,
                  request: notificationData,
                  response: (apiError as any).response?.data
                });
                throw apiError; // Re-throw to be caught by outer catch
              }
              
            } else if (currentUserId === userId) {
              console.log("⏭️ Not sending notification - user assigned task to themselves:", {
                currentUserId,
                assignedUserId: userId
              });
            } else {
              console.log("⚠️ Could not send notification - missing current user ID:", {
                currentUserId,
                localStorage: Object.keys(localStorage)
              });
            }
            
          } catch (notificationError) {
            console.error("❌ Error in notification process:", notificationError);
            // Don't show error toast to user as assignment still succeeded
          }
        } else {
          console.log("ℹ️ No notification needed:", {
            isValid,
            userId,
            reason: !isValid ? "Invalid assignment" : "No user ID"
          });
        }
        
        console.log(`✅ Task assignment updated: ${isReassignment ? 'Reassigned' : 'Assigned'} task "${task.title}" to ${userName} (${userId})`);
        
        await fetchProjectUsers();
      } catch (err) {
        console.error("Error assigning user:", err);
        toast.error("Failed to assign user");
      }
    };

    const getAvatarUrl = (user: any): string | undefined => {
      if (!user) return undefined;
      
      // Kiểm tra và log thông tin user để debug
      console.log("Getting avatar for user:", user.id, user.username || user.name);
      
      // Nếu user có trường avatar và nó là URL đầy đủ hoặc dữ liệu Base64
      if (user.avatar && typeof user.avatar === 'string') {
        // Nếu là URL đầy đủ
        if (user.avatar.startsWith('http') || user.avatar.startsWith('https')) {
          console.log("Using avatar URL from database:", user.avatar);
          return user.avatar;
        } 
        // Nếu là dữ liệu Base64
        else if (user.avatar.startsWith('/9j/') || user.avatar.startsWith('data:image')) {
          console.log("Using Base64 avatar data from database");
          return user.avatar;
        }
        // Nếu là UUID hoặc tên file, tạo URL Cloudinary
        else {
          const cloudinaryUrl = `https://res.cloudinary.com/dwmospuhh/image/upload/avatars/${user.avatar}.jpg`;
          console.log("Created Cloudinary URL from avatar value:", cloudinaryUrl);
          return cloudinaryUrl;
        }
      }
      
      // Các trường hợp khác giữ nguyên
      if (user.url && typeof user.url === 'string') {
        console.log("Using direct URL:", user.url);
        return user.url;
      }
      
      if (user.avatarUrl && typeof user.avatarUrl === 'string') {
        console.log("Using avatarUrl:", user.avatarUrl);
        return user.avatarUrl;
      }
      
      if (user.avatar_url && typeof user.avatar_url === 'string') {
        console.log("Using avatar_url:", user.avatar_url);
        return user.avatar_url;
      }
      
      console.log("No valid avatar URL found for user:", user.id);
      return undefined;
    };

    // Xác định tên người được gán nhiệm vụ
    const assigneeName = validAssignee 
      ? (assignee?.username || assignee?.name || task.assigneeName || "Unassigned")
      : "Unassigned";
    
    // Ưu tiên sử dụng URL từ assigneeAvatarUrl đã fetch từ API
    let avatarUrl = assigneeAvatarUrl;
    
    // Kiểm tra xem có phải là assignee hợp lệ không
    if (!validAssignee) {
      avatarUrl = DEFAULT_AVATAR_URL;
    } 
    // Nếu không có avatar URL từ fetch, thử lấy từ assignee object
    else if (!avatarUrl && assignee) {
      avatarUrl = getAvatarUrl(assignee);
    }
    // Nếu vẫn không có và có assigneeId hợp lệ, sử dụng default avatar
    else if (!avatarUrl) {
      avatarUrl = DEFAULT_AVATAR_URL;
    }

    return (
      <div
        onClick={onClick}
        className="bg-white rounded-sm p-3 mb-2 shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-200"
      >
        <div className="text-sm font-medium mb-4">{task.title}</div>
        <div className="flex justify-between items-center text-xs text-gray-700">
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 border border-blue-600 bg-white rounded-sm flex items-center justify-center text-blue-600 text-[10px]">
              ✔
            </span>
            <span className="font-semibold">{task.shortKey || "T-000"}</span>
          </div>
          <div ref={avatarRef} className="relative">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors overflow-hidden"
              onClick={handleShowDropdown}
            >
              {!validAssignee ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-600 font-medium text-xs">
                  {getInitials("Unassigned")}
                </div>
              ) : (
                <AvatarDisplay 
                  avatarUrl={avatarUrl} 
                  displayName={assigneeName} 
                />
              )}
            </div>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-60 bg-white border rounded-lg shadow-lg z-10">
                {loadingUsers ? (
                  <div className="flex justify-center py-3">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="py-1 max-h-60 overflow-y-auto">
                    {/* Thêm tùy chọn "Unassign" */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b"
                      onClick={e => {
                        e.stopPropagation();
                        setShowDropdown(false);
                        handleAssignUser("", "Unassigned");
                      }}
                    >
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 font-medium text-xs">
                          ?
                        </div>
                      </div>
                      <span className="text-sm font-medium">Unassign</span>
                    </div>
                    
                    {userList.length > 0 ? (
                      userList.map(user => {
                        if (!user.id) return null; // Skip invalid users
                        
                        const displayName = user.username || user.name || "User";
                        
                        return (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            onClick={e => {
                              e.stopPropagation();
                              setShowDropdown(false);
                              handleAssignUser(user.id, displayName);
                            }}
                          >
                            <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden">
                              {user.id && avatarCache.current[user.id] && !avatarCache.current[user.id].includes(DEFAULT_AVATAR_URL) ? (
                                <img 
                                  src={avatarCache.current[user.id]} 
                                  alt={displayName}
                                  className="w-full h-full object-cover"
                                  onError={() => {
                                    // Nếu lỗi, hiển thị initials
                                    avatarCache.current[user.id] = DEFAULT_AVATAR_URL;
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-medium text-xs">
                                  {getInitials(displayName)}
                                </div>
                              )}
                            </div>
                            <span className="text-sm">{displayName}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">No users found</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderColumn = (title: string, status: Task["status"]) => {
    // Filter tasks: chỉ hiển thị parent tasks (không có parentTaskId) và có status tương ứng
    const tasksInColumn = (tasks || []).filter((t) => 
      t.status === status && (t.parentTaskId === null || t.parentTaskId === undefined)
    );
    const hasTasksInColumn = tasksInColumn.length > 0;
    
    return (
      <DroppableProjectColumn 
        status={status}
        className="flex-1 bg-gray-50 rounded p-4 min-h-[300px] border border-gray-200"
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-sm uppercase text-gray-700">{title}</h2>
          <div className="text-xs font-semibold bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
            {loading ? "..." : tasksInColumn.length}
          </div>
        </div>
  
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent"></div>
          </div>
        ) : hasTasksInColumn ? (
          tasksInColumn.map((task) => (
            <DraggableProjectTaskCard key={task.id} task={task}>
            <TaskCard
              task={task}
              onClick={() => setSelectedTask(task)}
            />
            </DraggableProjectTaskCard>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 mb-3 flex items-center justify-center bg-gray-100 rounded-full text-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect opacity="0.4" x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">No issues</p>
            <p className="text-gray-400 text-xs mt-1">Create issues or move them here</p>
          </div>
        )}
  
        <div className="mt-4 border rounded p-2 bg-white">
          <Input
            className="text-sm mb-2"
            placeholder={`Add task to ${title}`}
            value={newTasks[status]}
            onChange={(e) =>
              setNewTasks((prev) => ({ ...prev, [status]: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTasks[status].trim() && latestSprintId) {
                e.preventDefault();
                handleCreateTaskByStatus(status);
              }
            }}
          />
          <Button
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!newTasks[status].trim() || !latestSprintId}
            onClick={() => handleCreateTaskByStatus(status)}
          >
            + Add
          </Button>
        </div>
      </DroppableProjectColumn>
    );
  };

  // Debug localStorage khi component mount
  useEffect(() => {
    console.log("🔍 === DEBUGGING LOCALSTORAGE FOR USER ID ===");
    
    // Kiểm tra các keys có thể chứa userId
    const possibleUserKeys = ["userId", "currentUserId", "user_id", "ownerId", "userInfo", "currentUser"];
    
    possibleUserKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`🔍 localStorage[${key}]:`, value);
    });
    
    // Kiểm tra tất cả keys trong localStorage
    console.log("🔍 All localStorage keys:", Object.keys(localStorage));
    
    // Thử parse userInfo nếu có
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        console.log("🔍 Parsed userInfo:", parsed);
        if (parsed.id) {
          console.log("🔍 Found user ID in userInfo:", parsed.id);
        }
      } catch (e) {
        console.log("🔍 userInfo is not JSON:", userInfo);
      }
    }
    
    console.log("🔍 === END DEBUGGING LOCALSTORAGE ===");
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  

  return (
    <div className="flex h-screen bg-gray-50">
      <NavigationProgress />
      <Sidebar projectId={projectId || undefined} />
      <div className="flex-1 flex flex-col">
        <TopNavigation />
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {project?.name || "Project"} Board
              </h1>
              <p className="text-sm text-gray-500">
                {latestSprintId ? (
                  <>
                    Active sprint: {sprints.find(s => s.id === latestSprintId)?.name || `Sprint #${latestSprintId.substring(0, 4)}`}
                  </>
                ) : (
                  <span className="flex items-center text-amber-600">
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    No active sprint found
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <div ref={searchRef} className="relative">
                <form onSubmit={handleSearchSubmit} className="flex items-center border rounded-md bg-white overflow-hidden">
                  <Input
                    placeholder="Search boards..."
                    value={searchProject}
                    onChange={handleSearchProject}
                    className="border-0 focus-visible:ring-0"
                  />
                  <button type="submit" className="px-3 text-gray-500 hover:text-gray-700">
                    <FaSearch />
                  </button>
                </form>
                {showSearchResults && (
                  <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border rounded-md shadow-lg z-50">
                    {isSearching ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                          <span className="text-sm">Searching boards...</span>
                        </div>
                      </div>
                    ) : searchResults && searchResults.length > 0 ? (
                      searchResults.map(project => {
                        console.log("🔍 Rendering project:", project);
                        const projectType = project.projectType || "Team-managed";
                        const projectAccess = project.access || "Private";
                        
                        return (
                          <div 
                            key={project.id}
                            className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              console.log("🔍 Project clicked:", project);
                              handleSelectProject(project.id);
                            }}
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600 font-semibold mr-3">
                                {(project.name || "PR").substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">{project.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5 flex items-center">
                                  <span className="mr-2">{projectType.replace('-', ' ')}</span>
                                  <span className="flex items-center">
                                    <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    {projectAccess}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-gray-500 text-center">
                        <div className="flex justify-center mb-2">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.5 15.5L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 11C5 14.3137 7.68629 17 11 17C12.6597 17 14.1621 16.3261 15.2483 15.2483C16.3261 14.1621 17 12.6597 17 11C17 7.68629 14.3137 5 11 5C7.68629 5 5 7.68629 5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        No projects found matching &quot;<strong>{searchProject}</strong>&quot; where you are a member
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => window.location.href = `/project/backlog?projectId=${projectId}`}
              >
                View Backlog
              </Button>
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Complete Sprint
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6V12L16 14" stroke="#7A869A" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="9" stroke="#7A869A" strokeWidth="2" />
                  </svg>
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12H21M3 6H21M3 18H21" stroke="#7A869A" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3V21M3 12H21" stroke="#7A869A" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>

          {!projectId ? (
            <div className="flex items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-md">
              <div className="text-center max-w-md p-6">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-200 rounded-full text-gray-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4V4.01M12 8V20M4.93 10C4.97 7.57 6.18 6.63 8.83 6.5H15.17C17.8 6.5 19.03 7.57 19.07 10C19.11 12.43 17.89 13.5 15.17 13.5H8.83C6.17 13.5 4.96 14.43 4.93 16.86C4.9 19.29 6.11 20.36 8.83 20.36H15.17C17.84 20.36 19.1 19.29 19.07 16.86" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No project selected</h3>
                <p className="text-gray-500 mb-4">Please select a project from the search box or sidebar to view its board.</p>
                <Button 
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => window.location.href = '/project/all_projects'}
                >
                  Browse Projects
                </Button>
              </div>
            </div>
          ) : !project ? (
            <div className="flex items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-md">
              <div className="text-center max-w-md p-6">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-200 rounded-full text-gray-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3H3V10H10V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 3H14V10H21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 14H14V21H21V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 14H3V21H10V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Project not found</h3>
                <p className="text-gray-500 mb-4">The project with ID {projectId} could not be found or you don't have access to it.</p>
                <Button 
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => window.location.href = '/project/all_projects'}
                >
                  Browse Projects
                </Button>
              </div>
            </div>
          ) : (
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-wrap gap-4">
              {renderColumn("To Do", "TODO")}
              {renderColumn("In Progress", "IN_PROGRESS")}
              {renderColumn("Review", "REVIEW")}
              {renderColumn("Done", "DONE")}
              </div>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeTask && (
                  <div className="bg-white rounded-sm p-3 shadow-lg border border-gray-200 opacity-90">
                    <div className="text-sm font-medium mb-4">{activeTask.title}</div>
                    <div className="flex justify-between items-center text-xs text-gray-700">
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 border border-blue-600 bg-white rounded-sm flex items-center justify-center text-blue-600 text-[10px]">
                          ✔
                        </span>
                        <span className="font-semibold">{activeTask.shortKey || "T-000"}</span>
                      </div>
                    </div>
            </div>
                )}
              </DragOverlay>

              {/* API Loading indicator */}
              {apiLoading && (
                <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                    <span>Updating task...</span>
                  </div>
                </div>
              )}
            </DndContext>
          )}
        </div>
      </div>
      
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask as TaskData}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          sprints={sprints}
          onOpenSubtask={(subtask) => {
            // Close current modal and open subtask detail
            setSelectedTask(subtask as Task);
          }}
          onBackToParent={async (parentTaskId) => {
            // Fetch parent task and open its detail modal
            try {
              console.log("Navigating back to parent task:", parentTaskId);
              
              // Find parent task from existing tasks first
              const parentTask = tasks.find(task => task.id === parentTaskId);
              
              if (parentTask) {
                // If found in current tasks, just open it
                setSelectedTask(parentTask);
              } else {
                // If not found, fetch from API
                const response = await axios.get(`http://localhost:8085/api/tasks/${parentTaskId}`);
                if (response.data?.status === "SUCCESS") {
                  setSelectedTask(response.data.data as Task);
                } else {
                  console.error("Failed to fetch parent task");
                  toast.error("Could not load parent task");
                }
              }
            } catch (error) {
              console.error("Error navigating to parent task:", error);
              toast.error("Failed to navigate to parent task");
            }
          }}
        />
      )}

      {/* Loading indicator for task from URL */}
      {loadingTaskFromUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchParams?.get("from") === "notification" ? "Opening Notification" : "Opening Task"}
            </h3>
            <p className="text-gray-500 text-sm">
              {searchParams?.get("from") === "notification"
                ? "Loading task from notification..." 
                : "Loading task details..."
              }
            </p>
            {urlTaskId && (
              <p className="text-gray-400 text-xs mt-2">
                Task ID: {urlTaskId}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
