"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks, getDaysInMonth, startOfMonth, getDate, isSameMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Search, Calendar as CalendarIcon, Filter, ChevronDown, X, RotateCcw, User } from "lucide-react";

// Type definitions
interface Task {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  sprintId?: string;
  dueDate?: string;
  startDate?: string;
  assigneeId?: string | null;
  assigneeName?: string;
}

interface Sprint {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

interface CalendarWeek {
  days: Date[];
  sprints: SprintBar[];
}

interface SprintBar {
  id: string;
  name: string;
  startDay: number; 
  endDay: number;
  row: number;
  isFirst: boolean;
  isLast: boolean;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

// Extract SprintModal component to make code clearer
const SprintDetailPopup = ({ 
  sprint, 
  position, 
  onClose 
}: { 
  sprint: Sprint, 
  position: { x: number, y: number }, 
  onClose: () => void 
}) => {
  const startDate = sprint.startDate ? format(parseISO(sprint.startDate), 'MMM d, yyyy') : 'Not set';
  const endDate = sprint.endDate ? format(parseISO(sprint.endDate), 'MMM d, yyyy') : 'Not set';
  
  // Get color scheme for the sprint - using simplified JIRA-like colors
  const getSprintColor = (name: string, id: string) => {
    // Create a deterministic color based on the sprint ID
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return hash;
    };
    
    // Simple, clean color scheme with background colors
    const colorSets = [
      { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'text-blue-600', labelBg: 'bg-blue-50' },
      { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', accent: 'text-green-600', labelBg: 'bg-green-50' },
      { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', accent: 'text-purple-600', labelBg: 'bg-purple-50' },
      { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', accent: 'text-amber-600', labelBg: 'bg-amber-50' },
      { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', accent: 'text-red-600', labelBg: 'bg-red-50' },
      { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', accent: 'text-cyan-600', labelBg: 'bg-cyan-50' },
      { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', accent: 'text-indigo-600', labelBg: 'bg-indigo-50' },
      { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', accent: 'text-orange-600', labelBg: 'bg-orange-50' },
    ];
    
    if (name.toLowerCase().includes('sprint 1') || name.toLowerCase().includes('scrum-1')) {
      return colorSets[0]; // Blue
    } else if (name.toLowerCase().includes('sprint 2') || name.toLowerCase().includes('scrum-2')) {
      return colorSets[1]; // Green
    } else if (name.toLowerCase().includes('sprint 3') || name.toLowerCase().includes('scrum-3')) {
      return colorSets[2]; // Purple
    } else if (name.toLowerCase().includes('sprint 4') || name.toLowerCase().includes('scrum-4')) {
      return colorSets[3]; // Amber
    } else if (name.toLowerCase().includes('new sprint')) {
      return colorSets[4]; // Red
    } else {
      const hash = Math.abs(hashCode(id));
      return colorSets[hash % colorSets.length];
    }
  };
  
  const colors = getSprintColor(sprint.name, sprint.id);
  
  // Calculate safe positioning to keep modal within viewport
  const adjustPositionForViewport = () => {
    const modalWidth = 320; // Width of modal in pixels
    const modalHeight = 200; // Approximate height of modal
    const padding = 16; // Padding from window edges
    
    // Check if modal would extend beyond right edge of viewport
    let left = position.x + 10;
    const viewportWidth = window.innerWidth;
    if (left + modalWidth > viewportWidth - padding) {
      // Position to the left of the sprint instead
      left = position.x - modalWidth - 10;
      
      // If that's still offscreen, position at right edge with padding
      if (left < padding) {
        left = viewportWidth - modalWidth - padding;
      }
    }
    
    // Check if modal would extend beyond bottom of viewport
    let top = position.y;
    const viewportHeight = window.innerHeight;
    if (top + modalHeight > viewportHeight - padding) {
      top = viewportHeight - modalHeight - padding;
    }
    
    // Ensure top is not negative
    if (top < padding) {
      top = padding;
    }
    
    return { left, top };
  };
  
  const { left, top } = adjustPositionForViewport();
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div 
        className={`fixed z-50 ${colors.bg} rounded-md shadow-lg w-80 border ${colors.border}`}
        style={{
          top: `${top}px`,
          left: `${left}px`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b ${colors.border} p-3`}>
          <div className="flex items-center gap-2">
            <RotateCcw className={`h-4 w-4 ${colors.accent}`} />
            <h2 className={`font-medium ${colors.text} uppercase text-sm`}>SPRINT</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className={`${colors.accent} hover:opacity-80`}>
              <span className="sr-only">Options</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="4" cy="10" r="2" />
                <circle cx="10" cy="10" r="2" />
                <circle cx="16" cy="10" r="2" />
              </svg>
            </button>
            <button 
              className={`${colors.accent} hover:opacity-80`}
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="p-3 pb-4">
          <div className="mb-3">
            <div className={`inline-block px-2 py-0.5 border rounded-sm bg-white border-gray-200 ${colors.text} text-xs font-medium mb-1`}>
              {sprint.status || 'ACTIVE'}
            </div>
            <h1 className={`text-xl font-bold ${colors.text}`}>{sprint.name}</h1>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <h3 className={`${colors.text} font-medium mb-1 text-sm`}>Start date</h3>
              <p className="text-base text-gray-700">{startDate}</p>
            </div>
            <div>
              <h3 className={`${colors.text} font-medium mb-1 text-sm`}>Planned end</h3>
              <p className="text-base text-gray-700">{endDate}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Extract DayCell component
const DayCell = ({ day, columnIndex, currentDate }: { day: Date, columnIndex: number, currentDate: Date }) => {
  const isToday = isSameDay(day, new Date());
  const isCurrentMonth = isSameMonth(day, currentDate);
  const isWeekend = columnIndex === 5 || columnIndex === 6; // Highlight weekends
  
  // Format ngày hiển thị
  const dayNum = getDate(day);
  const formattedDay = isCurrentMonth 
    ? dayNum.toString() 
    : format(day, "MMM d").toLowerCase();
  
  return (
    <div 
      className={`h-full border-r border-b p-1 relative ${
        isToday ? "bg-blue-50" : isCurrentMonth ? (isWeekend ? "bg-gray-50" : "bg-white") : "bg-gray-100 text-gray-400"
      }`}
    >
      <div className={`text-right p-1 ${isToday ? "font-bold text-blue-600" : ""}`}>
        {formattedDay}
      </div>
      
      {/* Icon + cho ngày 29 */}
      {(dayNum === 29 && isCurrentMonth) && (
        <div className="absolute right-1 top-1 text-gray-400 cursor-pointer hover:text-gray-600">
          +
        </div>
      )}
    </div>
  );
};

// Calendar Toolbar component
const CalendarToolbar = ({
  currentDate,
  goToToday,
  previousMonth,
  nextMonth
}: {
  currentDate: Date,
  goToToday: () => void,
  previousMonth: () => void,
  nextMonth: () => void
}) => (
  <div className="p-4 flex flex-wrap items-center gap-2 border-b">
    <div className="relative w-56">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input 
        className="pl-10 h-9" 
        placeholder="Search calendar" 
      />
    </div>
    
    <div className="flex items-center ml-2 gap-2">
      <Button variant="outline" className="flex items-center gap-1 h-9">
        Assignee <ChevronDown className="h-4 w-4" />
      </Button>
      
      <Button variant="outline" className="flex items-center gap-1 h-9">
        Type <ChevronDown className="h-4 w-4" />
      </Button>
      
      <Button variant="outline" className="flex items-center gap-1 h-9">
        Status <ChevronDown className="h-4 w-4" />
      </Button>
      
      <Button variant="outline" className="flex items-center gap-1 h-9">
        More filters <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
    
    <div className="ml-auto flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={goToToday}
        className="h-9"
      >
        Today
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        onClick={previousMonth}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <span className="font-medium px-2">
        {format(currentDate, "MMMM yyyy")}
      </span>
      
      <Button
        variant="outline"
        size="icon"
        onClick={nextMonth}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      <div className="flex border rounded overflow-hidden">
        <Button 
          variant="ghost" 
          size="sm"
          className="h-9 px-3"
        >
          <CalendarIcon className="h-4 w-4 mr-1" /> Month
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-9 px-3"
        >
          <span className="sr-only">List</span>
          List
        </Button>
      </div>
    </div>
  </div>
);

// Component for the AssigneeDropdown
const AssigneeDropdown = ({ 
  sprint, 
  users, 
  onAssign, 
  position,
  onClose 
}: { 
  sprint: Sprint, 
  users: User[], 
  onAssign: (sprintId: string, userId: string | null, userName: string | null) => void,
  position: { x: number, y: number },
  onClose: () => void
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      onClose();
    }
  };
  
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Calculate safe positioning to keep dropdown within viewport
  const adjustPositionForViewport = () => {
    const dropdownWidth = 250; // Width of dropdown in pixels
    const dropdownHeight = Math.min(300, users.length * 50 + 100); // Approx height based on users
    const padding = 16; // Padding from window edges
    
    let left = position.x;
    const viewportWidth = window.innerWidth;
    if (left + dropdownWidth > viewportWidth - padding) {
      left = viewportWidth - dropdownWidth - padding;
    }
    
    let top = position.y;
    const viewportHeight = window.innerHeight;
    if (top + dropdownHeight > viewportHeight - padding) {
      top = viewportHeight - dropdownHeight - padding;
    }
    
    return { left, top };
  };
  
  const { left, top } = adjustPositionForViewport();
  
  const assignToMe = () => {
    // Assumes there's a current user - in real app, get from context/auth
    const currentUser = {
      id: "current-user-id",
      name: "Nhật Trần",
      email: "102210072@sv1.dut.udn.vn"
    };
    
    onAssign(sprint.id, currentUser.id, currentUser.name);
  };
  
  const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <div 
      ref={dropdownRef}
      className="fixed z-50 bg-white rounded-md shadow-lg w-64 border border-gray-200"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      <div className="py-1 border-b border-gray-200">
        <div 
          className="px-3 py-2 flex items-center gap-2 hover:bg-blue-50 cursor-pointer"
          onClick={() => onAssign(sprint.id, null, null)}
        >
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
            <User className="h-4 w-4" />
          </div>
          <div className="font-medium text-sm">Unassigned</div>
          {!sprint.assigneeId && (
            <div className="ml-auto bg-blue-100 rounded px-2 py-0.5 text-xs text-blue-700">Current</div>
          )}
        </div>
        
        <div 
          className="px-3 py-2 flex items-center gap-2 hover:bg-gray-100 cursor-pointer"
        >
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="font-medium text-sm">Automatic</div>
        </div>
      </div>
      
      <div className="py-1 border-b border-gray-200">
        <div 
          className="px-3 py-2 flex items-center gap-2 hover:bg-blue-50 cursor-pointer"
          onClick={assignToMe}
        >
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-medium">
            NT
          </div>
          <div>
            <div className="font-medium text-sm">Nhật Trần <span className="text-gray-500 font-normal">(Assign to me)</span></div>
            <div className="text-xs text-gray-500">102210072@sv1.dut.udn.vn</div>
          </div>
        </div>
      </div>
      
      <div className="py-1 max-h-60 overflow-y-auto">
        {users.map(user => (
          <div 
            key={user.id}
            className="px-3 py-2 flex items-center gap-2 hover:bg-blue-50 cursor-pointer"
            onClick={() => onAssign(sprint.id, user.id, user.name)}
          >
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-medium">
              {getInitials(user.name)}
            </div>
            <div>
              <div className="font-medium text-sm">{user.name}</div>
              {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
            </div>
            {sprint.assigneeId === user.id && (
              <div className="ml-auto bg-blue-100 rounded px-2 py-0.5 text-xs text-blue-700">Current</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Hiển thị thanh sprint trong một tuần
const SprintBar = ({ 
  sprint, 
  weekIndex, 
  sprints, 
  onSprintClick,
  onAssigneeClick
}: { 
  sprint: SprintBar, 
  weekIndex: number, 
  sprints: Sprint[], 
  onSprintClick: (sprint: Sprint, event: React.MouseEvent) => void,
  onAssigneeClick: (sprint: Sprint, event: React.MouseEvent) => void
}) => {
  const width = sprint.endDay - sprint.startDay + 1;
  
  // Find the actual sprint object from the sprints array
  const actualSprint = sprints.find(s => s.id === sprint.id);
  
  // Simplified JIRA-like color scheme
  const getSprintColor = (name: string, id: string) => {
    // Create a deterministic color based on the sprint ID
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return hash;
    };
    
    // Simple, clean color scheme like in the image with distinct background colors
    const colorSets = [
      { bg: 'bg-blue-50', border: 'border-blue-300', dot: 'bg-blue-600', text: 'text-gray-700', labelBg: 'bg-blue-50' },
      { bg: 'bg-green-50', border: 'border-green-300', dot: 'bg-green-600', text: 'text-gray-700', labelBg: 'bg-green-50' },
      { bg: 'bg-purple-50', border: 'border-purple-300', dot: 'bg-purple-600', text: 'text-gray-700', labelBg: 'bg-purple-50' },
      { bg: 'bg-amber-50', border: 'border-amber-300', dot: 'bg-amber-600', text: 'text-gray-700', labelBg: 'bg-amber-50' },
      { bg: 'bg-red-50', border: 'border-red-300', dot: 'bg-red-600', text: 'text-gray-700', labelBg: 'bg-red-50' },
      { bg: 'bg-cyan-50', border: 'border-cyan-300', dot: 'bg-cyan-600', text: 'text-gray-700', labelBg: 'bg-cyan-50' },
      { bg: 'bg-indigo-50', border: 'border-indigo-300', dot: 'bg-indigo-600', text: 'text-gray-700', labelBg: 'bg-indigo-50' },
      { bg: 'bg-orange-50', border: 'border-orange-300', dot: 'bg-orange-600', text: 'text-gray-700', labelBg: 'bg-orange-50' },
    ];
    
    // Special named sprints get consistent colors
    if (name.toLowerCase().includes('sprint 1') || name.toLowerCase().includes('scrum-1')) {
      return colorSets[0]; // Blue
    } else if (name.toLowerCase().includes('sprint 2') || name.toLowerCase().includes('scrum-2')) {
      return colorSets[1]; // Green
    } else if (name.toLowerCase().includes('sprint 3') || name.toLowerCase().includes('scrum-3')) {
      return colorSets[2]; // Purple
    } else if (name.toLowerCase().includes('sprint 4') || name.toLowerCase().includes('scrum-4')) {
      return colorSets[3]; // Amber
    } else if (name.toLowerCase().includes('new sprint')) {
      return colorSets[4]; // Red
    } else {
      // For other sprints, use the ID to create a deterministic color
      const hash = Math.abs(hashCode(id));
      return colorSets[hash % colorSets.length];
    }
  };
  
  const colors = getSprintColor(sprint.name, sprint.id);
  
  const handleClick = (e: React.MouseEvent) => {
    if (actualSprint) {
      onSprintClick(actualSprint, e);
    }
  };
  
  const handleAssigneeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent sprint click
    if (actualSprint) {
      onAssigneeClick(actualSprint, e);
    }
  };
  
  // Get initials for assignee avatar
  const getInitials = (name?: string | null) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <div 
      key={`${sprint.id}-${weekIndex}-${sprint.row}`}
      className="sprint-bar absolute h-6 z-10 cursor-pointer"
      onClick={handleClick}
      style={{
        gridRow: `row-sprint-${sprint.row}`,
        gridColumn: `${sprint.startDay + 1} / ${sprint.endDay + 2}`,
        top: `${24 + sprint.row * 24}px`,
        left: `${sprint.startDay * (100/7) + 1}%`,
        width: `${width * (100/7) - 2}%` // Giảm một chút để tạo khoảng cách
      }}
    >
      <div 
        className={`
          h-full flex items-center justify-between px-1.5 ${colors.bg} border ${colors.border} text-xs
          ${sprint.isFirst ? 'rounded-l' : 'border-l-0 rounded-l-none'} 
          ${sprint.isLast ? 'rounded-r' : 'border-r-0 rounded-r-none'}
          shadow-sm hover:shadow-md transition-shadow
        `}
      >
        {sprint.isFirst && (
          <>
            <div className="flex items-center">
              <input type="checkbox" className="w-3 h-3 mr-1.5 rounded text-blue-500" checked disabled />
              <span className={`truncate font-medium text-xs ${colors.text}`}>{sprint.name}</span>
            </div>
            
            <div 
              className="ml-auto cursor-pointer" 
              onClick={handleAssigneeClick}
            >
              {sprint.assigneeName ? (
                <div className="w-5 h-5 rounded-full bg-green-600 text-white text-[9px] font-medium flex items-center justify-center">
                  {getInitials(sprint.assigneeName)}
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
                  <User className="h-3 w-3" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// WeekRow component to render a week of the calendar
const WeekRow = ({ 
  week, 
  weekIndex, 
  currentDate, 
  sprints, 
  onSprintClick,
  onAssigneeClick
}: { 
  week: CalendarWeek, 
  weekIndex: number, 
  currentDate: Date, 
  sprints: Sprint[], 
  onSprintClick: (sprint: Sprint, e: React.MouseEvent) => void,
  onAssigneeClick: (sprint: Sprint, e: React.MouseEvent) => void
}) => (
  <div key={`week-${weekIndex}`} className="relative">
    {/* Ngày trong tuần */}
    <div className="grid grid-cols-7" style={{ minHeight: '65px' }}>
      {week.days.map((day, dayIndex) => (
        <div key={`day-${weekIndex}-${dayIndex}`}>
          <DayCell day={day} columnIndex={dayIndex} currentDate={currentDate} />
        </div>
      ))}
    </div>
    
    {/* Sprint bars cho tuần này */}
    {week.sprints.map(sprint => (
      <SprintBar 
        key={`sprint-${sprint.id}-${weekIndex}-${sprint.row}`}
        sprint={sprint} 
        weekIndex={weekIndex} 
        sprints={sprints} 
        onSprintClick={onSprintClick}
        onAssigneeClick={onAssigneeClick}
      />
    ))}
    
    {/* Khoảng trống dành cho các sprint (nếu có) */}
    <div 
      className="sprint-placeholder"
      style={{ 
        height: `${week.sprints.length > 0 ? week.sprints.reduce((max, s) => Math.max(max, s.row), 0) * 24 : 0}px`,
        marginBottom: '8px' // Thêm khoảng cách giữa các tuần
      }}
    ></div>
  </div>
);

// Loading component
const Loading = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></div>
  </div>
);

// Main Calendar component
const CalendarView = ({ 
  calendarData, 
  currentDate, 
  sprints, 
  onSprintClick,
  onAssigneeClick
}: { 
  calendarData: CalendarWeek[], 
  currentDate: Date, 
  sprints: Sprint[], 
  onSprintClick: (sprint: Sprint, e: React.MouseEvent) => void,
  onAssigneeClick: (sprint: Sprint, e: React.MouseEvent) => void
}) => (
  <div className="calendar-view p-4 pb-16">
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-gray-50">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
          <div key={index} className="py-2 font-medium text-center border-r text-gray-600">{day}</div>
        ))}
      </div>
      
      {/* Calendar grid */}
      {calendarData.map((week, weekIndex) => (
        <WeekRow 
          key={`week-${weekIndex}`}
          week={week} 
          weekIndex={weekIndex} 
          currentDate={currentDate}
          sprints={sprints}
          onSprintClick={onSprintClick}
          onAssigneeClick={onAssigneeClick}
        />
      ))}
    </div>
  </div>
);

// Main component
export default function CalendarPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams?.get("projectId") || null;
  
  // State variables
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), "MMMM yyyy"));
  const [calendarData, setCalendarData] = useState<CalendarWeek[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assignSprint, setAssignSprint] = useState<Sprint | null>(null);
  const [projectUsers, setProjectUsers] = useState<User[]>([]);
  
  // Fetch project users
  useEffect(() => {
    if (!projectId) return;
    
    const fetchProjectUsers = async () => {
      try {
        // Gọi API từ Projects-Service
        const response = await axios.get(`http://localhost:8083/api/projects/${projectId}/users`);
        const userData = response.data?.data || [];
        
        // Map backend data structure (username) to frontend structure (name)
        const mappedUsers = userData.map((user: { id: string; username: string; email?: string; avatar?: string; roleInProject?: string }) => ({
          id: user.id,
          name: user.username,
          email: user.email,
          avatar: user.avatar,
          roleInProject: user.roleInProject
        }));
        
        setProjectUsers(mappedUsers);
      } catch (error) {
        console.error("Error fetching project users:", error);
        // Demo users
        setProjectUsers([
          { id: "user1", name: "John Doe", email: "john@example.com" },
          { id: "user2", name: "Jane Smith", email: "jane@example.com" },
          { id: "user3", name: "Robert Johnson", email: "robert@example.com" },
          { id: "user4", name: "Sarah Williams", email: "sarah@example.com" },
          { id: "user5", name: "Michael Brown", email: "michael@example.com" }
        ]);
      }
    };
    
    fetchProjectUsers();
  }, [projectId]);
  
  // Tính toán và chuẩn bị dữ liệu cho lịch
  useEffect(() => {
    if (!sprints.length) return;
    
    // Tạo mảng các ngày trong tháng
    const monthStart = startOfMonth(currentDate);
    const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    
    // Tạo 5 tuần (thông thường đủ để hiển thị cả tháng)
    const weeks: CalendarWeek[] = [];
    
    for (let weekIndex = 0; weekIndex < 5; weekIndex++) {
      const weekDays: Date[] = [];
      
      // Tạo 7 ngày cho tuần
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const day = addDays(weekStart, weekIndex * 7 + dayIndex);
        weekDays.push(day);
      }
      
      // Tạo tuần mới với ngày và không có sprint
      weeks.push({
        days: weekDays,
        sprints: []
      });
    }
    
    // Duyệt qua các sprint và thêm vào tuần tương ứng
    sprints.forEach(sprint => {
      if (!sprint.startDate || !sprint.endDate) return;
      
      const startDate = parseISO(sprint.startDate);
      const endDate = parseISO(sprint.endDate);
      
      // Duyệt qua từng tuần
      weeks.forEach((week, weekIndex) => {
        // Kiểm tra xem sprint có giao với tuần hiện tại không
        const firstDayOfWeek = week.days[0];
        const lastDayOfWeek = week.days[6];
        
        // Sprint bắt đầu sau tuần này hoặc kết thúc trước tuần này
        if (startDate > lastDayOfWeek || endDate < firstDayOfWeek) {
          return; // Bỏ qua tuần này
        }
        
        // Tính toán vị trí bắt đầu và kết thúc trong tuần
        let startDay = 0;
        let endDay = 6;
        let isFirst = false;
        let isLast = false;
        
        // Nếu ngày bắt đầu sprint nằm trong tuần này
        if (startDate >= firstDayOfWeek && startDate <= lastDayOfWeek) {
          for (let i = 0; i < 7; i++) {
            if (isSameDay(week.days[i], startDate) || week.days[i] > startDate) {
              startDay = i;
              isFirst = true;
              break;
            }
          }
        }
        
        // Nếu ngày kết thúc sprint nằm trong tuần này
        if (endDate >= firstDayOfWeek && endDate <= lastDayOfWeek) {
          for (let i = 0; i < 7; i++) {
            if (isSameDay(week.days[i], endDate) || (i > 0 && week.days[i] > endDate && week.days[i-1] <= endDate)) {
              endDay = i;
              isLast = true;
              break;
            }
          }
        }
        
        // Thêm sprint vào tuần với hàng phù hợp
        // Tìm vị trí hàng trống
        let row = 1;
        const usedRows = new Set<number>();
        
        week.sprints.forEach(existingSprint => {
          // Kiểm tra xem có giao với sprint hiện tại không
          if (
            (startDay <= existingSprint.endDay && endDay >= existingSprint.startDay) || 
            (existingSprint.startDay <= endDay && existingSprint.endDay >= startDay)
          ) {
            usedRows.add(existingSprint.row);
          }
        });
        
        while (usedRows.has(row)) {
          row++;
        }
        
        // Thêm sprint vào tuần
        week.sprints.push({
          id: sprint.id,
          name: sprint.name,
          startDay,
          endDay,
          row,
          isFirst,
          isLast,
          assigneeId: sprint.assigneeId,
          assigneeName: sprint.assigneeName
        });
      });
    });
    
    setCalendarData(weeks);
  }, [sprints, currentDate]);
  
  useEffect(() => {
    if (!projectId) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all sprints
        const sprintsResponse = await axios.get(
          `http://localhost:8084/api/sprints/project/${projectId}`
        );
        const sprintsData = sprintsResponse.data?.data || [];
        setSprints(sprintsData);
        
        // Fetch all tasks
        const tasksResponse = await axios.get(
          `http://localhost:8085/api/tasks/project/${projectId}`
        );
        const tasksData = tasksResponse.data || [];
        setTasks(tasksData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Lỗi khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [projectId]);
  
  // Navigation functions
  const previousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
    setCurrentMonth(format(newDate, "MMMM yyyy"));
  };
  
  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
    setCurrentMonth(format(newDate, "MMMM yyyy"));
  };
  
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setCurrentMonth(format(today, "MMMM yyyy"));
  };
  
  // Update sprint with new assignee
  const handleAssignSprint = async (sprintId: string, userId: string | null, userName: string | null) => {
    if (!sprintId) return;
    
    try {
      // API call to update sprint
      await axios.put(`http://localhost:8084/api/sprints/${sprintId}`, {
        assigneeId: userId,
        assigneeName: userName
      });
      
      // Update local state
      setSprints(prevSprints => 
        prevSprints.map(sprint => 
          sprint.id === sprintId 
            ? { ...sprint, assigneeId: userId, assigneeName: userName } 
            : sprint
        )
      );
      
      // Update calendar data to reflect the change
      setCalendarData(prevData => {
        const newData = [...prevData];
        
        // Update each week's sprints
        newData.forEach(week => {
          week.sprints.forEach(sprint => {
            if (sprint.id === sprintId) {
              sprint.assigneeId = userId;
              sprint.assigneeName = userName;
            }
          });
        });
        
        return newData;
      });
      
      toast.success("Sprint assignee updated");
    } catch (error) {
      console.error("Error updating sprint assignee:", error);
      toast.error("Failed to update assignee");
    } finally {
      setShowAssigneeDropdown(false);
    }
  };
  
  // Handle clicks
  const handleSprintClick = (sprint: Sprint, e: React.MouseEvent) => {
    setSelectedSprint(sprint);
    // Calculate position for the modal
    const rect = e.currentTarget.getBoundingClientRect();
    setModalPosition({
      x: rect.right,
      y: rect.top
    });
    setShowSprintModal(true);
  };
  
  const handleAssigneeClick = (sprint: Sprint, e: React.MouseEvent) => {
    setAssignSprint(sprint);
    const rect = e.currentTarget.getBoundingClientRect();
    setModalPosition({
      x: rect.left,
      y: rect.bottom
    });
    setShowAssigneeDropdown(true);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar projectId={projectId || undefined} />
      <div className="flex-1 flex flex-col">
        <TopNavigation />
        <div className="flex-1 overflow-y-auto">
          {/* Calendar toolbar */}
          <CalendarToolbar 
            currentDate={currentDate}
            goToToday={goToToday}
            previousMonth={previousMonth}
            nextMonth={nextMonth}
          />
          
          {loading ? (
            <Loading />
          ) : (
            <CalendarView 
              calendarData={calendarData} 
              currentDate={currentDate} 
              sprints={sprints} 
              onSprintClick={handleSprintClick}
              onAssigneeClick={handleAssigneeClick}
            />
          )}
          
          {/* Sprint detail popup */}
          {showSprintModal && selectedSprint && (
            <SprintDetailPopup 
              sprint={selectedSprint} 
              position={modalPosition} 
              onClose={() => setShowSprintModal(false)} 
            />
          )}
          
          {/* Assignee dropdown */}
          {showAssigneeDropdown && assignSprint && (
            <AssigneeDropdown 
              sprint={assignSprint}
              users={projectUsers}
              position={modalPosition}
              onAssign={handleAssignSprint}
              onClose={() => setShowAssigneeDropdown(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
} 