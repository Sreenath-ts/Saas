import { Router } from "express";
import AuthController from "../controllers/AuthController";

const userRouter = Router();

userRouter.post("/login", AuthController.login);
userRouter.post("/register", AuthController.register);


export default userRouter;