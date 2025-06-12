"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useUserStorage } from "@/hooks/useUserStorage";

interface Task {
  id: string;
  title: string;
  status: string;
  storyPoint?: number;
  assigneeId?: string;
}

interface Sprint {
  id: string;
  name: string;
  status: string;
}

// ✅ NEW: Task migration choice for individual tasks
interface TaskMigrationChoice {
  taskId: string;
  destination: "backlog" | "sprint" | "keep";
  targetSprintId?: string;
}

interface TaskMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintId: string;
  sprintName: string;
  projectId: string;
  onComplete: () => void;
  action: "cancel" | "delete";
}

export function TaskMigrationModal({
  isOpen,
  onClose,
  sprintId,
  sprintName,
  projectId,
  onComplete,
  action
}: TaskMigrationModalProps) {
  const { userData } = useUserStorage();
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([]);
  const [availableSprints, setAvailableSprints] = useState<Sprint[]>([]);
  // ✅ NEW: Individual task migration choices
  const [taskChoices, setTaskChoices] = useState<Record<string, TaskMigrationChoice>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, sprintId]);

  // ✅ Helper functions for managing individual task choices
  const updateTaskChoice = (taskId: string, destination: "backlog" | "sprint" | "keep", targetSprintId?: string) => {
    setTaskChoices(prev => ({
      ...prev,
      [taskId]: {
        taskId,
        destination,
        targetSprintId: destination === "sprint" ? targetSprintId : undefined
      }
    }));
  };

  const getTaskChoice = (taskId: string): TaskMigrationChoice => {
    return taskChoices[taskId] || { taskId, destination: "backlog" };
  };

  const fetchData = async () => {
    try {
      setFetching(true);
      
      const userId = userData?.account?.id || userData?.profile?.id;
      
      const tasksResponse = await axios.get(
        `http://localhost:8084/api/sprints/${sprintId}/incomplete-tasks`,
        {
          headers: {
            "X-User-Id": userId
          }
        }
      );
      
      const sprintsResponse = await axios.get(
        `http://localhost:8084/api/sprints/project/${projectId}`,
        {
          headers: {
            "X-User-Id": userId
          }
        }
      );

      if (tasksResponse.data && (tasksResponse.data.status === "SUCCESS" || Array.isArray(tasksResponse.data))) {
        const tasks = tasksResponse.data.status === "SUCCESS" ? tasksResponse.data.data : tasksResponse.data;
        setIncompleteTasks(tasks || []);
        
        // ✅ Initialize default choices for each task (default to backlog)
        const initialChoices: Record<string, TaskMigrationChoice> = {};
        (tasks || []).forEach((task: Task) => {
          initialChoices[task.id] = {
            taskId: task.id,
            destination: "backlog",
            targetSprintId: undefined
          };
        });
        setTaskChoices(initialChoices);
      }
      
      if (sprintsResponse.data && (sprintsResponse.data.data || Array.isArray(sprintsResponse.data))) {
        const sprints = sprintsResponse.data.data || sprintsResponse.data;
        // ✅ Filter available sprints for task migration: exclude current sprint and closed sprints
        const availableForMigration = (sprints || []).filter((s: Sprint) => 
          s.id !== sprintId && // Not the current sprint being deleted/cancelled
          (s.status === "NOT_STARTED" || s.status === "ACTIVE") // Only NOT_STARTED or ACTIVE sprints can receive tasks
        );
        setAvailableSprints(availableForMigration);
        console.log('📋 Available sprints for migration:', availableForMigration.length, availableForMigration);
      }
      
    } catch (error) {
      console.error("Error fetching migration data:", error);
      toast.error("Failed to load migration options");
    } finally {
      setFetching(false);
    }
  };

  const handleMigration = async () => {
    try {
      setLoading(true);
      
      const userId = userData?.account?.id || userData?.profile?.id;
    
      // Check if userId is valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isValidUUID = uuidRegex.test(userId || '');
      console.log('Is userId valid UUID?', isValidUUID);
      
      if (!userId) {
        toast.error("User ID not found. Please log in again.");
        console.error("❌ No user ID found in userData:", userData);
        return;
      }
      
      if (!isValidUUID) {
        toast.error("Invalid user ID format. Please log in again.");
        console.error("❌ User ID is not valid UUID format:", userId);
        return;
      }
      
      // ✅ NEW: Process individual task migrations
      const tasksByDestination = {
        backlog: [] as string[],
        sprints: {} as Record<string, string[]>, // sprintId -> taskIds[]
        keep: [] as string[]
      };
      
      // Group tasks by their chosen destinations
      Object.values(taskChoices).forEach(choice => {
        if (choice.destination === "backlog") {
          tasksByDestination.backlog.push(choice.taskId);
        } else if (choice.destination === "sprint" && choice.targetSprintId) {
          if (!tasksByDestination.sprints[choice.targetSprintId]) {
            tasksByDestination.sprints[choice.targetSprintId] = [];
          }
          tasksByDestination.sprints[choice.targetSprintId].push(choice.taskId);
        } else if (choice.destination === "keep") {
          tasksByDestination.keep.push(choice.taskId);
        }
      });
      
      console.log('📋 Task migration plan:', tasksByDestination);
      
      // Step 1: Move tasks to backlog
      if (tasksByDestination.backlog.length > 0) {
        try {
          console.log('📤 Moving specific tasks to backlog:', tasksByDestination.backlog);
          await axios.put(
            `http://localhost:8084/api/sprints/move-specific-tasks-to-backlog`,
            { taskIds: tasksByDestination.backlog },
            {
              headers: {
                "X-User-Id": userId,
                "Content-Type": "application/json"
              }
            }
          );
          console.log('✅ Specific tasks moved to backlog successfully');
          toast.success(`${tasksByDestination.backlog.length} tasks moved to backlog`);
        } catch (migrationError: any) {
          console.error("❌ Backlog migration error:", migrationError);
          toast.warning("Some tasks may not have been moved to backlog");
        }
      }
      
      // Step 2: Move tasks to other sprints
      for (const [targetSprintId, taskIds] of Object.entries(tasksByDestination.sprints)) {
        if (taskIds.length > 0) {
          try {
            console.log(`📤 Moving specific tasks to sprint ${targetSprintId}:`, taskIds);
            await axios.put(
              `http://localhost:8084/api/sprints/move-specific-tasks-to-sprint/${targetSprintId}`,
              { taskIds },
              {
                headers: {
                  "X-User-Id": userId,
                  "Content-Type": "application/json"
                }
              }
            );
            const targetSprint = availableSprints.find(s => s.id === targetSprintId);
            console.log(`✅ Specific tasks moved to sprint ${targetSprint?.name} successfully`);
            toast.success(`${taskIds.length} tasks moved to ${targetSprint?.name}`);
          } catch (migrationError: any) {
            console.error(`❌ Sprint migration error for ${targetSprintId}:`, migrationError);
            toast.warning(`Some tasks may not have been moved to target sprint`);
          }
        }
      }
      
      // Step 3: Tasks marked as "keep" remain in the sprint (no action needed)
      if (tasksByDestination.keep.length > 0) {
        console.log('📌 Tasks kept in sprint:', tasksByDestination.keep);
        toast.info(`${tasksByDestination.keep.length} tasks will remain in the ${action === "cancel" ? "cancelled" : "deleted"} sprint`);
      }
      
      // Step 4: Handle sprint action (this is where 403 happens)
      if (action === "cancel") {
        try {
          console.log('📤 FRONTEND REQUEST - Cancelling sprint...');
          console.log('Request URL:', `http://localhost:8084/api/sprints/${sprintId}/cancel`);
          console.log('Request Headers:', {
            "X-User-Id": userId,
            "Content-Type": "application/json"
          });
          
          const cancelResponse = await axios.put(
            `http://localhost:8084/api/sprints/${sprintId}/cancel`,
            {},
            {
              headers: {
                "X-User-Id": userId,
                "Content-Type": "application/json"
              }
            }
          );
          console.log('✅ Sprint cancelled successfully:', cancelResponse.data);
          toast.success("Sprint cancelled successfully");
        } catch (sprintError: any) {
          console.error("❌ FRONTEND ERROR vs POSTMAN SUCCESS:");
          console.error("Full error:", sprintError);
          console.error("Status:", sprintError?.response?.status);
          console.error("Response data:", sprintError?.response?.data);
          console.error("Request config:", sprintError?.config);
          
          if (sprintError?.response?.status === 403) {
            // Show the exact backend error message
            const backendMessage = sprintError?.response?.data?.message || sprintError?.response?.data?.error;
            toast.error(`Access denied: ${backendMessage || 'Permission check failed'}`);
            
            // Additional debug info
            console.log('🔍 PERMISSION DEBUG:');
            console.log('- Check if this userId has PROJECT_OWNER role in this project');
            console.log('- Sprint status should be NOT_STARTED for delete');
            console.log('- Compare this userId with Postman success userId');
          } else {
            toast.error(`Failed to cancel sprint: ${sprintError?.response?.data?.message || sprintError?.message || 'Unknown error'}`);
          }
          throw sprintError;
        }
      } else if (action === "delete") {
        try {
          console.log('📤 FRONTEND REQUEST - Deleting sprint...');
          console.log('Request URL:', `http://localhost:8084/api/sprints/${sprintId}/soft-delete`);
          console.log('Request Headers:', {
            "X-User-Id": userId,
            "Content-Type": "application/json"
          });
          console.log('Sprint ID:', sprintId);
          console.log('Project ID:', projectId);
          
          const deleteResponse = await axios.put(
            `http://localhost:8084/api/sprints/${sprintId}/soft-delete`,
            {},
            {
              headers: {
                "X-User-Id": userId,
                "Content-Type": "application/json"
              }
            }
          );
          console.log('✅ Sprint deleted successfully:', deleteResponse.data);
          toast.success("Sprint deleted successfully");
        } catch (sprintError: any) {
          console.error("❌ FRONTEND ERROR vs POSTMAN SUCCESS:");
          console.error("Full error object:", sprintError);
          console.error("Response status:", sprintError?.response?.status);
          console.error("Response data:", sprintError?.response?.data);
          console.error("Request headers sent:", sprintError?.config?.headers);
          console.error("Request URL:", sprintError?.config?.url);
          
          if (sprintError?.response?.status === 403) {
            // Show the exact backend error message
            const backendMessage = sprintError?.response?.data?.message || sprintError?.response?.data?.error;
            toast.error(`Access denied: ${backendMessage || 'Permission check failed'}`);
            
            // Detailed permission analysis
            console.log('🔍 PERMISSION ANALYSIS:');
            console.log('- Current userId (frontend):', userId);
            console.log('- Sprint projectId:', projectId);
            console.log('- Check Projects Service for user permissions');
            console.log('- Verify user has isOwner=true for this project');
          } else {
            toast.error(`Failed to delete sprint: ${sprintError?.response?.data?.message || sprintError?.message || 'Unknown error'}`);
          }
          throw sprintError;
        }
      }
      
      onComplete();
      onClose();
      
    } catch (error: any) {
      console.error("❌ Overall migration error:", error);
      if (!error?.response || error?.response?.status !== 403) {
        toast.error(`Failed to ${action} sprint and migrate tasks`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {action === "cancel" ? "Cancel" : "Delete"} Sprint: {sprintName}
            </h3>
            
            {fetching ? (
              <div className="text-center py-4">
                <div className="text-sm text-gray-500">Loading tasks...</div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  This sprint has {incompleteTasks.length} incomplete task(s). Choose where to move each task:
                </p>
                
                {incompleteTasks.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {incompleteTasks.map((task) => {
                      const choice = getTaskChoice(task.id);
                      return (
                        <div key={task.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="font-medium text-sm text-gray-900 mb-2">
                            {task.title} ({task.status})
                            {task.storyPoint && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {task.storyPoint} pts
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            {/* Move to Backlog */}
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name={`task-${task.id}`}
                                value="backlog"
                                checked={choice.destination === "backlog"}
                                onChange={() => updateTaskChoice(task.id, "backlog")}
                                className="mr-2"
                              />
                              <span className="text-sm">Move to Backlog</span>
                            </label>
                            
                            {/* Move to Another Sprint */}
                            <label className="flex items-start">
                              <input
                                type="radio"
                                name={`task-${task.id}`}
                                value="sprint"
                                checked={choice.destination === "sprint"}
                                onChange={() => updateTaskChoice(task.id, "sprint")}
                                className="mr-2 mt-1"
                                disabled={availableSprints.length === 0}
                              />
                              <div className="flex-1">
                                <span className="text-sm">Move to Sprint:</span>
                                {choice.destination === "sprint" && (
                                  <select
                                    value={choice.targetSprintId || ""}
                                    onChange={(e) => updateTaskChoice(task.id, "sprint", e.target.value)}
                                    className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                                    disabled={availableSprints.length === 0}
                                  >
                                    <option value="">Choose sprint...</option>
                                    {availableSprints.map((sprint) => (
                                      <option key={sprint.id} value={sprint.id}>
                                        {sprint.name} ({sprint.status})
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {availableSprints.length === 0 && (
                                  <span className="ml-2 text-xs text-gray-500">No available sprints</span>
                                )}
                              </div>
                            </label>
                            
                            {/* Keep in Sprint */}
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name={`task-${task.id}`}
                                value="keep"
                                checked={choice.destination === "keep"}
                                onChange={() => updateTaskChoice(task.id, "keep")}
                                className="mr-2"
                              />
                              <span className="text-sm">Keep in {action === "cancel" ? "cancelled" : "deleted"} sprint</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {incompleteTasks.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Affected Tasks:</div>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-gray-50">
                      {incompleteTasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="text-sm text-gray-600 py-1">
                          • {task.title} ({task.status})
                        </div>
                      ))}
                      {incompleteTasks.length > 5 && (
                        <div className="text-sm text-gray-500 italic">
                          ...and {incompleteTasks.length - 5} more tasks
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleMigration}
              disabled={
                loading || 
                fetching || 
                // Check if any task choosing "sprint" destination doesn't have a target sprint selected
                Object.values(taskChoices).some(choice => 
                  choice.destination === "sprint" && !choice.targetSprintId
                )
              }
              className={`px-4 py-2 rounded-md text-white ${
                action === "cancel" 
                  ? "bg-yellow-600 hover:bg-yellow-700" 
                  : "bg-red-600 hover:bg-red-700"
              } disabled:bg-gray-400 disabled:cursor-not-allowed`}
            >
              {loading ? "Processing..." : `${action === "cancel" ? "Cancel" : "Delete"} Sprint`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 