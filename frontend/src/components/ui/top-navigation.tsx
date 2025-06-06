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
    Bug,
    FolderOpen,
    Plus,
    User,
    LogOut
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { toast } from "sonner"
import { NotificationDropdown } from "@/components/ui/notification-dropdown"

// Interface for Project
interface Project {
    id: string;
    name: string;
    key: string;
    projectType?: string;
    access?: string;
    description?: string;
}

export function TopNavigation() {
    const router = useRouter();
    const searchRef = useRef<HTMLDivElement>(null);
    
    // User state
    const [userId, setUserId] = useState<string | null>(null);
    
    // Search states
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Project[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

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
    const [menuTimeoutId, setMenuTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null)
    const [searchTimeoutId, setSearchTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null)

    // Load userId on client-side
    useEffect(() => {
        const currentUserId = getCurrentUserId();
        setUserId(currentUserId);
    }, []);

    // Function to get current user ID
    const getCurrentUserId = () => {
        // Check if running in browser environment
        if (typeof window === 'undefined') {
            return null;
        }
        
        let currentUserId = localStorage.getItem("userId") || 
                           localStorage.getItem("currentUserId") || 
                           localStorage.getItem("user_id") ||
                           localStorage.getItem("ownerId");
        
        // If not found, try parse from userInfo
        if (!currentUserId) {
            const userInfo = localStorage.getItem("userInfo");
            if (userInfo) {
                try {
                    const parsed = JSON.parse(userInfo);
                    if (parsed.id) {
                        currentUserId = parsed.id;
                    } else if (parsed.userId) {
                        currentUserId = parsed.userId;
                    }
                } catch (e) {
                    console.log("Could not parse userInfo JSON:", e);
                }
            }
        }
        
        // Try to find in auth token if available
        if (!currentUserId) {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    // Decode JWT token to get user info
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.userId) {
                        currentUserId = payload.userId;
                    } else if (payload.sub) {
                        currentUserId = payload.sub;
                    }
                } catch (e) {
                    console.log("Could not decode JWT token:", e);
                }
            }
        }
        
        return currentUserId;
    };

    // Search projects function
    const searchProjects = async (term: string) => {
        console.log("🔍 === searchProjects called ===");
        console.log("🔍 Search term:", term);

        if (!term.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        try {
            setIsSearching(true);
            setShowSearchResults(true);
            
            let currentUserId = getCurrentUserId();
            
            if (!currentUserId) {
                // TEMPORARY: Use hardcoded userId for testing
                currentUserId = "d90e8bd8-72e2-47cc-b9f0-edb92fe60c5a";
            }

            // Search in both owned projects and member projects
            const [ownedResponse, memberResponse] = await Promise.allSettled([
                // Get projects where user is owner
                axios.get(`http://localhost:8083/api/projects/user/${currentUserId}`),
                // Get projects where user is member  
                axios.get(`http://localhost:8083/api/projects/search/member?keyword=${encodeURIComponent(term)}&userId=${currentUserId}`)
            ]);

            let allProjects: Project[] = [];

            // Handle owned projects
            if (ownedResponse.status === 'fulfilled' && ownedResponse.value.data?.data) {
                const ownedProjects = ownedResponse.value.data.data.filter((project: Project) => 
                    project.name.toLowerCase().includes(term.toLowerCase()) ||
                    project.key.toLowerCase().includes(term.toLowerCase())
                );
                allProjects.push(...ownedProjects);
            }

            // Handle member projects
            if (memberResponse.status === 'fulfilled' && memberResponse.value.data?.data) {
                const memberProjects = memberResponse.value.data.data;
                allProjects.push(...memberProjects);
            }

            // Remove duplicates by ID
            const uniqueProjects = allProjects.filter((project, index, self) => 
                index === self.findIndex(p => p.id === project.id)
            );

            setSearchResults(uniqueProjects);
            console.log(`✅ Found ${uniqueProjects.length} projects (owned + member)`);
            
        } catch (error) {
            console.error("❌ Error searching projects:", error);
            setSearchResults([]);
            toast.error("Failed to search projects. Please try again.");
        } finally {
            setIsSearching(false);
        }
    };

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        console.log("🔍 === handleSearchChange ===");
        console.log("🔍 Input term:", term);
        
        setSearchTerm(term);
        
        // Clear previous search timeout
        if (searchTimeoutId) {
            console.log("🔍 Clearing previous search timeout");
            clearTimeout(searchTimeoutId);
        }
        
        // Set new search timeout
        const newSearchTimeoutId = setTimeout(() => {
            console.log("🔍 Search timeout triggered for term:", term);
            searchProjects(term);
        }, 300);
        
        setSearchTimeoutId(newSearchTimeoutId);
        console.log("🔍 New search timeout set");
    };

    // Handle project selection
    const handleProjectSelect = (project: Project) => {
        console.log("🔍 Project selected:", project);
        setSearchTerm("");
        setSearchResults([]);
        setShowSearchResults(false);
        
        // Store selected project info for sync across pages
        localStorage.setItem("currentProjectId", project.id);
        localStorage.setItem("currentProjectName", project.name);
        localStorage.setItem("currentProjectKey", project.key);
        
        // Navigate to project board with selected projectId
        router.push(`/project/project_homescreen?projectId=${project.id}`);
    };

    // Handle search form submit
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("🔍 Form submitted, search results length:", searchResults.length);
        if (searchResults.length > 0) {
            handleProjectSelect(searchResults[0]);
        }
    };

    // Close search results when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        }
        
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Clear timeouts when component unmounts
    useEffect(() => {
        return () => {
            if (menuTimeoutId !== null) {
                clearTimeout(menuTimeoutId);
            }
            if (searchTimeoutId !== null) {
                clearTimeout(searchTimeoutId);
            }
        };
    }, [menuTimeoutId, searchTimeoutId]);

    const handleMenuEnter = (menuTitle: string) => {
        if (menuTimeoutId !== null) {
            clearTimeout(menuTimeoutId)
            setMenuTimeoutId(null)
        }
        setOpenDropdown(menuTitle)
    }

    const handleMenuLeave = (menuTitle: string) => {
        const id = setTimeout(() => {
            if (openDropdown === menuTitle) {
                setOpenDropdown(null)
            }
        }, 100) // Thời gian trễ 100ms

        setMenuTimeoutId(id)
    }

    const handleLogout = () => {
        console.log("Logout clicked");
        // Đóng dropdown trước
        setOpenDropdown(null);
        
        // Xóa localStorage
        localStorage.clear();
        console.log("LocalStorage cleared");
        
        // Redirect về signin
        console.log("Redirecting to signin...");
        router.push("/auth/signin");
    };

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
                {/* Global Search */}
                <div ref={searchRef} className="relative">
                    <form onSubmit={handleSearchSubmit} className="bg-white border border-gray-300 rounded-md flex items-center px-2">
                        <Search className="h-4 w-4 text-gray-500" />
                        <Input
                            type="text"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="border-0 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 w-48"
                        />
                    </form>

                    {/* Search Results Dropdown */}
                    {showSearchResults && (
                        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border rounded-md shadow-lg z-50">
                            {isSearching ? (
                                <div className="p-4 text-center text-gray-500">
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                        <span className="text-sm">Searching projects...</span>
                                    </div>
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(project => (
                                    <div
                                        key={project.id}
                                        onClick={() => handleProjectSelect(project)}
                                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Project Avatar */}
                                            <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center text-blue-600 text-xs font-semibold">
                                                {project.key || project.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {/* Project Name */}
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {project.name}
                                                </div>
                                                {/* Project Details */}
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                        {project.projectType || "Team-managed"}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                                                        </svg>
                                                        {project.access || "Private"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : searchTerm.trim() ? (
                                <div className="p-3 text-gray-500 text-center">
                                    <div className="flex justify-center mb-2">
                                        <Search className="h-5 w-5" />
                                    </div>
                                    No projects found matching &quot;<strong>{searchTerm}</strong>&quot;
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Notification Dropdown - only render on client-side with valid userId */}
                {userId && <NotificationDropdown userId={userId} />}

                <button className="p-2 hover:bg-gray-100 rounded">
                    <Settings className="h-4 w-4" />
                </button>

                <div className="relative">
                    <Avatar 
                        className="h-7 w-7 bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                        onMouseEnter={() => handleMenuEnter("user-menu")}
                    >
                        <span className="text-xs font-medium">TN</span>
                    </Avatar>

                    {/* User dropdown */}
                    {openDropdown === "user-menu" && (
                        <div
                            className="absolute right-0 top-full mt-1 w-48 bg-white border rounded shadow-md p-2 z-50"
                            onMouseEnter={() => handleMenuEnter("user-menu")}
                            onMouseLeave={() => handleMenuLeave("user-menu")}
                        >
                            <div
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-gray-800 text-sm rounded cursor-pointer"
                            >
                                <User className="h-4 w-4 text-gray-500" />
                                <span>Profile</span>
                            </div>
                            <div
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-gray-800 text-sm rounded cursor-pointer"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4 text-gray-500" />
                                <span>Logout</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}