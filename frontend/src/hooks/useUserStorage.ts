import { useState, useEffect } from 'react';
import UserStorageService, { LoggedInUserData, UserProfile, AccountInfo } from '@/services/userStorageService';

export interface UseUserStorageReturn {
  userData: LoggedInUserData | null;
  userProfile: UserProfile | null;
  accountInfo: AccountInfo | null;
  isLoggedIn: boolean;
  sessionToken: string | null;
  displayName: string;
  userInitials: string;
  
  // Actions
  saveUser: (account: AccountInfo, profile: UserProfile, sessionToken?: string) => void;
  updateProfile: (updatedProfile: Partial<UserProfile>) => void;
  syncFromServer: (userId: string) => Promise<LoggedInUserData | null>;
  logout: () => void;
  debugLogData: () => void;
  
  // Status
  isLoading: boolean;
  error: string | null;
}

export const useUserStorage = (): UseUserStorageReturn => {
  const [userData, setUserData] = useState<LoggedInUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data from localStorage
  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Migrate old data if needed
      UserStorageService.migrateOldUserData();
      
      // Load current user data
      const currentUserData = UserStorageService.getLoggedInUser();
      setUserData(currentUserData);
      
      if (currentUserData) {
        console.log('✅ User data loaded from localStorage:', currentUserData.profile.username);
      }
    } catch (err) {
      setError('Failed to load user data');
      console.error('❌ Error loading user data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen to localStorage changes (for multiple tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'taskflow_logged_user') {
        const newData = UserStorageService.getLoggedInUser();
        setUserData(newData);
        console.log('📱 User data updated from another tab');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Actions
  const saveUser = (account: AccountInfo, profile: UserProfile, sessionToken?: string) => {
    try {
      UserStorageService.saveLoggedInUser(account, profile, sessionToken);
      const newData = UserStorageService.getLoggedInUser();
      setUserData(newData);
      setError(null);
    } catch (err) {
      setError('Failed to save user data');
      console.error('❌ Error saving user data:', err);
    }
  };

  const updateProfile = (updatedProfile: Partial<UserProfile>) => {
    try {
      UserStorageService.updateUserProfile(updatedProfile);
      const newData = UserStorageService.getLoggedInUser();
      setUserData(newData);
      setError(null);
    } catch (err) {
      setError('Failed to update profile');
      console.error('❌ Error updating profile:', err);
    }
  };

  const syncFromServer = async (userId: string): Promise<LoggedInUserData | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const syncedData = await UserStorageService.syncUserFromServer(userId);
      if (syncedData) {
        setUserData(syncedData);
        return syncedData;
      } else {
        setError('Failed to sync user data from server');
        return null;
      }
    } catch (err) {
      setError('Failed to sync user data from server');
      console.error('❌ Error syncing from server:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      UserStorageService.clearLoggedInUser();
      setUserData(null);
      setError(null);
      console.log('✅ User logged out successfully');
    } catch (err) {
      setError('Failed to logout');
      console.error('❌ Error during logout:', err);
    }
  };

  const debugLogData = () => {
    UserStorageService.debugLogUserData();
  };

  // Computed values
  const userProfile = userData?.profile || null;
  const accountInfo = userData?.account || null;
  const isLoggedIn = UserStorageService.isUserLoggedIn();
  const sessionToken = UserStorageService.getSessionToken();
  const displayName = UserStorageService.getUserDisplayName();
  const userInitials = UserStorageService.getUserInitials();

  return {
    userData,
    userProfile,
    accountInfo,
    isLoggedIn,
    sessionToken,
    displayName,
    userInitials,
    
    // Actions
    saveUser,
    updateProfile,
    syncFromServer,
    logout,
    debugLogData,
    
    // Status
    isLoading,
    error
  };
}; 