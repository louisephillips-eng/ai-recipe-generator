import shoppingList from '../models/shoppingList.js';

/** generate shopping list from meal plan */

export const generateFromMealPlan = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.body;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Please provide startDate and endDate'
            });
        }

        const items = await shoppingList.generateFromMealPlan(req.user.id, startDate, endDate);

        res.json({
            success: true,
            message: 'Shopping list generated from meal plan',
            data: { items } // fix: was 'date'
        });
    } catch (error) {
        next(error);
    }
};

/** get shopping list */
export const getShoppingList = async (req, res, next) => {
    try {
        const grouped = req.query.grouped === 'true';

        const items = grouped
        ? await shoppingList.getGroupedByCategory(req.user.id)
        : await shoppingList.findByUserId(req.user.id);

        res.json({
            success: true,
            data: { items } // fix: was 'date'
        });
    } catch (error) {
        next(error);
    }
};

/** add item to shopping list */
export const addItem = async (req, res, next) => {
    try {
        const item = await shoppingList.create(req.user.id, req.body);

        res.status(201).json({
            success: true,
            message: 'item added to shopping list',
            data: { item }
        });
    } catch (error) {
        next(error);
    }
};

/** update shopping list item */

export const updateItem = async (req, res, next) => {
    try {
        const {id} = req.params;
        const item = await shoppingList.update(id, req.user.id, req.body);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'shopping list item not found'
            });
        }

        res.json({
            success: true,
            message: 'item updated',
            data: { item }
        });
    } catch (error) {
        next(error);
    }
};

/** toggle item checked status */

export const toggleChecked = async (req, res, next) => {
    try {
        const { id } = req.params;
        const item = await shoppingList.toggleChecked(id, req.user.id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'shopping list item not found'
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

/** delete shopping list item */
export const deleteItem = async (req, res, next) => { // fix: was '= >'
    try {
        const {id} = req.params;
        const item = await shoppingList.delete(id, req.user.id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'shopping list item not found'
            });
        }

        res.json({
            success: true,
            message: 'item deleted',
            data: { item }
        });
    } catch (error) {
        next(error);
    }
};

/** clear checked items */

export const clearChecked = async (req, res, next) => {
    try {
        const items = await shoppingList.clearChecked(req.user.id);

        res.json({
            success: true,
            message: 'checked items cleared',
            data: { items }
        });
    } catch (error) {
        next(error);
    }
};

/** clear all items */
export const clearAll = async (req, res, next) => {
    try {
        const items = await shoppingList.clearAll(req.user.id);

        res.json({
            success: true,
            message: 'shopping list cleared',
            data: { items }
        });
    } catch (error) {
        next(error);
    }
};

/** add checked items to pantry */
export const addCheckedToPantry = async (req, res, next) => {
    try {
        const items = await shoppingList.addCheckedToPantry(req.user.id);

        res.json({
            success: true,
            message: 'checked items added to pantry',
            data: { items }
        });
    } catch (error) {
        next(error);
    }
};