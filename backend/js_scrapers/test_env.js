import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
console.log('[TEST] MONGO_URI:', process.env.MONGO_URI); 