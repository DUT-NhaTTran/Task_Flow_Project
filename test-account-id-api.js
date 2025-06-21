const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

// Test function
async function testAccountIdAPI(email, testName) {
    console.log(`\n=== ${testName} ===`);
    console.log(`Testing email: ${email}`);
    
    try {
        const response = await axios.get(`${BASE_URL}/api/auth/account-id/${email}`);
        console.log('✅ Success:');
        console.log('Status:', response.status);
        console.log('Response:', response.data);
        console.log('Account ID:', response.data.accountId);
    } catch (error) {
        console.log('❌ Error:');
        console.log('Status:', error.response?.status || 'No response');
        console.log('Error:', error.response?.data || error.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🧪 Starting Account ID API Tests...');
    
    // Test cases
    await testAccountIdAPI('test@example.com', 'Test Case 1: Valid Email');
    await testAccountIdAPI('notfound@example.com', 'Test Case 2: Email Not Found');
    await testAccountIdAPI('invalid-email', 'Test Case 3: Invalid Email Format');
    await testAccountIdAPI('', 'Test Case 4: Empty Email');
    await testAccountIdAPI('user@domain.com', 'Test Case 5: Another Valid Email');
    
    console.log('\n🏁 Tests completed!');
}

// Run tests
runAllTests().catch(console.error); 