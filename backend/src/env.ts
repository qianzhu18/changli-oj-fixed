import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env from the working directory first (docker: /app/.env, local dev: backend/.env).
// dotenv does not override already-defined process.env values by default.
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

