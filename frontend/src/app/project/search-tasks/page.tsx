"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigation } from "@/contexts/NavigationContext";
import TaskDetailModal, { TaskData, SprintOption } from "@/components/tasks/TaskDetailModal";
import { FaSearch, FaTimes } from "react-icons/fa";
import { Filter } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  type DragStartEvent, 
  type DragEndEvent 
} from '@dnd-kit/core';
import { DraggableProjectTaskCard } from "@/components/ui/draggable-project-task-card";
import { DroppableProjectColumn } from "@/components/ui/droppable-project-column";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useUserStorage } from "@/hooks/useUserStorage";
import { 
  getUserPermissions, 
  canManageProject, 
  canDeleteProject, 
  isProjectOwner,
  UserPermissions 
} from "@/utils/permissions";
import { useUser } from "@/contexts/UserContext";
import { NavigationProgress } from "@/components/ui/LoadingScreen";
import { isValidUUID } from "@/utils/uuidUtils";
import { TaskFilterPanel, FilterState, ProjectUser } from "@/components/filters/TaskFilterPanel";
import { useTaskFilters } from "@/hooks/useTaskFilters";

// Interface definitions (same as project homescreen)
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
  ownerName?: string;
  scrumMasterId?: string;
  deadline?: string;
  deletedAt?: string | null;
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
  createdBy?: string;
  priority?: "LOWEST" | "LOW" | "MEDIUM" | "HIGH" | "HIGHEST" | "BLOCKER" | "BLOCK";
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

export default function SearchTasksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProjectId, setCurrentProjectId } = useNavigation();
  const { userData } = useUserStorage();
  const { currentUser, isLoading: userContextLoading, users: cachedUsers, getUserById, fetchUserById } = useUser();
  
  const urlProjectId = searchParams?.get("projectId");
  const projectId = urlProjectId || currentProjectId;
  
  // Update context if projectId from URL
  useEffect(() => {
    if (urlProjectId && urlProjectId !== currentProjectId) {
      setCurrentProjectId(urlProjectId);
    }
  }, [urlProjectId, currentProjectId, setCurrentProjectId]);
  
  const [project, setProject] = useState<Project | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  
  // Use shared filter hook
  const {
    filters,
    filteredTasks,
    handleFilterChange,
    toggleArrayFilter,
    clearAllFilters,
    availableLabels,
    totalTasks,
    filteredTasksCount
  } = useTaskFilters(allTasks);
  
  // Drag and drop state
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { updateTaskStatus, loading: apiLoading } = useProjectTasks();

  // Add avatar cache
  const avatarCache = useRef<Record<string, string>>({});

  const canEditTask = (task: Task) => {
    if (!currentUser?.id) return false;
    if (task.createdBy === currentUser.id) return true;
    if (task.assigneeId === currentUser.id) return true;
    if (userPermissions?.canManageAnyTask || userPermissions?.isOwner) return true;
    return false;
  };

  // Fetch project data
  const fetchProject = async (projectId: string) => {
    try {
      const userId = userData?.account?.id || userData?.profile?.id;
      if (!userId) {
        toast.error("User authentication required");
        setLoading(false);
        return;
      }

      const response = await axios.get(`http://localhost:8083/api/projects/${projectId}`, {
        headers: { "X-User-Id": userId }
      });

      if (response.data?.status === "SUCCESS") {
        setProject(response.data.data);
      } else {
        toast.error("Failed to load project");
      }
    } catch (error: any) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project");
    }
  };

  // Fetch all tasks for the project
  const fetchAllTasks = async (projectId: string) => {
    try {
      const userId = userData?.account?.id || userData?.profile?.id;
      if (!userId) return;

      const response = await axios.get(
        `http://localhost:8085/api/tasks/project/${projectId}`,
        {
          headers: { "X-User-Id": userId }
        }
      );

      // The endpoint returns data directly, not wrapped in ResponseDataAPI
      const tasks = Array.isArray(response.data) ? response.data.filter(task => task && task.id) : [];
      setAllTasks(tasks);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    }
  };

  // Fetch project users
  const fetchProjectUsers = async (projectId: string) => {
    try {
      const userId = userData?.account?.id || userData?.profile?.id;
      if (!userId) return;

      const response = await axios.get(`http://localhost:8083/api/projects/${projectId}/users`, {
        headers: { "X-User-Id": userId }
      });

      if (response.data?.status === "SUCCESS") {
        const users = response.data.data || [];
        setProjectUsers(users);
        
        // Prefetch avatars for all users
        users.forEach(async (user: ProjectUser) => {
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
    } catch (error) {
      console.error("Error fetching project users:", error);
    }
  };

  // Fetch user permissions
  const fetchUserPermissions = async (userId: string, projectId: string) => {
    try {
      setPermissionsLoading(true);
      const permissions = await getUserPermissions(userId, projectId);
      setUserPermissions(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Task update handler
  const handleUpdateTask = async (updatedTask: TaskData) => {
    try {
      // Update in allTasks
      setAllTasks(prev => prev.map(task => 
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      ));
      
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      const userId = userData?.account?.id || userData?.profile?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await Promise.all([
          fetchProject(projectId),
          fetchAllTasks(projectId),
          fetchProjectUsers(projectId),
          fetchUserPermissions(userId, projectId)
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, userData]);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const task = filteredTasks.find(t => t.id === taskId);
    
    if (task && canEditTask(task)) {
      setActiveTask(task);
    } else {
      // Cannot prevent drag start in @dnd-kit, but we'll handle it in handleDragEnd
      setActiveTask(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !active) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task["status"];
    const task = filteredTasks.find(t => t.id === taskId);

    if (!task || task.status === newStatus) return;

    if (!canEditTask(task)) {
      toast.error("You don't have permission to move this task");
      return;
    }

    try {
      const oldStatus = task.status;
      await updateTaskStatus(task, newStatus, oldStatus);
      
      // Update local state
      setAllTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      
      toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to move task");
    }
  };

  // Avatar and user utilities (simplified from original)
  const DEFAULT_AVATAR_URL = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

  const getInitials = (name: string): string => {
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

  // Task Card Component (simplified from original)
  function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
    const assignee = projectUsers.find(user => user.id === task.assigneeId);
    const assigneeName = assignee?.name || assignee?.username || task.assigneeName || "Unassigned";

    const getPriorityColor = (priority?: string) => {
      switch (priority) {
        case "BLOCKER":
        case "BLOCK":
          return "border-l-red-600 bg-red-50";
        case "HIGHEST":
          return "border-l-red-500 bg-red-50";
        case "HIGH":
          return "border-l-orange-500 bg-orange-50";
        case "MEDIUM":
          return "border-l-yellow-500 bg-yellow-50";
        case "LOW":
          return "border-l-green-500 bg-green-50";
        case "LOWEST":
          return "border-l-gray-400 bg-gray-50";
        default:
          return "border-l-gray-300 bg-white";
      }
    };

    return (
      <div
        className={`bg-white rounded-sm p-3 mb-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer border-l-4 ${getPriorityColor(task.priority)}`}
        onClick={onClick}
      >
        <div className="text-sm font-medium mb-2 text-gray-900">{task.title}</div>
        
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.map((tag, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center text-xs text-gray-700">
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 border border-blue-600 bg-white rounded-sm flex items-center justify-center text-blue-600 text-[10px]">
              ✔
            </span>
            <span className="font-semibold">{task.shortKey || "T-000"}</span>
            {task.priority && (
              <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                task.priority === "BLOCKER" || task.priority === "BLOCK" ? "bg-red-100 text-red-700" :
                task.priority === "HIGHEST" ? "bg-red-100 text-red-700" :
                task.priority === "HIGH" ? "bg-orange-100 text-orange-700" :
                task.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                task.priority === "LOW" ? "bg-green-100 text-green-700" :
                "bg-gray-100 text-gray-700"
              }`}>
                {task.priority}
              </span>
            )}
          </div>
          
          {task.assigneeId && (
            <AvatarDisplay 
              avatarUrl={assignee?.avatar || assignee?.avatarUrl}
              displayName={assigneeName}
              size="small"
            />
          )}
        </div>

        {task.dueDate && (
          <div className="text-xs text-gray-500 mt-1">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  }

  // Render column (same structure as original)
  const renderColumn = (title: string, status: Task["status"]) => {
    const columnTasks = filteredTasks.filter(task => task && task.status === status);
    
    const getColumnStyle = (status: string) => {
      switch (status) {
        case "TODO": return "border-gray-300";
        case "IN_PROGRESS": return "border-blue-300";
        case "REVIEW": return "border-yellow-300";
        case "DONE": return "border-green-300";
        default: return "border-gray-300";
      }
    };

    return (
      <DroppableProjectColumn key={status} status={status}>
        <div className={`bg-gray-50 rounded-lg p-4 min-h-[400px] w-72 border-t-4 ${getColumnStyle(status)}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 uppercase text-xs tracking-wider">
              {title} ({columnTasks.length})
            </h3>
          </div>
          
          <div className="space-y-2">
            {columnTasks.filter(task => task && task.id).map(task => (
              <DraggableProjectTaskCard
                key={task.id}
                task={task}
                disabled={!canEditTask(task)}
              >
                <TaskCard 
                  task={task} 
                  onClick={() => setSelectedTask(task)}
                />
              </DraggableProjectTaskCard>
            ))}
          </div>
        </div>
      </DroppableProjectColumn>
    );
  };

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

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar projectId={projectId ?? undefined} />
        <div className="flex-1 flex flex-col">
          <TopNavigation />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar projectId={projectId ?? undefined} />
      <div className="flex-1 flex flex-col">
        <TopNavigation />
        
        <div className="flex-1 overflow-y-auto">
          {/* Filter Panel */}
          <TaskFilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onToggleArrayFilter={toggleArrayFilter}
            onClearAllFilters={clearAllFilters}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            projectUsers={projectUsers}
            availableLabels={availableLabels}
            totalTasks={totalTasks}
            filteredTasks={filteredTasksCount}
            AvatarComponent={AvatarDisplay}
            headerContent={
              <>
                <h1 className="text-xl font-semibold text-gray-900">
                  Search & Filter Tasks
                </h1>
                {project && (
                  <p className="text-sm text-gray-600 mt-1">
                    Project: {project.name}
                  </p>
                )}
                <div className="flex gap-3 items-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/project/project_homescreen?projectId=${projectId || ''}`)}
                  >
                    Back to Board
                  </Button>
                </div>
              </>
            }
          />

          {/* Tasks Board */}
          <div className="p-6">
            {!projectId ? (
              <div className="flex items-center justify-center min-h-[60vh] bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Select a Project</h3>
                  <p className="text-gray-600">Please select a project to search and filter tasks.</p>
                </div>
              </div>
            ) : !project ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="text-gray-600">Loading project...</span>
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
      </div>
      
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask as TaskData}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          sprints={sprints}
          onOpenSubtask={(subtask) => {
            setSelectedTask(subtask as Task);
          }}
          onBackToParent={async (parentTaskId) => {
            try {
              const parentTask = allTasks.find(task => task.id === parentTaskId);
              
              if (parentTask) {
                setSelectedTask(parentTask);
              } else {
                const response = await axios.get(`http://localhost:8085/api/tasks/${parentTaskId}`);
                if (response.data?.status === "SUCCESS") {
                  setSelectedTask(response.data.data as Task);
                } else {
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
    </div>
  );
} 