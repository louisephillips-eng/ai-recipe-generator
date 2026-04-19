import db from '../config/db.js';

class UserPreferences {
    /** Create or update user preferences */
    static async upsert(userId, preferences) {
        const {
            dietary_restrictions = [],
            allergies = [],
            preferred_cuisines = [],
            default_servings = 4,
            measurement_units = 'metric'
        } = preferences;

        const result = await db.query(
            `INSERT INTO user_preferences (user_id, dietary_restrictions, allergies, preferred_cuisines, default_servings, measurement_units)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id)
             DO UPDATE SET
                 dietary_restrictions = $2,
                 allergies = $3,
                 preferred_cuisines = $4,
                 default_servings = $5,
                 measurement_units = $6
             RETURNING *`,
            [userId, dietary_restrictions, allergies, preferred_cuisines, default_servings, measurement_units]
        );

        return result.rows[0];
    }

    /** Get user preferences by user ID */
    static async findByUserId(userId) {
        const result = await db.query(
            'SELECT * FROM user_preferences WHERE user_id = $1',
            [userId]
        );
        return result.rows[0] || null;
    }

    /** Delete user preferences */
    static async delete(userId) {
        await db.query(
            'DELETE FROM user_preferences WHERE user_id = $1',
            [userId]
        );
    }
}

export default UserPreferences;