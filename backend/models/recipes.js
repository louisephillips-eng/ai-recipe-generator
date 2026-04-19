import db from '../config/db.js';

class Recipe {
    /** Create a new recipe */
    static async create(userId, recipeData) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const {
                name,
                description,
                cuisine_type,
                difficulty,
                prep_time,
                cook_time,
                servings,
                instructions,
                dietary_tags = [],
                user_notes,
                ingredients = [],
                nutrition = {}
            } = recipeData;

            const recipeResult = await client.query(
                `INSERT INTO recipes(user_id, name, description, cuisine_type, difficulty, prep_time, cook_time, servings, instructions, dietary_tags, user_notes) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [userId, name, description, cuisine_type, difficulty, prep_time, cook_time, servings, JSON.stringify(instructions), dietary_tags, user_notes]
            );
            const recipe = recipeResult.rows[0];

            if (ingredients.length > 0) {
                const ingredientValues = ingredients.map((ing, idx) =>
                    `($1, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4}, $${idx * 4 + 5})`
                ).join(', ');

                const ingredientParams = [recipe.id];
                ingredients.forEach(ing => {
                    ingredientParams.push(ing.name, ing.quantity, ing.unit, ing.category || 'Other');
                });

                await client.query(
                    `INSERT INTO recipe_ingredients(recipe_id, ingredients_name, quantity, unit, category) VALUES ${ingredientValues}`,
                    ingredientParams
                );
            }

            if (nutrition && Object.keys(nutrition).length > 0) {
                await client.query(
                    `INSERT INTO recipe_nutrition(recipe_id, calories, protein, carbohydrates, fats, fiber) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [recipe.id, nutrition.calories, nutrition.protein, nutrition.carbohydrates, nutrition.fats, nutrition.fiber]
                );
            }

            await client.query('COMMIT');
            return await this.findById(recipe.id, userId);

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /** Get recipe by id with ingredients and nutrition */
    static async findById(id, userId) {
        const recipeResult = await db.query(
            `SELECT * FROM recipes WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (recipeResult.rows.length === 0) {
            return null;
        }

        const recipe = recipeResult.rows[0];

        const ingredientsResult = await db.query(
            `SELECT ingredients_name as name, quantity, unit, category FROM recipe_ingredients WHERE recipe_id = $1`,
            [id]
        );

        const nutritionResult = await db.query(
            `SELECT calories, protein, carbohydrates, fats, fiber FROM recipe_nutrition WHERE recipe_id = $1`,
            [id]
        );

        return {
            ...recipe,
            ingredients: ingredientsResult.rows,
            nutrition: nutritionResult.rows[0] || null
        };
    }

    /** Get all recipes for a user with filters */
    static async findByUserId(userId, filters = {}) {
        let query = `SELECT r.*, rn.calories FROM recipes r LEFT JOIN recipe_nutrition rn ON r.id = rn.recipe_id WHERE r.user_id = $1`;
        const params = [userId];
        let paramCount = 1;

        if (filters.search) {
            paramCount++;
            query += ` AND (r.name ILIKE $${paramCount} OR r.description ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
        }

        if (filters.cuisine_type) {
            paramCount++;
            query += ` AND r.cuisine_type = $${paramCount}`;
            params.push(filters.cuisine_type);
        }

        if (filters.difficulty) {
            paramCount++;
            query += ` AND r.difficulty = $${paramCount}`;
            params.push(filters.difficulty);
        }

        if (filters.dietary_tags) {
            paramCount++;
            query += ` AND $${paramCount} = ANY(r.dietary_tags)`;
            params.push(filters.dietary_tags);
        }

        if (filters.max_cook_time) {
            paramCount++;
            query += ` AND r.cook_time <= $${paramCount}`;
            params.push(filters.max_cook_time);
        }

        // ✅ Whitelisted sort field to prevent SQL injection
        const allowedSortFields = ['created_at', 'name', 'cook_time', 'prep_time', 'difficulty'];
        const sortBy = allowedSortFields.includes(filters.sort_by) ? filters.sort_by : 'created_at';
        const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY r.${sortBy} ${sortOrder}`;

        const limit = filters.limit || 20;
        const offset = filters.offset || 0;
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await db.query(query, params);
        return result.rows;
    }

    /** Get recent recipes */
    static async getRecent(userId, limit = 5) {
        const result = await db.query(
            `SELECT r.*, rn.calories FROM recipes r
             LEFT JOIN recipe_nutrition rn ON r.id = rn.recipe_id
             WHERE r.user_id = $1
             ORDER BY r.created_at DESC
             LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    }

    /** Update recipe */
    static async update(id, userId, updates) {
        const {
            name,
            description,
            cuisine_type,
            difficulty,
            prep_time,
            cook_time,
            servings,
            instructions,
            dietary_tags,
            user_notes,
        } = updates;

        const result = await db.query(
            `UPDATE recipes SET 
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                cuisine_type = COALESCE($3, cuisine_type),
                difficulty = COALESCE($4, difficulty),
                prep_time = COALESCE($5, prep_time),
                cook_time = COALESCE($6, cook_time),
                servings = COALESCE($7, servings),
                instructions = COALESCE($8, instructions),
                dietary_tags = COALESCE($9, dietary_tags),
                user_notes = COALESCE($10, user_notes)
             WHERE id = $11 AND user_id = $12
             RETURNING *`,
            [name, description, cuisine_type, difficulty, prep_time, cook_time, servings, JSON.stringify(instructions), dietary_tags, user_notes, id, userId]
        );

        return result.rows[0];
    }

    /** Delete recipe */
    static async delete(id, userId) {
        const result = await db.query(
            'DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );
        return result.rows[0];
    }

    /** Get recipe stats */
    static async getStats(userId) {
        const result = await db.query(
            `SELECT 
                COUNT(*) as total_recipes,
                COUNT(DISTINCT cuisine_type) as cuisine_types_count,
                AVG(cook_time) as avg_cook_time
             FROM recipes 
             WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0];
    }
}

export default Recipe;