const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super_secret_jwt_token_key_for_asquare_properties';

// Create a JWT token for a new User ID 99
const token = jwt.sign({ id: 99, email: 'newuser@example.com', name: 'New User', role: 'user' }, JWT_SECRET);

async function testRatings() {
  try {
    // 1. Submit rating (first time for user 99)
    console.log('--- Submitting rating 4 stars for User 99 ---');
    let res1 = await fetch('http://localhost:3000/api/services/1/ratings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rating: 4 })
    });
    let data1 = await res1.json();
    console.log('Response 1 Status:', res1.status);
    console.log('Response 1 Data:', data1);

    // 2. Submit rating again (should be update for user 99)
    console.log('\n--- Submitting rating 5 stars (should update) for User 99 ---');
    let res2 = await fetch('http://localhost:3000/api/services/1/ratings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rating: 5 })
    });
    let data2 = await res2.json();
    console.log('Response 2 Status:', res2.status);
    console.log('Response 2 Data:', data2);

    // 3. Query the service details to verify calculated rating
    console.log('\n--- Querying service details ---');
    let res3 = await fetch('http://localhost:3000/api/services/1');
    let data3 = await res3.json();
    console.log('Service Data:', data3.data);

  } catch (err) {
    console.error('Test failed:', err);
  }
}

testRatings();
