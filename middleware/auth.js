import jwt from 'jsonwebtoken';
import { redis } from '../lib/redis.js';

export const protectRoute = async(req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];


    try {
        if (!token) {
            return res.status(401).json({"success": false, "message": "Not authorized, no token provided"});
        }
    
        const decoded = jwt.verify(token, process.env.JWT_KEY);
    
        const isBlacklisted = await redis.get(`blacklist:${decoded.jti}`)
        if (isBlacklisted) {
            return res.status(401).json({"success": false, "message": "Token revoked, please login again"})
        }
    
        req.userId = decoded.userId;
        next();

    } catch (err) {
        console.log("Error in protectRoute: ", err.message)
        return res.status(401).json({"success": false, "message": "Not authorized,  invalid token"})
    }

}