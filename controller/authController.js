import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '../lib/prisma.js';
import { generateTokens } from '../utils/generateToken.js';
import { redis } from '../lib/redis.js';
import { sendVerificationEmail } from '../nodemailer/email.js';


const safeUserFields = {
    id: true,
    email: true,
    name: true,
    company_name: true,
    created_at: true,
    is_email_verified: true
  };

export const register = async(req, res) => {

    const {email, name, password, company_name} =  req.body;

    if (!email || !name || !password || !company_name) {
		return res.status(400).json({"success": false, "message": "All fields are required!"});
	}

    try {
        const userExists = await prisma.user.findUnique({
            where: {
                email: email
            },
            select: {id: true}
        })

        if (userExists) {
            return res.status(400).json({
                "success": false,
                "message": userExists.is_email_verified ? "User already exists, try logging in!" : "Check your email to verify your account first."
            })
        }

        const hashedPassword = await bcryptjs.hash(password, 10)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

        const user = await prisma.user.create({data: {
            email,
            name,
            company_name,
            password: hashedPassword,
            verification_token: verificationCode,
            verification_token_expires_at: verificationCodeExpiresAt
        },
        select: safeUserFields
    })

        await sendVerificationEmail(user.email, verificationCode, user.name);

        return res.status(201).json({
            "success": true,
            "message": "User created successfully, kindly login!",
            user
        })
    } catch (err) {
        console.log("Error in register: ", err.message);
        return res.status(500).json({ success: false, message: "Error occured while process data" });
    }
}

export const login = async(req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
		return res.status(400).json({"success": false, "message": "Fill out all fields!"});
	}

    try {
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        const isValidPassword = await bcryptjs.compare(password, user?.password || '')
        if (!user || !isValidPassword) {
            return res.status(401).json({
                "success": false,
                "message": "Invalid credentials!"
            })
        }

        if(!user.is_email_verified){
            return res.status(403).json({
                "success": false,
                "message": "Please verify your email before logging in. Check your inbox!"
            })
        }

        const { password: _, ...safeUser } = user;
        const {access_token, refresh_token} = await generateTokens(user.id)

        return res.status(200).json({
            "success": true, 
            "token": access_token,
            refresh_token,
            "user": safeUser
        })
    } catch (err) {
        console.log("Login error:", err.message);
        return res.status(500).json({ "success": false, "message": "Server error" });
    }
}

export const refreshToken = async(req, res) => {
    const {token} = req.body;

    if (!token) {
        return res.status(401).json({ "success": false, "message": "Refresh token required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_KEY);
        const storedToken = await prisma.refreshToken.findUnique({
            where: {
                token: token
            }
        })

        if (!storedToken || storedToken.revoked || storedToken.expires_at < new Date() || storedToken.jti !== decoded.jti) {
            return res.status(401).json({ "success": false, "message": "Invalid or expired refresh token" });
        }

        const {access_token, refresh_token} = await generateTokens(decoded.userId);

        await prisma.refreshToken.update({
            where: {id: storedToken.id},
            data: {
                revoked: true
            }
        })

        return res.status(200).json({
            "success": true,
            "token": access_token,
            refresh_token
        })

    } catch (err) {
        console.log("Error in refreshToken: ", err.message);
        return res.status(500).json({
            "success": false,
            "message": "Error while processing refresh token"
        })
    }
}

export const logout = async(req, res) => {
    const token = req.headers.authorization?.split(" ")[1]
    const {refreshToken} = req.body;

    if (!token) {
        return res.status(401).json({"success": false, "message": "No token provided"})
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY, {ignoreExpiration: true})

        if  (!decoded.jti){
            return res.status(401).json({ success: false, message: "Invalid token format" })
        }

        const now = Math.floor(Date.now() / 1000)
        const expiresIn = decoded.exp - now

        if (expiresIn > 0){
            await redis.set(`blacklist:${decoded.jti}`, "true", 'EX', expiresIn)
        }

        if(refreshToken) {
            await prisma.refreshToken.updateMany({
                where: {token: refreshToken},
                data: {revoked: true}
            })
        }

        return res.status(200).json({
            "success": true,
            "message": "User logged out successfully!"
        })

    } catch (err) {
        console.log("Error in logout: ", err.message)
        return res.status(500).json({
            "success": false,
            "message": "An error occurred while logging out, please try again later!"
        })
    }
}

export const verifyEmail = async(req, res) => {
    const { code } = req.body;

    if(!code) {
        return res.status(401).json({"success": false, "message": "Bad request, no code was provided"})
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                verification_token: code,
                verification_token_expires_at: {
                    gt: new Date()
                }
            },
            select: safeUserFields
        })

        if(!user) {
            return res.status(400).json({"success": false, "message": "Invalid or expired code!"})
        }

        await prisma.user.update({
            where: {id: user.id},
            data: {
                is_email_verified: true,
                verification_token: null,
                verification_token_expires_at: null,
            }
            
        })

        return res.status(200).json({
            "success": true, 
            "message": "Verification successful!", 
            user
        })
    } catch (err) {
        console.log("Error in verifyEmail: ", err.message)
        return res.status(500).json({
            "success": false,
            "message": "Something went wrong during verification, try again later"
        })
    }
}

export const resendVerificationCode = async(req, res) => {
    const { email } = req.body

    if (!email) {
        return res.status(400).json({
            "success": false,
            "message": "Kindly provide your email!"
        })
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if(!user) {
            return res.status(400).json({
                "success": false,
                "message": "Wrong email, kindly confirm email"
            })
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await sendVerificationEmail(email, verificationCode, user.name)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verification_token: verificationCode,
                verification_token_expires_at: verificationCodeExpiresAt
            }
            
        })
        return res.status(200).json({
            "success": true,
            "message": "Email verification sent, check your inbox!"
        })
    } catch (err) {
        console.log("Error in resend verification: ", err.message)
        return res.status(500).json({
            "success": false,
            "message": "Server error, try again later!"
        })
    }

    
}