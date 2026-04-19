import db from '../config/db.js';

class ShoppingList { 
    /** Generate shopping list from meal plans */
    static async generateFromMealPlan(userId, startDate, endDate) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            await client.query(
                `DELETE FROM shopping_list_items WHERE user_id = $1 AND from_meal_plan = true`,
                [userId]
            );

            const result = await client.query(
                `SELECT ri.ingredients_name, ri.category, SUM(ri.quantity) AS total_quantity, ri.unit
                 FROM meal_plans mp
                 JOIN recipe_ingredients ri ON mp.recipe_id = ri.recipe_id
                 WHERE mp.user_id = $1
                 AND mp.meal_date >= $2
                 AND mp.meal_date <= $3
                 GROUP BY ri.ingredients_name, ri.unit, ri.category`, // ✅ Fix 4: added ri.category to GROUP BY
                [userId, startDate, endDate]
            );

            const ingredients = result.rows;

            const pantryResult = await client.query(
                `SELECT name, quantity, unit FROM pantry_items WHERE user_id = $1`,
                [userId]
            );

            const pantryMap = new Map();
            pantryResult.rows.forEach(item => {
                const key = `${item.name.toLowerCase()}_${item.unit}`;
                pantryMap.set(key, item.quantity);
            });

            for (const ingredient of ingredients) {
                const key = `${ingredient.ingredients_name.toLowerCase()}_${ingredient.unit}`;
                const pantryQuantity = pantryMap.get(key) || 0;
                const neededQuantity = Math.max(0, parseFloat(ingredient.total_quantity) - parseFloat(pantryQuantity));

                if (neededQuantity > 0) {
                    await client.query(
                        `INSERT INTO shopping_list_items (user_id, ingredient_name, quantity, unit, category, from_meal_plan)
                         VALUES ($1, $2, $3, $4, $5, true)`,
                        [userId, ingredient.ingredients_name, neededQuantity, ingredient.unit, ingredient.category || 'Uncategorized']
                    );
                }
            }

            await client.query('COMMIT');
            return await this.findByUserId(userId);

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /** Add manual item to shopping list */
    static async create(userId, itemData) {
        const { ingredient_name, quantity, unit, category = 'Uncategorized' } = itemData;
        const result = await db.query(
            `INSERT INTO shopping_list_items (user_id, ingredient_name, quantity, unit, category, from_meal_plan)
             VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
            [userId, ingredient_name, quantity, unit, category]
        );
        return result.rows[0];
    }

    /** Get all shopping list items for a user */
    static async findByUserId(userId) {
        const result = await db.query(
            `SELECT * FROM shopping_list_items WHERE user_id = $1 ORDER BY category, ingredient_name`,
            [userId]
        );
        return result.rows;
    }

    /** Get shopping list grouped by category */
    static async getGroupedByCategory(userId) {
        const result = await db.query(
            `SELECT category, json_agg(json_build_object(
                'id', id,
                'ingredient_name', ingredient_name,
                'quantity', quantity,
                'unit', unit,
                'is_checked', is_checked,
                'from_meal_plan', from_meal_plan
            )) AS items
             FROM shopping_list_items
             WHERE user_id = $1
             GROUP BY category
             ORDER BY category`,
            [userId]
        );
        return result.rows;
    } 

    /** Update shopping list item */
    static async update(id, userId, updates) {
        const result = await db.query(
            `UPDATE shopping_list_items SET 
                ingredient_name = COALESCE($1, ingredient_name),
                quantity = COALESCE($2, quantity),
                unit = COALESCE($3, unit),
                category = COALESCE($4, category),
                is_checked = COALESCE($5, is_checked)
             WHERE id = $6 AND user_id = $7 
             RETURNING *`,
            [updates.ingredient_name, updates.quantity, updates.unit, updates.category, updates.is_checked, id, userId]
        );
        return result.rows[0];
    }

    /** Toggle item checked status */
    static async toggleChecked(id, userId) {
        const result = await db.query(
            `UPDATE shopping_list_items SET is_checked = NOT is_checked WHERE id = $1 AND user_id = $2 RETURNING *`,
            [id, userId]
        );
        return result.rows[0];
    }

    /** Delete shopping list item */
    static async delete(id, userId) {
        const result = await db.query(
            `DELETE FROM shopping_list_items WHERE id = $1 AND user_id = $2 RETURNING *`,
            [id, userId]
        );
        return result.rows[0];
    }

    /** Clear all checked items */
    static async clearChecked(userId) {
        const result = await db.query(
            `DELETE FROM shopping_list_items WHERE user_id = $1 AND is_checked = true RETURNING *`,
            [userId]
        );
        return result.rows;
    }

    /** Clear entire shopping list */
    static async clearAll(userId) {
        const result = await db.query(
            `DELETE FROM shopping_list_items WHERE user_id = $1 RETURNING *`,
            [userId]
        );
        return result.rows;
    }

    /** Add checked items to pantry */
    static async addCheckedToPantry(userId) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const checkedItems = await client.query(
                `SELECT * FROM shopping_list_items WHERE user_id = $1 AND is_checked = true`,
                [userId]
            );

            for (const item of checkedItems.rows) {
                await client.query(
                    `INSERT INTO pantry_items (user_id, name, quantity, unit, category)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT DO NOTHING`,
                    [userId, item.ingredient_name, item.quantity, item.unit, item.category || 'Uncategorized']
                );
            }

            await client.query(
                `DELETE FROM shopping_list_items WHERE user_id = $1 AND is_checked = true`,
                [userId]
            );

            await client.query('COMMIT');
            return checkedItems.rows;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

export default ShoppingList;