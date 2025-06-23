"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, X, Search, UserPlus } from "lucide-react";
import { Dropdown } from "@/components/ui/drop-down";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { useUser } from "@/contexts/UserContext";
import { API_CONFIG } from "@/lib/config";

interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    userRole?: string;
}

// ✅ Avatar Component for better reusability
const UserAvatar = ({ user, size = "md" }: { user: User; size?: "sm" | "md" | "lg" }) => {
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
    
    if (isValidImageUrl(user.avatar)) {
        return (
            <img
                src={user.avatar}
                alt={user.username}
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
        <div className={`${sizeClass} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium border border-gray-200 shadow-sm`}>
            {user.username.charAt(0).toUpperCase()}
        </div>
    );
};

export default function CreateProjectPage() {
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [description, setDescription] = useState("");
    const [projectType, setProjectType] = useState("");
    const [access, setAccess] = useState("");
    const [deadline, setDeadline] = useState("");
    
    // ✅ Use UserContext instead of localStorage
    const { currentUser, isLoading: userLoading } = useUser();
    
    // ✅ New states for user invitation
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    
    const router = useRouter();

    // ✅ Get tomorrow's date in YYYY-MM-DD format
    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    // ✅ Simplified useEffect with UserContext
    useEffect(() => {
        if (!userLoading && currentUser) {
            console.log("✅ Current user from context:", currentUser);
            // Fetch users when we have current user
            fetchAllUsers();
        } else if (!userLoading && !currentUser) {
            console.warn("❌ No current user found in context");
            toast.error("Please log in to create a project");
        }
    }, [currentUser, userLoading]);

    // Fetch all users from API for invite
    const fetchAllUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await axios.get(`${API_CONFIG.USER_SERVICE}/api/users`);
            if (response.data && response.data.status === "SUCCESS" && response.data.data) {
                // ✅ Filter out current user (owner) from the list
                const users = response.data.data.filter((user: User) => user.id !== currentUser?.id);
                setAllUsers(users);
                console.log(`Loaded ${users.length} users (excluding current user)`);
            } else {
                console.error("Failed to fetch users:", response.data);
                toast.error("Failed to load users");
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Error loading users");
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // ✅ Filter users based on search term
    const filteredUsers = allUsers.filter(user => 
        !selectedUsers.some(selected => selected.id === user.id) &&
        (user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // ✅ Add user to selected list
    const addUser = (user: User) => {
        setSelectedUsers([...selectedUsers, user]);
        setSearchTerm("");
        setShowUserDropdown(false);
    };

    // ✅ Remove user from selected list
    const removeUser = (userId: string) => {
        setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
    };

    // ✅ Send project invitation notifications
    const sendProjectInvitations = async (projectId: string, projectName: string) => {
        if (selectedUsers.length === 0) return;

        try {
            const ownerName = currentUser?.username || 'Project Owner';

            const invitationPromises = selectedUsers.map(async (user) => {
                // Standard payload format - only essential fields
                const notificationData = {
                    type: 'PROJECT_INVITE',
                    title: 'Project Invitation',
                    message: `${ownerName} invited you to join project "${projectName}"`,
                    recipientUserId: user.id,
                    actorUserId: currentUser?.id,
                    actorUserName: ownerName,
                    projectId: projectId,
                    projectName: projectName,
                    taskId: null // No task associated with project invitation
                };

                console.log(`PROJECT: Sending standard invitation to ${user.username}:`, notificationData);
                return axios.post(`${API_CONFIG.NOTIFICATION_SERVICE}/api/notifications/create`, notificationData);
            });

            await Promise.all(invitationPromises);
            console.log(`PROJECT: ${selectedUsers.length} project invitations sent successfully`);
            toast.success(`Project invitations sent to ${selectedUsers.length} users`);
        } catch (error) {
            console.error('❌ PROJECT: Failed to send project invitations:', error);
            toast.error('Failed to send some invitations');
        }
    };

    const handleSubmit = async () => {
        if (!currentUser) {
            toast.error("Current user is missing. Please log in again.");
            return;
        }

        try {
            //STEP 1: Create Project
            const payload = {
                name,
                key,
                description,
                projectType,
                access,
                ownerId: currentUser.id, // Already string UUID from UserContext
                deadline, // YYYY-MM-DD format from HTML input
                createdAt: new Date().toISOString(),
            };

            const res = await axios.post(`${API_CONFIG.PROJECTS_SERVICE}/api/projects`, payload);
            const newProjectId: string = res.data?.data?.id;

            if (!newProjectId) {
                toast.error("Project created but no ID returned.");
                return;
            }
            console.log("✅ STEP 1 SUCCESS: Project created with ID:", newProjectId);

            // ✅ STEP 2: Create Sprint
            console.log("🚀 STEP 2: Creating default sprint...");
            const sprintPayload = {
                name: "Sprint 1",
                projectId: newProjectId,
                startDate: new Date().toISOString().split("T")[0], // YYYY-MM-DD
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 2 weeks later
                goal: "Initial project setup and first tasks",
                status: "ACTIVE",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await axios.post(`${API_CONFIG.SPRINTS_SERVICE}/api/sprints`, sprintPayload);

            // STEP 3: Auto-add project owner as member
            try {
                const ownerMemberData = {
                    userId: currentUser.id,
                    roleInProject: "SCRUM_MASTER" // Owner role
                };
                
                await axios.post(`${API_CONFIG.PROJECTS_SERVICE}/api/projects/${newProjectId}/members`, ownerMemberData);
            } catch (ownerError) {
                console.warn("⚠️ STEP 3 WARNING: Failed to auto-add owner as member:", ownerError);
                // Don't fail the whole process if this fails
            }

            // ✅ STEP 4: Send project invitations
            console.log("🚀 STEP 4: Sending notifications...");
            await sendProjectInvitations(newProjectId, name);
            console.log("✅ STEP 4 SUCCESS: Notifications sent");

            // ✅ STEP 5: Navigate to project
            console.log("🚀 STEP 5: Navigating to project...");
            const redirectUrl = `/project/project_homescreen?projectId=${newProjectId}`;
            console.log("✅ REDIRECT: Navigating to:", redirectUrl);
            
            toast.success("Project and default sprint created successfully!");
            router.push(redirectUrl);
            console.log("✅ STEP 5 SUCCESS: Navigation initiated");

        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
                console.error("❌ PROJECT: Axios Error:", axiosErr.response?.data);
                console.error("❌ PROJECT: Error details:", {
                    status: axiosErr.response?.status,
                    statusText: axiosErr.response?.statusText,
                    url: axiosErr.config?.url,
                    method: axiosErr.config?.method
                });
                
                // Better error messaging
                const errorMessage = axiosErr.response?.data?.message || 
                                   axiosErr.response?.data?.error || 
                                   axiosErr.message || 
                                   "Unknown server error";
                                   
                toast.error("Error creating project: " + errorMessage);
            } else if (err instanceof Error) {
                console.error("❌ PROJECT: Error:", err.message);
                toast.error("Error: " + err.message);
            } else {
                console.error("❌ PROJECT: Unknown error", err);
                toast.error("Unknown error occurred.");
            }
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            <TopNavigation />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto p-8 bg-white">
                    <h1 className="text-2xl font-bold mb-2">Add project details</h1>
                    <p className="text-sm text-gray-600 mb-6">
                        Explore what's possible when you collaborate with your team. Edit project details anytime in project settings.
                    </p>
                    <p className="text-xs text-gray-500 mb-6">
                        <span className="text-red-500">*</span> Required fields are marked with an asterisk
                    </p>

                    <div className="md:col-span-2 grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold mb-1">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <Input value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div>
                            <label className="flex items-center text-sm font-semibold mb-1 gap-1">
                                Key <span className="text-red-500">*</span>
                                <Info className="w-4 h-4 text-gray-400" />
                            </label>
                            <Input value={key} onChange={e => setKey(e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold mb-1">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">
                                Project Type <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                placeholder="Select project type"
                                options={["Team-managed", "Company-managed"]}
                                onSelect={setProjectType}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">
                                Access <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                placeholder="Choose an access level"
                                options={["Private", "Public"]}
                                onSelect={setAccess}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">
                                Deadline <span className="text-red-500">*</span>
                            </label>
                            <Input 
                                type="date" 
                                value={deadline} 
                                onChange={e => setDeadline(e.target.value)}
                                min={getTomorrowDate()}
                            />
                        </div>
                        
                        {/* ✅ User Invitation Section */}
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold mb-1">
                                <UserPlus className="w-4 h-4 inline mr-1" />
                                Invite Team Members
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                                Add team members to your project. They will receive notifications to accept or decline the invitation.
                            </p>
                            
                            {/* Selected Users */}
                            {selectedUsers.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-sm text-gray-600 mb-2">Selected members ({selectedUsers.length}):</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedUsers.map(user => (
                                            <div key={user.id} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm gap-2">
                                                {/* ✅ Avatar for Selected Users */}
                                                <UserAvatar user={user} size="sm" />
                                                <span>{user.username}</span>
                                                <button
                                                    onClick={() => removeUser(user.id)}
                                                    className="hover:bg-blue-200 rounded-full p-0.5"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* User Search Input */}
                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search users by name or email..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setShowUserDropdown(true);
                                        }}
                                        onFocus={() => setShowUserDropdown(true)}
                                        className="pl-10"
                                    />
                                </div>
                                
                                {/* User Dropdown */}
                                {showUserDropdown && searchTerm && (
                                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                                        {isLoadingUsers ? (
                                            <div className="p-3 text-center text-gray-500">
                                                Loading users...
                                            </div>
                                        ) : filteredUsers.length > 0 ? (
                                            filteredUsers.slice(0, 10).map(user => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => addUser(user)}
                                                    className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3"
                                                >
                                                    {/* ✅ Real Avatar Display */}
                                                    <UserAvatar user={user} />
                                                    <div>
                                                        <div className="font-medium text-sm">{user.username}</div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                        {user.userRole && (
                                                            <div className="text-xs text-gray-400 capitalize">{user.userRole.toLowerCase()}</div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-gray-500">
                                                No users found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-4 mt-10">
                        <Button variant="outline" className="text-sm">Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!name || !key || !description || !projectType || !access || !deadline || !currentUser || userLoading}
                            className={`text-sm ${name && key && description && projectType && access && deadline && currentUser ? "bg-[#0052CC] text-white" : "bg-gray-300 text-gray-600"}`}
                        >
                            {userLoading ? (
                                <>Loading...</>
                            ) : !currentUser ? (
                                <>Please log in first</>
                            ) : (
                                <>Create project {selectedUsers.length > 0 && `& Invite ${selectedUsers.length} members`}</>
                            )}
                        </Button>
                    </div>
                </main>
            </div>
            
            {/* Click outside to close dropdown */}
            {showUserDropdown && (
                <div
                    className="fixed inset-0 z-5"
                    onClick={() => setShowUserDropdown(false)}
                />
            )}
        </div>
    );
}
