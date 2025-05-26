"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Sidebar } from "@/components/ui/sidebar";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/drop-down";
import { ChevronDown, Search, MoreHorizontal, Check, Edit } from "lucide-react";

// Define task interface
interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  storyPoint?: number;
  assigneeId?: string | null;
  assigneeName?: string;
  shortKey?: string;
  projectId?: string;
  sprintId?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  parentTaskId?: string | null;
  tags?: string[] | null;
  team?: string;
  labels?: string[];
  label?: string;
}

export default function BoardPage() {
  const searchParams = useSearchParams();
  const projectId =   searchParams?.get("projectId") || null;
  
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  // Status options for filtering
  const statusOptions = ["All", "TODO", "IN_PROGRESS", "REVIEW", "DONE"];
  
  // Fetch tasks
  useEffect(() => {
    if (!projectId) {
      toast.error("No project ID provided");
      return;
    }
    
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`http://localhost:8085/api/tasks/project/${projectId}`);
        if (response.data) {
          setTasks(response.data);
        } else {
          toast.error("Failed to load tasks");
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast.error("Error loading tasks");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTasks();
  }, [projectId]);
  
  // Handle status change
  const handleStatusChange = async (taskId: string, newStatus: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE") => {
    try {
      // Find the task to update
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) {
        toast.error("Task not found");
        return;
      }
      
      // Update the task status
      const updatedTask = { ...taskToUpdate, status: newStatus };
      
      const response = await axios.put(`http://localhost:8085/api/tasks/${taskId}`, updatedTask);
      
      if (response.data) {
        // Update local state
        const updatedTasks = tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        );
        setTasks(updatedTasks);
        toast.success("Task status updated");
      } else {
        toast.error("Failed to update task status");
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    }
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    if (value === "All") {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(value);
    }
  };
  
  // Get filtered tasks based on search and status filter
  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const matchesSearch = searchQuery === "" || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.shortKey && task.shortKey.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = selectedStatus === null || task.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  };
  
  // Get status color class
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "TODO":
        return "bg-gray-200 text-gray-800";
      case "IN_PROGRESS":
        return "bg-blue-200 text-blue-800";
      case "REVIEW":
        return "bg-purple-200 text-purple-800";
      case "DONE":
        return "bg-green-200 text-green-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };
  
  // Format task ID for display
  const formatTaskId = (taskId: string, shortKey?: string) => {
    if (shortKey) return shortKey;
    return taskId.substring(0, 8);
  };
  
  // Get status options for task status dropdown
  const getTaskStatusOptions = () => {
    return ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
  };
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar projectId={projectId || undefined} />
      <div className="flex-1 flex flex-col">
        <TopNavigation />
        <div className="flex-1 overflow-y-auto">
          {/* Search and Filters Header */}
          <div className="py-3 px-4 flex items-center border-b">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10 h-9" 
                placeholder="Search tasks" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center ml-4 space-x-3">
              <div className="w-40">
                <Dropdown 
                  placeholder="Status"
                  options={statusOptions}
                  defaultValue="All"
                  onSelect={handleStatusFilterChange}
                />
              </div>
            </div>
          </div>
          
          {/* Task List */}
          <div className="px-4 py-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {getFilteredTasks().length > 0 ? (
                  getFilteredTasks().map(task => (
                    <div key={task.id} className="border rounded-sm bg-white shadow-sm">
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
                        />
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center">
                            <a href={`/project/task?taskId=${task.id}`} className="text-blue-600 font-medium text-sm mr-2">
                              {formatTaskId(task.id, task.shortKey)}
                            </a>
                            <span className="text-sm font-medium">{task.title}</span>
                            {task.label && (
                              <div className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                                {task.label}
                              </div>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-32">
                            <Dropdown 
                              options={getTaskStatusOptions()}
                              defaultValue={task.status}
                              onSelect={(value) => handleStatusChange(task.id, value as "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE")}
                            />
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
                  <div className="p-10 border border-dashed rounded-md text-center">
                    <p className="text-gray-500">No tasks found. Create new tasks to get started.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => window.location.href = `/project/backlog?projectId=${projectId}`}
                    >
                      Go to Backlog
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 