/* eslint-disable @nx/enforce-module-boundaries */
import { NextFunction, Request, Response } from "express";
import { checkOTPRestrictions, sendOTP, trackOTPRequest, validateRegistrationData, verifyOTP } from "../utils/auth.helper";
import prisma from "@packages/libs/prisma";
import { ValidationError } from "@packages/error_handler";
import bcrypt from "bcryptjs";

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