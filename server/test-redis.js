const redis = require('redis');

async function testRedis() {
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
    
    await client.del('test:key', 'test:queue');
    await client.disconnect();
    
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Redis test failed:', error);
  }
}

testRedis();