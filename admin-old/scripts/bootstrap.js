import dotenv from "dotenv";
import path from "path";

// Load environment variables from the .env.local file in the 'admin' directory.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import("./create-admin-logic.js");