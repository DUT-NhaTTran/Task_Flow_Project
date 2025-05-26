"use client";

import Link from "next/link";
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
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

interface SidebarProps {
  projectId?: string;
}

export function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname();
  
  // Check if the current path matches a specific pattern
  const isActive = (path: string) => {
    if (path === '/project/project_homescreen' && pathname.includes('/project/project_homescreen')) {
      return true;
    }
    if (path === '/project/backlog' && pathname.includes('/project/backlog')) {
      return true;
    }
    if (path === '/project/calendar' && pathname.includes('/project/calendar')) {
      return true;
    }
    return false;
  };
  
  return (
    <div className="w-64 border-r border-gray-200 overflow-y-auto flex flex-col h-full bg-white">
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

      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-500 mb-3">PLANNING</h3>
        <nav className="space-y-3">
          <Link
            href="#"
            className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
          >
            <Globe className="h-5 w-5" />
            <span>Summary</span>
          </Link>
          <Link
            href="#"
            className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
          >
            <Clock className="h-5 w-5" />
            <span>Timeline</span>
          </Link>
          <Link
            href={projectId ? `/project/backlog?projectId=${projectId}` : "#"}
            passHref
            className={`flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 ${isActive('/project/backlog') ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
          >
            <ListChecks className="h-5 w-5" />
            <span>Backlog</span>
          </Link>

          <Link
            href={
              projectId
                ? `/project/project_homescreen?projectId=${projectId}`
                : "#"
            }
            className={`flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 ${isActive('/project/project_homescreen') ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
          >
            <LayoutGrid className="h-5 w-5" />
            <span>Board</span>
          </Link>
          <Link
            href={projectId ? `/project/calendar?projectId=${projectId}` : "#"}
            className={`flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 ${isActive('/project/calendar') ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
          >
            <Calendar className="h-5 w-5" />
            <span>Calendar</span>
          </Link>
          <Link
            href="#"
            className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
          >
            <List className="h-5 w-5" />
            <span>List</span>
          </Link>
          <Link
            href="#"
            className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
          >
            <FileText className="h-5 w-5" />
            <span>Forms</span>
          </Link>
          <Link
            href="#"
            className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
          >
            <Target className="h-5 w-5" />
            <span>Goals</span>
          </Link>
          <Link
            href="#"
            className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
          >
            <Briefcase className="h-5 w-5" />
            <span>All work</span>
          </Link>
        </nav>
      </div>
  
      <div className="mt-auto p-4 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          <p>You're in a team-managed project</p>

        </div>
      </div>

    </div>
  );
}
