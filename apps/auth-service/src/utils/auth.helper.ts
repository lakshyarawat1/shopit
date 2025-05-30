/* eslint-disable @nx/enforce-module-boundaries */
import crypto from 'crypto';
import { ValidationError } from '@packages/error_handler';
import { NextFunction, Request, Response } from 'express';
import redis from '@packages/libs/redis';
import { sendEmail } from './sendMail';
import prisma from '@packages/libs/prisma';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegistrationData = (data: any, userType: 'user' | 'seller') => {
    const { name, email, password, phone_number, country } = data;
    if (!name || !email || !password || (userType === 'seller' && (!phone_number || !country))) {
        {
            throw new ValidationError(`Missing required fields`)
        }
    }
    if (!emailRegex.test(email)) { 
        throw new ValidationError(`Invalid email format`)
    }
}

export const checkOTPRestrictions = async (email: string, next: NextFunction) => {
    if (await redis.get(`otp_lock:${email}`)) {
        return next(new ValidationError(`Account locked due to multiple failed attempts. Try again after 30 mins.`));
    }

    if (await redis.get(`otp_spam_lock:${email}`)) {
        return next(new ValidationError(`Too many OTP requests. Try again after 1 hour.`));
    }

    if (await redis.get(`otp_cooldown:${email}`)) { 
        return next(new ValidationError(`Please wait 1 minute before requesting another OTP.`));
    }
}

export const trackOTPRequest = async (email: string, next: NextFunction) => { 
    const otpRequestKey = `otp_request_count:${email}`;
    const otpRequests = parseInt((await redis.get(otpRequestKey)) || '0');

    if (otpRequests >= 2) {
        await redis.set(`otp_spam_lock:${email}`, "locked", "EX", 3600); // locked for 1 hour
        return next(new ValidationError(`Too many OTP requests. Try again after 1 hour.`));
    }

    await redis.set(otpRequestKey, otpRequests + 1, "EX", 3600); //Tracks the number of requests for 1 hour
}


export const sendOTP = async (name: string, email: string, template: string) => {
    const OTP = crypto.randomInt(1000, 9999).toString();
    await sendEmail(email, "Verify your email", template, {name, OTP});
    await redis.set(`otp:${email}`, OTP, "EX", 300);
    await redis.set(`otp_cooldown:${email}`, "true", "EX", 60);


}

export const verifyOTP = async (email: string, otp: string, next: NextFunction) => { 
    const storedOTP = await redis.get(`otp:${email}`);
    if (!storedOTP) {
        throw next(new ValidationError(`OTP expired or not found`));
    }
    
    const failedAttemptsKey = `otp_attempts:${email}`;
    const failedAttempts = parseInt((await redis.get(failedAttemptsKey)) || '0');

    if (storedOTP !== otp) {
        if (failedAttempts >= 2) {
            await redis.set(`otp_lock:${email}`, "locked", "EX", 1800); // locked for 30 mins
            await redis.del(`otp:${email}`,failedAttemptsKey); // reset failed attempts
            throw next(new ValidationError(`Account locked due to multiple failed attempts. Try again after 30 mins.`));
        }

        await redis.set(failedAttemptsKey, failedAttempts + 1, "EX", 300); // Tracks failed attempts for 30 mins
        throw next(new ValidationError(`Incorrect OTP. ${2 - failedAttempts} attempts left.`));
    }

    await redis.del(`otp:${email}`, failedAttemptsKey); // delete OTP after successful verification
}

export const handleForgotPassword = async (req: Request, res: Response, next: NextFunction, userType: 'user' | 'seller') => {
    try {
        const { email } = req.body;

        if (!email) {
            throw new ValidationError(`Email is required`);
        }

        const user = userType === 'user' ? await prisma.user.findUnique({ where: { email } }) : await prisma.seller.findUnique({ where: { email } });

        if (!user) throw new ValidationError(`${userType} not found !`);
        await checkOTPRestrictions(email, next);
        await trackOTPRequest(email, next);

        await sendOTP(user.name, email, userType === 'user' ? "forgot-password-user-mail" : "forgot-password-seller-mail" );
        
        res.status(200).json({ message : `OTP sent to your email, Please verify your account.` });
    } catch (err) {
        next(err);
    }
}

export const verifyForgotPasswordOTP = async (req:Request, res:Response, next:NextFunction) => { 
    try {
        const { email, otp } = req.body;

        if(!email || !otp) {
            throw new ValidationError(`Email and OTP are required`);
        }
        await verifyOTP(email, otp, next);

        res.status(200).json({ message : `OTP verified successfully. You can now reset your password.` });
    } catch (err) {
        next(err);
    }
}