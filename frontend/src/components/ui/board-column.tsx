import type React from "react"
import { Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TaskCard } from "@/components/ui/task-card"

interface Tag {
    text: string
    color: string
}

interface Task {
    id: string
    title: string
    tag: Tag
}

interface BoardColumnProps {
    title: string
    count: number
    tasks: Task[]
    showCheckmark?: boolean
    emptyState?: React.ReactNode
}

export function BoardColumn({ title, count, tasks, showCheckmark = false, emptyState }: BoardColumnProps) {
    return (
        <div className="flex-shrink-0 w-72 bg-gray-50 rounded-md">
            <div className="p-3 flex items-center justify-between border-b">
                <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-sm">{title}</h3>
                    <span className="text-sm text-gray-500">{count}</span>
                    {showCheckmark && <Check className="h-4 w-4 text-green-500" />}
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="p-2 space-y-2">
                {tasks.map((task) => (
                    <TaskCard key={task.id} id={task.id} title={task.title} tag={task.tag} />
                ))}
                {tasks.length === 0 && emptyState}
            </div>
        </div>
    )
}
