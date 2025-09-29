import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRootEnv = path.resolve(__dirname, "..", "..", ".env");
const serverEnv = path.resolve(__dirname, "..", ".env");

dotenv.config({ path: projectRootEnv });
dotenv.config({ path: serverEnv, override: true });
