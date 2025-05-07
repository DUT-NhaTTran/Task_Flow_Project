"use client"
import Link from "next/link"
import {
    Search,
    Filter,
    ChevronDown,
    BarChart2,
    Settings,
    Plus,
    Zap,
    Star,
    Share2,
    Maximize2,
    MoreHorizontal,
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BoardColumn } from "@/components/ui/board-column"

export function BugTrackingBoard() {
    return (
        <div className="p-6">
            <div className="flex items-center mb-6">
                <div className="flex items-center space-x-2">
                        <Link href="/project/project_homescreen" className="text-gray-500 hover:text-gray-700 text-sm">
                            Projects
                        </Link>
                    <span className="text-gray-500">/</span>
                    <Link href="#" className="text-gray-500 hover:text-gray-700 text-sm">
                        Bug Tracking System
                    </Link>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">BTS board</h1>
                <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon">
                        <Zap className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <Star className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <Share2 className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <Maximize2 className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                    </Button>
                    <Button variant="outline">Start stand-up</Button>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input type="text" placeholder="Search board" className="pl-10 w-64" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8 bg-gray-200">
                            <span className="sr-only">User</span>
                        </Avatar>
                        <Avatar className="h-8 w-8 bg-[#FF8B00] text-white">
                            <span className="text-xs font-medium">TN</span>
                        </Avatar>
                        <Button variant="outline" size="sm" className="rounded-full">
                            <span className="sr-only">Add person</span>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="outline" className="flex items-center space-x-2">
                        <Filter className="h-4 w-4" />
                        <span>Filter</span>
                    </Button>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">GROUP BY</span>
                        <Button variant="outline" className="flex items-center space-x-2">
                            <span>None</span>
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="outline" className="flex items-center space-x-2">
                        <BarChart2 className="h-4 w-4" />
                        <span>Insights</span>
                    </Button>
                    <Button variant="outline" className="flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>View settings</span>
                    </Button>
                </div>
            </div>

            <div className="flex space-x-4 overflow-x-auto pb-6">
                <BoardColumn
                    title="TO DO"
                    count={1}
                    tasks={[
                        {
                            id: "BTS-5",
                            title: "(Sample) Fix Database Connection Errors",
                            tag: { text: "(SAMPLE) BACKEND BUGS", color: "bg-purple-100 text-purple-800" },
                        },
                    ]}
                />

                <BoardColumn
                    title="IN PROGRESS"
                    count={2}
                    tasks={[
                        {
                            id: "BTS-3",
                            title: "(Sample) Improve Dropdown Menu Responsiveness",
                            tag: { text: "(SAMPLE) USER INTERFACE BUGS", color: "bg-purple-100 text-purple-800" },
                        },
                        {
                            id: "BTS-6",
                            title: "(Sample) Resolve API Timeout Issues",
                            tag: { text: "(SAMPLE) BACKEND BUGS", color: "bg-purple-100 text-purple-800" },
                        },
                    ]}
                />

                <BoardColumn
                    title="DONE"
                    count={0}
                    showCheckmark={true}
                    tasks={[]}
                    emptyState={
                        <div className="flex flex-col items-center justify-center p-4 text-gray-500">
                            <button className="text-sm hover:underline flex items-center">
                                <Search className="h-4 w-4 mr-1" />
                                View done work items
                            </button>
                        </div>
                    }
                />

                <div className="flex-shrink-0 w-10 flex items-start justify-center pt-10">
                    <Button variant="ghost" size="icon" className="rounded-full bg-gray-100">
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
