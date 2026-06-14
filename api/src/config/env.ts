import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(12),
  PUBLIC_API_KEY: z.string().min(1).default("change_me_public_api_key"),
  KOMMO_BASE_URL: z.string().optional(),
  KOMMO_ACCESS_TOKEN: z.string().optional(),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.string().default("development")
});

export const env = envSchema.parse(process.env);
