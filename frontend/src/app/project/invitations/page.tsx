"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Check, X, Calendar, Users, Mail, Clock } from "lucide-react";
import { useUserStorage } from "@/hooks/useUserStorage";
import { toast } from "sonner";
import axios from "axios";

// ✅ Avatar Component for users
const UserAvatar = ({ username, avatar, size = "md" }: { username: string; avatar?: string; size?: "sm" | "md" | "lg" }) => {
    const sizeClasses = {
        sm: "w-5 h-5 text-xs",
        md: "w-8 h-8 text-sm", 
        lg: "w-10 h-10 text-base"
    };
    
    const sizeClass = sizeClasses[size];
    
    // Check if avatar is a valid URL (Cloudinary or other image URL)
    const isValidImageUrl = (url?: string) => {
        if (!url) return false;
        return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
    };
    
    if (isValidImageUrl(avatar)) {
        return (
            <img
                src={avatar}
                alt={username}
                className={`${sizeClass} rounded-full object-cover border border-gray-200`}
                onError={(e) => {
                    // Hide image and show fallback
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                }}
            />
        );
    }
    
    // Fallback to initials
    return (
        <div className={`${sizeClass} bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium border border-gray-200 shadow-sm`}>
            {username.charAt(0).toUpperCase()}
        </div>
    );
};

interface ProjectInvitation {
    id: number;
    userId: string;
    type: string;
    message: string;
    actionUrl: string;
    isRead: boolean;
    createdAt: string;
    projectId?: string;
    projectName?: string;
    invitedBy?: string;
    invitedByName?: string;
}

interface Project {
    id: string;
    name: string;
    description: string;
    key: string;
    projectType: string;
    access: string;
    deadline: string;
    ownerId: string;
    createdAt: string;
}

export default function ProjectInvitationsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { userData } = useUserStorage();
    
    const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
    const [projects, setProjects] = useState<{[key: string]: Project}>({});
    const [isLoading, setIsLoading] = useState(true);
    const [processingInvitations, setProcessingInvitations] = useState<Set<number>>(new Set());
    
    const projectId = searchParams?.get("projectId");
    const currentUserId = userData?.profile?.id || userData?.account?.id;

    useEffect(() => {
        if (currentUserId) {
            fetchInvitations();
        }
    }, [currentUserId]);

    const fetchInvitations = async () => {
        setIsLoading(true);
        try {
            // Fetch all notifications for the user
            const response = await axios.get(`http://localhost:8089/api/notifications/user/${currentUserId}`);
            
            if (response.data && response.data.status === "SUCCESS") {
                // Filter for PROJECT_INVITE notifications
                const projectInvites = response.data.data.filter(
                    (notification: ProjectInvitation) => notification.type === 'PROJECT_INVITE'
                );
                
                setInvitations(projectInvites);
                
                // Fetch project details for each invitation
                const projectIds = [...new Set(projectInvites.map((inv: ProjectInvitation) => inv.projectId).filter(Boolean))];
                const projectPromises = projectIds.map(async (projId) => {
                    try {
                        const projResponse = await axios.get(`http://localhost:8083/api/projects/${projId}`);
                        if (projResponse.data && projResponse.data.status === "SUCCESS") {
                            return { id: projId, data: projResponse.data.data };
                        }
                        return null;
                    } catch (error) {
                        console.error(`Failed to fetch project ${projId}:`, error);
                        return null;
                    }
                });
                
                const projectResults = await Promise.all(projectPromises);
                const projectsData: {[key: string]: Project} = {};
                projectResults.forEach(result => {
                    if (result) {
                        projectsData[result.id] = result.data;
                    }
                });
                setProjects(projectsData);
            }
        } catch (error) {
            console.error("Error fetching invitations:", error);
            toast.error("Failed to load invitations");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcceptInvitation = async (invitation: ProjectInvitation) => {
        if (!invitation.projectId || !currentUserId) return;
        
        setProcessingInvitations(prev => new Set([...prev, invitation.id]));
        
        try {
            // Add user to project using correct backend model structure
            const projectMemberData = {
                userId: currentUserId,
                roleInProject: "developer" // Default role - backend will set this
            };
            
            // Call API to add member to project
            await axios.post(`http://localhost:8083/api/projects/${invitation.projectId}/members`, projectMemberData);
            
            // Mark notification as read
            await axios.patch(`http://localhost:8089/api/notifications/${invitation.id}/read`);
            
            // Send acceptance notification to project owner
            if (invitation.invitedBy) {
                const acceptanceNotificationData = {
                    userId: invitation.invitedBy,
                    type: 'PROJECT_INVITE_ACCEPTED',
                    message: `${userData?.profile?.username || 'User'} accepted your invitation to join "${invitation.projectName}"`,
                    actionUrl: `/project/project_homescreen?projectId=${invitation.projectId}`,
                    isRead: false
                };
                
                await axios.post('http://localhost:8089/api/notifications/create', acceptanceNotificationData);
            }
            
            toast.success(`Successfully joined "${invitation.projectName}"!`);
            
            // Remove from local state
            setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
            
            // Redirect to project
            router.push(`/project/project_homescreen?projectId=${invitation.projectId}`);
            
        } catch (error) {
            console.error("Error accepting invitation:", error);
            toast.error("Failed to accept invitation");
        } finally {
            setProcessingInvitations(prev => {
                const newSet = new Set(prev);
                newSet.delete(invitation.id);
                return newSet;
            });
        }
    };

    const handleDeclineInvitation = async (invitation: ProjectInvitation) => {
        setProcessingInvitations(prev => new Set([...prev, invitation.id]));
        
        try {
            // Mark notification as read
            await axios.patch(`http://localhost:8089/api/notifications/${invitation.id}/read`);
            
            // Send decline notification to project owner
            if (invitation.invitedBy) {
                const declineNotificationData = {
                    userId: invitation.invitedBy,
                    type: 'PROJECT_INVITE_DECLINED',
                    message: `${userData?.profile?.username || 'User'} declined your invitation to join "${invitation.projectName}"`,
                    actionUrl: `/project/project_homescreen?projectId=${invitation.projectId}`,
                    isRead: false
                };
                
                await axios.post('http://localhost:8089/api/notifications/create', declineNotificationData);
            }
            
            toast.success("Invitation declined");
            
            // Remove from local state
            setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
            
        } catch (error) {
            console.error("Error declining invitation:", error);
            toast.error("Failed to decline invitation");
        } finally {
            setProcessingInvitations(prev => {
                const newSet = new Set(prev);
                newSet.delete(invitation.id);
                return newSet;
            });
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getProjectTypeIcon = (type: string) => {
        return type === "Team-managed" ? "👥" : "🏢";
    };

    const getAccessIcon = (access: string) => {
        return access === "Private" ? "🔒" : "🌐";
    };

    if (isLoading) {
        return (
            <div className="flex h-screen bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <TopNavigation />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <TopNavigation />
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Invitations</h1>
                            <p className="text-gray-600">Manage your project invitations and join teams</p>
                        </div>

                        {invitations.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
                                <p className="text-gray-600">You don't have any pending project invitations at the moment.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {invitations.map((invitation) => {
                                    const project = projects[invitation.projectId || ''];
                                    const isProcessing = processingInvitations.has(invitation.id);
                                    
                                    return (
                                        <div key={invitation.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                                            <div className="p-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-md">
                                                                {project?.name?.charAt(0) || invitation.projectName?.charAt(0) || 'P'}
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className="text-lg font-semibold text-gray-900">
                                                                    {project?.name || invitation.projectName || 'Unknown Project'}
                                                                </h3>
                                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                    <UserAvatar 
                                                                        username={invitation.invitedByName || 'Project Owner'} 
                                                                        size="sm"
                                                                    />
                                                                    <span>Invited by {invitation.invitedByName || 'Project Owner'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <p className="text-gray-700 mb-4">{invitation.message}</p>
                                                        
                                                        {project && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                                                                <div>
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                                        <span>{getProjectTypeIcon(project.projectType)}</span>
                                                                        <span>Type: {project.projectType}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                        <span>{getAccessIcon(project.access)}</span>
                                                                        <span>Access: {project.access}</span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                                        <Calendar className="w-4 h-4" />
                                                                        <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                        <Clock className="w-4 h-4" />
                                                                        <span>Invited: {formatDate(invitation.createdAt)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {project?.description && (
                                                            <p className="text-sm text-gray-600 mb-4 italic">
                                                                "{project.description}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-3 mt-6">
                                                    <Button
                                                        onClick={() => handleAcceptInvitation(invitation)}
                                                        disabled={isProcessing}
                                                        className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        {isProcessing ? 'Accepting...' : 'Accept'}
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleDeclineInvitation(invitation)}
                                                        disabled={isProcessing}
                                                        variant="outline"
                                                        className="border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-2"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        {isProcessing ? 'Declining...' : 'Decline'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 