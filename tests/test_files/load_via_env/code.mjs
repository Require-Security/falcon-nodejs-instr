import { fileURLToPath } from "node:url";
import {open} from "fs/promises"

const __filename = fileURLToPath(import.meta.url);
await open(__filename)