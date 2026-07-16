import { Router } from "express";

import { validateRequest } from "../../middleware/validate-request.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import { getCurrentUser, login, logout, refreshToken, register } from "./auth.controller";
import { requireAuth } from "./auth.middleware";
import { loginSchema, registerSchema } from "./auth.schemas";

export const authRouter = Router();

authRouter.post("/register", validateRequest({ body: registerSchema }), asyncHandler(register));
authRouter.post("/login", validateRequest({ body: loginSchema }), asyncHandler(login));
authRouter.post("/logout", asyncHandler(logout));
authRouter.post("/refresh-token", asyncHandler(refreshToken));
authRouter.get("/me", requireAuth, asyncHandler(getCurrentUser));

