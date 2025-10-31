const redis = require('redis');

async function testRedis() {
  console.log('🧪 Testing Redis connection...\n');

  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  try {
    await client.connect();
    console.log('✅ Redis connected!');
    
    await client.set('test:key', 'Hello Redis');
    const value = await client.get('test:key');
    console.log('✅ GET/SET works:', value);
    
    await client.rPush('test:queue', 'user1', 'user2');
    const length = await client.lLen('test:queue');
    console.log('✅ LIST operations work, length:', length);

    // Test LIST operations (for queue)
    await client.rPush('test:queue', 'user1', 'user2', 'user3');
    const queueLength = await client.lLen('test:queue');
    console.log(`✅ LIST operations successful, queue length: ${queueLength}`);

    // Test KEYS
    const keys = await client.keys('test:*');
    console.log(`✅ Found keys: ${keys.join(', ')}`);

    // Cleanup
    await client.del('test:connection', 'test:queue');
    console.log('✅ Cleanup successful');
    
    await client.del('test:key', 'test:queue');
    await client.disconnect();
    
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testRedis();