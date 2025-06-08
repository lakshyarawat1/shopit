/* eslint-disable @nx/enforce-module-boundaries */
import { NextFunction, Request, Response } from "express";
import { checkOTPRestrictions, handleForgotPassword, sendOTP, trackOTPRequest, validateRegistrationData, verifyForgotPasswordOTP, verifyOTP } from "../utils/auth.helper";
import prisma from "@packages/libs/prisma";
import { AuthenticationError, ValidationError } from "@packages/error_handler";
import bcrypt from "bcryptjs";
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { setCookie } from "../utils/cookies/setCookie";
import Stripe from 'stripe'
import { decode } from "punycode";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-04-30.basil'
})

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

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => { 
    try {
        const refreshToken = req.cookies.accessToken || req.cookies.sellerAccessToken || req.headers.authorization?.split(" ")[1];

        if (!refreshToken) {
            return new ValidationError("Unauthorized ! No refresh token provided.");
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as { id: string, role: string };

        if (!decoded ||  !decoded.id || !decoded.role) {
            return new JsonWebTokenError("Forbidden ! Invalid refresh token.");
            
        }

        let account;
        if (decoded.role === 'user') {
            account = await prisma.user.findUnique({ where: { id: decoded.id } })
        } else if (decoded.role === 'seller') {
            account= await prisma.seller.findUnique({ where: { id: decoded.id }, include: { shop: true } })
        }

        if (!account) {
            return new AuthenticationError("Forbidden ! User/Seller does not exist.")
        }
        const newAccessToken = jwt.sign(
            { id: decoded.id, role: decoded.role },
            process.env.ACCESS_TOKEN_SECRET as string,
            {expiresIn:"15m"}
        )
        if (decoded.role === 'user') {
            setCookie(res, "accessToken", newAccessToken);
        }
        else if (decoded.role === 'seller') { 
            setCookie(res, "sellerAccessToken", newAccessToken);
        }

        return res.status(200).json({ success:true })
    } catch (err) {
        return next(err);
    }
}

export const getUser = async (req: any, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        res.status(201).json({
            success: true,
            user,
        });

    } catch (err) {
        next(err);
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

export const registerSeller = async (req: Request, res: Response, next: NextFunction) => { 
    try {
        validateRegistrationData(req.body, 'seller');
        const { name, email } = req.body;

        const existingSeller = await prisma.seller.findUnique({ where: { email } });

        if (existingSeller) {
            throw new ValidationError("Seller already exists with this email !");
        }
        await checkOTPRestrictions(email, next);
        await trackOTPRequest(email, next);
        await sendOTP(name, email, "seller-activation");
        res.status(200).json({
            message : "OTP send to your email. Please verify your account."
        })
    } catch (err) {
        next(err);
    }
}

export const verifySeller = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, otp, password, name, phone_number, country } = req.body;

        console.log("req.body", req.body);

        if (!email || !otp || !password || !name || !phone_number || !country) {
            return next(new ValidationError("Please provide all required fields."));
        }

        const existingSeller = await prisma.seller.findUnique({ where: { email } });
        if(existingSeller) {
            return next(new ValidationError("Seller already exists with this email !"));
        }

        await verifyOTP(email, otp, next);
        const hashedPassword = await bcrypt.hash(password, 10);

        const seller = await prisma.seller.create({
            data: {
                name,
                email,
                password: hashedPassword,
                country,
                phone_number
            }
        })

        res.status(201).json({
            seller, message : "Seller registered successfully !"
        })
    } catch (err) {
        next(err);
    }
}
 
export const createShop = async (req: Request, res: Response, next: NextFunction) => { 
    try {
        const { name, bio, address, openingHours, website, category, sellerId } = req.body;

        if (!name || !bio || !address || !openingHours || !website || !category || !sellerId) {
            return next(new ValidationError("Please provide all required fields."));
        }

        const shopData = {
            name,
            bio,
            address,
            openingHours,
            website,
            category,
            sellerId
        }

        if (website && website.trim() !== "") {
            shopData.website = website;
        }

        const shop = await prisma.shop.create({
            data: shopData
        })

        res.send(201).json({
            success: true,
            shop,
        })

    } catch (err) {
        next(err);
    }
}

export const loginSeller = async (req: Request, res: Response, next: NextFunction) => { 
    try {
        const { email, password } = req.body;

        if (!email || !password) return next(new ValidationError("Email and password are required !"))
        
        const seller = await prisma.seller.findUnique({ where: { email } });
        if (!seller) return next(new ValidationError("Invalid email or password."))
        
        const isMatch = await bcrypt.compare(password, seller.password!);
        if (!isMatch) return next(new ValidationError("Invalid email or password."));

        const accessToken = jwt.sign({ id: seller.id, role: "seller" }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: "15m" })
        
        const refreshToken = jwt.sign({ id: seller.id, role: "seller" }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: "7d" })
        
        setCookie(res, "sellerRefreshToken", refreshToken);
        setCookie(res, "sellerAccessToken", accessToken);

        res.status(200).json({ 
            message: "Seller logged in successfully",
            user: {
                id: seller.id,
                name: seller.name,
                email: seller.email,
            }
        })
    } catch (err) {
        return next(err);
    }
}

export const getSeller = async (req: any, res: Response, next: NextFunction) => {
    try {
        const seller = req.seller;
        res.status(201).json({
            success: true,
            seller, 
        }
        )
    } catch (err) {
        return next(err);
    }
 }

export const createStripeConnectLink = async (req: Request, res: Response, next: NextFunction) => { 
    try {
        const { sellerId } = req.body;
        
        if (!sellerId) return next(new ValidationError("Seller Id is required !"))
        
        const seller = await prisma.seller.findUnique({ where: { id: sellerId } });

        if (!seller) return new ValidationError("Seller is not available with this id !");

        const account = await stripe.accounts.create({
            type: 'express',
            email: seller?.email,
            country: "US",
            capabilities: {
                card_payments: { requested: true },
                transfers : {requested : true},
            }
        })

        await prisma.seller.update({
            where: {
                id: sellerId,
            },
            data: {
                paymentId : account.id,
            }
        })

        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: "http://localhost:3000/pending",
            return_url: "http://localhost:3000/success",
            type: 'account_onboarding',
            
        })
        res.json({ url : accountLink.url })
    } catch (err) {
        return next(err);
    }
}