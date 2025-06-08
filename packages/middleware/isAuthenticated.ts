import prisma from "@packages/libs/prisma";
import e, { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

const isAuthenticated = async (req: any, res: Response, next: NextFunction) => { 
    try {
        const token = req.cookies.accessToken || req.cookies.sellerAccessToken || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Unauthorized ! Token missing.", token:token })
        }

        // verify token
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as { id: string, role: 'user' | 'seller' }
        if (!decoded) {
            return res.status(401).json({ message : "Unauthorized ! Invalid token." })
        }

        let account;
        if (decoded.role === 'user') {
            await prisma.user.findUnique({ where: { id: decoded.id } })
            req.user = account;
        } else if (decoded.role === 'seller') { 
            await prisma.seller.findUnique({ where: { id: decoded.id }, include: { shop: true } })
            req.seller = account;
        }

        req.role = decoded.role;
        
        if (!account) {
            return res.status(401).json({ message: "Unauthorized ! User not found." })
        }

        return next();
    } catch (err) {
        return res.status(401).json({error:err, message: "Unauthorized ! Invalid token." })
    }
}

export default isAuthenticated;