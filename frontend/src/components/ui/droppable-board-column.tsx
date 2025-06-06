import React from "react";
import { useDroppable } from '@dnd-kit/core';
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DraggableTaskCard } from "@/components/ui/draggable-task-card";
import { Task, TaskStatus } from '@/types/task';

interface DroppableBoardColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  showCheckmark?: boolean;
  emptyState?: React.ReactNode;
}

export function DroppableBoardColumn({ 
  title, 
  status, 
  tasks, 
  showCheckmark = false, 
  emptyState 
}: DroppableBoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
    data: {
      status,
    },
  });

  return (
    <div className="flex-shrink-0 w-72 bg-gray-50 rounded-md">
      <div className="p-3 flex items-center justify-between border-b">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-sm">{title}</h3>
          <span className="text-sm text-gray-500">{tasks.length}</span>
          {showCheckmark && <Check className="h-4 w-4 text-green-500" />}
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className={`p-2 space-y-2 min-h-[200px] transition-colors ${
          isOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
        }`}
      >
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && !isOver && emptyState}
        {isOver && tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-blue-600 font-medium">
            Drop task here
          </div>
        )}
      </div>
    </div>
  );
} 