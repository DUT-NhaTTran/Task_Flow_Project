"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreHorizontal, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Dropdown } from "@/components/ui/drop-down";
import { useRouter } from "next/navigation";
import { useUserStorage } from "@/hooks/useUserStorage";
import { toast } from "sonner";
import UserStorageService from "@/services/userStorageService";

interface Project {
    id: string;
    name: string;
    key: string;
    projectType: string;
    access: string;
    leadName?: string;
    ownerId?: string;
    ownerName?: string;
    ownerAvatar?: string;
    canEdit?: boolean;
    canDelete?: boolean;
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState<string>("All");
    const [isLoading, setIsLoading] = useState(true);
    const { userData, isLoading: userLoading } = useUserStorage();
    const router = useRouter();
    const [noUserFound, setNoUserFound] = useState(false);
    const [enrichingProjects, setEnrichingProjects] = useState(false);
    
    // Confirmation modal state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    
    // Cache for project details to avoid repeated API calls
    const [projectDetailsCache, setProjectDetailsCache] = useState<Record<string, Project>>({});
    // Cache for user details to avoid repeated API calls  
    const [userDetailsCache, setUserDetailsCache] = useState<Record<string, any>>({});

    // Helper function to get user ID from multiple sources
    const getUserId = () => {
        console.log('🔍 DEBUG: Getting user ID...');
        
        // Try userData first (from UserContext)
        if (userData?.account?.id) {
            console.log('✅ Found user ID in userData.account.id:', userData.account.id);
            return userData.account.id;
        }
        
        if (userData?.profile?.id) {
            console.log('✅ Found user ID in userData.profile.id:', userData.profile.id);
            return userData.profile.id;
        }
        
        // Check UserStorageService (sessionStorage) - PRIMARY source after login
        try {
            const loggedInUser = UserStorageService.getLoggedInUser();
            if (loggedInUser?.account?.id) {
                console.log('✅ Found user ID in UserStorageService.account.id:', loggedInUser.account.id);
                return loggedInUser.account.id;
            }
            if (loggedInUser?.profile?.id) {
                console.log('✅ Found user ID in UserStorageService.profile.id:', loggedInUser.profile.id);
                return loggedInUser.profile.id;
            }
        } catch (error) {
            console.warn('⚠️ Error accessing UserStorageService:', error);
        }
        
        // Check sessionStorage directly (where login data is actually stored)
        try {
            const taskflowUser = sessionStorage.getItem('taskflow_logged_user');
            if (taskflowUser) {
                const userData = JSON.parse(taskflowUser);
                if (userData?.account?.id) {
                    console.log('✅ Found user ID in sessionStorage.account.id:', userData.account.id);
                    return userData.account.id;
                }
                if (userData?.profile?.id) {
                    console.log('✅ Found user ID in sessionStorage.profile.id:', userData.profile.id);
                    return userData.profile.id;
                }
            }
        } catch (error) {
            console.warn('⚠️ Error parsing sessionStorage data:', error);
        }
        
        // Debug userData structure
        console.log('🔍 Full userData object:', userData);
        
        // Fallback to localStorage (for backward compatibility)
        const possibleUserKeys = [
            "ownerId", "userId", "user_id", "currentUserId", 
            "id", "accountId", "account_id"
        ];
        
        for (const key of possibleUserKeys) {
            const value = localStorage.getItem(key);
            if (value && value.trim() && !value.includes('undefined') && !value.includes('null')) {
                console.log(`✅ Found user ID in localStorage.${key}:`, value);
                return value;
            }
        }
        
        // Log all storage data for debugging
        console.log('🔍 All localStorage keys:', Object.keys(localStorage));
        console.log('🔍 All sessionStorage keys:', Object.keys(sessionStorage));
        
        console.error('❌ No user ID found anywhere!');
        return null;
    };

    useEffect(() => {
        // Wait for user context to finish loading
        if (!userLoading) {
            const userId = getUserId();
            if (userId) {
                fetchAllProjects();
            } else {
                console.error("No user ID found in context or localStorage");
                setIsLoading(false);
            }
        }
    }, [userData?.account?.id, userLoading]);

    // Handle escape key and click outside for delete modal
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showDeleteConfirm) {
                setShowDeleteConfirm(false);
                setProjectToDelete(null);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showDeleteConfirm]);

    const fetchAllProjects = async () => {
        try {
            setIsLoading(true);
            console.log('🚀 Starting fetchAllProjects...');
            
            // Get user ID from context
            const userId = getUserId();
            if (!userId) {
                console.error("❌ No user ID found in context or localStorage");
                console.log('📊 Debug info:', {
                    userLoading,
                    userData,
                    hasUserData: !!userData,
                    accountId: userData?.account?.id,
                    profileId: userData?.profile?.id,
                    localStorageOwnerId: localStorage.getItem("ownerId"),
                    localStorageUserId: localStorage.getItem("userId")
                });
                setNoUserFound(true);
                setIsLoading(false);
                return;
            }

            setNoUserFound(false);

            console.log("✅ Fetching all projects for user:", userId);
            
            // Use the correct API to get all projects where user is owner or member
            const apiUrl = `http://localhost:8083/api/projects/search/member?keyword=&userId=${userId}`;
            console.log('📡 API URL:', apiUrl);
            
            const response = await axios.get(apiUrl);
            
            console.log('📡 Raw API Response:', response);
            console.log('📡 Response Status:', response.status);
            console.log('📡 Response Data:', response.data);
            
            if (response.status === 200) {
                // Handle different response formats
                // Format 1: {status: "SUCCESS", data: [...]}
                // Format 2: {data: [...], status: 200, statusText: '', headers: {...}}
                
                const responseData = response.data;
                let projectsData = [];
                
                if (responseData?.status === "SUCCESS" && responseData?.data) {
                    // Format 1: Standard API response with status: "SUCCESS"
                    projectsData = responseData.data;
                    console.log('✅ Using Format 1 (status: SUCCESS)');
                } else if (Array.isArray(responseData?.data)) {
                    // Format 2: Direct data array in response.data
                    projectsData = responseData.data;
                    console.log('✅ Using Format 2 (direct data array)');
                } else if (Array.isArray(responseData)) {
                    // Format 3: Response is directly an array
                    projectsData = responseData;
                    console.log('✅ Using Format 3 (response is array)');
                } else {
                    console.error("❌ Unexpected response format:", responseData);
                    setProjects([]);
                    return;
                }
                
                console.log('✅ Projects fetched successfully:', projectsData.length, 'projects');
                console.log('📋 Projects data:', projectsData);
                
                setProjects(projectsData);
                
                // Only enrich if we have projects
                if (projectsData.length > 0) {
                    // Enrich projects with detailed info and permissions in background
                    enrichProjectsWithPermissions(projectsData);
                } else {
                    console.log('ℹ️ No projects found for user');
                }
            } else {
                console.error("❌ HTTP request failed with status:", response.status);
                setProjects([]);
            }
        } catch (error) {
            console.error("❌ Error fetching all projects:", error);
            
            // Enhanced error logging
            if (axios.isAxiosError(error)) {
                console.error('📡 Axios Error Details:', {
                    message: error.message,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    url: error.config?.url
                });
                
                if (error.response?.status === 404) {
                    console.error('❌ API endpoint not found - check if backend is running');
                } else if (error.response?.status === 500) {
                    console.error('❌ Server error - check backend logs');
                }
            } else {
                console.error('❌ Non-Axios error:', error);
            }
            
            setProjects([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to enrich projects with detailed info and permissions
    const enrichProjectsWithPermissions = async (basicProjects: Project[]) => {
        console.log('🔄 Enriching projects with permissions and owner names...');
        setEnrichingProjects(true);
        
        try {
            // Process projects in batches to avoid overwhelming the API
            const batchSize = 3; // Reduced batch size since we're making more API calls
            for (let i = 0; i < basicProjects.length; i += batchSize) {
                const batch = basicProjects.slice(i, i + batchSize);
                
                const enrichedBatch = await Promise.all(
                    batch.map(async (project) => {
                        const details = await fetchProjectDetails(project.id);
                        return details || project; // Use detailed info if available, fallback to basic
                    })
                );
                
                // Update projects state with enriched data
                setProjects(prev => 
                    prev.map(p => {
                        const enriched = enrichedBatch.find(e => e.id === p.id);
                        return enriched || p;
                    })
                );
                
                console.log(`✅ Enriched batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(basicProjects.length/batchSize)} with owner names and avatars`);
                
                // Small delay between batches to be nice to the API
                if (i + batchSize < basicProjects.length) {
                    await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay
                }
            }
            
            console.log('✅ Finished enriching all projects with permissions, owner names and avatars');
        } finally {
            setEnrichingProjects(false);
        }
    };

    const fetchSearchResults = async (term: string) => {
        try {
            // Get user ID from context
            const userId = getUserId();
            if (!userId) {
                console.error("No user ID found in context or localStorage");
                return;
            }

            console.log('🔍 Searching projects with term:', term, 'for user:', userId);
            
            // Sử dụng API search với user membership
            const res = await axios.get("http://localhost:8083/api/projects/search/member", {
                params: { keyword: term, userId: userId },
            });
            
            console.log('🔍 Search API response:', res.data);
            
            // Handle different response formats
            let projectsData = [];
            
            if (res.data?.status === "SUCCESS" && res.data?.data) {
                projectsData = res.data.data;
            } else if (Array.isArray(res.data?.data)) {
                projectsData = res.data.data;
            } else if (Array.isArray(res.data)) {
                projectsData = res.data;
            } else {
                console.warn('⚠️ Unexpected search response format:', res.data);
                projectsData = [];
            }
            
            setProjects(projectsData);
            console.log(`✅ Found ${projectsData.length} projects matching "${term}" where user is member`);
        } catch (err) {
            console.error("Error searching user projects:", err);
            setProjects([]);
        }
    };

    const fetchFilteredProjects = async (type: string) => {
        try {
            if (type === "All") {
                fetchAllProjects();
                return;
            }

            // Get user ID from context
            const userId = getUserId();
            if (!userId) {
                console.error("No user ID found in context or localStorage");
                return;
            }

            console.log('🔍 Filtering projects by type:', type, 'for user:', userId);
            
            // Lấy tất cả projects mà user là member, sau đó filter theo type ở frontend
            const res = await axios.get(`http://localhost:8083/api/projects/member/${userId}`);
            
            console.log('🔍 Filter API response:', res.data);
            
            // Handle different response formats
            let allUserProjects = [];
            
            if (res.data?.status === "SUCCESS" && res.data?.data) {
                allUserProjects = res.data.data;
            } else if (Array.isArray(res.data?.data)) {
                allUserProjects = res.data.data;
            } else if (Array.isArray(res.data)) {
                allUserProjects = res.data;
            } else {
                console.warn('⚠️ Unexpected filter response format:', res.data);
                allUserProjects = [];
            }
            
            // Filter theo project type
            const filteredProjects = allUserProjects.filter((project: Project) => 
                project.projectType?.toLowerCase() === type.toLowerCase()
            );
            
            setProjects(filteredProjects);
            console.log(`✅ Found ${filteredProjects.length} ${type} projects where user is member`);
        } catch (err) {
            console.error("Error filtering user projects:", err);
            setProjects([]);
        }
    };

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (!searchTerm.trim()) {
                selectedType === "All" ? fetchAllProjects() : fetchFilteredProjects(selectedType);
                return;
            }

            fetchSearchResults(searchTerm);
        }, 400);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm, selectedType]);

    // Fetch detailed project info and check permissions
    const fetchProjectDetails = async (projectId: string): Promise<Project | null> => {
        try {
            // Check cache first
            if (projectDetailsCache[projectId]) {
                return projectDetailsCache[projectId];
            }

            console.log('🔍 Fetching project details for ID:', projectId);
            const response = await axios.get(`http://localhost:8083/api/projects/${projectId}`);
            
            if (response.data?.status === "SUCCESS" && response.data?.data) {
                const projectData = response.data.data;
                const currentUserId = getUserId();
                
                // Check if current user is the actual project owner
                const isOwner = currentUserId && projectData.ownerId && currentUserId === projectData.ownerId;
                
                // Fetch owner details if ownerId exists
                let ownerName = 'Unknown Owner';
                let ownerAvatar = '';
                let ownerData = null;
                
                if (projectData.ownerId) {
                    console.log('👤 Fetching owner details for ownerId:', projectData.ownerId);
                    ownerData = await fetchUserDetails(projectData.ownerId);
                    
                    if (ownerData) {
                        // Use fullname first, fallback to username, then email
                        ownerName = ownerData.fullname || ownerData.username || ownerData.email || 'Unknown Owner';
                        
                        // Get avatar - handle different avatar formats
                        if (ownerData.avatar) {
                            if (ownerData.avatar.startsWith('http') || ownerData.avatar.startsWith('https')) {
                                // Direct URL
                                ownerAvatar = ownerData.avatar;
                            } else if (ownerData.avatar.startsWith('data:image') || ownerData.avatar.startsWith('/9j/')) {
                                // Base64 data
                                ownerAvatar = ownerData.avatar.startsWith('data:image') 
                                    ? ownerData.avatar 
                                    : `data:image/jpeg;base64,${ownerData.avatar}`;
                            } else {
                                // Cloudinary or filename
                                ownerAvatar = `https://res.cloudinary.com/dwmospuhh/image/upload/avatars/${ownerData.avatar}`;
                            }
                        }
                        
                        console.log('✅ Owner details resolved:', {
                            name: ownerName,
                            hasAvatar: !!ownerAvatar,
                            avatarType: ownerAvatar ? (
                                ownerAvatar.includes('cloudinary') ? 'cloudinary' :
                                ownerAvatar.startsWith('data:image') ? 'base64' : 'url'
                            ) : 'none'
                        });
                    } else {
                        console.warn('⚠️ Could not fetch owner details for ID:', projectData.ownerId);
                        ownerName = `Owner (${projectData.ownerId.substring(0, 8)}...)`;
                    }
                }
                
                console.log('🔐 Permission check:', {
                    projectId,
                    projectName: projectData.name,
                    projectOwnerId: projectData.ownerId,
                    ownerName,
                    currentUserId,
                    isOwner: isOwner,
                    ownerMatch: currentUserId === projectData.ownerId
                });
                
                const detailedProject: Project = {
                    id: projectData.id,
                    name: projectData.name,
                    key: projectData.key,
                    projectType: projectData.projectType || 'Software',
                    access: projectData.access || 'Private',
                    leadName: ownerName, // Use fetched owner name
                    ownerId: projectData.ownerId,
                    ownerName: ownerName, // Use fetched owner name
                    ownerAvatar: ownerAvatar,
                    canEdit: isOwner,    // Only actual owner can edit
                    canDelete: isOwner   // Only actual owner can delete
                };
                
                // Cache the result
                setProjectDetailsCache(prev => ({
                    ...prev,
                    [projectId]: detailedProject
                }));
                
                console.log('✅ Project details processed:', {
                    projectId,
                    projectName: detailedProject.name,
                    ownerName: detailedProject.ownerName,
                    ownerId: detailedProject.ownerId,
                    currentUserId,
                    isOwner,
                    canEdit: detailedProject.canEdit,
                    canDelete: detailedProject.canDelete,
                    userRole: isOwner ? 'OWNER' : 'MEMBER'
                });
                
                return detailedProject;
            } else {
                console.error('❌ Failed to fetch project details:', response.data);
                return null;
            }
        } catch (error) {
            console.error('❌ Error fetching project details:', error);
            return null;
        }
    };

    // Fetch user details by ID
    const fetchUserDetails = async (userId: string) => {
        try {
            // Check cache first
            if (userDetailsCache[userId]) {
                return userDetailsCache[userId];
            }

            console.log('👤 Fetching user details for ID:', userId);
            const response = await axios.get(`http://localhost:8086/api/users/${userId}`);
            
            if (response.data?.status === "SUCCESS" && response.data?.data) {
                const userData = response.data.data;
                
                // Cache the result
                setUserDetailsCache(prev => ({
                    ...prev,
                    [userId]: userData
                }));
                
                console.log('✅ User details fetched:', {
                    userId,
                    fullname: userData.fullname,
                    username: userData.username,
                    email: userData.email
                });
                
                return userData;
            } else if (response.data?.data) {
                // Handle different response format
                const userData = response.data.data;
                setUserDetailsCache(prev => ({
                    ...prev,
                    [userId]: userData
                }));
                return userData;
            } else {
                console.error('❌ Failed to fetch user details:', response.data);
                return null;
            }
        } catch (error) {
            console.error('❌ Error fetching user details:', error);
            return null;
        }
    };

    // Enhanced project click handler with permission checking
    const handleProjectClick = async (projectId: string) => {
        // Fetch detailed project info to check permissions
        const projectDetails = await fetchProjectDetails(projectId);
        
        if (projectDetails) {
            // Update the project in the list with detailed info
            setProjects(prev => prev.map(p => 
                p.id === projectId ? { ...p, ...projectDetails } : p
            ));
        }
        
        // Navigate to project board
        router.push(`/project/board?projectId=${projectId}`);
    };

    // Function to handle project edit
    const handleProjectEdit = async (projectId: string) => {
        const projectDetails = await fetchProjectDetails(projectId);
        
        if (projectDetails?.canEdit) {
            router.push(`/project/edit_project?projectId=${projectId}`);
        } else {
            toast.error("Permission denied", {
                description: "You don't have permission to edit this project. Only the project owner can edit projects."
            });
        }
    };

    // Function to handle project delete
    const handleProjectDelete = async (projectId: string) => {
        const projectDetails = await fetchProjectDetails(projectId);
        
        if (!projectDetails?.canDelete) {
            toast.error("Permission denied", {
                description: "You don't have permission to delete this project. Only the project owner can delete projects."
            });
            return;
        }

        // Show custom confirmation modal
        setProjectToDelete(projectDetails);
        setShowDeleteConfirm(true);
    };

    // ENTERPRISE APPROACH: Event-Driven Architecture
    const confirmDeleteProjectEnterprise = async () => {
        if (!projectToDelete) return;

        try {
            console.log('🏢 Enterprise deletion approach: Event-Driven');
            
            toast.loading("Deleting project...", {
                id: `delete-${projectToDelete.id}`
            });

            // STEP 1: Trigger deletion event - backend handles everything
            const deleteEventResponse = await axios.post(`http://localhost:8083/api/projects/${projectToDelete.id}/delete-event`, {
                triggeredBy: getUserId(),
                reason: 'USER_INITIATED_DELETE',
                timestamp: new Date().toISOString()
            });

            if (deleteEventResponse.data?.status === "SUCCESS") {
                console.log('✅ Deletion event triggered - backend will handle notifications and cleanup');
                
                // Update UI immediately based on event acknowledgment
                setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
                setProjectDetailsCache(prev => {
                    const newCache = { ...prev };
                    delete newCache[projectToDelete.id];
                    return newCache;
                });
                
                toast.success("Project deletion initiated", {
                    id: `delete-${projectToDelete.id}`,
                    description: `"${projectToDelete.name}" deletion is in progress. Members will be notified automatically.`
                });
                
                // Redirect to project homescreen for user to select another project
                console.log('🚀 Redirecting to project homescreen for user to select a project');
                setTimeout(() => {
                    window.location.href = '/project/project_homescreen';
                }, 1500);
            } else {
                throw new Error("Failed to trigger deletion event");
            }
        } catch (error) {
            console.error('❌ Error in enterprise deletion:', error);
            toast.error("Failed to initiate project deletion", {
                id: `delete-${projectToDelete.id}`,
                description: "Please try again or contact support."
            });
        } finally {
            setShowDeleteConfirm(false);
            setProjectToDelete(null);
        }
    };

    // Function to confirm and execute project deletion
    const confirmDeleteProject = async () => {
        if (!projectToDelete) return;

        try {
            console.log('🗑️ Starting project deletion process:', projectToDelete.id);
            
            // Show loading toast
            toast.loading("Preparing project deletion...", {
                id: `delete-${projectToDelete.id}`
            });

            // STEP 1: Fetch project members for notification
            console.log('👥 Fetching project members for notification...');
            let projectMembers: any[] = [];
            try {
                const membersResponse = await axios.get(`http://localhost:8083/api/projects/${projectToDelete.id}/users`);
                
                if (membersResponse.data?.status === "SUCCESS" && membersResponse.data?.data) {
                    projectMembers = membersResponse.data.data;
                } else if (Array.isArray(membersResponse.data?.data)) {
                    projectMembers = membersResponse.data.data;
                } else if (Array.isArray(membersResponse.data)) {
                    projectMembers = membersResponse.data;
                } else {
                    console.warn('⚠️ Could not fetch project members for notification');
                }
                
                console.log('👥 Found project members:', projectMembers.length);
            } catch (memberError) {
                console.warn('⚠️ Failed to fetch project members:', memberError);
                // Continue with deletion even if member fetch fails
            }

            // STEP 2: Send notifications FIRST and WAIT for completion
            console.log('📤 Sending notifications BEFORE deleting project...');
            toast.loading("Notifying project members...", {
                id: `delete-${projectToDelete.id}`
            });
            
            let notificationSuccess = false;
            try {
                await sendProjectDeletionNotifications(projectToDelete, projectMembers);
                console.log('✅ All notifications sent successfully');
                notificationSuccess = true;
                
                // Add a small delay to ensure notifications are fully processed
                console.log('⏳ Waiting for notification processing...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                
            } catch (notifError) {
                console.warn('⚠️ Failed to send notifications, but continuing with deletion:', notifError);
                // Don't block deletion if notifications fail, but user should know
                toast.warning("Some notifications may have failed", {
                    id: `delete-${projectToDelete.id}`
                });
            }

            // STEP 3: NOW delete project (after notifications are confirmed sent)
            console.log('🗑️ Now deleting project from backend...');
            toast.loading("Deleting project from database...", {
                id: `delete-${projectToDelete.id}`
            });
            
            const deleteResponse = await axios.delete(`http://localhost:8083/api/projects/${projectToDelete.id}`);
            console.log('🗑️ Project deletion response:', deleteResponse.status);

            if (deleteResponse.data?.status === "SUCCESS" || deleteResponse.status === 200) {
                // STEP 4: Update UI after successful deletion
                setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
                setProjectDetailsCache(prev => {
                    const newCache = { ...prev };
                    delete newCache[projectToDelete.id];
                    return newCache;
                });
                
                // STEP 5: Clear deleted project from browser storage and navigation context
                const deletedProjectId = projectToDelete.id;
                
                // Clear from localStorage/sessionStorage
                const currentProjectId = localStorage.getItem('currentProjectId') || sessionStorage.getItem('currentProjectId');
                if (currentProjectId === deletedProjectId) {
                    localStorage.removeItem('currentProjectId');
                    localStorage.removeItem('currentProjectName');
                    localStorage.removeItem('currentProjectKey');
                    localStorage.removeItem('currentProjectType');
                    sessionStorage.removeItem('currentProjectId');
                    sessionStorage.removeItem('currentProjectName');
                    sessionStorage.removeItem('currentProjectKey');
                    console.log('🧹 Cleared deleted project from storage');
                }
                
                // Update recent projects to remove deleted project
                try {
                    const recentProjectsStr = localStorage.getItem('recentProjects');
                    if (recentProjectsStr) {
                        const recentProjects = JSON.parse(recentProjectsStr);
                        if (Array.isArray(recentProjects)) {
                            const updatedRecent = recentProjects.filter(id => id !== deletedProjectId);
                            localStorage.setItem('recentProjects', JSON.stringify(updatedRecent));
                            console.log('🧹 Removed deleted project from recent projects');
                        }
                    }
                } catch (error) {
                    console.warn('Failed to update recent projects:', error);
                }
                
                // Success toast
                toast.success("Project deleted successfully", {
                    id: `delete-${projectToDelete.id}`,
                    description: notificationSuccess 
                        ? `"${projectToDelete.name}" has been deleted and members have been notified.`
                        : `"${projectToDelete.name}" has been deleted. Some notifications may have failed.`
                });
                
                // STEP 6: Always redirect to project homescreen for user to select another project
                console.log('🚀 Redirecting to project homescreen for user to select a project');
                
                // Small delay to allow toast to show before redirect
                setTimeout(() => {
                    window.location.href = '/project/project_homescreen';
                }, 1500);
            } else {
                throw new Error("Delete request failed");
            }
        } catch (error) {
            console.error('❌ Error deleting project:', error);
            toast.error("Failed to delete project", {
                id: `delete-${projectToDelete.id}`,
                description: "Please try again or contact support if the problem persists."
            });
        } finally {
            // Close modal and reset state
            setShowDeleteConfirm(false);
            setProjectToDelete(null);
        }
    };

    // Function to send project deletion notifications to members
    const sendProjectDeletionNotifications = async (deletedProject: Project, members: any[]) => {
        try {
            console.log('🔔 Starting project deletion notifications process...');
            console.log('🗑️ Deleted Project Info:', {
                id: deletedProject.id,
                name: deletedProject.name,
                ownerId: deletedProject.ownerId,
                ownerName: deletedProject.ownerName
            });
            console.log('👥 Raw Members List:', members);
            
            // STEP 1: Check if notification service is available
            console.log('🏥 Checking notification service health...');
            try {
                const healthCheck = await axios.get(`http://localhost:8089/api/notifications/health`, {
                    timeout: 5000
                });
                console.log('✅ Notification service is running:', healthCheck.data);
            } catch (healthError: any) {
                console.error('❌ Notification service health check failed:', healthError?.message);
                throw new Error('Notification service is not available');
            }
            
            // Get current user info
            const currentUserId = getUserId();
            const currentUserName = userData?.profile?.username || userData?.profile?.firstName || 'Project Owner';
            
            if (!currentUserId) {
                throw new Error('No current user ID found for notifications');
            }
            
            // Create a comprehensive list of users to notify
            let allUsersToNotify: any[] = [];
            
            // 1. Add all project members
            const projectMembers = members.filter(member => {
                const memberId = member.id || member.userId || member.user_id;
                return memberId && memberId !== currentUserId; // Exclude current user (deleter)
            });
            
            allUsersToNotify = [...projectMembers];
            console.log(`👥 Found ${projectMembers.length} project members to notify`);
            
            // 2. Add project owner if different from current user and not already in members list
            if (deletedProject.ownerId && deletedProject.ownerId !== currentUserId) {
                const ownerAlreadyInMembers = allUsersToNotify.some(user => {
                    const userId = user.id || user.userId || user.user_id;
                    return userId === deletedProject.ownerId;
                });
                
                if (!ownerAlreadyInMembers) {
                    allUsersToNotify.push({
                        id: deletedProject.ownerId,
                        userId: deletedProject.ownerId,
                        role: 'OWNER',
                        name: deletedProject.ownerName || 'Project Owner'
                    });
                    console.log(`👑 Added project owner (${deletedProject.ownerId}) to notification list`);
                }
            }
            
            console.log(`📤 Total users to notify: ${allUsersToNotify.length}`);
            
            if (allUsersToNotify.length === 0) {
                console.log('ℹ️ No users to notify (only deleter in project)');
                return;
            }
            
            // Create notifications for each user 
            const notifications = allUsersToNotify.map(user => {
                const userId = user.id || user.userId || user.user_id;
                const userRole = user.role || 'MEMBER';
                const isOwner = userRole === 'OWNER' || userId === deletedProject.ownerId;
                
                // Create notification payload that exactly matches backend API expectations
                return {
                    type: "PROJECT_DELETED",
                    title: "Project Deleted",
                    message: `Project "${deletedProject.name}" has been deleted by ${currentUserName}. All project data including tasks, sprints, and settings have been permanently removed.${isOwner ? ' As the project owner, all administrative access has been revoked.' : ''}`,
                    recipientUserId: userId,
                    actorUserId: currentUserId,
                    actorUserName: currentUserName,
                    projectId: deletedProject.id,
                    projectName: deletedProject.name,
                    taskId: null,
                    recipientRole: userRole // For tracking only
                };
            });
            
            // Send notifications SEQUENTIALLY to avoid overwhelming the API and ensure proper ordering
            console.log('📤 Sending notifications sequentially...');
            const results = [];
            
            for (let i = 0; i < notifications.length; i++) {
                const notification = notifications[i];
                const userType = notification.recipientRole === 'OWNER' ? 'Owner' : 'Member';
                
                console.log(`📤 Sending notification ${i + 1}/${notifications.length} to ${userType}:`, notification.recipientUserId);
                
                // Create clean payload for API
                const apiPayload = {
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    recipientUserId: notification.recipientUserId,
                    actorUserId: notification.actorUserId,
                    actorUserName: notification.actorUserName,
                    projectId: notification.projectId,
                    projectName: notification.projectName,
                    taskId: notification.taskId
                };
                
                try {
                    const startTime = Date.now();
                    const response = await axios.post(`http://localhost:8089/api/notifications/create`, apiPayload, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 15000 // 15 second timeout for each notification
                    });
                    const endTime = Date.now();
                    
                    console.log(`📋 Full API Response:`, JSON.stringify(response.data, null, 2));
                    
                    // Check if notification was successful
                    const isSuccessful = response.data?.success === true || response.data?.status === "SUCCESS";
                    
                    if (isSuccessful) {
                        console.log(`✅ Notification successfully sent to ${userType} (${notification.recipientUserId})`);
                        results.push({ success: true, userId: notification.recipientUserId, userType });
                    } else {
                        console.error(`❌ API returned non-SUCCESS status for ${userType}:`, response.data);
                        results.push({ success: false, userId: notification.recipientUserId, userType, error: response.data });
                    }
                    
                    // Add delay between notifications to avoid overwhelming the service
                    if (i < notifications.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
                    }
                    
                } catch (error: any) {
                    console.error(`❌ Failed to send notification to ${userType}:`, error);
                    
                    if (axios.isAxiosError(error)) {
                        console.error(`📡 Error Details:`, {
                            message: error.message,
                            status: error.response?.status,
                            data: error.response?.data
                        });
                    }
                    
                    results.push({ success: false, userId: notification.recipientUserId, userType, error });
                }
            }
            
            // Summary
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            
            console.log(`📊 Notification Results: ${successful} successful, ${failed} failed`);
            
            if (successful === 0 && results.length > 0) {
                throw new Error(`All notifications failed (${failed}/${results.length})`);
            }
            
            if (failed > 0) {
                console.warn(`⚠️ Some notifications failed: ${failed}/${results.length}`);
            }
            
            console.log(`🎉 Successfully notified ${successful} users about project deletion!`);
            
        } catch (error) {
            console.error('❌ Error sending project deletion notifications:', error);
            throw error; // Re-throw to let the calling function handle it
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <TopNavigation />

            <div className="max-w-7xl mx-auto p-6">
                {/* Page Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-semibold text-gray-800">My Projects</h1>
                    <div className="flex gap-2">
                        <Button
                            className="bg-[#0052CC] hover:bg-[#0747A6] text-white text-sm"
                            onClick={() => router.push("/project/create_project")}
                        >
                            Create Project
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
                    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                        <Input
                            placeholder="Search projects..."
                            className="w-full sm:w-80 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="w-48">
                            <Dropdown
                                placeholder="Filter by product"
                                options={["All", "Team-managed", "Company-managed"]}
                                onSelect={(value) => {
                                    setSelectedType(value);
                                    if (!searchTerm.trim()) {
                                        fetchFilteredProjects(value);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Projects Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-auto">
                    {/* Show enriching progress */}
                    {enrichingProjects && !isLoading && (
                        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
                            <div className="flex items-center gap-2 text-blue-700">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm">Loading owner details and avatars...</span>
                            </div>
                        </div>
                    )}
                    
                    {(userLoading || isLoading) ? (
                        <div className="p-8 text-center">
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">
                                    {userLoading ? "Loading user..." : "Loading projects..."}
                                </span>
                            </div>
                        </div>
                    ) : noUserFound ? (
                        <div className="p-8 text-center">
                            <div className="max-w-md mx-auto">
                                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full text-red-500">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
                                <p className="text-gray-500 mb-4">
                                    No user session found. Please login to access your projects.
                                </p>
                                <div className="space-y-2">
                                    <Button 
                                        className="bg-blue-600 text-white hover:bg-blue-700 w-full"
                                        onClick={() => router.push('/auth/login')}
                                    >
                                        Login
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            // Force retry with temporary session
                                            console.log('🔄 Forcing project load with temporary session...');
                                            setNoUserFound(false);
                                            fetchAllProjects();
                                        }}
                                    >
                                        I'm Already Logged In - Retry
                                    </Button>
                                    <p className="text-xs text-gray-400">
                                        Click "Retry" if you're already logged in but session not detected
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No projects found.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-left border-b">
                            <tr>
                                <th className="px-4 py-3 w-12"></th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Key</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Lead</th>
                                <th className="px-4 py-3">Project URL</th>
                                <th className="px-4 py-3 w-12 text-center">More</th>
                            </tr>
                            </thead>
                            <tbody>
                            {projects.map((p) => (
                                <tr key={p.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-400">
                                        <Star size={16} />
                                    </td>
                                    <td className="px-4 py-3 text-[#0052CC] font-medium">
                                        <div className="flex items-center gap-2 cursor-pointer hover:underline" onClick={() => handleProjectClick(p.id)}>
                                            <div className="w-6 h-6 rounded bg-orange-200 flex items-center justify-center text-white text-xs font-bold">
                                                {p.name[0].toUpperCase()}
                                            </div>
                                            {p.name}
                                            {/* Show owner badge only if current user is the owner */}
                                            {p.canEdit && (
                                                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                                    Owner
                                                </span>
                                            )}
                                            {/* Show member badge if user is member but not owner */}
                                            {p.ownerId && !p.canEdit && (
                                                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                                    Member
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{p.key}</td>
                                    <td className="px-4 py-3">{p.projectType} software</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-orange-400 text-white text-xs flex items-center justify-center">
                                                {p.ownerAvatar ? (
                                                    <img 
                                                        src={p.ownerAvatar} 
                                                        alt={p.ownerName || 'Owner'} 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            // Fallback to initials if image fails to load
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const parent = target.parentElement;
                                                            if (parent) {
                                                                parent.classList.add('bg-orange-400', 'text-white');
                                                                const initials = (p.ownerName || 'Owner')
                                                                    .split(' ')
                                                                    .map(word => word[0])
                                                                    .slice(0, 2)
                                                                    .join('')
                                                                    .toUpperCase();
                                                                parent.textContent = initials;
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    // Show initials if no avatar
                                                    (p.ownerName || p.leadName || '?')
                                                        .split(' ')
                                                        .map(word => word[0])
                                                        .slice(0, 2)
                                                        .join('')
                                                        .toUpperCase()
                                                )}
                                            </div>
                                            <span className="text-sm">{p.ownerName || p.leadName || "Unknown Owner"}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-blue-600 underline cursor-pointer" onClick={() => handleProjectClick(p.id)}>
                                        /projects/{p.id}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {/* Actions for project owners only */}
                                            {p.canEdit && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleProjectEdit(p.id);
                                                        }}
                                                        className="p-1 hover:bg-gray-200 rounded text-blue-600"
                                                        title="Edit Project (Owner)"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleProjectDelete(p.id);
                                                        }}
                                                        className="p-1 hover:bg-gray-200 rounded text-red-600"
                                                        title="Delete Project (Owner)"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                            
                                            {/* Actions for members - just view/open */}
                                            {p.ownerId && !p.canEdit && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleProjectClick(p.id);
                                                    }}
                                                    className="p-1 hover:bg-gray-200 rounded text-gray-600"
                                                    title="Open Project (Member)"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </button>
                                            )}
                                            
                                            {/* Default more button if permissions not loaded yet */}
                                            {!p.ownerId && (
                                                <MoreHorizontal size={18} className="text-gray-600 cursor-pointer" />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination (placeholder) */}
                <div className="flex justify-center mt-6">
                    <div className="border rounded px-3 py-1 text-sm text-gray-600 bg-white shadow-sm">
                        1
                    </div>
                </div>
            </div>
            
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && projectToDelete && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200"
                    onClick={(e) => {
                        // Close modal when clicking on backdrop
                        if (e.target === e.currentTarget) {
                            setShowDeleteConfirm(false);
                            setProjectToDelete(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl animate-in zoom-in-95 duration-200"
                         onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on modal content
                    >
                        {/* Modal Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Delete Project</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone</p>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="mb-6">
                            <p className="text-gray-700 mb-3">
                                Are you sure you want to delete the project <span className="font-semibold">"{projectToDelete.name}"</span>?
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                                <p className="text-red-800 text-sm">
                                    <strong>⚠️ Warning:</strong> This will permanently delete:
                                </p>
                                <ul className="text-red-700 text-sm mt-2 space-y-1">
                                    <li>• All tasks and issues</li>
                                    <li>• All sprints and backlogs</li>
                                    <li>• All project data and settings</li>
                                    <li>• All member access and permissions</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-blue-800 text-sm">
                                    <strong>📢 Notification:</strong> All project members and owner will be notified about this deletion.
                                </p>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setProjectToDelete(null);
                                }}
                                className="px-4 py-2"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmDeleteProject}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                            >
                                Delete Project
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}