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
    deletedAt?: string | null;
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
    
    // ✅ NEW: Permanent delete confirmation modal state
    const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);
    const [projectToPermanentDelete, setProjectToPermanentDelete] = useState<Project | null>(null);
    
    // ✅ NEW: State for managing deleted projects view
    const [showDeletedProjects, setShowDeletedProjects] = useState(false);
    const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
    const [loadingDeleted, setLoadingDeleted] = useState(false);
    
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
            if (event.key === 'Escape') {
                if (showDeleteConfirm) {
                    setShowDeleteConfirm(false);
                    setProjectToDelete(null);
                }
                if (showPermanentDeleteConfirm) {
                    setShowPermanentDeleteConfirm(false);
                    setProjectToPermanentDelete(null);
                }
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showDeleteConfirm, showPermanentDeleteConfirm]);

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
                    // Format 3: Direct array response
                    projectsData = responseData;
                    console.log('✅ Using Format 3 (direct array)');
                } else {
                    console.warn('⚠️ Unexpected response format:', responseData);
                    projectsData = [];
                }

                console.log('📦 Raw projects data:', projectsData);
                console.log('📦 Projects count:', projectsData.length);

                // ✅ NEW: Filter out deleted projects (only show active projects by default)
                const activeProjects = projectsData.filter((project: any) => !project.deletedAt);
                console.log('📦 Active projects count:', activeProjects.length);

                if (activeProjects.length === 0) {
                    console.log('⚠️ No active projects found');
                    setProjects([]);
                    setIsLoading(false);
                    return;
                }

                // Enrich projects with permissions and owner details
                console.log('🔄 Enriching projects with permissions...');
                setEnrichingProjects(true);
                const enrichedProjects = await enrichProjectsWithPermissions(activeProjects);
                setEnrichingProjects(false);
                
                setProjects(enrichedProjects);
                console.log('✅ Projects loaded and enriched:', enrichedProjects.length);
            } else {
                console.error('❌ API request failed with status:', response.status);
                setProjects([]);
            }
        } catch (error) {
            console.error('❌ Error fetching projects:', error);
            setProjects([]);
            
            if (axios.isAxiosError(error)) {
                console.error('📡 Axios Error Details:', {
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ NEW: Function to fetch deleted projects
    const fetchDeletedProjects = async () => {
        try {
            setLoadingDeleted(true);
            console.log('🗑️ Fetching deleted projects...');
            
            const userId = getUserId();
            if (!userId) {
                console.error("❌ No user ID found");
                return;
            }

            const apiUrl = `http://localhost:8083/api/projects/search/member?keyword=&userId=${userId}&includeDeleted=true`;
            console.log('🔗 Deleted projects API URL:', apiUrl);
            const response = await axios.get(apiUrl);
            
            if (response.status === 200) {
                const responseData = response.data;
                let projectsData = [];
                
                if (responseData?.status === "SUCCESS" && responseData?.data) {
                    projectsData = responseData.data;
                } else if (Array.isArray(responseData?.data)) {
                    projectsData = responseData.data;
                } else if (Array.isArray(responseData)) {
                    projectsData = responseData;
                }

                console.log('📦 Raw deleted projects data:', projectsData);

                // Filter only deleted projects
                const deletedProjectsData = projectsData.filter((project: any) => project.deletedAt);
                console.log('🗑️ Deleted projects count:', deletedProjectsData.length);
                console.log('🗑️ Deleted projects raw data:', deletedProjectsData);

                if (deletedProjectsData.length === 0) {
                    console.log('⚠️ No deleted projects found');
                    setDeletedProjects([]);
                    return;
                }

                // ✅ DEBUG: Log each deleted project before enrichment
                deletedProjectsData.forEach((project: any, index: number) => {
                    console.log(`🗑️ Deleted Project ${index + 1}:`, {
                        id: project.id,
                        name: project.name,
                        ownerId: project.ownerId,
                        deletedAt: project.deletedAt,
                        hasOwnerId: !!project.ownerId
                    });
                });

                // Enrich deleted projects with permissions and owner details
                console.log('🔄 Starting enrichment for deleted projects...');
                const enrichedDeletedProjects = await enrichProjectsWithPermissions(deletedProjectsData);
                
                // ✅ DEBUG: Log each enriched deleted project
                enrichedDeletedProjects.forEach((project: Project, index: number) => {
                    console.log(`✅ Enriched Deleted Project ${index + 1}:`, {
                        id: project.id,
                        name: project.name,
                        ownerId: project.ownerId,
                        ownerName: project.ownerName,
                        leadName: project.leadName,
                        ownerAvatar: project.ownerAvatar,
                        deletedAt: project.deletedAt,
                        hasOwnerName: !!project.ownerName,
                        hasOwnerAvatar: !!project.ownerAvatar
                    });
                });
                
                setDeletedProjects(enrichedDeletedProjects);
                console.log('✅ Deleted projects loaded and enriched:', enrichedDeletedProjects.length);
            }
        } catch (error) {
            console.error('❌ Error fetching deleted projects:', error);
            if (axios.isAxiosError(error)) {
                console.error('📡 Axios Error Details:', {
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                });
            }
            toast.error("Failed to load deleted projects");
        } finally {
            setLoadingDeleted(false);
        }
    };

    // Function to enrich projects with detailed info and permissions
    const enrichProjectsWithPermissions = async (basicProjects: Project[]): Promise<Project[]> => {
        console.log('🔄 Enriching projects with permissions and owner names...');
        
        try {
            // Process projects in batches to avoid overwhelming the API
            const batchSize = 3; // Reduced batch size since we're making more API calls
            const enrichedProjects: Project[] = [];
            
            for (let i = 0; i < basicProjects.length; i += batchSize) {
                const batch = basicProjects.slice(i, i + batchSize);
                
                const enrichedBatch = await Promise.all(
                    batch.map(async (project) => {
                        const details = await fetchProjectDetails(project.id);
                        return details || project; // Use detailed info if available, fallback to basic
                    })
                );
                
                enrichedProjects.push(...enrichedBatch);
                
                console.log(`✅ Enriched batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(basicProjects.length/batchSize)} with owner names and avatars`);
                
                // Small delay between batches to be nice to the API
                if (i + batchSize < basicProjects.length) {
                    await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay
                }
            }
            
            console.log('✅ Finished enriching all projects with permissions, owner names and avatars');
            return enrichedProjects;
        } catch (error) {
            console.error('❌ Error enriching projects:', error);
            return basicProjects; // Return original projects if enrichment fails
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
            
            // ✅ NEW: Use includeDeleted=true to fetch details for potentially deleted projects
            const response = await axios.get(`http://localhost:8083/api/projects/${projectId}?includeDeleted=true`);
            
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
                    ownerData = await fetchUserDetailsWithFallback(projectData.ownerId, projectData.name);
                    
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
                        // ✅ IMPROVED: Show partial owner ID instead of generic message
                        ownerName = `Owner (${projectData.ownerId.substring(0, 8)}...)`;
                    }
                } else {
                    console.warn('⚠️ Project has no ownerId:', projectData.id);
                    ownerName = 'No Owner';
                }
                
                console.log('🔐 Permission check:', {
                    projectId,
                    projectName: projectData.name,
                    projectOwnerId: projectData.ownerId,
                    ownerName,
                    currentUserId,
                    isOwner: isOwner,
                    ownerMatch: currentUserId === projectData.ownerId,
                    isDeleted: !!projectData.deletedAt // ✅ NEW: Log if project is deleted
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
                    canDelete: isOwner,   // Only actual owner can delete
                    deletedAt: projectData.deletedAt // ✅ NEW: Include deletedAt field
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
                    userRole: isOwner ? 'OWNER' : 'MEMBER',
                    isDeleted: !!detailedProject.deletedAt // ✅ NEW: Log deleted status
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

    // ✅ NEW: Test User Service connectivity
    const testUserService = async () => {
        try {
            console.log('🏥 Testing User Service connectivity...');
            // Try to get a simple endpoint instead of health
            const response = await axios.get('http://localhost:8086/api/users', { 
                timeout: 3000,
                params: { limit: 1 } // Try to get just 1 user to test connectivity
            });
            console.log('✅ User Service is running - status:', response.status);
            return true;
        } catch (error) {
            console.error('❌ User Service connectivity test failed:', error);
            if (axios.isAxiosError(error)) {
                console.error('📡 User Service Error:', {
                    message: error.message,
                    status: error.response?.status,
                    code: error.code
                });
            }
            return false;
        }
    };

    // ✅ IMPROVED: Enhanced fetchUserDetails with better error handling
    const fetchUserDetailsWithFallback = async (userId: string, projectName?: string) => {
        try {
            // Check cache first
            if (userDetailsCache[userId]) {
                console.log('✅ User details found in cache for ID:', userId);
                return userDetailsCache[userId];
            }

            console.log('👤 Fetching user details for ID:', userId, projectName ? `(Project: ${projectName})` : '');
            
            // Test User Service first (but don't block on it for too long)
            const isUserServiceUp = await testUserService();
            if (!isUserServiceUp) {
                console.warn('⚠️ User Service is down, using fallback name');
                
                // Show toast notification only once
                if (!sessionStorage.getItem('userServiceDownNotified')) {
                    toast.warning("User Service Unavailable", {
                        description: "Owner names will show as IDs. User service may be down.",
                        duration: 5000
                    });
                    sessionStorage.setItem('userServiceDownNotified', 'true');
                }
                
                const fallbackData = {
                    id: userId,
                    fullname: `Owner (${userId.substring(0, 8)}...)`,
                    username: `user_${userId.substring(0, 8)}`,
                    email: `${userId.substring(0, 8)}@unknown.com`,
                    avatar: null
                };
                
                // Cache the fallback data to avoid repeated service tests
                setUserDetailsCache(prev => ({
                    ...prev,
                    [userId]: fallbackData
                }));
                
                return fallbackData;
            }

            const response = await axios.get(`http://localhost:8086/api/users/${userId}`, { timeout: 10000 });
            
            console.log('👤 User API response for', userId, ':', {
                status: response.status,
                dataStatus: response.data?.status,
                hasData: !!response.data?.data
            });
            
            if (response.data?.status === "SUCCESS" && response.data?.data) {
                const userData = response.data.data;
                
                console.log('👤 User data received:', {
                    userId,
                    fullname: userData.fullname,
                    username: userData.username,
                    email: userData.email,
                    hasAvatar: !!userData.avatar
                });
                
                // Cache the result
                setUserDetailsCache(prev => ({
                    ...prev,
                    [userId]: userData
                }));
                
                return userData;
            } else {
                console.error('❌ Invalid user data format:', response.data);
                // Return fallback data
                const fallbackData = {
                    id: userId,
                    fullname: `Owner (${userId.substring(0, 8)}...)`,
                    username: `user_${userId.substring(0, 8)}`,
                    email: `${userId.substring(0, 8)}@unknown.com`,
                    avatar: null
                };
                
                // Cache the fallback data
                setUserDetailsCache(prev => ({
                    ...prev,
                    [userId]: fallbackData
                }));
                
                return fallbackData;
            }
        } catch (error) {
            console.error('❌ Error fetching user details for ID:', userId, error);
            
            // Return fallback data instead of null
            const fallbackData = {
                id: userId,
                fullname: `Owner (${userId.substring(0, 8)}...)`,
                username: `user_${userId.substring(0, 8)}`,
                email: `${userId.substring(0, 8)}@unknown.com`,
                avatar: null
            };
            
            // Cache the fallback data
            setUserDetailsCache(prev => ({
                ...prev,
                [userId]: fallbackData
            }));
            
            return fallbackData;
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

    // Function to confirm and execute project soft deletion
    const confirmDeleteProject = async () => {
        if (!projectToDelete) return;

        try {
            console.log('🗑️ Starting project soft deletion process:', projectToDelete.id);
            
            // Show loading toast
            toast.loading("Archiving project...", {
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
            console.log('📤 Sending notifications BEFORE archiving project...');
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
                console.warn('⚠️ Failed to send notifications, but continuing with archiving:', notifError);
                // Don't block deletion if notifications fail, but user should know
                toast.warning("Some notifications may have failed", {
                    id: `delete-${projectToDelete.id}`
                });
            }

            // STEP 3: NOW soft delete project (set deletedAt timestamp)
            console.log('🗑️ Now archiving project (soft delete)...');
            toast.loading("Archiving project...", {
                id: `delete-${projectToDelete.id}`
            });
            
            // ✅ NEW: Use soft delete API endpoint instead of hard delete
            const softDeleteResponse = await axios.put(`http://localhost:8083/api/projects/${projectToDelete.id}/soft-delete`, {
                deletedAt: new Date().toISOString(),
                deletedBy: getUserId()
            });
            
            console.log('🗑️ Project soft deletion response:', softDeleteResponse.status);

            if (softDeleteResponse.data?.status === "SUCCESS" || softDeleteResponse.status === 200) {
                // STEP 4: Update UI after successful soft deletion
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
                toast.success("Project archived successfully", {
                    id: `delete-${projectToDelete.id}`,
                    description: notificationSuccess 
                        ? `"${projectToDelete.name}" has been archived and members have been notified. You can restore it from the archived projects view.`
                        : `"${projectToDelete.name}" has been archived. Some notifications may have failed. You can restore it from the archived projects view.`
                });
                
                // STEP 6: Always redirect to project homescreen for user to select another project
                console.log('🚀 Redirecting to project homescreen for user to select a project');
                
                // Small delay to allow toast to show before redirect
                setTimeout(() => {
                    window.location.href = '/project/project_homescreen';
                }, 1500);
            } else {
                throw new Error("Soft delete request failed");
            }
        } catch (error) {
            console.error('❌ Error in project soft deletion:', error);
            toast.error("Failed to archive project", {
                id: `delete-${projectToDelete.id}`,
                description: "Please try again or contact support."
            });
        } finally {
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

    // ✅ NEW: Function to restore a deleted project
    const handleRestoreProject = async (projectId: string, projectName: string) => {
        try {
            console.log('🔄 Restoring project:', projectId);
            
            toast.loading("Restoring project...", {
                id: `restore-${projectId}`
            });

            const restoreResponse = await axios.put(`http://localhost:8083/api/projects/${projectId}/restore`, {
                restoredBy: getUserId(),
                restoredAt: new Date().toISOString()
            });

            if (restoreResponse.data?.status === "SUCCESS" || restoreResponse.status === 200) {
                // Remove from deleted projects list
                setDeletedProjects(prev => prev.filter(p => p.id !== projectId));
                
                // Clear from cache
                setProjectDetailsCache(prev => {
                    const newCache = { ...prev };
                    delete newCache[projectId];
                    return newCache;
                });

                toast.success("Project restored successfully", {
                    id: `restore-${projectId}`,
                    description: `"${projectName}" has been restored and is now active again.`
                });

                // Refresh active projects to include the restored project
                fetchAllProjects();
            } else {
                throw new Error("Restore request failed");
            }
        } catch (error) {
            console.error('❌ Error restoring project:', error);
            toast.error("Failed to restore project", {
                id: `restore-${projectId}`,
                description: "Please try again or contact support."
            });
        }
    };

    // ✅ NEW: Function to permanently delete a project (hard delete)
    const handlePermanentDelete = async (projectId: string, projectName: string) => {
        // Find the project object
        const project = deletedProjects.find(p => p.id === projectId);
        if (!project) {
            toast.error("Project not found");
            return;
        }

        // Show custom confirmation modal instead of browser confirm
        setProjectToPermanentDelete(project);
        setShowPermanentDeleteConfirm(true);
    };

    // ✅ NEW: Function to confirm and execute permanent deletion
    const confirmPermanentDelete = async () => {
        if (!projectToPermanentDelete) return;

        try {
            console.log('💀 Permanently deleting project:', projectToPermanentDelete.id);
            
            toast.loading("Permanently deleting project...", {
                id: `permanent-delete-${projectToPermanentDelete.id}`
            });

            const deleteResponse = await axios.delete(`http://localhost:8083/api/projects/${projectToPermanentDelete.id}/permanent`);

            if (deleteResponse.data?.status === "SUCCESS" || deleteResponse.status === 200) {
                // Remove from deleted projects list
                setDeletedProjects(prev => prev.filter(p => p.id !== projectToPermanentDelete.id));
                
                // Clear from cache
                setProjectDetailsCache(prev => {
                    const newCache = { ...prev };
                    delete newCache[projectToPermanentDelete.id];
                    return newCache;
                });

                toast.success("Project permanently deleted", {
                    id: `permanent-delete-${projectToPermanentDelete.id}`,
                    description: `"${projectToPermanentDelete.name}" has been permanently deleted and cannot be recovered.`
                });
            } else {
                throw new Error("Permanent delete request failed");
            }
        } catch (error) {
            console.error('❌ Error permanently deleting project:', error);
            toast.error("Failed to permanently delete project", {
                id: `permanent-delete-${projectToPermanentDelete.id}`,
                description: "Please try again or contact support."
            });
        } finally {
            setShowPermanentDeleteConfirm(false);
            setProjectToPermanentDelete(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <TopNavigation />

            <div className="max-w-7xl mx-auto p-6">
                {/* Page Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-semibold text-gray-800">
                        {showDeletedProjects ? "Archived Projects" : "My Projects"}
                    </h1>
                    <div className="flex gap-2">
                        {/* ✅ NEW: Toggle button for deleted projects */}
                        <Button
                            variant={showDeletedProjects ? "default" : "outline"}
                            className={showDeletedProjects ? "bg-orange-600 hover:bg-orange-700 text-white" : "border-orange-300 text-orange-600 hover:bg-orange-50"}
                            onClick={() => {
                                setShowDeletedProjects(!showDeletedProjects);
                                if (!showDeletedProjects && deletedProjects.length === 0) {
                                    fetchDeletedProjects();
                                }
                            }}
                        >
                            {showDeletedProjects ? (
                                <>
                                    <svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Back to Active
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    View Archived ({deletedProjects.length})
                                </>
                            )}
                        </Button>
                        
                        {/* ✅ NEW: Refresh owner names button */}
                        <Button
                            variant="outline"
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                                // Clear user cache and session storage flag
                                setUserDetailsCache({});
                                setProjectDetailsCache({});
                                sessionStorage.removeItem('userServiceDownNotified');
                                
                                // Refresh current view
                                if (showDeletedProjects) {
                                    fetchDeletedProjects();
                                } else {
                                    fetchAllProjects();
                                }
                                
                                toast.success("Refreshing owner names...", {
                                    description: "Clearing cache and reloading project data."
                                });
                            }}
                        >
                            <svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Refresh Names
                        </Button>
                        
                        {!showDeletedProjects && (
                            <Button
                                className="bg-[#0052CC] hover:bg-[#0747A6] text-white text-sm"
                                onClick={() => router.push("/project/create_project")}
                            >
                                Create Project
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                {!showDeletedProjects && (
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
                )}

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
                    
                    {/* Show loading for deleted projects */}
                    {showDeletedProjects && loadingDeleted && (
                        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2">
                            <div className="flex items-center gap-2 text-orange-700">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                                <span className="text-sm">Loading archived projects...</span>
                            </div>
                        </div>
                    )}
                    
                    {(userLoading || isLoading || (showDeletedProjects && loadingDeleted)) ? (
                        <div className="p-8 text-center">
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">
                                    {userLoading ? "Loading user..." : 
                                     showDeletedProjects ? "Loading archived projects..." : 
                                     "Loading projects..."}
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
                    ) : showDeletedProjects ? (
                        // ✅ NEW: Deleted Projects Table
                        deletedProjects.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-100 rounded-full text-gray-400">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Archived Projects</h3>
                                <p className="text-gray-500">You don't have any archived projects.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-orange-100 text-left border-b">
                                <tr>
                                    <th className="px-4 py-3 w-12"></th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Key</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Lead</th>
                                    <th className="px-4 py-3">Archived Date</th>
                                    <th className="px-4 py-3 w-24 text-center">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {deletedProjects.map((p) => (
                                    <tr key={p.id} className="border-b hover:bg-orange-50">
                                        <td className="px-4 py-3 text-orange-400">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-gray-300 flex items-center justify-center text-white text-xs font-bold">
                                                    {p.name[0].toUpperCase()}
                                                </div>
                                                {p.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{p.key}</td>
                                        <td className="px-4 py-3 text-gray-500">{p.projectType} software</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-400 text-white text-xs flex items-center justify-center">
                                                    {p.ownerAvatar ? (
                                                        <img 
                                                            src={p.ownerAvatar} 
                                                            alt={p.ownerName || 'Owner'} 
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                                const parent = target.parentElement;
                                                                if (parent) {
                                                                    parent.classList.add('bg-gray-400', 'text-white');
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
                                                        (p.ownerName || p.leadName || '?')
                                                            .split(' ')
                                                            .map(word => word[0])
                                                            .slice(0, 2)
                                                            .join('')
                                                            .toUpperCase()
                                                    )}
                                                </div>
                                                <span className="text-sm text-gray-600">{p.ownerName || p.leadName || "Unknown Owner"}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : 'Unknown'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* Restore button - only for owners */}
                                                {p.canEdit && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRestoreProject(p.id, p.name);
                                                        }}
                                                        className="p-1 hover:bg-green-100 rounded text-green-600"
                                                        title="Restore Project (Owner)"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            <path d="M8 16l-5 5v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </button>
                                                )}
                                                
                                                {/* Permanent delete button - only for owners */}
                                                {p.canDelete && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePermanentDelete(p.id, p.name);
                                                        }}
                                                        className="p-1 hover:bg-red-100 rounded text-red-600"
                                                        title="Permanently Delete Project (Owner)"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )
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
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Archive Project</h3>
                                <p className="text-sm text-gray-500">This project will be moved to archive</p>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="mb-6">
                            <p className="text-gray-700 mb-3">
                                Are you sure you want to archive the project <span className="font-semibold">"{projectToDelete.name}"</span>?
                            </p>
                            <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-3">
                                <p className="text-orange-800 text-sm">
                                    <strong>📦 Archive Info:</strong> This will move the project to archive:
                                </p>
                                <ul className="text-orange-700 text-sm mt-2 space-y-1">
                                    <li>• Project will be hidden from active projects</li>
                                    <li>• All data will be preserved safely</li>
                                    <li>• You can restore it anytime from archived projects</li>
                                    <li>• Members will lose access until restored</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-blue-800 text-sm">
                                    <strong>📢 Notification:</strong> All project members and owner will be notified about this archival.
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
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                Archive Project
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permanent Delete Confirmation Modal */}
            {showPermanentDeleteConfirm && projectToPermanentDelete && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200"
                    onClick={(e) => {
                        // Close modal when clicking on backdrop
                        if (e.target === e.currentTarget) {
                            setShowPermanentDeleteConfirm(false);
                            setProjectToPermanentDelete(null);
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
                                    <path d="M9 9l6 6M15 9l-6 6" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Permanently Delete Project</h3>
                                <p className="text-sm text-red-600 font-medium">⚠️ This action cannot be undone</p>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="mb-6">
                            <p className="text-gray-700 mb-3">
                                Are you sure you want to permanently delete the project <span className="font-semibold text-red-600">"{projectToPermanentDelete.name}"</span>?
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                                <p className="text-red-800 text-sm">
                                    <strong>💀 Permanent Deletion:</strong> This will completely remove:
                                </p>
                                <ul className="text-red-700 text-sm mt-2 space-y-1">
                                    <li>• All project data and settings</li>
                                    <li>• All tasks, sprints, and boards</li>
                                    <li>• All project history and comments</li>
                                    <li>• All member access and permissions</li>
                                    <li>• This action CANNOT be undone</li>
                                </ul>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                                <p className="text-yellow-800 text-sm">
                                    <strong>📋 Project Info:</strong>
                                </p>
                                <ul className="text-yellow-700 text-sm mt-1 space-y-1">
                                    <li>• Project Key: <span className="font-mono">{projectToPermanentDelete.key}</span></li>
                                    <li>• Project Type: {projectToPermanentDelete.projectType}</li>
                                    <li>• Owner: {projectToPermanentDelete.ownerName || 'Unknown'}</li>
                                    <li>• Archived: {projectToPermanentDelete.deletedAt ? new Date(projectToPermanentDelete.deletedAt).toLocaleDateString() : 'Unknown'}</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-blue-800 text-sm">
                                    <strong>📢 Alternative:</strong> Consider restoring the project instead if you might need it later.
                                </p>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowPermanentDeleteConfirm(false);
                                    setProjectToPermanentDelete(null);
                                }}
                                className="px-4 py-2"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmPermanentDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium"
                            >
                                💀 Permanently Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}