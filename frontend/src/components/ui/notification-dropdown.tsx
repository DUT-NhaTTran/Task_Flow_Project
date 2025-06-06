"use client"

import React, { useState, useEffect, useRef } from "react"
import { Bell, Check, X, MoreHorizontal, Settings, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import axios from "axios"
import { formatDistanceToNow, format, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from "sonner"

interface Notification {
    id: string
    type: 'TASK_ASSIGNED' | 'TASK_REASSIGNED' | 'TASK_UPDATED' | 'TASK_COMMENT' | 'TASK_CREATED' | 'TASK_DELETED' | 'TASK_MOVED' | 'TASK_STATUS_CHANGED' | 'PROJECT_INVITE' | 'PROJECT_DELETED' | 'SPRINT_UPDATED' | 'SPRINT_CREATED' | 'SPRINT_STARTED' | 'SPRINT_ENDED' | 'TASK_MENTIONED' | 'MENTIONED_IN_COMMENT' | 'FILE_ATTACHED' | 'TAGGED_IN_TASK' | 'REMINDER'
    title: string
    message: string
    recipientUserId: string
    actorUserId?: string
    actorUserName?: string
    actorUserAvatar?: string
    projectId?: string
    projectName?: string
    taskId?: string
    sprintId?: string
    commentId?: string
    actionUrl?: string
    isRead: boolean
    createdAt: string
    readAt?: string
}

interface NotificationDropdownProps {
    userId: string
}

// Custom time formatting function for accurate Vietnamese time
const formatTimeAgo = (dateString: string): string => {
    try {
        const date = new Date(dateString)
        const now = new Date()
        
        const minutesAgo = differenceInMinutes(now, date)
        const hoursAgo = differenceInHours(now, date)
        const daysAgo = differenceInDays(now, date)
        
        if (minutesAgo < 1) {
            return "Vừa xong"
        } else if (minutesAgo < 60) {
            return `${minutesAgo} phút trước`
        } else if (hoursAgo < 24) {
            return `${hoursAgo} giờ trước`
        } else if (daysAgo === 1) {
            return "Hôm qua"
        } else if (daysAgo < 7) {
            return `${daysAgo} ngày trước`
        } else {
            // Show exact date for older notifications
            return format(date, "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })
        }
    } catch (error) {
        console.error("Error formatting time:", error)
        return "Thời gian không xác định"
    }
}

export function NotificationDropdown({ userId }: NotificationDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [selectedTab, setSelectedTab] = useState<'all' | 'unread'>('all')
    const [previousNotificationCount, setPreviousNotificationCount] = useState(0)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    // Get user ID from localStorage - simplified and reliable
    const getUserId = (): string | null => {
        // If userId is provided directly, use it
        if (userId) {
            return userId;
        }
        
        const possibleKeys = ["ownerId", "userId", "currentUserId", "user_id", "id"]
        
        for (const key of possibleKeys) {
            const value = localStorage.getItem(key)
            if (value) {
                return value
            }
        }
        
        return null
    }

   
    // Simple refresh function
    const handleSimpleRefresh = () => {
        setIsRefreshing(true)
        // Clear current notifications to force complete refresh
        setNotifications([])
        setUnreadCount(0)
        // Set a small timeout to ensure UI shows loading state
        setTimeout(() => {
            fetchDirectFromDatabase(true)
        }, 100)
    }
    
    // Load notifications on mount and set up polling
    useEffect(() => {
        // Set current user ID once on mount
        const userId = getUserId();
        setCurrentUserId(userId);
        
        // Initial fetch
        fetchDirectFromDatabase()
        
        // Set up polling interval for realtime updates - 5 seconds
        const interval = setInterval(() => {
            fetchDirectFromDatabase()
        }, 5000) // Poll every 5 seconds as requested
        
        // Save interval reference for cleanup
        pollingIntervalRef.current = interval;
        
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
            }
        }
    }, [])
    
    // Force refresh when dropdown is opened
    useEffect(() => {
        if (isOpen) {
            fetchDirectFromDatabase(true)
        }
    }, [isOpen])

    // Mark single notification as read
    const markAsRead = async (notificationId: string) => {
        try {
            const userId = getUserId();
            if (!userId) {
                console.error("No user ID found for marking notification as read")
                return
            }
            
            console.log(`Marking notification ${notificationId} as read`)
            await axios.patch(`http://localhost:8089/api/notifications/${notificationId}/read`, {
                userId: userId
            })
            
            // Update local state
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, isRead: true } : n
                )
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
            
        } catch (error) {
            console.error("Error marking notification as read:", error)
            // Update locally anyway for better UX
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, isRead: true } : n
                )
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        }
    }

    // Mark all notifications as read
    const markAllAsRead = async () => {
        const userId = getUserId();
        if (!userId) {
            console.log("❌ No user ID for mark all as read")
            toast.error("Cannot mark all as read - no user found")
            return
        }

        try {
            console.log("📝 Marking all notifications as read for user:", userId)
            
            // Call the mark-all-read endpoint
            await axios.patch(`http://localhost:8089/api/notifications/user/${userId}/mark-all-read`)
            console.log("✅ Bulk mark-all-read successful")
            
            // Update local state
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            setUnreadCount(0)
            toast.success("All notifications marked as read")
            
        } catch (error) {
            console.error("❌ Error marking all notifications as read:", error)
            
            // Try fallback approach with individual updates
            try {
                const unreadNotifications = notifications.filter(n => !n.isRead)
                const markPromises = unreadNotifications.map(notification => 
                    axios.patch(`http://localhost:8089/api/notifications/${notification.id}/read`, {
                        userId: userId
                    })
                );
                
                await Promise.allSettled(markPromises)
                console.log("✅ Individual mark-as-read completed")
                
                // Update local state
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
                setUnreadCount(0)
                toast.success("All notifications marked as read")
                
            } catch (fallbackError) {
                console.error("❌ Fallback also failed:", fallbackError)
                
                // Update locally anyway for better UX
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
                setUnreadCount(0)
                toast.warning("Marked locally - sync may be incomplete")
            }
        }
    }

    const deleteNotification = async (notificationId: string) => {
        try {
            await axios.delete(`http://localhost:8089/api/notifications/${notificationId}`)
            setNotifications(prev => prev.filter(n => n.id !== notificationId))
            const deletedNotification = notifications.find(n => n.id === notificationId)
            if (deletedNotification && !deletedNotification.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1))
            }
        } catch (error) {
            console.error("Error deleting notification:", error)
            // Update locally anyway for better UX
            setNotifications(prev => prev.filter(n => n.id !== notificationId))
            const deletedNotification = notifications.find(n => n.id === notificationId)
            if (deletedNotification && !deletedNotification.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1))
            }
        }
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            markAsRead(notification.id)
        }
        
        // Navigate using the action URL from backend (already has correct format)
        if (notification.actionUrl) {
            console.log('Navigating to:', notification.actionUrl)
            window.location.href = `http://localhost:3001${notification.actionUrl}`
        } else if (notification.projectId) {
            // Fallback: navigate to project homescreen if no actionUrl but has projectId
            const fallbackUrl = notification.taskId 
                ? `/project/project_homescreen?projectId=${notification.projectId}&taskId=${notification.taskId}`
                : `/project/project_homescreen?projectId=${notification.projectId}`;
            console.log('Fallback navigation to:', fallbackUrl)
            window.location.href = `http://localhost:3001${fallbackUrl}`
        }
        
        setIsOpen(false)
    }

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'TASK_ASSIGNED':
            case 'TASK_REASSIGNED':
                return '👤'
            case 'TASK_UPDATED':
            case 'TASK_STATUS_CHANGED':
            case 'TASK_MOVED':
                return '🔄'
            case 'TASK_COMMENT':
            case 'MENTIONED_IN_COMMENT':
                return '💬'
            case 'TASK_CREATED':
                return '✅'
            case 'TASK_DELETED':
                return '🗑️'
            case 'PROJECT_INVITE':
            case 'PROJECT_DELETED':
                return '📋'
            case 'SPRINT_UPDATED':
            case 'SPRINT_CREATED':
            case 'SPRINT_STARTED':
            case 'SPRINT_ENDED':
                return '🏃‍♂️'
            case 'TASK_MENTIONED':
            case 'TAGGED_IN_TASK':
                return '🏷️'
            case 'FILE_ATTACHED':
                return '📎'
            case 'REMINDER':
                return '⏰'
            default:
                return '📢'
        }
    }

    const getNotificationColor = (type: Notification['type']) => {
        switch (type) {
            case 'TASK_ASSIGNED':
            case 'TASK_REASSIGNED':
                return 'bg-blue-500'
            case 'TASK_UPDATED':
            case 'TASK_STATUS_CHANGED':
            case 'TASK_MOVED':
                return 'bg-green-500'
            case 'TASK_COMMENT':
            case 'MENTIONED_IN_COMMENT':
                return 'bg-purple-500'
            case 'TASK_CREATED':
                return 'bg-emerald-500'
            case 'TASK_DELETED':
                return 'bg-red-500'
            case 'PROJECT_INVITE':
            case 'PROJECT_DELETED':
                return 'bg-orange-500'
            case 'SPRINT_UPDATED':
            case 'SPRINT_CREATED':
            case 'SPRINT_STARTED':
            case 'SPRINT_ENDED':
                return 'bg-indigo-500'
            case 'TASK_MENTIONED':
            case 'TAGGED_IN_TASK':
                return 'bg-pink-500'
            case 'FILE_ATTACHED':
                return 'bg-amber-500'
            case 'REMINDER':
                return 'bg-yellow-500'
            default:
                return 'bg-gray-500'
        }
    }

    const filteredNotifications = selectedTab === 'unread' 
        ? notifications.filter(n => !n.isRead)
        : notifications

    // Fetch notifications directly from database - realtime approach
    const fetchDirectFromDatabase = async (forceRefresh = false) => {
        // Show loading state only when manually refreshing or force refresh
        if (isRefreshing || forceRefresh) {
            setIsLoading(true)
        }
        
        try {
            // Get current user ID
            const userId = getUserId()
            if (!userId) {
                console.error("No user ID found")
                return
            }
            
            // Set current user ID if not already set
            if (!currentUserId) {
                setCurrentUserId(userId)
            }
            
            // Create a completely unique URL to bypass all caching
            const timestamp = Date.now()
            const url = `http://localhost:8089/api/notifications/user/${userId}?_=${timestamp}&forceRefresh=${forceRefresh ? 'true' : 'false'}`
            
            console.log("Fetching notifications from:", url)
            
            // Make a direct fetch call with timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout for manual refresh
            
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        'X-Force-Refresh': forceRefresh ? 'true' : 'false'
                    },
                    cache: 'no-store',
                    signal: controller.signal
                })
                
                clearTimeout(timeoutId)
                
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`)
                }
                
                // Parse JSON response
                const data = await response.json()
                
                // Extract notifications from response
                let fetchedNotifications = []
                if (Array.isArray(data)) {
                    fetchedNotifications = data
                } else if (data?.data && Array.isArray(data.data)) {
                    fetchedNotifications = data.data
                } else {
                    console.error("Unexpected response format:", data)
                    return
                }
                
                // Sort by creation date in descending order to ensure newest first
                fetchedNotifications.sort((a: Notification, b: Notification) => {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                })
                
                // Log the number of notifications received
                console.log(`Received ${fetchedNotifications.length} notifications from server`)
                
                // Update state
                setNotifications(fetchedNotifications)
                const newUnreadCount = fetchedNotifications.filter((n: Notification) => !n.isRead).length
                setUnreadCount(newUnreadCount)
                
                // Show notification for new unread items if dropdown is not open
                if (!isOpen && newUnreadCount > unreadCount && unreadCount > 0) {
                    toast.info(`You have ${newUnreadCount - unreadCount} new notification(s)`)
                }
                
                if (isRefreshing || forceRefresh) {
                    toast.success(`Loaded ${fetchedNotifications.length} notifications`)
                }
                
                console.log(`Successfully loaded ${fetchedNotifications.length} notifications (${newUnreadCount} unread)`)
            } catch (fetchError: any) {
                clearTimeout(timeoutId)
                // Check if this is an abort error (timeout)
                if (fetchError.name === 'AbortError') {
                    console.error("Request timed out after 10 seconds")
                    if (isRefreshing || forceRefresh) {
                        toast.error("Request timed out. Server may be unavailable.")
                    }
                } else {
                    throw fetchError // rethrow for outer catch
                }
            }
        } catch (error: any) {
            console.error("Error fetching notifications:", error)
            
            // Only show toast on manual refresh
            if (isRefreshing || forceRefresh) {
                // Show a more specific error message
                if (error.message && error.message.includes("Failed to fetch")) {
                    toast.error("Cannot connect to notification server. Is it running?")
                } else {
                    toast.error("Failed to load notifications: " + (error.message || "Unknown error"))
                }
            }
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notification Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                    <Badge 
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0 border-2 border-white"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[600px] overflow-hidden">
                    {/* Header with tabs and actions */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-1">
                            <button
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                    selectedTab === 'all'
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                                onClick={() => setSelectedTab('all')}
                            >
                                All ({notifications.length})
                            </button>
                            <button
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                    selectedTab === 'unread'
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                                onClick={() => setSelectedTab('unread')}
                            >
                                Unread ({unreadCount})
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            
                            
                            {/* Manual refresh button */}
                            <button
                                onClick={() => {
                                    handleSimpleRefresh()
                                }}
                                disabled={isRefreshing}
                                className={`p-1 rounded-md transition-colors ${
                                    isRefreshing
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                                title="Refresh notifications"
                            >
                                <svg 
                                    className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                                    />
                                </svg>
                            </button>
                            
                            {/* Mark all as read button */}
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent mx-auto mb-2"></div>
                                <p className="text-gray-500">Loading notifications...</p>
                            </div>
                        ) : filteredNotifications.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {filteredNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors group ${
                                            !notification.isRead ? 'bg-blue-50' : ''
                                        }`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon */}
                                            <div className={`w-10 h-10 ${getNotificationColor(notification.type)} rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                                                <span className="text-lg">
                                                    {getNotificationIcon(notification.type)}
                                                </span>
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                            <span>{formatTimeAgo(notification.createdAt)}</span>
                                                            {notification.projectName && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>{notification.projectName}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {!notification.isRead && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    markAsRead(notification.id)
                                                                }}
                                                                className="p-1 h-6 w-6"
                                                            >
                                                                <Check className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                deleteNotification(notification.id)
                                                            }}
                                                            className="p-1 h-6 w-6"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                
                                                {/* Read indicator */}
                                                {!notification.isRead && (
                                                    <Circle className="absolute left-2 top-4 h-2 w-2 fill-blue-500 text-blue-500" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">
                                    {selectedTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                    {selectedTab === 'unread' 
                                        ? 'You\'re all caught up!' 
                                        : 'When you get notifications, they\'ll show up here'
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {filteredNotifications.length > 0 && (
                        <div className="p-3 border-t border-gray-100 bg-gray-50">
                            <Button
                                variant="ghost"
                                className="w-full text-sm text-blue-600 hover:text-blue-700"
                                onClick={() => {
                                    window.location.href = '/notifications'
                                    setIsOpen(false)
                                }}
                            >
                                View all notifications
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
} 