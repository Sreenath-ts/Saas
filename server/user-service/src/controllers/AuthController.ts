import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../database";
import { ApiError, encryptPassword, isPasswordMatch } from "../utils";
import config from "../config/config";

const jwtSecret = config.JWT_SECRET as string;
const COOKIE_EXPIRATION_DAYS = 90; // cookie expiration in days
const expirationDate = new Date(
    Date.now() + COOKIE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
);
const cookieOptions = {
    expires: expirationDate,
    secure: false,
    httpOnly: true
};

const register = async (req:any,res: any ) => {
    try {
        const { name, email, password }:IUser = req.body;
        const userExists = await User.retrieveByValue(email,"email");
        if (userExists) {
            throw new ApiError(400, "User already exists!");
        }

        const user = await User.save({name,email,password: await encryptPassword(password)} as IUser);

        const userData = {
            _id:user.id,
            name:user.name,
            email:user.email
        };
        
        return res.json({
            status: 200,
            message: "User registered successfully!",
            data: userData,
        });
    } catch (error:any) {
        return res.json({
            status: 500,
            message: error.message,
        });
    }
}

const createSendToken = async (user: IUser, res: Response) => {
    const { name, email, id } = user;
    const token = jwt.sign({ name, email, id }, jwtSecret, {
        expiresIn: "1d",
    });
    res.cookie("jwt", token, cookieOptions);

    return token;
}

const login = async (req: any, res: any) => {
    try {
        const { email, password } = req.body;
        const user = await User.retrieveByValue(email,'email');
        if (
            !user ||
            !(await isPasswordMatch(password, user.password as string))
        ) {
            throw new ApiError(400, "Incorrect email or password");
        }
       
        const token = await createSendToken(user!, res);
        
        return res.json({
            status: 200,
            message: "User logged in successfully!",
            token,
        });
    } catch (error:any) {
        return res.json({
            status: 500,
            message: error.message,
        });
    }
}

export default {
    login,
    register
}