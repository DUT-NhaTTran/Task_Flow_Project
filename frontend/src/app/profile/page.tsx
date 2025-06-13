"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/drop-down";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { ArrowLeft, Save, Upload, Camera, Mail, User, Shield, Calendar, Edit2, Phone, X } from "lucide-react";
import axios from "axios";

interface UserProfile {
    id: string;
    username: string;
    email: string;
    phone?: string;
    avatar?: string;
    userRole?: string;
    createdAt?: string;
    updatedAt?: string;
}

export default function ProfilePage() {
    const router = useRouter();
    const { currentUser, isLoading, updateUser } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Check if this is a welcome flow from registration
    const [isWelcomeFlow, setIsWelcomeFlow] = useState(false);
    const [tempUserData, setTempUserData] = useState<{userId?: string, email?: string}>({});

    // Form state
    const [profile, setProfile] = useState<UserProfile>({
        id: '',
        username: '',
        email: '',
        phone: '',
        avatar: '',
        userRole: ''
    });

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [originalProfile, setOriginalProfile] = useState<UserProfile>({
        id: '',
        username: '',
        email: '',
        phone: '',
        avatar: '',
        userRole: ''
    });

    // Check for welcome flow and temp data
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const welcomeParam = urlParams.get('welcome');
        
        if (welcomeParam === 'true') {
            setIsWelcomeFlow(true);
            
            // Get temp user data from sessionStorage
            const tempUserId = sessionStorage.getItem('tempUserId');
            const tempEmail = sessionStorage.getItem('tempEmail');
            
            if (tempUserId && tempEmail) {
                setTempUserData({ userId: tempUserId, email: tempEmail });
                
                console.log('🎉 Welcome flow detected:', { tempUserId, tempEmail });
                
                // Clean up temp data
                sessionStorage.removeItem('tempUserId');
                sessionStorage.removeItem('tempEmail');
                
                // Show welcome message
                toast.success("Welcome! Please complete your profile", {
                    description: "Fill in your information to get started with TaskFlow"
                });
            }
        }
    }, []);

    useEffect(() => {
        // Skip user loading if in welcome flow - we handle temp data above
        if (isWelcomeFlow && tempUserData.userId) {
            // Keep form mostly empty for welcome flow - let user fill fresh data
            setProfile({
                id: tempUserData.userId,
                username: '', // Keep empty for user to fill
                email: tempUserData.email || '',
                phone: '', // Keep empty
                avatar: '', // Keep empty
                userRole: 'USER' // Default role
            });
            setOriginalProfile({
                id: tempUserData.userId,
                username: '',
                email: tempUserData.email || '',
                phone: '',
                avatar: '',
                userRole: 'USER'
            });
            console.log('🎉 Welcome flow: Form initialized with empty fields for fresh input');
            return;
        }
        
        if (!isLoading && currentUser) {
            setProfile({
                id: currentUser.id,
                username: currentUser.username || '',
                email: currentUser.email || '',
                phone: currentUser.phone || '',
                avatar: currentUser.avatar || '',
                userRole: currentUser.userRole || 'USER',
                createdAt: currentUser.createdAt,
                updatedAt: currentUser.updatedAt
            });
            setOriginalProfile({
                id: currentUser.id,
                username: currentUser.username || '',
                email: currentUser.email || '',
                phone: currentUser.phone || '',
                avatar: currentUser.avatar || '',
                userRole: currentUser.userRole || 'USER',
                createdAt: currentUser.createdAt,
                updatedAt: currentUser.updatedAt
            });
        } else if (!isLoading && !currentUser && !isWelcomeFlow) {
            toast.error("Please log in to access your profile");
            router.push('/auth/signin');
        }
    }, [currentUser, isLoading, router, isWelcomeFlow, tempUserData.userId, tempUserData.email]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validate username (match updated backend validation)
        if (!profile.username.trim()) {
            newErrors.username = "Username is required";
        } else if (profile.username.length < 3 || profile.username.length > 50) {
            newErrors.username = "Username must be between 3 and 50 characters";
        } else if (!/^[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s._-]+$/.test(profile.username)) {
            newErrors.username = "Username can only contain letters, numbers, spaces, dots, underscores, and hyphens";
        } else if (profile.username.trim().length !== profile.username.length || profile.username.includes("  ")) {
            newErrors.username = "Username cannot have leading/trailing spaces or consecutive spaces";
        }

        // Validate email
        if (!profile.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
            newErrors.email = "Please enter a valid email address";
        }

        // Validate phone (optional)
        if (profile.phone && !/^[\d\s\-\+\(\)]+$/.test(profile.phone)) {
            newErrors.phone = "Please enter a valid phone number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof UserProfile, value: string) => {
        const newProfile = {
            ...profile,
            [field]: value
        };
        
        setProfile(newProfile);
        
        // Check if there are changes compared to original
        const hasProfileChanges = 
            newProfile.username !== originalProfile.username ||
            newProfile.email !== originalProfile.email ||
            newProfile.userRole !== originalProfile.userRole ||
            (newProfile.phone || '') !== (originalProfile.phone || '');
        
        // In welcome flow, always consider as having changes if user filled required fields
        if (isWelcomeFlow) {
            const hasRequiredFields = !!(newProfile.username.trim() && newProfile.email.trim());
            setHasChanges(hasRequiredFields);
        } else {
            setHasChanges(hasProfileChanges);
        }
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    // Helper function to suggest valid username
    const suggestValidUsername = (invalidUsername: string): string => {
        return invalidUsername
            .trim() // Remove leading/trailing spaces
            .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
            .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s._-]/g, '_') // Replace invalid chars with underscore
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .substring(0, 50); // Limit to 50 chars
    };

    const handleAvatarUpload = async (file: File) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        try {
            setIsUploadingAvatar(true);
            console.log('📤 Uploading avatar:', file.name);

            const formData = new FormData();
            formData.append('avatar', file);

            const response = await axios.patch(
                `http://localhost:8086/api/users/${profile.id}/avatar`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    }
                }
            );

            if (response.data?.status === "SUCCESS" && response.data?.data?.url) {
                // Use the Cloudinary URL from response
                const cloudinaryUrl = response.data.data.url;
                console.log('✅ Avatar uploaded successfully:', cloudinaryUrl);
                
                setProfile(prev => ({
                    ...prev,
                    avatar: cloudinaryUrl
                }));
                
                // Check if avatar changed
                setHasChanges(cloudinaryUrl !== originalProfile.avatar);
                
                // Update user context
                if (currentUser) {
                    updateUser({
                        ...currentUser,
                        avatar: cloudinaryUrl
                    });
                }
                
                toast.success("Avatar updated successfully");
            } else {
                throw new Error("Failed to upload avatar - no URL returned");
            }
        } catch (error) {
            console.error('❌ Error uploading avatar:', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 400) {
                    toast.error("Invalid file format", {
                        description: "Please select a valid image file (JPG, PNG, etc.)"
                    });
                } else {
                    toast.error("Failed to upload avatar", {
                        description: "Please try again or use a different image."
                    });
                }
            } else {
                toast.error("Failed to upload avatar", {
                    description: "Please try again or use a different image."
                });
            }
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleAvatarUpload(file);
        }
    };

    const handleSave = async () => {
        if (!validateForm()) {
            toast.error("Please fix the errors before saving");
            return;
        }

        try {
            setIsSaving(true);
            console.log('💾 Saving profile:', profile);

            // Prepare user data according to backend User model
            const updateData = {
                username: profile.username.trim(),
                email: profile.email.trim(),
                phone: profile.phone?.trim() || null,
                userRole: profile.userRole,
                avatar: profile.avatar || null
            };

            console.log('📦 Request payload:', updateData);
            console.log('🔗 API URL:', `http://localhost:8086/api/users/${profile.id}`);

            const response = await axios.put(
                `http://localhost:8086/api/users/${profile.id}`,
                updateData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data?.status === "SUCCESS") {
                // Update role if it has changed
                if (profile.userRole !== originalProfile.userRole) {
                    try {
                        console.log('🔄 Updating user role:', profile.userRole);
                        
                        // Update role in User Service only (role is stored in users table)
                        const userRoleResponse = await axios.patch(
                            `http://localhost:8086/api/users/${profile.id}/role?role=${profile.userRole}`,
                            {},
                            {
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            }
                        );
                        
                        if (userRoleResponse.data?.status !== "SUCCESS") {
                            console.warn('⚠️ Role update failed but profile updated successfully');
                            toast.warning("Profile updated but role change failed", {
                                description: "Please try updating your role again."
                            });
                        } else {
                            console.log('✅ Role updated successfully');
                        }
                    } catch (roleError) {
                        console.error('❌ Error updating role:', roleError);
                        toast.warning("Profile updated but role change failed", {
                            description: "Please try updating your role again."
                        });
                    }
                }
                
                // Update user context
                if (currentUser) {
                    updateUser({
                        ...currentUser,
                        username: updateData.username,
                        email: updateData.email,
                        phone: updateData.phone || undefined,
                        userRole: profile.userRole, // Use the new role
                        avatar: updateData.avatar || undefined
                    });
                }
                
                if (isWelcomeFlow) {
                    toast.success("Profile completed successfully! Please sign in to continue.", {
                        description: "Your account is now ready to use."
                    });
                    
                    // Redirect to signin with success message
                    setTimeout(() => {
                        router.push('/auth/signin?message=profile_completed');
                    }, 1500);
                } else {
                    toast.success("Profile updated successfully");
                    setHasChanges(false);
                    
                    // Update original profile to new values
                    if (currentUser) {
                        setOriginalProfile({
                            id: currentUser.id,
                            username: updateData.username,
                            email: updateData.email,
                            phone: updateData.phone || '',
                            avatar: updateData.avatar || '',
                            userRole: profile.userRole // Use the new role value
                        });
                    }
                }
            } else {
                throw new Error("Failed to update profile");
            }
        } catch (error: any) {
            console.error('❌ Error updating profile:', error);
            
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 409) {
                    toast.error("Username or email already exists", {
                        description: "Please choose a different username or email."
                    });
                } else if (error.response?.status === 400) {
                    const errorMessage = error.response?.data?.error || error.response?.data?.message || "Invalid data";
                    
                    // Show specific validation errors
                    if (errorMessage.includes("Username")) {
                        setErrors(prev => ({
                            ...prev,
                            username: errorMessage
                        }));
                    } else if (errorMessage.includes("Email")) {
                        setErrors(prev => ({
                            ...prev,
                            email: errorMessage
                        }));
                    }
                    
                    toast.error("Validation error", {
                        description: errorMessage
                    });
                } else {
                    toast.error("Failed to update profile", {
                        description: "Please try again or contact support."
                    });
                }
            } else {
                toast.error("Failed to update profile", {
                    description: "Please try again or contact support."
                });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (currentUser) {
            setProfile({
                id: currentUser.id,
                username: currentUser.username || '',
                email: currentUser.email || '',
                phone: currentUser.phone || '',
                avatar: currentUser.avatar || '',
                userRole: currentUser.userRole || 'USER'
            });
        }
        setErrors({});
    };

    const handleReset = () => {
        setProfile({ ...originalProfile });
        setHasChanges(false);
        setErrors({});
        toast.info("Changes have been reset");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <TopNavigation />
                <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="text-gray-600">Loading profile...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <TopNavigation />
            
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                    // For welcome flow, redirect to signin after completion
                                    if (isWelcomeFlow) {
                                        router.push('/auth/signin?message=profile_completed');
                                    } else {
                                        router.back();
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {isWelcomeFlow ? 'Continue to Sign In' : 'Back'}
                            </Button>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">
                                    {isWelcomeFlow ? 'Complete Your Profile' : 'Profile Settings'}
                                    {hasChanges && (
                                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                            Unsaved changes
                                        </span>
                                    )}
                                </h1>
                                <p className="text-sm text-gray-600">
                                    {isWelcomeFlow 
                                        ? "Welcome! Please add your personal information to complete your registration"
                                        : hasChanges 
                                            ? "You have unsaved changes. Don't forget to save!" 
                                            : "Manage your account information and preferences"
                                    }
                                </p>
                            </div>
                        </div>
                        
                        {(hasChanges || isWelcomeFlow) && (
                            <div className="flex items-center gap-2">
                                {!isWelcomeFlow && (
                                    <Button
                                        variant="outline"
                                        onClick={handleReset}
                                        disabled={isSaving}
                                        className="flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Reset
                                    </Button>
                                )}
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving || (isWelcomeFlow && (!profile.username.trim() || !profile.email.trim()))}
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
                                            {isWelcomeFlow ? 'Complete Registration' : 'Save Changes'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                    
                    {/* Welcome flow progress indicator */}
                    {isWelcomeFlow && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                    2
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-blue-900">
                                        Step 2 of 2: Complete Your Profile
                                    </h3>
                                    <p className="text-sm text-blue-700">
                                        Add your personal information and preferences. You can always update these later.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-200">
                        <div className="relative">
                            <UserAvatar 
                                user={{
                                    username: profile.username,
                                    email: profile.email,
                                    avatar: profile.avatar
                                }}
                                size="lg"
                                className="w-20 h-20"
                            />
                            
                            {/* Upload overlay */}
                            <div 
                                className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {isUploadingAvatar ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                ) : (
                                    <Camera className="w-6 h-6 text-white" />
                                )}
                            </div>
                            
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                        
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold text-gray-900 mb-1">
                                {profile.username}
                            </h2>
                            <p className="text-gray-600 mb-2">{profile.email}</p>
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-500">
                                    {profile.userRole === 'USER' ? 'User' :
                                     profile.userRole === 'ADMIN' ? 'Admin' :
                                     profile.userRole === 'MANAGER' ? 'Manager' :
                                     profile.userRole === 'DEVELOPER' ? 'Developer' :
                                     profile.userRole === 'TESTER' ? 'Tester' :
                                     profile.userRole === 'DESIGNER' ? 'Designer' :
                                     profile.userRole === 'SCRUM_MASTER' ? 'Scrum Master' :
                                     profile.userRole === 'PRODUCT_OWNER' ? 'Product Owner' :
                                     'User'}
                                </span>
                            </div>
                        </div>
                        
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            className="flex items-center gap-2"
                        >
                            {isUploadingAvatar ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Change Avatar
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-gray-400" />
                                Basic Information
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Username *
                                    </label>
                                    <Input
                                        value={profile.username}
                                        onChange={(e) => handleInputChange('username', e.target.value)}
                                        placeholder="Enter username (no spaces)"
                                        className={`w-full ${errors.username ? 'border-red-500' : ''}`}
                                    />
                                    {errors.username && (
                                        <div className="mt-1">
                                            <p className="text-red-500 text-xs">{errors.username}</p>
                                            {!/^[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s._-]+$/.test(profile.username) && profile.username.trim() && (
                                                <p className="text-blue-600 text-xs mt-1">
                                                    💡 Suggested: <button 
                                                        type="button"
                                                        onClick={() => handleInputChange('username', suggestValidUsername(profile.username))}
                                                        className="underline hover:text-blue-800"
                                                    >
                                                        {suggestValidUsername(profile.username)}
                                                    </button>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-gray-500 text-xs mt-1">
                                        3-50 characters: letters, numbers, spaces, dots (.), underscores (_), hyphens (-) only
                                    </p>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address *
                                    </label>
                                    <Input
                                        type="email"
                                        value={profile.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        placeholder="Enter email address"
                                        className={`w-full ${errors.email ? 'border-red-500' : ''}`}
                                    />
                                    {errors.email && (
                                        <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <Phone className="w-5 h-5 text-gray-400" />
                                Contact Information
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number
                                    </label>
                                    <Input
                                        type="tel"
                                        value={profile.phone || ''}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        placeholder="Enter phone number"
                                        className={`w-full ${errors.phone ? 'border-red-500' : ''}`}
                                    />
                                    {errors.phone && (
                                        <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                                    )}
                                    <p className="text-gray-500 text-xs mt-1">
                                        Optional - for account security and notifications
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Account Information */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                Account Information
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Account Type
                                    </label>
                                    <Dropdown
                                        placeholder="Select account type"
                                        options={[
                                            "User",
                                            "Admin", 
                                            "Manager",
                                            "Developer",
                                            "Tester",
                                            "Designer",
                                            "Scrum Master",
                                            "Product Owner"
                                        ]}
                                        defaultValue={
                                            profile.userRole === 'USER' ? 'User' :
                                            profile.userRole === 'ADMIN' ? 'Admin' :
                                            profile.userRole === 'MANAGER' ? 'Manager' :
                                            profile.userRole === 'DEVELOPER' ? 'Developer' :
                                            profile.userRole === 'TESTER' ? 'Tester' :
                                            profile.userRole === 'DESIGNER' ? 'Designer' :
                                            profile.userRole === 'SCRUM_MASTER' ? 'Scrum Master' :
                                            profile.userRole === 'PRODUCT_OWNER' ? 'Product Owner' :
                                            'User'
                                        }
                                        onSelect={(value: string) => {
                                            const roleValue = 
                                                value === 'User' ? 'USER' :
                                                value === 'Admin' ? 'ADMIN' :
                                                value === 'Manager' ? 'MANAGER' :
                                                value === 'Developer' ? 'DEVELOPER' :
                                                value === 'Tester' ? 'TESTER' :
                                                value === 'Designer' ? 'DESIGNER' :
                                                value === 'Scrum Master' ? 'SCRUM_MASTER' :
                                                value === 'Product Owner' ? 'PRODUCT_OWNER' :
                                                'USER';
                                            handleInputChange('userRole', roleValue);
                                        }}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Your role determines your permissions and access level in the system
                                    </p>
                                </div>
                                
                                {profile.createdAt && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Member Since
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-md">
                                            <span className="text-sm text-gray-600">
                                                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 