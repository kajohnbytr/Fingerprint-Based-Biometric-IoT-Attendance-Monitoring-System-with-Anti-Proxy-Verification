import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const protect = async (req, res, next) => {
    let token;

    // Check for Bearer token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract token
            token = req.headers.authorization.split(' ')[1];
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from token
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ error: 'User not found' });
            }
            
            return next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }
    
    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token provided' });
    }
}