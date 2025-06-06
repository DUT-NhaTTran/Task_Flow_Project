import React from 'react';
import { useUserStorage } from '@/hooks/useUserStorage';
import UserStorageService from '@/services/userStorageService';

interface UserDataDisplayProps {
  title?: string;
  showActions?: boolean;
}

export const UserDataDisplay: React.FC<UserDataDisplayProps> = ({ 
  title = "Current User Information", 
  showActions = true 
}) => {
  const { 
    userData, 
    userProfile, 
    accountInfo, 
    isLoggedIn, 
    sessionToken, 
    displayName, 
    userInitials,
    isLoading,
    error,
    debugLogData,
    logout
  } = useUserStorage();

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
          <span className="text-blue-700">Loading user data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-700">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !userData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-gray-600 text-center">
          <div className="text-lg mb-2">👤</div>
          <div>No user logged in</div>
          <div className="text-sm text-gray-500 mt-1">
            Please log in to see user information
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {userInitials}
          </div>
          <span className="text-green-600 text-sm">● Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 border-b border-gray-100 pb-1">
            👤 User Profile (from Users table)
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">ID:</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {userProfile?.id?.substring(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Username:</span>
              <span className="font-medium">{userProfile?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span>{userProfile?.email}</span>
            </div>
            {userProfile?.firstName && (
              <div className="flex justify-between">
                <span className="text-gray-600">First Name:</span>
                <span>{userProfile.firstName}</span>
              </div>
            )}
            {userProfile?.lastName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Last Name:</span>
                <span>{userProfile.lastName}</span>
              </div>
            )}
            {userProfile?.role && (
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {userProfile.role}
                </span>
              </div>
            )}
            {userProfile?.phoneNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span>{userProfile.phoneNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Account Info Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 border-b border-gray-100 pb-1">
            🔐 Account Info (from Accounts table)
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Account ID:</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {accountInfo?.id?.substring(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email Verified:</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                accountInfo?.isEmailVerified 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {accountInfo?.isEmailVerified ? '✓ Verified' : '✗ Not Verified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active:</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                accountInfo?.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {accountInfo?.isActive ? '✓ Active' : '✗ Inactive'}
              </span>
            </div>
            {accountInfo?.createdAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="text-xs">{formatDate(accountInfo.createdAt)}</span>
              </div>
            )}
            {accountInfo?.lastLoginAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Last Login:</span>
                <span className="text-xs">{formatDate(accountInfo.lastLoginAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <h4 className="font-medium text-gray-900 mb-3">🎫 Session Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Display Name:</span>
            <span className="font-medium">{displayName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Login Time:</span>
            <span className="text-xs">{formatDate(userData.loginTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Session Token:</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {sessionToken ? `***${sessionToken.slice(-8)}` : 'None'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Logged In:</span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              isLoggedIn 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isLoggedIn ? '✓ Yes' : '✗ No'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={debugLogData}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium transition-colors"
            >
              🔍 Debug Log to Console
            </button>
            <button
              onClick={() => {
                const data = JSON.stringify(userData, null, 2);
                navigator.clipboard.writeText(data);
                alert('User data copied to clipboard!');
              }}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm font-medium transition-colors"
            >
              📋 Copy Data
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to logout?')) {
                  logout();
                  window.location.reload();
                }
              }}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium transition-colors"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDataDisplay; 