import '../loadEnv.js';
import { OAuth2Client } from 'google-auth-library';

// Extracted from index.js so controllers can import the client
export const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
