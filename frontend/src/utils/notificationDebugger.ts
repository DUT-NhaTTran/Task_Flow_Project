import axios from 'axios';

export interface NotificationTestResult {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  timestamp: string;
}

// Standard notification payload structure
interface StandardNotificationPayload {
  type: string;
  title: string;
  message: string;
  recipientUserId: string;
  actorUserId: string;
  actorUserName: string;
  projectId: string;
  projectName: string;
  taskId: string;
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
   * Test create notification API with standard payload format
   */
  static async testCreateNotification(testData?: any): Promise<NotificationTestResult> {
    try {
      console.log('🔍 Testing create notification API...');
      
      // Standard payload format - only essential fields
      const defaultTestData: StandardNotificationPayload = {
        type: "TASK_ASSIGNED",
        title: "Test from Notification Debugger",
        message: "This is a test notification to check API and database",
        recipientUserId: "test-recipient-123",
        actorUserId: "test-actor-456",
        actorUserName: "Test User Debugger",
        projectId: "test-project-789",
        projectName: "Test Project",
        taskId: "test-task-abc"
      };

      const notificationData = testData || defaultTestData;
      
      console.log('📤 Sending standard test notification:', notificationData);
      
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
   * Run complete notification test suite
   */
  static async runCompleteSuite(): Promise<NotificationTestResult[]> {
    console.group('🧪 Running Complete Notification Test Suite');
    
    const results: NotificationTestResult[] = [];
    
    // Test 1: Health check
    console.log('\n1️⃣ Testing notification service health...');
    const healthResult = await this.testNotificationServiceHealth();
    results.push(healthResult);
    console.log('Health check result:', healthResult.success ? '✅ PASS' : '❌ FAIL');
    
    // Test 2: Create notification
    console.log('\n2️⃣ Testing notification creation...');
    const createResult = await this.testCreateNotification();
    results.push(createResult);
    console.log('Create notification result:', createResult.success ? '✅ PASS' : '❌ FAIL');
    
    // Test 3: Get notifications
    console.log('\n3️⃣ Testing notification retrieval...');
    const getResult = await this.testGetNotifications();
    results.push(getResult);
    console.log('Get notifications result:', getResult.success ? '✅ PASS' : '❌ FAIL');
    
    // Summary
    const passCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`\n📊 Test Suite Summary: ${passCount}/${totalCount} tests passed`);
    
    if (passCount === totalCount) {
      console.log('🎉 All tests passed! Notification system is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the results above for details.');
    }
    
    console.groupEnd();
    
    return results;
  }

  /**
   * Test with real user data using standard format
   */
  static async testWithRealUserData(
    currentUserId: string,
    currentUserName: string,
    assigneeId: string,
    taskId: string,
    taskTitle: string,
    projectId: string,
    projectName: string
  ): Promise<NotificationTestResult> {
    try {
      console.log('🔍 Testing with real user data using standard format...');
      
      // Standard payload format - only essential fields
      const realNotificationData: StandardNotificationPayload = {
        type: "TASK_ASSIGNED",
        title: "Test from Real Data",
        message: `${currentUserName} assigned you to task "${taskTitle}"`,
        recipientUserId: assigneeId,
        actorUserId: currentUserId,
        actorUserName: currentUserName,
        projectId: projectId,
        projectName: projectName,
        taskId: taskId
      };
      
      console.log('📤 Sending real notification data (standard format):', realNotificationData);
      
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
  const results = await debugger.runCompleteSuite();
  
  // Also debug database
  await debugger.debugNotificationDatabase();
  
  return results;
};

export default NotificationDebugger; 