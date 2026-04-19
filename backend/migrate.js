import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('Running database migrations...');

        // Read all SQL files from the migrations directory
        const schemaPath = path.join(__dirname, 'config', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
       
        await client.query(schemaSql);
        console.log('Migrations completed successfully.');
        console.log('tables created successfully.');
        console.log('   - users');
        console.log('   - user_preferences');
        console.log('   - pantry_items');
        console.log('   - recipes');
        console.log('   - recipe_ingredients');
        console.log('   - recipe_nutrition');
        console.log('   - meal_plans');
        console.log('   - shopping_list_items');
    }
    catch (err) {
        console.error('Error running migrations:', err.message);
        process.exit(1);
    }
    finally {
        client.release();
        pool.end();
    }
};

runMigrations();
