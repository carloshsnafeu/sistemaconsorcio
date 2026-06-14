import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(12),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.string().default("development")
});

export const env = envSchema.parse(process.env);
