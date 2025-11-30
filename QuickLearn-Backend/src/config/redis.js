const Redis = require("ioredis");
let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379/0";

    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true, // Enable offline queue to handle commands before connection is ready
    });

    redisClient.on("connect", () => {
      console.log("[Redis] Connected to Redis server");
    });

    redisClient.on("error", (err) => {
      console.error("[Redis] Error:", err);
    });

    redisClient.on("ready", () => {
      console.log("[Redis] Redis client ready");
    });
  }
  return redisClient;
}

// Test connection on startup
async function testConnection() {
  try {
    const client = getRedisClient();
    
    // Wait for client to be ready if not already connected
    if (client.status !== 'ready') {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 5000);
        
        if (client.status === 'ready') {
          clearTimeout(timeout);
          resolve();
        } else {
          client.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });
          
          client.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        }
      });
    }
    
    await client.ping();
    console.log("[Redis] Connection test successful");
    return true;
  } catch (error) {
    console.error("[Redis] Connection test failed:", error.message);
    return false;
  }
}

module.exports = {
  getRedisClient,
  testConnection,
};
