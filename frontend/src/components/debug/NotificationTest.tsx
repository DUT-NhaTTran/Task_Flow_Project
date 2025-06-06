import React, { useState } from 'react';
import UserStorageService from '@/services/userStorageService';
import { NotificationDebugger } from '@/utils/notificationDebugger';

export const NotificationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: any) => {
    setTestResults(prev => [result, ...prev]);
  };

  const testUserStorageService = () => {
    const userData = UserStorageService.getLoggedInUser();
    const profile = UserStorageService.getCurrentUserProfile();
    const account = UserStorageService.getCurrentAccount();
    const sessionToken = UserStorageService.getSessionToken();
    const displayName = UserStorageService.getUserDisplayName();
    const initials = UserStorageService.getUserInitials();

    addResult({
      type: 'UserStorageService Test',
      success: !!userData,
      data: {
        hasUserData: !!userData,
        hasProfile: !!profile,
        hasAccount: !!account,
        username: profile?.username,
        email: profile?.email,
        accountEmail: account?.email,
        sessionToken: sessionToken ? `***${sessionToken.slice(-8)}` : 'None',
        displayName,
        initials
      },
      timestamp: new Date().toISOString()
    });
  };

  const testNotificationService = async () => {
    setIsLoading(true);
    try {
      const healthResult = await NotificationDebugger.testNotificationServiceHealth();
      addResult({
        type: 'Notification Service Health',
        ...healthResult
      });

      if (healthResult.success) {
        const userData = UserStorageService.getLoggedInUser();
        if (userData?.profile) {
          const testNotificationResult = await NotificationDebugger.testCreateNotification({
            type: "TASK_COMMENT",
            title: "Test notification from debug",
            message: `${userData.profile.username} is testing notification system`,
            recipientUserId: userData.profile.id,
            actorUserId: userData.profile.id,
            actorUserName: userData.profile.username,
            projectId: "test-project",
            taskId: "test-task"
          });

          addResult({
            type: 'Test Notification Creation',
            ...testNotificationResult
          });
        } else {
          addResult({
            type: 'Test Notification Creation',
            success: false,
            error: 'No user logged in - cannot test notification',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      addResult({
        type: 'Notification Test Error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const debugUserStorage = () => {
    UserStorageService.debugLogUserData();
    addResult({
      type: 'Debug Log',
      success: true,
      data: 'Check browser console for detailed user data',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">🔧 Notification & User Storage Test</h2>
        
        {/* Test Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={testUserStorageService}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Test UserStorageService
          </button>
          
          <button
            onClick={testNotificationService}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? 'Testing...' : 'Test Notification Service'}
          </button>
          
          <button
            onClick={debugUserStorage}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Debug User Data
          </button>
          
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Clear Results
          </button>
        </div>

        {/* Results Display */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Test Results ({testResults.length})</h3>
          
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No test results yet. Click a test button above to start.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    result.success
                      ? 'bg-green-50 border-green-500'
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.success ? '✅' : '❌'} {result.type}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {result.error && (
                    <div className="text-red-700 text-sm mb-2">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                  
                  {result.status && (
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Status:</strong> {result.status}
                    </div>
                  )}
                  
                  {result.data && (
                    <div className="text-sm">
                      <strong>Data:</strong>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {typeof result.data === 'string' 
                          ? result.data 
                          : JSON.stringify(result.data, null, 2)
                        }
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">📖 Instructions:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Make sure you're logged in first</li>
            <li>2. Test UserStorageService to verify username is saved correctly</li>
            <li>3. Test Notification Service to check API connectivity</li>
            <li>4. Use Debug User Data to view detailed information in console</li>
            <li>5. Check that actorUserName uses the username from login</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 