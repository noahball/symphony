const redis = require("redis");

let redisClient = redis.createClient({
    socket: {
      port: process.env.REDIS_PORT,
      host: process.env.REDIS_HOST,
    },
    password: process.env.REDIS_PASSWORD
  })
  redisClient.connect().catch(console.error)

module.exports = redisClient;