import { Avatar } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"

interface Tag {
    text: string
    color: string
}

interface TaskCardProps {
    id: string
    title: string
    tag: Tag
}

export function TaskCard({ id, title, tag }: TaskCardProps) {
    return (
        <div className="bg-white p-3 rounded shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="space-y-2">
                <div>
                    <span className={`text-xs px-2 py-1 rounded ${tag.color}`}>{tag.text}</span>
                </div>
                <h4 className="font-medium">{title}</h4>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Checkbox id={`task-${id}`} />
                        <span className="text-xs text-gray-500">{id}</span>
                    </div>
                    <Avatar className="h-6 w-6 bg-gray-200">
                        <span className="sr-only">Assignee</span>
                    </Avatar>
                </div>
            </div>
        </div>
    )
}
