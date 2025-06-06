import React, { cloneElement, isValidElement } from 'react';
import { useDraggable } from '@dnd-kit/core';

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
}

interface DraggableProjectTaskCardProps {
  task: Task;
  children: React.ReactNode;
}

export function DraggableProjectTaskCard({ task, children }: DraggableProjectTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: {
      task,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${
        isDragging ? 'opacity-50 rotate-1 scale-105 z-50' : ''
      }`}
    >
      {/* Drag handle - only visible on hover */}
      <div
        {...listeners}
        {...attributes}
        className="absolute -top-1 -left-1 w-5 h-5 cursor-grab active:cursor-grabbing z-20 flex items-center justify-center bg-gray-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-600"
        style={{ fontSize: '8px' }}
        title="Drag to move"
      >
        ⋮⋮
      </div>
      
      {/* Task content - fully clickable */}
      {children}
    </div>
  );
} 