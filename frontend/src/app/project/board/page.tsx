"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Sidebar } from "@/components/ui/sidebar";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/drop-down";
import { ChevronDown, Search, MoreHorizontal, Check, Edit } from "lucide-react";
import { useNavigation } from "@/contexts/NavigationContext";

// Define types for the task
export interface TaskData {
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
  label?: string;
  priority?: "LOWEST" | "LOW" | "MEDIUM" | "HIGH" | "HIGHEST";
  // AI Estimation fields
  estimatedStoryPoints?: number;
  estimationConfidence?: number;
  isAiEstimated?: boolean;
  estimationCreatedAt?: string;
}

export default function BoardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProjectId, setCurrentProjectId } = useNavigation();
  
  // Get projectId from URL or context
  const urlProjectId = searchParams?.get("projectId");
  const projectId = urlProjectId || currentProjectId;
  
  // Update context if projectId from URL
  useEffect(() => {
    if (urlProjectId && urlProjectId !== currentProjectId) {
      setCurrentProjectId(urlProjectId);
    }
  }, [urlProjectId, currentProjectId, setCurrentProjectId]);

  // Redirect to project_homescreen as the main board
  useEffect(() => {
    if (projectId) {
      router.replace(`/project/project_homescreen?projectId=${projectId}`);
    }
  }, [projectId, router]);
  
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
  
  // Get filtered tasks based on search and status filter - chỉ hiển thị parent tasks
  const getFilteredTasks = () => {
    return tasks.filter(task => {
      // Chỉ hiển thị tasks có parentTaskId === null (không hiển thị subtasks)
      const isParentTask = task.parentTaskId === null;
      
      const matchesSearch = searchQuery === "" || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.shortKey && task.shortKey.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = selectedStatus === null || task.status === selectedStatus;
      
      return isParentTask && matchesSearch && matchesStatus;
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
  
  // Show loading while redirecting
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar projectId={projectId || undefined} />
      <div className="flex-1 flex flex-col">
        <TopNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting to project board...</p>
          </div>
        </div>
      </div>
    </div>
  );
} 