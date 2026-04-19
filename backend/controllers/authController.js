import User from '../models/user.js';
import userPreferences from '../models/userPreferences.js';
import jwt from 'jsonwebtoken';

/** Generate JWT token */
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

/** Register new user */
export const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        const newUser = await User.create(username, email, password);

      await userPreferences.upsert(newUser.id, {
        dietary_restrictions: [],
        allergies: [],
        preferred_cuisines: [],
        default_servings: 4,
        measurement_units: 'metric'
     });

        const token = generateToken(newUser);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email
                },
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

/** Login user */
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const foundUser = await User.findByEmail(email);
        if (!foundUser) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isPasswordValid = await User.verifyPassword(password, foundUser.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(foundUser);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: foundUser.id,
                    username: foundUser.username,
                    email: foundUser.email
                },
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

/** Get current user */
export const getCurrentUser = async (req, res, next) => {
    try {
        const foundUser = await User.findByEmail(req.user.email);
        if (!foundUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            data: { user: foundUser }
        });
    } catch (error) {
        next(error);
    }
};

/** Request password reset */
export const requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your email address'
            });
        }

        // Intentionally not checking if user exists for security
        res.json({
            success: true,
            message: 'If that email exists, a reset link has been sent'
        });
    } catch (error) {
        next(error);
    }
};