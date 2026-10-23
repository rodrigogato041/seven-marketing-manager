import "dotenv/config";
import { getDatabase } from "./client";

getDatabase();
console.log("Database migration completed.");
