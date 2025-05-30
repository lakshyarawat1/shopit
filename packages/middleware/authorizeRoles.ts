import { AuthenticationError } from "@packages/error_handler";
import { NextFunction, Response } from "express";

export const isSeller = (req: any, res: Response, next: NextFunction) => { 
    if (req.role !== 'seller') {
        return next(new AuthenticationError("Access denied! You are not a seller."));
    }
}

export const isUser = (req: any, res: Response, next: NextFunction) => { 
    if (req.role !== 'user') {
        return next(new AuthenticationError("Access denied! You are not a user."));
    }
}