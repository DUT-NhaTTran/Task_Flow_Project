"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Globe,
  Clock,
  LayoutGrid,
  Calendar,
  List,
  FileText,
  Target,
  Briefcase,
  Package,
  ListChecks,
  BarChart3,
  Layout,
} from "lucide-react";
import { useNavigation } from "@/contexts/NavigationContext";

interface SidebarProps {
  projectId?: string;
}

export function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname();
  const { 
    currentProjectId, 
    userId, 
    isNavigating, 
    navigateTo, 
    getProjectPath, 
    getUserPath,
    setCurrentProjectId 
  } = useNavigation();

  // Update project ID if provided as prop - use useEffect to avoid setState during render
  useEffect(() => {
    if (projectId && projectId !== currentProjectId) {
      setCurrentProjectId(projectId);
    }
  }, [projectId, currentProjectId, setCurrentProjectId]);

  // Check if current path matches specific routes
  const isActive = (path: string) => {
    if (!pathname) return false;
    
    // Handle different path patterns
    if (path.includes('/work')) {
      return pathname.includes('/work');
    }
    if (path.includes('/project/summary')) {
      return pathname.includes('/project/summary');
    }
    if (path.includes('/project/project_homescreen')) {
      return pathname.includes('/project/project_homescreen');
    }
    if (path.includes('/project/backlog')) {
      return pathname.includes('/project/backlog');
    }
    if (path.includes('/project/calendar')) {
      return pathname.includes('/project/calendar');
    }
    
    return pathname.includes(path);
  };

  // Utility to build class for each nav link
  const makeLinkClass = (path: string) => {
    const active = isActive(path);
    return `flex items-center space-x-3 px-2 py-1 rounded transition-colors duration-200 ${
      active 
        ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600" 
        : "text-gray-700 hover:bg-gray-100"
    } ${isNavigating ? 'opacity-50' : ''}`;
  };

  // Navigation data
  const navItems = [
    {
      name: "Summary",
      path: getProjectPath('summary'),
      icon: BarChart3,
      pathPattern: "/project/summary",
      available: !!currentProjectId
    },
    {
      name: "Board", 
      path: getProjectPath('board'),
      icon: LayoutGrid,
      pathPattern: "/project/project_homescreen",
      available: !!currentProjectId
    },
    {
      name: "Backlog",
      path: getProjectPath('backlog'), 
      icon: ListChecks,
      pathPattern: "/project/backlog",
      available: !!currentProjectId
    },
    {
      name: "Calendar",
      path: getProjectPath('calendar'),
      icon: Calendar,
      pathPattern: "/project/calendar", 
      available: !!currentProjectId
    },
    {
      name: "All work",
      path: getUserPath('work'),
      icon: Briefcase,
      pathPattern: "/work",
      available: !!userId
    }
  ];

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (path !== '#' && !isNavigating) {
      navigateTo(path);
    }
  };

  return (
    <div className="w-64 border-r border-gray-200 overflow-y-auto flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="bg-[#0052CC] text-white p-2 rounded">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Bug Tracking System</h2>
            <p className="text-xs text-gray-500">Software project</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 flex-1">
        <h3 className="text-xs font-semibold text-gray-500 mb-3">PLANNING</h3>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isDisabled = !item.available;
            
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`${makeLinkClass(item.pathPattern)} ${
                  isDisabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                onClick={(e) => handleNavClick(e, item.path)}
                title={isDisabled ? `${item.name} - No ${item.name.includes('work') ? 'user' : 'project'} selected` : item.name}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
                {isDisabled && (
                  <span className="text-xs text-gray-400 ml-auto">N/A</span>
                )}
              </Link>
            );
          })}

          {/* Placeholder items */}
          <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 text-gray-400 cursor-not-allowed">
            <List className="h-4 w-4" />
            <span>List</span>
            <span className="text-xs ml-auto">Soon</span>
          </Link>

          <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 text-gray-400 cursor-not-allowed">
            <FileText className="h-4 w-4" />
            <span>Forms</span>
            <span className="text-xs ml-auto">Soon</span>
          </Link>

          <Link href="#" className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 text-gray-400 cursor-not-allowed">
            <Target className="h-4 w-4" />
            <span>Goals</span>
            <span className="text-xs ml-auto">Soon</span>
          </Link>
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-600">You're in a team-managed project</p>
        {isNavigating && (
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-xs text-blue-600">Navigating...</span>
          </div>
        )}
      </div>
    </div>
  );
}
