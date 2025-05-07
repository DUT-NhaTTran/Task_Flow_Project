"use client"

import Link from "next/link"
import {
    Globe,
    Clock,
    LayoutGrid,
    Calendar,
    List,
    FileText,
    Target,
    Briefcase,
    Plus,
    Code,
    Package,
} from "lucide-react"

export function Sidebar() {
    return (
        <div className="w-64 border-r border-gray-200 overflow-y-auto flex flex-col h-full bg-[#F4F5F7]">
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                    <div className="bg-[#FF5630] text-white p-2 rounded">
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-semibold">Bug Tracking System</h2>
                        <p className="text-xs text-gray-500">Software project</p>
                    </div>
                </div>
            </div>

            <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 mb-3">PLANNING</h3>
                <nav className="space-y-1">
                    <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                        <Globe className="h-5 w-5" />
                        <span>Summary</span>
                    </Link>
                    <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                        <Clock className="h-5 w-5" />
                        <span>Timeline</span>
                    </Link>
                    <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded bg-[#E6EFFC] text-[#0052CC]">
                        <LayoutGrid className="h-5 w-5" />
                        <span>Board</span>
                    </Link>
                    <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                        <Calendar className="h-5 w-5" />
                        <span>Calendar</span>
                    </Link>
                    <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                        <List className="h-5 w-5" />
                        <span>List</span>
                    </Link>
                    <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                        <FileText className="h-5 w-5" />
                        <span>Forms</span>
                    </Link>
                    <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                        <Target className="h-5 w-5" />
                        <span>Goals</span>
                    </Link>
                    <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                        <Briefcase className="h-5 w-5" />
                        <span>All work</span>
                    </Link>
                </nav>
            </div>

            <div className="mt-2 px-4">
                <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
                    <Plus className="h-4 w-4" />
                    <span>Add view</span>
                </button>
            </div>

            <div className="mt-6 p-4">
                <h3 className="text-xs font-semibold text-gray-500 mb-3">DEVELOPMENT</h3>
                <nav className="space-y-1">
                    <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                        <Code className="h-5 w-5" />
                        <span>Code</span>
                    </Link>
                    <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                        <Package className="h-5 w-5" />
                        <span>Project pages</span>
                    </Link>
                </nav>
            </div>

            <div className="mt-auto p-4 border-t border-gray-200">
                <div className="text-xs text-gray-600">
                    <p>You're in a team-managed project</p>
                    <Link href="#" className="text-[#0052CC]">
                        Learn more
                    </Link>
                </div>
            </div>
        </div>
    )
}
