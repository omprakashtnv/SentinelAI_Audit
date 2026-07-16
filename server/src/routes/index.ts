import { Router } from "express";

import { authRouter } from "../modules/auth/auth.routes";
import { healthRouter } from "../modules/health/health.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/health", healthRouter);
