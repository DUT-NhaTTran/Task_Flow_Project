import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from '@/types/task';

interface DraggableTaskCardProps {
  task: Task;
}

export function DraggableTaskCard({ task }: DraggableTaskCardProps) {
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
      {...listeners}
      {...attributes}
      className={`bg-white p-3 rounded shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 rotate-3 scale-105 z-50' : ''
      }`}
    >
      <div className="space-y-2">
        <div>
          <span className={`text-xs px-2 py-1 rounded ${task.tag.color}`}>
            {task.tag.text}
          </span>
        </div>
        <h4 className="font-medium">{task.title}</h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox id={`task-${task.id}`} />
            <span className="text-xs text-gray-500">{task.id}</span>
          </div>
          <Avatar className="h-6 w-6 bg-gray-200">
            <span className="sr-only">Assignee</span>
          </Avatar>
        </div>
      </div>
    </div>
  );
} 