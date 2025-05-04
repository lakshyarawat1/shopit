/* eslint-disable @nx/enforce-module-boundaries */
import { NextFunction, Request, Response } from "express";
import { checkOTPRestrictions, sendOTP, trackOTPRequest, validateRegistrationData } from "../utils/auth.helper";
import prisma from "@packages/libs/prisma";
import { ValidationError } from "@packages/error_handler";

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