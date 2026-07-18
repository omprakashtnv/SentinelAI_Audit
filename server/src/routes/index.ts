import { Router } from "express";

import { authRouter } from "../modules/auth/auth.routes";
import { healthRouter } from "../modules/health/health.routes";
import { projectRouter } from "../modules/projects/project.routes";
import { uploadRouter } from "../modules/uploads/upload.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/projects", projectRouter);
apiRouter.use("/uploads", uploadRouter);
