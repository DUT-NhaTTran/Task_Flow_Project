"use client"

import Link from "next/link"
import {
    Search,
    Bell,
    Settings,
    ChevronDown,
    LayoutGrid,
    FolderPlus,
    ListChecks,
    Users,
    AppWindow,
    ClipboardList,
    Bug
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

export function TopNavigation() {
    const menuItems = [
        {
            title: "Your work",
            items: [
                { label: "Assigned to me", icon: ListChecks },
                { label: "Recent work", icon: ClipboardList },
            ]
        },
        {
            title: "Projects",
            items: [
                { label: "Bug Tracking System (BTS)", icon: Bug },
                { label: "View all projects", icon: LayoutGrid, href: "/project/view_all_projects" },
                { label: "Create project", icon: FolderPlus },
            ]
        },
        {
            title: "Filters",
            items: [
                { label: "My open issues", icon: ListChecks },
                { label: "Reported by me", icon: ClipboardList },
            ]
        },
        {
            title: "Dashboards",
            items: [
                { label: "Team dashboard", icon: LayoutGrid },
                { label: "Create dashboard", icon: FolderPlus },
            ]
        },
        {
            title: "Teams",
            items: [
                { label: "Engineering team", icon: Users },
                { label: "Create team", icon: FolderPlus },
            ]
        },
        {
            title: "Plans",
            items: [
                { label: "Sprint planning", icon: ClipboardList },
                { label: "Roadmap", icon: AppWindow },
            ]
        },
        {
            title: "Apps",
            items: [
                { label: "Marketplace apps", icon: AppWindow },
                { label: "Manage apps", icon: Settings },
            ]
        },
    ]

    const [openDropdown, setOpenDropdown] = useState<string | null>(null)
    const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null)

    // Xóa timeout khi component unmount
    useEffect(() => {
        return () => {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
        };
    }, [timeoutId]);

    const handleMenuEnter = (menuTitle: string) => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId)
            setTimeoutId(null)
        }
        setOpenDropdown(menuTitle)
    }

    const handleMenuLeave = (menuTitle: string) => {
        const id = setTimeout(() => {
            if (openDropdown === menuTitle) {
                setOpenDropdown(null)
            }
        }, 100) // Thời gian trễ 100ms

        setTimeoutId(id)
    }

    return (
        <div className="flex items-center px-4 py-2 border-b border-gray-200 text-sm relative bg-white z-50">
            {/* Left */}
            <div className="flex items-center space-x-4">
                <button className="p-2 hover:bg-gray-100 rounded">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <rect width="24" height="24" fill="#DEEBFF" rx="4" />
                        <rect width="10" height="10" x="7" y="7" fill="#0052CC" rx="1" />
                    </svg>
                </button>
                <Link href="#" className="text-[#0052CC] font-semibold text-base">
                    TaskFlow
                </Link>

                {/* Menu items */}
                <div className="flex items-center space-x-2 relative">
                    {menuItems.map((menu, index) => (
                        <div
                            key={index}
                            className="relative"
                        >
                            {/* Nút menu */}
                            <button
                                className={`flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 ${
                                    openDropdown === menu.title ? "text-[#0052CC] border-b-2 border-[#0052CC]" : ""
                                }`}
                                onMouseEnter={() => handleMenuEnter(menu.title)}
                            >
                                <span>{menu.title}</span>
                                <ChevronDown className="h-3 w-3" />
                            </button>

                            {/* Dropdown menu với phần này là bao bọc menu ẩn */}
                            {openDropdown === menu.title && (
                                <div
                                    className="absolute left-0 top-full mt-1 w-60 bg-white border rounded shadow-md p-2 z-50"
                                    onMouseEnter={() => handleMenuEnter(menu.title)}
                                    onMouseLeave={() => handleMenuLeave(menu.title)}
                                >
                                    {menu.items.map((item, idx) =>
                                        item.href ? (
                                            <Link
                                                key={idx}
                                                href={item.href}
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-gray-800 text-sm rounded"
                                            >
                                                <item.icon className="h-4 w-4 text-gray-500" />
                                                <span>{item.label}</span>
                                            </Link>
                                        ) : (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-gray-800 text-sm rounded cursor-pointer"
                                            >
                                                <item.icon className="h-4 w-4 text-gray-500" />
                                                <span>{item.label}</span>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <Button className="bg-blue-600 hover:bg-blue-700 text-xs py-2 px-4">
                    Create
                </Button>
            </div>

            {/* Right */}
            <div className="ml-auto flex items-center space-x-3">
                <div className="bg-white border border-gray-300 rounded-md flex items-center px-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                        type="text"
                        placeholder="Search"
                        className="border-0 text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                </div>

                <button className="p-2 hover:bg-gray-100 rounded">
                    <Bell className="h-4 w-4" />
                </button>

                <button className="p-2 hover:bg-gray-100 rounded">
                    <Settings className="h-4 w-4" />
                </button>

                <Avatar className="h-7 w-7 bg-blue-600 text-white">
                    <span className="text-xs font-medium">TN</span>
                </Avatar>
            </div>
        </div>
    )
}