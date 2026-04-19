import pantryItem from '../models/pantryItem.js';

/** Get all pantry items */
export const getAllPantryItems = async (req, res, next) => {
    try {
        const { category, is_running_low, search } = req.query;

        const items = await pantryItem.findByUserId(req.user.id, {
            category,
            is_running_low: is_running_low === 'true' ? true : undefined,
            search
        });

        res.json({
            success: true,
            data: { items }
        });
    } catch (error) {
        next(error);
    }
};

/** Get pantry stats */
export const getPantryStats = async (req, res, next) => {
    try {
        const stats = await pantryItem.getStats(req.user.id);
        res.json({
            success: true,
            data: { stats }
        });
    } catch (error) {
        next(error);
    }
};

/** Get items expiring soon */
export const getExpiringItems = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const expiringItems = await pantryItem.getExpiringSoon(req.user.id, days);
        res.json({
            success: true,
            data: { items: expiringItems } // ✅ Minor: lowercased 'Items' to 'items' for consistency
        });
    } catch (error) {
        next(error);
    }
};

/** Add pantry item */
export const addPantryItem = async (req, res, next) => {
    try {
        const item = await pantryItem.create(req.user.id, req.body);
        res.status(201).json({
            success: true,
            message: 'Pantry item added successfully',
            data: { item }
        });
    } catch (error) {
        next(error);
    }
};

/** Update pantry item */
export const updatePantryItem = async (req, res, next) => {
    try {
        const { id } = req.params;

        const item = await pantryItem.update(id, req.user.id, req.body);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Pantry item not found'
            });
        }

        res.json({
            success: true,
            data: { item }
        });
    } catch (error) {
        next(error);
    }
};

/** Delete pantry item */
export const deletePantryItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const item = await pantryItem.delete(id, req.user.id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Pantry item not found'
            });
        }

        res.json({
            success: true,
            message: 'Pantry item deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};