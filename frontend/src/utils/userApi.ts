import axios from 'axios';

/**
 * Fetch username from User Service API
 * @param userId - The user ID to fetch username for
 * @returns Promise<string> - The username or fallback name
 */
export const fetchUsernameById = async (userId: string): Promise<string> => {
  try {
    console.log(`🔍 Fetching username for userId: ${userId}`);
    
    const response = await axios.get(`http://localhost:8086/api/users/${userId}/username`, {
      timeout: 5000 // 5 second timeout
    });

    if (response.data?.status === "SUCCESS" && response.data?.data) {
      const username = response.data.data;
      console.log(`✅ Successfully fetched username: ${username} for userId: ${userId}`);
      return username;
    } else {
      console.warn(`⚠️ Invalid response from User Service for userId: ${userId}`, response.data);
      return `User-${userId.substring(0, 8)}`;
    }
  } catch (error: any) {
    console.error(`❌ Failed to fetch username for userId: ${userId}`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.error(`❌ User not found: ${userId}`);
      } else if (error.code === 'ECONNREFUSED') {
        console.error('❌ Cannot connect to User Service');
      }
    }
    
    // Fallback to safe username
    return `User-${userId.substring(0, 8)}`;
  }
};

/**
 * Fetch username with caching to avoid repeated API calls
 */
const usernameCache = new Map<string, { username: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const fetchUsernameCached = async (userId: string): Promise<string> => {
  const now = Date.now();
  const cached = usernameCache.get(userId);
  
  // Return cached result if it's still valid
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log(`🔄 Using cached username: ${cached.username} for userId: ${userId}`);
    return cached.username;
  }
  
  // Fetch fresh data
  const username = await fetchUsernameById(userId);
  
  // Cache the result
  usernameCache.set(userId, { username, timestamp: now });
  
  return username;
}; 