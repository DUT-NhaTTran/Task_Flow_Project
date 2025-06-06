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

// Key để lưu trong localStorage
const USER_STORAGE_KEY = 'taskflow_logged_user';
const USER_SESSION_KEY = 'taskflow_user_session';

export class UserStorageService {
  
  /**
   * Lưu thông tin user vào localStorage khi login thành công
   */
  static saveLoggedInUser(accountData: AccountInfo, userProfile: UserProfile, sessionToken?: string): void {
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

      // Lưu vào localStorage
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInData));
      
      // Lưu session token riêng để dễ truy cập
      if (sessionToken) {
        localStorage.setItem(USER_SESSION_KEY, sessionToken);
      }

      // Log để debug
      console.log('✅ User data saved to localStorage:', {
        userId: userProfile.id,
        username: userProfile.username,
        email: accountData.email,
        loginTime: loggedInData.loginTime
      });

    } catch (error) {
      console.error('❌ Error saving user data to localStorage:', error);
    }
  }

  /**
   * Lấy thông tin user đã login từ localStorage
   */
  static getLoggedInUser(): LoggedInUserData | null {
    try {
      const userData = localStorage.getItem(USER_STORAGE_KEY);
      if (!userData) {
        return null;
      }

      const parsedData: LoggedInUserData = JSON.parse(userData);
      
      // Kiểm tra tính hợp lệ của session (có thể thêm logic expire)
      if (!parsedData.account || !parsedData.profile) {
        console.warn('⚠️ Invalid user data in localStorage');
        this.clearLoggedInUser();
        return null;
      }

      return parsedData;
    } catch (error) {
      console.error('❌ Error reading user data from localStorage:', error);
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
    return localStorage.getItem(USER_SESSION_KEY);
  }

  /**
   * Update thông tin profile user
   */
  static updateUserProfile(updatedProfile: Partial<UserProfile>): void {
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

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedData));
      console.log('✅ User profile updated in localStorage');
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
    }
  }

  /**
   * Xóa thông tin user khi logout
   */
  static clearLoggedInUser(): void {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(USER_SESSION_KEY);
      
      // Xóa các key cũ nếu có
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('user_name');
      localStorage.removeItem('userName');
      
      console.log('✅ User data cleared from localStorage');
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

        // Lưu thông tin mới vào localStorage
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
   * Migrate từ localStorage cũ sang format mới
   */
  static migrateOldUserData(): void {
    try {
      // Kiểm tra xem đã có data mới chưa
      if (this.getLoggedInUser()) {
        return; // Đã có data mới rồi
      }

      // Tìm data cũ
      const oldUserId = localStorage.getItem('userId');
      const oldUsername = localStorage.getItem('username') || localStorage.getItem('user_name');
      const oldEmail = localStorage.getItem('userEmail');

      if (oldUserId && oldUsername) {
        console.log('🔄 Migrating old user data to new format...');
        
        // Tạo data tạm thời từ thông tin cũ
        const tempAccount: AccountInfo = {
          id: oldUserId,
          email: oldEmail || '',
          isEmailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        };

        const tempProfile: UserProfile = {
          id: oldUserId,
          username: oldUsername,
          email: oldEmail || ''
        };

        this.saveLoggedInUser(tempAccount, tempProfile);
        
        // Sau đó sync với server để lấy data đúng
        this.syncUserFromServer(oldUserId);
        
        console.log('✅ Old user data migrated successfully');
      }
    } catch (error) {
      console.error('❌ Error migrating old user data:', error);
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
   * Debug: Log toàn bộ thông tin user hiện tại
   */
  static debugLogUserData(): void {
    const userData = this.getLoggedInUser();
    if (userData) {
      console.group('🔍 Current User Data');
      console.log('📧 Account Info:', userData.account);
      console.log('👤 Profile Info:', userData.profile);
      console.log('🕒 Login Time:', userData.loginTime);
      console.log('🎫 Session Token:', userData.sessionToken ? '***' + userData.sessionToken.slice(-8) : 'None');
      console.groupEnd();
    } else {
      console.log('❌ No user logged in');
    }
  }
}

// Export default instance
export default UserStorageService; 