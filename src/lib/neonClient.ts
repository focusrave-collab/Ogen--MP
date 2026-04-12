import { neon } from '@neondatabase/serverless'

const DATABASE_URL = 'postgresql://neondb_owner:npg_M8qdbgx6iNcI@ep-quiet-hat-anmpt22w-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require'

export const sql = neon(DATABASE_URL)
