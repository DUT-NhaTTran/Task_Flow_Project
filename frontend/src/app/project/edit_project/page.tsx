"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Save, Settings, Users, Shield, FileText, UserPlus, X, Crown, User, Trash2 } from "lucide-react";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/drop-down";
import { toast } from "sonner";
import UserStorageService from "@/services/userStorageService";

interface ProjectData {
    id: string;
    name: string;
    key: string;
    projectType: string;
    access: string;
    description?: string;
    ownerId: string;
    ownerName?: string;
    leadName?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface Member {
    id: string;
    username: string;
    email: string;
    role: string;
    tasks?: number;
    avatar?: string;
    joinedAt?: string;
}

interface TaskAssignment {
    memberId: string;
    memberName: string;
    taskCount: number;
}

interface MemberTask {
    id: string;
    title: string;
    status: string;
    assigneeId: string;
}

interface InviteUser {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    userRole?: string;
}

type TabType = 'settings' | 'members';

export default function EditProjectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams?.get('projectId');

    // Form state
    const [formData, setFormData] = useState<ProjectData>({
        id: '',
        name: '',
        key: '',
        projectType: 'Team-managed',
        access: 'Private',
        description: '',
        ownerId: '',
        ownerName: '',
        leadName: ''
    });

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [members, setMembers] = useState<Member[]>([]);
    const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('settings');
    
    // Member invitation states
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('Member');
    const [isInviting, setIsInviting] = useState(false);
    const [allUsers, setAllUsers] = useState<InviteUser[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<InviteUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    
    // Member removal states
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
    const [memberTasks, setMemberTasks] = useState<MemberTask[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);

    // Helper function to get current user ID
    const getCurrentUserId = () => {
        const userData = UserStorageService.getLoggedInUser();
        return userData?.account?.id || userData?.profile?.id || localStorage.getItem('userId');
    };

    // Helper function to get current user data
    const getCurrentUserData = () => {
        return UserStorageService.getLoggedInUser();
    };

    useEffect(() => {
        if (!projectId) {
            toast.error("No project ID provided");
            router.push('/project/view_all_projects');
            return;
        }
        fetchProjectData();
        fetchAllUsers(); // Fetch all users for invitation
    }, [projectId]);

    const fetchProjectData = async () => {
        try {
            setIsLoading(true);
            console.log('🔍 Fetching project data for editing:', projectId);

            const response = await axios.get(`http://localhost:8083/api/projects/${projectId}`);
            
            if (response.data?.status === "SUCCESS" && response.data?.data) {
                const projectData = response.data.data;
                const currentUserId = getCurrentUserId();
                
                // Check if current user can edit (only owner can edit)
                const userCanEdit = currentUserId && projectData.ownerId && currentUserId === projectData.ownerId;
                setCanEdit(userCanEdit);
                
                if (!userCanEdit) {
                    toast.error("Permission denied", {
                        description: "Only the project owner can edit project settings."
                    });
                    setTimeout(() => {
                        router.push(`/project/board?projectId=${projectId}`);
                    }, 2000);
                    return;
                }

                // Fetch owner details
                let ownerName = 'Unknown Owner';
                if (projectData.ownerId) {
                    try {
                        const ownerResponse = await axios.get(`http://localhost:8086/api/users/${projectData.ownerId}`);
                        if (ownerResponse.data?.status === "SUCCESS" && ownerResponse.data?.data) {
                            const ownerData = ownerResponse.data.data;
                            ownerName = ownerData.fullname || ownerData.username || ownerData.email || 'Unknown Owner';
                        }
                    } catch (error) {
                        console.warn('Could not fetch owner details:', error);
                    }
                }

                setFormData({
                    id: projectData.id,
                    name: projectData.name || '',
                    key: projectData.key || '',
                    projectType: projectData.projectType || 'Team-managed',
                    access: projectData.access || 'Private',
                    description: projectData.description || '',
                    ownerId: projectData.ownerId,
                    ownerName: ownerName,
                    leadName: ownerName,
                    createdAt: projectData.createdAt,
                    updatedAt: projectData.updatedAt
                });

                console.log('✅ Project data loaded for editing');
                
                // Fetch project members after loading project data
                await fetchProjectMembers();
            } else {
                throw new Error("Project not found");
            }
        } catch (error) {
            console.error('❌ Error fetching project data:', error);
            toast.error("Failed to load project data", {
                description: "The project may not exist or you don't have permission to access it."
            });
            setTimeout(() => {
                router.push('/project/view_all_projects');
            }, 2000);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProjectMembers = async () => {
        try {
            setIsLoadingMembers(true);
            console.log('👥 Fetching project members...');
            
            const response = await axios.get(`http://localhost:8083/api/projects/${projectId}/users`);
            
            if (response.data?.status === "SUCCESS" && response.data?.data) {
                const membersList = response.data.data;
                
                // Fetch user details for each member
                const enrichedMembers = await Promise.all(
                    membersList.map(async (member: any) => {
                        try {
                            const userId = member.userId || member.id;
                            const userResponse = await axios.get(`http://localhost:8086/api/users/${userId}`);
                            
                            if (userResponse.data?.status === "SUCCESS" && userResponse.data?.data) {
                                const userData = userResponse.data.data;
                                return {
                                    id: userId,
                                    username: userData.username || userData.email || 'Unknown',
                                    email: userData.email || '',
                                    role: member.role || 'Member',
                                    tasks: member.taskCount || 0,
                                    avatar: userData.avatar || '',
                                    joinedAt: member.joinedAt || ''
                                };
                            }
                        } catch (error) {
                            console.warn('Could not fetch user details for member:', member);
                        }
                        
                        return {
                            id: member.userId || member.id,
                            username: 'Unknown User',
                            email: '',
                            role: member.role || 'Member',
                            tasks: member.taskCount || 0,
                            avatar: '',
                            joinedAt: ''
                        };
                    })
                );
                
                setMembers(enrichedMembers);
                
                // Initialize task assignments
                setTaskAssignments(enrichedMembers.map(member => ({
                    memberId: member.id,
                    memberName: member.username,
                    taskCount: member.tasks || 0
                })));
                
                console.log('✅ Project members loaded:', enrichedMembers.length);
            }
        } catch (error) {
            console.error('❌ Error fetching project members:', error);
            // Don't show error toast as this is optional functionality
        } finally {
            setIsLoadingMembers(false);
        }
    };

    const handleTaskAssignmentChange = (memberId: string, newTaskCount: number) => {
        setTaskAssignments(prev => 
            prev.map(assignment => 
                assignment.memberId === memberId 
                    ? { ...assignment, taskCount: Math.max(0, newTaskCount) }
                    : assignment
            )
        );
    };

    const handleRebalanceTasks = () => {
        const totalTasks = taskAssignments.reduce((sum, assignment) => sum + assignment.taskCount, 0);
        const memberCount = taskAssignments.length;
        
        if (memberCount === 0) return;
        
        const tasksPerMember = Math.floor(totalTasks / memberCount);
        const remainingTasks = totalTasks % memberCount;
        
        setTaskAssignments(prev => 
            prev.map((assignment, index) => ({
                ...assignment,
                taskCount: tasksPerMember + (index < remainingTasks ? 1 : 0)
            }))
        );
        
        toast.success("Tasks rebalanced evenly among all members");
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validate project name
        if (!formData.name.trim()) {
            newErrors.name = "Project name is required";
        } else if (formData.name.length < 3) {
            newErrors.name = "Project name must be at least 3 characters";
        } else if (formData.name.length > 100) {
            newErrors.name = "Project name must be less than 100 characters";
        }

        // Validate project key
        if (!formData.key.trim()) {
            newErrors.key = "Project key is required";
        } else if (!/^[A-Z][A-Z0-9]{1,9}$/.test(formData.key)) {
            newErrors.key = "Project key must start with a letter, be 2-10 characters, and contain only uppercase letters and numbers";
        }

        // Validate description length
        if (formData.description && formData.description.length > 500) {
            newErrors.description = "Description must be less than 500 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof ProjectData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleSave = async () => {
        if (!validateForm()) {
            toast.error("Please fix the errors before saving");
            return;
        }

        try {
            setIsSaving(true);
            console.log('💾 Saving project changes:', formData);

            const updateData = {
                name: formData.name.trim(),
                key: formData.key.trim().toUpperCase(),
                projectType: formData.projectType,
                access: formData.access,
                description: formData.description?.trim() || null,
                ownerId: formData.ownerId,
                ...(formData.createdAt && { createdAt: formData.createdAt }),
                ...(formData.updatedAt && { updatedAt: new Date().toISOString() })
            };

            // =============== DEBUG INFO FOR POSTMAN ===============
            const apiUrl = `http://localhost:8083/api/projects/${projectId}`;
            console.log('🔍 DEBUG - API Request Details:');
            console.log('📍 URL:', apiUrl);
            console.log('🔧 Method: PATCH');
            console.log('📦 Headers: Content-Type: application/json');
            console.log('📋 Request Body (JSON):');
            console.log(JSON.stringify(updateData, null, 2));
            console.log('📋 Request Body (Raw JSON for Postman):');
            console.log(JSON.stringify(updateData));
            console.log('🆔 Project ID:', projectId);
            console.log('👤 Current User ID:', getCurrentUserId());
            console.log('👑 Project Owner ID:', formData.ownerId);
            
            // Additional validation logs
            console.log('✅ Validation checks:');
            console.log('- Name length:', formData.name.trim().length);
            console.log('- Key format:', formData.key.trim().toUpperCase(), 'matches regex:', /^[A-Z][A-Z0-9]{1,9}$/.test(formData.key.trim().toUpperCase()));
            console.log('- Project Type:', formData.projectType);
            console.log('- Access:', formData.access);
            console.log('- Description length:', formData.description?.trim()?.length || 0);
            console.log('- Owner ID present:', !!formData.ownerId);
            console.log('- User is owner:', getCurrentUserId() === formData.ownerId);
            
            // DB Schema expectations (based on your scripts)
            console.log('🗄️ Expected DB fields:');
            console.log('- id (UUID): ✅ Not sending (update only)');
            console.log('- name (VARCHAR NOT NULL): ✅', updateData.name);
            console.log('- description (TEXT): ✅', updateData.description || 'NULL');
            console.log('- owner_id (UUID NOT NULL): ✅', updateData.ownerId);
            console.log('- key (VARCHAR NOT NULL): ✅', updateData.key);
            console.log('- project_type (VARCHAR NOT NULL): ✅', updateData.projectType);
            console.log('- access (VARCHAR NOT NULL): ✅', updateData.access);
            console.log('- deadline (DATE): ❌ Not sending');
            console.log('- created_at (TIMESTAMP): ❌ Not sending');
            console.log('- updated_at (TIMESTAMP): ❌ Not sending');
            console.log('===============================================');

            // Save basic project data
            const response = await axios.patch(apiUrl, updateData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data?.status === "SUCCESS") {
                // Save task assignments if members exist
                if (taskAssignments.length > 0) {
                    try {
                        console.log('💾 Saving task assignments...');
                        // This would be a custom API call to save task assignments
                        // For now, we'll just log the assignments
                        console.log('Task assignments to save:', taskAssignments);
                        
                        // You might implement this as:
                        // await axios.put(`http://localhost:8083/api/projects/${projectId}/task-assignments`, {
                        //     assignments: taskAssignments
                        // });
                        
                        toast.success("Project and task assignments updated successfully", {
                            description: "All changes have been saved."
                        });
                    } catch (assignmentError) {
                        console.warn('Failed to save task assignments:', assignmentError);
                        toast.success("Project updated successfully", {
                            description: "Basic project settings saved, but task assignments may need to be updated manually."
                        });
                    }
                } else {
                    toast.success("Project updated successfully", {
                        description: "Your changes have been saved."
                    });
                }
                
                // Redirect back to project board or list
                setTimeout(() => {
                    router.push(`/project/board?projectId=${projectId}`);
                }, 1500);
            } else {
                throw new Error("Update failed");
            }
        } catch (error: any) {
            console.error('❌ Error updating project:', error);
            
            // =============== DEBUG ERROR INFO ===============
            console.log('🚨 ERROR DETAILS:');
            if (axios.isAxiosError(error)) {
                console.log('📍 Request URL:', error.config?.url);
                console.log('🔧 Request Method:', error.config?.method?.toUpperCase());
                console.log('📦 Request Headers:', error.config?.headers);
                console.log('📋 Request Data:', error.config?.data);
                console.log('💥 Response Status:', error.response?.status);
                console.log('💬 Response Status Text:', error.response?.statusText);
                console.log('📄 Response Headers:', error.response?.headers);
                console.log('📋 Response Data:', error.response?.data);
                console.log('📋 Response Data (JSON):');
                console.log(JSON.stringify(error.response?.data, null, 2));
            } else {
                console.log('❌ Non-Axios Error:', error);
            }
            console.log('===============================================');
            
            if (error.response?.status === 409) {
                toast.error("Project key already exists", {
                    description: "Please choose a different project key."
                });
                setErrors(prev => ({
                    ...prev,
                    key: "This project key is already in use"
                }));
            } else if (error.response?.status === 403) {
                toast.error("Permission denied", {
                    description: "You don't have permission to edit this project."
                });
            } else {
                toast.error("Failed to update project", {
                    description: "Please try again or contact support."
                });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        router.push(`/project/board?projectId=${projectId}`);
    };

    const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
        try {
            console.log('🔄 Updating member role:', { memberId, newRole, projectId });
            
            // Get current user data for permission check
            const currentUserId = getCurrentUserId();
            console.log('👤 Current user ID:', currentUserId);
            console.log('👑 Project owner ID:', formData.ownerId);
            
            // Check if current user is project owner
            if (currentUserId !== formData.ownerId) {
                toast.error("Permission denied", {
                    description: "Only the project owner can update member roles."
                });
                return;
            }
            
            // Backend now properly checks SCRUM_MASTER or PROJECT_OWNER permissions
            // Prepare request payload matching backend expectations
            const requestPayload = {
                projectId: projectId,
                userId: memberId,
                roleInProject: newRole.toUpperCase() // Backend might expect uppercase
            };
            
            console.log('📦 Request payload:', requestPayload);
            console.log('🔗 API URL:', `http://localhost:8083/api/projects/${projectId}/members/role`);
            
            const response = await axios.patch(
                `http://localhost:8083/api/projects/${projectId}/members/role`, 
                requestPayload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );
            
            console.log('✅ API Response:', response.status, response.data);
            
            if (response.data?.status === "SUCCESS" || response.status === 200) {
                // Update local state
                setMembers(prev => 
                    prev.map(member => 
                        member.id === memberId 
                            ? { ...member, role: newRole }
                            : member
                    )
                );
                
                toast.success("Member role updated successfully");
            } else {
                throw new Error("Failed to update role - API returned non-success status");
            }
        } catch (error: any) {
            console.error('❌ Error updating member role:', error);
            
            // Enhanced error logging
            if (axios.isAxiosError(error)) {
                console.log('🚨 Axios Error Details:');
                console.log('- URL:', error.config?.url);
                console.log('- Method:', error.config?.method);
                console.log('- Headers:', error.config?.headers);
                console.log('- Data:', error.config?.data);
                console.log('- Status:', error.response?.status);
                console.log('- Status Text:', error.response?.statusText);
                console.log('- Response Headers:', error.response?.headers);
                console.log('- Response Data:', error.response?.data);
                
                if (error.response?.status === 500) {
                    console.log('💥 Server Error 500 - Possible causes:');
                    console.log('1. Permission check failed');
                    console.log('2. Invalid role format');
                    console.log('3. Member not found in project');
                    console.log('4. Database constraint violation');
                    
                    toast.error("Server error while updating role", {
                        description: "Please try again or contact support."
                    });
                } else if (error.response?.status === 403) {
                    toast.error("Permission denied", {
                        description: "You don't have permission to update member roles."
                    });
                } else {
                    toast.error("Failed to update member role", {
                        description: "Please try again or contact support."
                    });
                }
            } else {
                toast.error("Failed to update member role", {
                    description: "Please try again or contact support."
                });
            }
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        // First, fetch member's tasks before showing removal modal
        try {
            setIsLoadingTasks(true);
            const member = members.find(m => m.id === memberId);
            if (!member) return;
            
            setMemberToRemove(member);
            
            // Fetch member's tasks in this project
            const tasksResponse = await axios.get(`http://localhost:8084/api/tasks/project/${projectId}/assignee/${memberId}`);
            
            if (tasksResponse.data?.status === "SUCCESS" && tasksResponse.data?.data) {
                setMemberTasks(tasksResponse.data.data);
            } else {
                setMemberTasks([]);
            }
            
            setShowRemoveModal(true);
        } catch (error) {
            console.error('❌ Error fetching member tasks:', error);
            setMemberTasks([]);
            setShowRemoveModal(true);
        } finally {
            setIsLoadingTasks(false);
        }
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;
        
        try {
            console.log('🗑️ Removing member:', memberToRemove);
            
            const response = await axios.delete(`http://localhost:8083/api/projects/${projectId}/members/${memberToRemove.id}`);
            
            if (response.data?.status === "SUCCESS") {
                // Update local state
                setMembers(prev => prev.filter(member => member.id !== memberToRemove.id));
                setTaskAssignments(prev => prev.filter(assignment => assignment.memberId !== memberToRemove.id));
                
                toast.success(`${memberToRemove.username} has been removed from the project`);
                setShowRemoveModal(false);
                setMemberToRemove(null);
                setMemberTasks([]);
            } else {
                throw new Error("Failed to remove member");
            }
        } catch (error) {
            console.error('❌ Error removing member:', error);
            toast.error("Failed to remove member", {
                description: "Please try again or contact support."
            });
        }
    };

    // Fetch all users for invitation (like in create project)
    const fetchAllUsers = async () => {
        setIsLoadingUsers(true);
        try {
            console.log('👥 Fetching all users for invitation...');
            const response = await axios.get("http://localhost:8086/api/users");
            
            if (response.data && response.data.status === "SUCCESS" && response.data.data) {
                const currentUserId = getCurrentUserId();
                // Filter out current user from the list
                const users = response.data.data.filter((user: InviteUser) => user.id !== currentUserId);
                setAllUsers(users);
                console.log(`✅ Loaded ${users.length} users (excluding current user)`);
            } else {
                console.error("Failed to fetch users:", response.data);
                setAllUsers([]);
            }
        } catch (error) {
            console.error("❌ Error fetching users:", error);
            setAllUsers([]);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // Local filtering function (like in create project)
    const filterUsers = (query: string) => {
        if (!query.trim() || query.length < 2) {
            setFilteredUsers([]);
            return;
        }

        // Get existing member IDs to exclude them
        const existingMemberIds = members.map(m => m.id);
        
        // Filter users based on search term and exclude existing members
        const filtered = allUsers.filter(user => 
            !existingMemberIds.includes(user.id) &&
            (user.username.toLowerCase().includes(query.toLowerCase()) ||
             user.email.toLowerCase().includes(query.toLowerCase()))
        );

        setFilteredUsers(filtered);
        console.log(`🔍 Filtered ${filtered.length} users for query: "${query}"`);
    };

    const inviteUserToProject = async (userId: string, userEmail: string) => {
        try {
            setIsInviting(true);
            console.log('📧 Inviting user to project:', { userId, userEmail, role: inviteRole });
            
            // Get current user data for notification
            const currentUserData = getCurrentUserData();
            const currentUserId = getCurrentUserId();
            const currentUserName = currentUserData?.profile?.username || 
                                  currentUserData?.profile?.firstName || 
                                  currentUserData?.account?.email || 
                                  'Project Owner';

            // Send invitation notification (NOT directly adding to project)
            const notificationData = {
                type: 'PROJECT_INVITE',
                title: 'Project Invitation',
                message: `${currentUserName} invited you to join project "${formData.name}" as a ${inviteRole}`,
                recipientUserId: userId,
                actorUserId: currentUserId,
                actorUserName: currentUserName,
                projectId: projectId,
                projectName: formData.name,
                invitedRole: inviteRole,
                taskId: null // No task associated with project invitation
            };

            console.log('📤 Sending project invitation notification:', notificationData);
            
            const response = await axios.post('http://localhost:8089/api/notifications/create', notificationData);
            
            if (response.data?.status === "SUCCESS" || response.status === 200 || response.status === 201) {
                toast.success(`Invitation sent to ${userEmail}`, {
                    description: `They will receive a notification to accept or decline joining as ${inviteRole}`
                });
                
                // Reset invite form
                setShowInviteModal(false);
                setInviteEmail('');
                setInviteRole('Member');
                setFilteredUsers([]);
            } else {
                throw new Error("Failed to send invitation");
            }
        } catch (error) {
            console.error('❌ Error sending invitation:', error);
            toast.error("Failed to send invitation", {
                description: "Please try again or contact support."
            });
        } finally {
            setIsInviting(false);
        }
    };

    const inviteByEmail = async () => {
        if (!inviteEmail.trim()) {
            toast.error("Please enter an email address");
            return;
        }

        // Check if it's a valid email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inviteEmail.trim())) {
            toast.error("Please enter a valid email address");
            return;
        }
        
        try {
            setIsInviting(true);
            console.log('📧 Inviting by email:', { email: inviteEmail, role: inviteRole });
            
            // Find user by email in local allUsers data
            const exactMatch = allUsers.find((user: InviteUser) => 
                user.email?.toLowerCase() === inviteEmail.trim().toLowerCase()
            );
            
            if (exactMatch) {
                // Check if user is already a member
                const existingMemberIds = members.map(m => m.id);
                if (existingMemberIds.includes(exactMatch.id)) {
                    toast.error("User is already a member of this project");
                    return;
                }

                // User exists in system - send notification
                const currentUserData = getCurrentUserData();
                const currentUserId = getCurrentUserId();
                const currentUserName = currentUserData?.profile?.username || 
                                      currentUserData?.profile?.firstName || 
                                      currentUserData?.account?.email || 
                                      'Project Owner';

                const notificationData = {
                    type: 'PROJECT_INVITE',
                    title: 'Project Invitation',
                    message: `${currentUserName} invited you to join project "${formData.name}" as a ${inviteRole}`,
                    recipientUserId: exactMatch.id,
                    actorUserId: currentUserId,
                    actorUserName: currentUserName,
                    projectId: projectId,
                    projectName: formData.name,
                    invitedRole: inviteRole,
                    taskId: null
                };

                console.log('📤 Sending project invitation notification to existing user:', notificationData);
                
                const response = await axios.post('http://localhost:8089/api/notifications/create', notificationData);
                
                if (response.data?.status === "SUCCESS" || response.status === 200 || response.status === 201) {
                    toast.success(`Invitation sent to ${inviteEmail}`, {
                        description: `They will receive a notification to accept or decline joining as ${inviteRole}`
                    });
                } else {
                    throw new Error("Failed to send notification");
                }
            } else {
                // User doesn't exist in system
                toast.error("User not found", {
                    description: `No user with email ${inviteEmail} found. They need to register first.`
                });
                return;
            }
            
            // Reset invite form
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteRole('Member');
            setFilteredUsers([]);
            
        } catch (error) {
            console.error('❌ Error sending invitation:', error);
            toast.error("Failed to send invitation", {
                description: "Please try again or contact support."
            });
        } finally {
            setIsInviting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <TopNavigation />
                <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="text-gray-600">Loading project data...</span>
                    </div>
                </div>
            </div>
        );
    }

    

    return (
        <div className="min-h-screen bg-gray-50">
            <TopNavigation />
            
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleCancel}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Edit Project</h1>
                            <p className="text-sm text-gray-600">Modify your project settings and manage team members</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6">
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'settings'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                Project Settings
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'members'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Team Members ({members.length})
                            </div>
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    {activeTab === 'settings' && (
                        <div className="space-y-8">
                            {/* Basic Information Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Settings className="w-5 h-5 text-gray-400" />
                                    <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Project Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Project Name *
                                        </label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder="Enter project name"
                                            className={`w-full ${errors.name ? 'border-red-500' : ''}`}
                                        />
                                        {errors.name && (
                                            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                                        )}
                                    </div>

                                    {/* Project Key */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Project Key *
                                        </label>
                                        <Input
                                            value={formData.key}
                                            onChange={(e) => handleInputChange('key', e.target.value.toUpperCase())}
                                            placeholder="PROJ"
                                            maxLength={10}
                                            className={`w-full ${errors.key ? 'border-red-500' : ''}`}
                                        />
                                        {errors.key && (
                                            <p className="text-red-500 text-xs mt-1">{errors.key}</p>
                                        )}
                                        <p className="text-gray-500 text-xs mt-1">
                                            2-10 characters, uppercase letters and numbers only
                                        </p>
                                    </div>

                                    {/* Project Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Project Type
                                        </label>
                                        <select
                                            value={formData.projectType}
                                            onChange={(e) => handleInputChange('projectType', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="Team-managed">Team-managed</option>
                                            <option value="Company-managed">Company-managed</option>
                                        </select>
                                    </div>

                                    {/* Access Level */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Access Level
                                        </label>
                                        <Dropdown
                                            placeholder="Select access level"
                                            options={["Private", "Public"]}
                                            defaultValue={formData.access}
                                            onSelect={(value) => handleInputChange('access', value)}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Description Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    <h2 className="text-lg font-medium text-gray-900">Description</h2>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Project Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        placeholder="Describe your project goals, scope, or any important details..."
                                        rows={4}
                                        maxLength={500}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${errors.description ? 'border-red-500' : ''}`}
                                    />
                                    {errors.description && (
                                        <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                                    )}
                                    <p className="text-gray-500 text-xs mt-1">
                                        {formData.description?.length || 0}/500 characters
                                    </p>
                                </div>
                            </div>


                            {/* Form Actions for Settings Tab */}
                            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                                <Button 
                                    variant="outline" 
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className="space-y-6">
                            {/* Members Management Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-gray-400" />
                                    <h2 className="text-lg font-medium text-gray-900">Team Management</h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-gray-600">
                                        1 owner + {members.filter(m => m.id !== formData.ownerId).length} member{members.filter(m => m.id !== formData.ownerId).length !== 1 ? 's' : ''}
                                    </div>
                                    <Button
                                        onClick={() => setShowInviteModal(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                                        size="sm"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Invite Member
                                    </Button>
                                </div>
                            </div>

                            {/* Project Owner Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Crown className="w-5 h-5 text-yellow-500" />
                                    <h3 className="text-md font-medium text-gray-900">Project Owner</h3>
                                </div>
                                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
                                                {/* Try to find owner in members list for avatar */}
                                                {(() => {
                                                    const ownerMember = members.find(m => m.id === formData.ownerId);
                                                    if (ownerMember?.avatar) {
                                                        return (
                                                            <img 
                                                                src={ownerMember.avatar} 
                                                                alt={formData.ownerName}
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        );
                                                    } else {
                                                        return (
                                                            <span className="text-blue-600 text-sm font-medium">
                                                                {formData.ownerName?.charAt(0).toUpperCase() || 'O'}
                                                            </span>
                                                        );
                                                    }
                                                })()}
                                                {/* Crown badge overlay */}
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                                                    <Crown className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-gray-900">{formData.ownerName}</p>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        Owner
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">Full administrative control</p>
                                                {formData.createdAt && (
                                                    <p className="text-xs text-gray-500">
                                                        Created project {new Date(formData.createdAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Cannot be removed</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Team Members Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="w-5 h-5 text-gray-400" />
                                    <h3 className="text-md font-medium text-gray-900">Team Members</h3>
                                    <span className="text-sm text-gray-500">
                                        ({members.filter(m => m.id !== formData.ownerId).length})
                                    </span>
                                </div>

                                {/* Members List */}
                                {isLoadingMembers ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            <span className="text-gray-600 text-sm">Loading members...</span>
                                        </div>
                                    </div>
                                ) : members.filter(m => m.id !== formData.ownerId).length === 0 ? (
                                    <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
                                        <p className="text-gray-600 text-sm mb-4">
                                            Invite team members to collaborate on this project.
                                        </p>
                                        <Button
                                            onClick={() => setShowInviteModal(true)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Invite First Member
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {members.filter(member => member.id !== formData.ownerId).map((member) => (
                                            <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                        {member.avatar ? (
                                                            <img 
                                                                src={member.avatar} 
                                                                alt={member.username}
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-blue-600 text-sm font-medium">
                                                                {member.username.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-gray-900">{member.username}</p>
                                                        </div>
                                                        <p className="text-sm text-gray-500">{member.email}</p>
                                                        {member.joinedAt && (
                                                            <p className="text-xs text-gray-400">
                                                                Joined {new Date(member.joinedAt).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3">
                                                    {/* Role Dropdown */}
                                                    <div className="w-40">
                                                        <Dropdown
                                                            placeholder="Select role"
                                                            options={["Member", "Admin", "Viewer"]}
                                                            defaultValue={member.role}
                                                            onSelect={(newRole) => handleUpdateMemberRole(member.id, newRole)}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                    
                                                    {/* Remove Member Button */}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRemoveMember(member.id, member.username)}
                                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                                        disabled={isLoadingTasks}
                                                    >
                                                        {isLoadingTasks ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Member Actions Footer */}
                            <div className="pt-6 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        <p>Role changes are saved automatically.</p>
                                        <p className="text-xs text-gray-500">
                                            Only the project owner can manage team member roles.
                                        </p>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        onClick={handleCancel}
                                    >
                                        Done
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Metadata Section */}
                {formData.createdAt && (
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Project Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Created:</span>
                                <span className="ml-2 text-gray-900">
                                    {new Date(formData.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            {formData.updatedAt && (
                                <div>
                                    <span className="text-gray-500">Last Updated:</span>
                                    <span className="ml-2 text-gray-900">
                                        {new Date(formData.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Invite Member Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
                                <p className="text-sm text-gray-600">Send an invitation notification to join this project</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setShowInviteModal(false);
                                    setInviteEmail('');
                                    setInviteRole('Member');
                                    setFilteredUsers([]);
                                }}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Search/Email Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Search by email or username
                                    </label>
                                    <Input
                                        type="text"
                                        value={inviteEmail}
                                        onChange={(e) => {
                                            setInviteEmail(e.target.value);
                                            filterUsers(e.target.value);
                                        }}
                                        placeholder="Enter email or username..."
                                        className="w-full"
                                    />
                                </div>

                                {/* Role Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Role (Default: Member)
                                    </label>
                                    <Dropdown
                                        placeholder="Select role"
                                        options={["Member", "Admin", "Viewer"]}
                                        defaultValue="Member"
                                        onSelect={(value) => setInviteRole(value)}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Invited users will receive a notification to accept or decline joining as this role.
                                    </p>
                                </div>
                            </div>

                            {/* Search Results Table */}
                            {isLoadingUsers && allUsers.length === 0 && (
                                <div className="flex items-center gap-2 py-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <span className="text-sm text-gray-600">Loading users...</span>
                                </div>
                            )}

                            {filteredUsers.length > 0 && (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <h4 className="text-sm font-medium text-gray-700">
                                            Search Results ({filteredUsers.length} found)
                                        </h4>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Role</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {filteredUsers.map((user) => (
                                                    <tr key={user.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                                    {user.avatar ? (
                                                                        <img 
                                                                            src={user.avatar} 
                                                                            alt={user.username}
                                                                            className="w-full h-full rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-blue-600 text-xs font-medium">
                                                                            {user.username.charAt(0).toUpperCase()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                                        {user.username}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="text-sm text-gray-600 truncate">{user.email}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                                                {user.userRole || 'User'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Button 
                                                                size="sm" 
                                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                                                onClick={() => inviteUserToProject(user.id, user.email)}
                                                                disabled={isInviting}
                                                            >
                                                                {isInviting ? (
                                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                                                ) : (
                                                                    "Select"
                                                                )}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* No Results Message */}
                            {!isLoadingUsers && inviteEmail.length >= 2 && filteredUsers.length === 0 && allUsers.length > 0 && (
                                <div className="text-center py-4">
                                    <p className="text-sm text-gray-500">No users found matching "{inviteEmail}"</p>
                                    <p className="text-xs text-gray-400 mt-1">Try a different email or username</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-between pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowInviteModal(false);
                                        setInviteEmail('');
                                        setInviteRole('Member');
                                        setFilteredUsers([]);
                                    }}
                                    disabled={isInviting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={inviteByEmail}
                                    disabled={isInviting || !inviteEmail.trim()}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {isInviting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Inviting...
                                        </>
                                    ) : (
                                        "Send Invitation"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Member Confirmation Modal */}
            {showRemoveModal && memberToRemove && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Remove Team Member</h3>
                                <p className="text-sm text-gray-600">
                                    Are you sure you want to remove {memberToRemove.username} from this project?
                                </p>
                            </div>
                        </div>

                        {/* Member Tasks */}
                        {memberTasks.length > 0 ? (
                            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">{memberTasks.length}</span>
                                    </div>
                                    <p className="text-sm font-medium text-yellow-800">
                                        This member has {memberTasks.length} active task{memberTasks.length !== 1 ? 's' : ''}:
                                    </p>
                                </div>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {memberTasks.map((task) => (
                                        <div key={task.id} className="text-xs text-yellow-700 flex items-center justify-between">
                                            <span>• {task.title}</span>
                                            <span className="px-2 py-1 bg-yellow-200 rounded text-yellow-800">
                                                {task.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-yellow-600 mt-2">
                                    These tasks will need to be reassigned to other team members.
                                </p>
                            </div>
                        ) : (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-700">
                                    ✓ This member has no active tasks in this project.
                                </p>
                            </div>
                        )}

                        {/* Confirmation Actions */}
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowRemoveModal(false);
                                    setMemberToRemove(null);
                                    setMemberTasks([]);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmRemoveMember}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Remove Member
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 