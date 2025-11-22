import jwt from "jsonwebtoken";
import {v4 as uuidv4} from "uuid";
import { prisma } from '../lib/prisma.js' 

const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60;

export const generateTokens = async(userId) => {
    const jti = uuidv4(); 

    const payload = {
        userId, jti
    }
	const access_token = jwt.sign({type: "access", ...payload}, process.env.JWT_KEY, {
		expiresIn: "15m",
	});

    const refresh_token = jwt.sign({type: "refresh", ...payload}, process.env.REFRESH_TOKEN_KEY, {
        expiresIn: REFRESH_TOKEN_EXPIRY
    })

    await prisma.refreshToken.create({data: {
        userId,
        token: refresh_token,
        jti,
        expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000),
    }})

    return {access_token, refresh_token};
}