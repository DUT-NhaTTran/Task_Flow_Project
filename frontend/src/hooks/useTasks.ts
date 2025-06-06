import { useState } from 'react';
import axios from 'axios';
import { Task, TaskStatus } from '@/types/task';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const useTasks = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/tasks/${taskId}/status`,
        { status: newStatus },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.status === 200) {
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Error updating task status:', err);
      setError(err.response?.data?.message || 'Failed to update task status');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getTasks = async (projectId: string): Promise<Task[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tasks/project/${projectId}`);
      return response.data;
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.response?.data?.message || 'Failed to fetch tasks');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    updateTaskStatus,
    getTasks,
    loading,
    error,
  };
}; 