/* eslint-disable @nx/enforce-module-boundaries */
import { NextFunction, Request, Response } from "express";
import { checkOTPRestrictions, handleForgotPassword, sendOTP, trackOTPRequest, validateRegistrationData, verifyForgotPasswordOTP, verifyOTP } from "../utils/auth.helper";
import prisma from "@packages/libs/prisma";
import { AuthenticationError, ValidationError } from "@packages/error_handler";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { setCookie } from "../utils/cookies/setCookie";

export const userRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        validateRegistrationData(req.body, 'user');
    
    const { name, email } = req.body;

    const existingUser = await prisma.user.findUnique({ where: {email} })
    
    if (existingUser) {
        return next(new ValidationError(`User already exists with this email !`))
    }

    await checkOTPRestrictions(email, next);
    await trackOTPRequest(email, next);
    await sendOTP(name, email, "user-activation-mail");

    res.status(200).json({
        message : "OTP send to your email, Please verify your account."
    })
    } catch (err) {
        return next(err);
    }
}
 
export const verifyUser = async (req: Request, res: Response, next: NextFunction) => { 
    try {
        const { email, otp, password, name } = req.body;
        if(!email || !otp || !password || !name) {
            return next(new ValidationError("Please provide all required fields."));
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return next(new ValidationError(`User already exists with this email !`));
        }

        await verifyOTP(email, otp, next);
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data : {name, email, password: hashedPassword}
        })

        res.status(200).json({ success: true, message: "User registered successfully" });
    } catch (err) {
        return next(err);
    }
}

export const loginUser = async (req: Request, res: Response, next: NextFunction) => { 
    try {
        const { email, password } = req.body; 

        if (!email || !password) {
            return next(new ValidationError("Email and password are required!"))
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return next(new AuthenticationError("User does not exist !"));
        }

        // verify password

        const isMatch = await bcrypt.compare(password, user.password!);
        if (!isMatch) {
            return next(new AuthenticationError("Invalid email or password. "))
        }

        const accessToken = jwt.sign({ id: user.id, role: "user" }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: "15m" })
        
        const refreshToken = jwt.sign({ id: user.id, role: "user" }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: "7d" })
        
        setCookie(res, "refreshToken", refreshToken);
        setCookie(res, "accessToken", accessToken);

        res.status(200).json({
            message: "User logged in successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            }
        })

    } catch (err) {
        return next(err);
    }
}

export const userForgotPassword = async (req: Request, res: Response, next: NextFunction) => { 
    await handleForgotPassword(req, res, next, "user");

}

export const verifyUserForgotPassword = async (req: Request, res: Response, next: NextFunction) => { 
    await verifyForgotPasswordOTP(req, res, next);
}

export const resetUserPassword = async (req: Request, res: Response, next: NextFunction) => { 
    try {
        const { email, newPassword } = req.body;

        if(!email || !newPassword) {
            return next(new ValidationError("Please provide all required fields."));
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return next(new ValidationError("User not found !"));
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password!);

        if(isSamePassword) {
            return next(new ValidationError("New password cannot be same as old password."));
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        })

        res.status(200).json({
            message: "Password reset successfully !",
        })
    } catch (err) { 
        next(err);
    }
}