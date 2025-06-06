import axios from 'axios';

export interface NotificationTestResult {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  timestamp: string;
}

export class NotificationDebugger {
  
  /**
   * Test notification service health
   */
  static async testNotificationServiceHealth(): Promise<NotificationTestResult> {
    try {
      console.log('🔍 Testing notification service health...');
      
      const response = await axios.get('http://localhost:8089/health', {
        timeout: 5000
      });
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Health check failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test create notification API
   */
  static async testCreateNotification(testData?: any): Promise<NotificationTestResult> {
    try {
      console.log('🔍 Testing create notification API...');
      
      const defaultTestData = {
        type: "TASK_COMMENT",
        title: "Test notification from debugger",
        message: "This is a test notification to check database save",
        recipientUserId: "test-recipient-123",
        actorUserId: "test-actor-456", 
        actorUserName: "Test User Debugger",
        projectId: "test-project-789",
        taskId: "test-task-abc",
        actionUrl: "/test"
      };

      const notificationData = testData || defaultTestData;
      
      console.log('📤 Sending test notification:', notificationData);
      
      const response = await axios.post(
        'http://localhost:8089/api/notifications/create',
        notificationData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000
        }
      );
      
      console.log('📬 Test notification response:', response.data);
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('❌ Test notification failed:', error);
      
      return {
        success: false,
        status: error.response?.status,
        error: error.response?.data || error.message || 'Create notification failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test get notifications API  
   */
  static async testGetNotifications(userId: string = "test-recipient-123"): Promise<NotificationTestResult> {
    try {
      console.log('🔍 Testing get notifications API for user:', userId);
      
      const response = await axios.get(
        `http://localhost:8089/api/notifications/user/${userId}`,
        { timeout: 5000 }
      );
      
      console.log('📬 Get notifications response:', response.data);
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: error.response?.data || error.message || 'Get notifications failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run full notification test suite
   */
  static async runFullTest(): Promise<{
    healthCheck: NotificationTestResult;
    createNotification: NotificationTestResult;
    getNotifications: NotificationTestResult;
    summary: string;
  }> {
    console.group('🔬 Running Full Notification Test Suite');
    
    // Test 1: Health check
    console.log('\n🏥 Step 1: Health Check');
    const healthCheck = await this.testNotificationServiceHealth();
    console.log('Health check result:', healthCheck);
    
    // Test 2: Create notification
    console.log('\n📝 Step 2: Create Notification');
    const createNotification = await this.testCreateNotification();
    console.log('Create notification result:', createNotification);
    
    // Test 3: Get notifications (if create was successful)
    console.log('\n📋 Step 3: Get Notifications');
    const getNotifications = await this.testGetNotifications();
    console.log('Get notifications result:', getNotifications);
    
    // Summary
    const allPassed = healthCheck.success && createNotification.success && getNotifications.success;
    const summary = allPassed 
      ? '✅ All notification tests passed! Service is working properly.'
      : '❌ Some notification tests failed. Check the results above.';
      
    console.log('\n📊 Test Summary:', summary);
    console.groupEnd();
    
    return {
      healthCheck,
      createNotification, 
      getNotifications,
      summary
    };
  }

  /**
   * Test với real user data từ TaskDetailModal
   */
  static async testWithRealUserData(
    currentUserId: string,
    currentUserName: string,
    assigneeId: string,
    taskId: string,
    taskTitle: string,
    projectId: string
  ): Promise<NotificationTestResult> {
    try {
      console.log('🔍 Testing with real user data from TaskDetailModal...');
      
      const realNotificationData = {
        type: "TASK_COMMENT",
        title: "Test comment notification with real data",
        message: `${currentUserName} commented on your task "${taskTitle}": "This is a test comment from notification debugger"`,
        recipientUserId: assigneeId,
        actorUserId: currentUserId,
        actorUserName: currentUserName,
        projectId: projectId,
        taskId: taskId,
        actionUrl: `/project/board?projectId=${projectId}&taskId=${taskId}`
      };
      
      console.log('📤 Sending real notification data:', realNotificationData);
      
      const response = await axios.post(
        'http://localhost:8089/api/notifications/create',
        realNotificationData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000
        }
      );
      
      console.log('📬 Real notification response:', response.data);
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('❌ Real notification test failed:', error);
      
      return {
        success: false,
        status: error.response?.status,
        error: error.response?.data || error.message || 'Real notification test failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Debug notification database directly (if we have access)
   */
  static async debugNotificationDatabase(): Promise<void> {
    console.group('🗄️ Notification Database Debug');
    
    try {
      // Try to get recent notifications to check database
      const response = await axios.get('http://localhost:8089/api/notifications/recent', {
        timeout: 5000
      });
      
      if (response.data) {
        console.log('📊 Recent notifications from database:', response.data);
        
        if (response.data.data && Array.isArray(response.data.data)) {
          console.log(`📈 Total notifications in database: ${response.data.data.length}`);
          
          if (response.data.data.length > 0) {
            console.log('🔍 Sample notification structure:', response.data.data[0]);
          }
        }
      }
    } catch (error: any) {
      console.log('⚠️ Could not access notification database directly');
      console.log('Error:', error.message);
    }
    
    console.groupEnd();
  }
}

// Helper function for quick testing
export const quickNotificationTest = async () => {
  const debugger = new NotificationDebugger();
  const results = await debugger.runFullTest();
  
  // Also debug database
  await debugger.debugNotificationDatabase();
  
  return results;
};

export default NotificationDebugger; 