import { useState, useEffect } from 'react';
import { FilterState } from '@/components/filters/TaskFilterPanel';

// Task interface (minimal for filtering)
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

export const useTaskFilters = (allTasks: Task[]) => {
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchText: "",
    status: [],
    assignee: [],
    priority: [],
    labels: [],
    createdDateFrom: "",
    createdDateTo: "",
    updatedDateFrom: "",
    updatedDateTo: ""
  });

  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  // Apply filters to tasks
  const applyFilters = () => {
    let filtered = [...allTasks].filter(task => task && task.id);

    // Search text filter
    if (filters.searchText.trim()) {
      const searchText = filters.searchText.toLowerCase();
      filtered = filtered.filter(task => 
        task.title?.toLowerCase().includes(searchText) ||
        task.description?.toLowerCase().includes(searchText) ||
        task.shortKey?.toLowerCase().includes(searchText)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status.includes(task.status));
    }

    // Assignee filter
    if (filters.assignee.length > 0) {
      filtered = filtered.filter(task => 
        task.assigneeId && filters.assignee.includes(task.assigneeId)
      );
    }

    // Priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(task => 
        task.priority && filters.priority.includes(task.priority)
      );
    }

    // Labels filter
    if (filters.labels.length > 0) {
      filtered = filtered.filter(task => 
        task.tags && task.tags.some(tag => filters.labels.includes(tag))
      );
    }

    // Created date filter
    if (filters.createdDateFrom) {
      const fromDate = new Date(filters.createdDateFrom);
      filtered = filtered.filter(task => 
        task.createdAt && new Date(task.createdAt) >= fromDate
      );
    }
    if (filters.createdDateTo) {
      const toDate = new Date(filters.createdDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(task => 
        task.createdAt && new Date(task.createdAt) <= toDate
      );
    }

    // Updated date filter (using completedAt as proxy for updated date)
    if (filters.updatedDateFrom) {
      const fromDate = new Date(filters.updatedDateFrom);
      filtered = filtered.filter(task => 
        task.completedAt && new Date(task.completedAt) >= fromDate
      );
    }
    if (filters.updatedDateTo) {
      const toDate = new Date(filters.updatedDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(task => 
        task.completedAt && new Date(task.completedAt) <= toDate
      );
    }

    setFilteredTasks(filtered);
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
      createdDateTo: "",
      updatedDateFrom: "",
      updatedDateTo: ""
    });
  };

  // Get unique labels from all tasks
  const getAvailableLabels = () => {
    return Array.from(
      new Set(allTasks.filter(task => task && task.tags).flatMap(task => task.tags || []))
    ).filter(Boolean);
  };

  // Apply filters whenever filter state or tasks change
  useEffect(() => {
    applyFilters();
  }, [filters, allTasks]);

  return {
    filters,
    filteredTasks,
    handleFilterChange,
    toggleArrayFilter,
    clearAllFilters,
    availableLabels: getAvailableLabels(),
    totalTasks: allTasks.length,
    filteredTasksCount: filteredTasks.length
  };
}; 