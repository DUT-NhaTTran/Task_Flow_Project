import axios from 'axios';

// Interface cho User từ Users table
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
}

// Interface cho Account từ Accounts table  
export interface AccountInfo {
  id: string;
  email: string;
  password?: string; // Don't store password in frontend
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

// Interface cho thông tin đầy đủ khi login
export interface LoggedInUserData {
  account: AccountInfo;
  profile: UserProfile;
  loginTime: string;
  sessionToken?: string;
}

// Key để lưu trong sessionStorage (thay đổi từ localStorage)
const USER_STORAGE_KEY = 'taskflow_logged_user';
const USER_SESSION_KEY = 'taskflow_user_session';

// Helper function to check if we're in browser environment
const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
};

export class UserStorageService {
  
  /**
   * Lưu thông tin user vào sessionStorage khi login thành công
   */
  static saveLoggedInUser(accountData: AccountInfo, userProfile: UserProfile, sessionToken?: string): void {
    if (!isBrowser()) {
      console.warn('⚠️ sessionStorage not available (SSR environment)');
      return;
    }

    try {
      const loggedInData: LoggedInUserData = {
        account: {
          ...accountData,
          password: undefined // Never store password
        },
        profile: userProfile,
        loginTime: new Date().toISOString(),
        sessionToken: sessionToken
      };

      // Lưu vào sessionStorage thay vì localStorage
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInData));
      
      // Lưu session token riêng để dễ truy cập
      if (sessionToken) {
        sessionStorage.setItem(USER_SESSION_KEY, sessionToken);
      }

      // Log để debug
      console.log('✅ User data saved to sessionStorage:', {
        userId: userProfile.id,
        username: userProfile.username,
        email: accountData.email,
        loginTime: loggedInData.loginTime
      });

    } catch (error) {
      console.error('❌ Error saving user data to sessionStorage:', error);
    }
  }

  /**
   * Lấy thông tin user đã login từ sessionStorage
   */
  static getLoggedInUser(): LoggedInUserData | null {
    if (!isBrowser()) {
      return null;
    }

    try {
      const userData = sessionStorage.getItem(USER_STORAGE_KEY);
      if (!userData) {
        return null;
      }

      const parsedData: LoggedInUserData = JSON.parse(userData);
      
      // Kiểm tra tính hợp lệ của session (có thể thêm logic expire)
      if (!parsedData.account || !parsedData.profile) {
        console.warn('⚠️ Invalid user data in sessionStorage');
        this.clearLoggedInUser();
        return null;
      }

      return parsedData;
    } catch (error) {
      console.error('❌ Error reading user data from sessionStorage:', error);
      this.clearLoggedInUser();
      return null;
    }
  }

  /**
   * Lấy profile user hiện tại
   */
  static getCurrentUserProfile(): UserProfile | null {
    const userData = this.getLoggedInUser();
    return userData?.profile || null;
  }

  /**
   * Lấy account info hiện tại
   */
  static getCurrentAccount(): AccountInfo | null {
    const userData = this.getLoggedInUser();
    return userData?.account || null;
  }

  /**
   * Lấy session token
   */
  static getSessionToken(): string | null {
    if (!isBrowser()) {
      return null;
    }
    return sessionStorage.getItem(USER_SESSION_KEY);
  }

  /**
   * Update thông tin profile user
   */
  static updateUserProfile(updatedProfile: Partial<UserProfile>): void {
    if (!isBrowser()) {
      console.warn('⚠️ sessionStorage not available (SSR environment)');
      return;
    }

    try {
      const currentData = this.getLoggedInUser();
      if (!currentData) {
        console.warn('⚠️ No user data to update');
        return;
      }

      const updatedData: LoggedInUserData = {
        ...currentData,
        profile: {
          ...currentData.profile,
          ...updatedProfile
        }
      };

      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedData));
      console.log('✅ User profile updated in sessionStorage');
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
    }
  }

  /**
   * Xóa thông tin user khi logout
   */
  static clearLoggedInUser(): void {
    if (!isBrowser()) {
      console.warn('⚠️ sessionStorage not available (SSR environment)');
      return;
    }

    try {
      console.log("🧹 UserStorageService: Starting complete data cleanup...");
      
      // Clear main user data from sessionStorage
      sessionStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(USER_SESSION_KEY);
      
      // Clear all possible user-related keys from sessionStorage
      const sessionKeysToRemove = [
        'username', 'userId', 'userEmail', 'user_name', 'userName',
        'ownerId', 'currentUserId', 'user_id', 'currentProjectId',
        'token', 'authToken', 'sessionToken', 'accessToken',
        'currentProjectName', 'currentProjectKey', 'projectId',
        'taskflow_logged_user', 'taskflow_user_session'
      ];
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
      });
      
      // Clear main user data from localStorage for migration/cleanup
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(USER_SESSION_KEY);
        
        // Clear all possible user-related keys from localStorage
        const localKeysToRemove = [
          'username', 'userId', 'userEmail', 'user_name', 'userName',
          'ownerId', 'currentUserId', 'user_id', 'currentProjectId',
          'token', 'authToken', 'sessionToken', 'accessToken',
          'currentProjectName', 'currentProjectKey', 'projectId',
          'taskflow_logged_user', 'taskflow_user_session'
        ];
        
        localKeysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
      }
      
      console.log("✅ UserStorageService: All user data cleared from both sessionStorage and localStorage");
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
    }
  }

  /**
   * Kiểm tra user có đang login không
   */
  static isUserLoggedIn(): boolean {
    const userData = this.getLoggedInUser();
    return userData !== null && userData.account.isActive;
  }

  /**
   * Fetch và sync thông tin user mới nhất từ server
   */
  static async syncUserFromServer(userId: string): Promise<LoggedInUserData | null> {
    try {
      console.log('🔄 Syncing user data from server for userId:', userId);

      // Fetch user profile từ Users service
      const userResponse = await axios.get(`http://localhost:8086/api/users/${userId}`);
      
      // Fetch account info từ Auth service  
      const accountResponse = await axios.get(`http://localhost:8088/api/auth/account/${userId}`);

      if (userResponse.data?.status === 'SUCCESS' && accountResponse.data?.status === 'SUCCESS') {
        const userProfile: UserProfile = userResponse.data.data;
        const accountInfo: AccountInfo = accountResponse.data.data;

        // Lưu thông tin mới vào sessionStorage
        this.saveLoggedInUser(accountInfo, userProfile, this.getSessionToken() || undefined);

        console.log('✅ User data synced from server successfully');
        return this.getLoggedInUser();
      } else {
        console.error('❌ Failed to sync user data from server');
        return null;
      }
    } catch (error) {
      console.error('❌ Error syncing user data from server:', error);
      return null;
    }
  }

  /**
   * Migration từ localStorage sang sessionStorage (một lần)
   */
  static migrateOldUserData(): void {
    if (!isBrowser()) {
      return; // No migration needed in SSR environment
    }

    try {
      // Kiểm tra xem có data cũ trong localStorage không
      const oldUserData = localStorage.getItem(USER_STORAGE_KEY);
      const currentSessionData = sessionStorage.getItem(USER_STORAGE_KEY);
      
      // Chỉ migrate nếu sessionStorage chưa có data và localStorage có data
      if (!currentSessionData && oldUserData) {
        console.log('🔄 Migrating user data from localStorage to sessionStorage...');
        
        // Copy data sang sessionStorage
        sessionStorage.setItem(USER_STORAGE_KEY, oldUserData);
        
        // Migrate session token nếu có
        const oldSessionToken = localStorage.getItem(USER_SESSION_KEY);
        if (oldSessionToken) {
          sessionStorage.setItem(USER_SESSION_KEY, oldSessionToken);
        }
        
        // Migrate các key khác
        const keysToMigrate = ['userId', 'ownerId', 'currentUserId', 'user_id', 'currentProjectId'];
        keysToMigrate.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            sessionStorage.setItem(key, value);
          }
        });
        
        console.log('✅ Migration completed successfully');
      }
    } catch (error) {
      console.error('❌ Error during migration:', error);
    }
  }

  /**
   * Lấy display name cho user
   */
  static getUserDisplayName(): string {
    const profile = this.getCurrentUserProfile();
    if (!profile) return 'Unknown User';

    if (profile.firstName && profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    
    return profile.username || profile.email || 'Unknown User';
  }

  /**
   * Lấy user initials cho avatar
   */
  static getUserInitials(): string {
    const displayName = this.getUserDisplayName();
    if (!displayName || displayName === 'Unknown User') return '?';
    
    return displayName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  /**
   * Debug method to log current user data
   */
  static debugLogUserData(): void {
    if (!isBrowser()) {
      console.log('🔍 Debug: Running in SSR environment - no user data available');
      return;
    }

    try {
      const userData = this.getLoggedInUser();
      const sessionToken = this.getSessionToken();
      const isLoggedIn = this.isUserLoggedIn();
      
      console.log('🔍 UserStorageService Debug Info:');
      console.log('- Is Logged In:', isLoggedIn);
      console.log('- Session Token:', sessionToken ? '✅ Present' : '❌ Missing');
      console.log('- User Data:', userData);
      console.log('- Display Name:', this.getUserDisplayName());
      console.log('- User Initials:', this.getUserInitials());
      
      if (userData) {
        console.log('- Profile ID:', userData.profile.id);
        console.log('- Username:', userData.profile.username);
        console.log('- Email:', userData.account.email);
        console.log('- Login Time:', userData.loginTime);
        console.log('- Account Active:', userData.account.isActive);
      }
    } catch (error) {
      console.error('❌ Error in debugLogUserData:', error);
    }
  }

}

// Export default instance
export default UserStorageService; 