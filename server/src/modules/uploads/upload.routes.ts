import { Router } from "express";

import { validateRequest } from "../../middleware/validate-request.middleware";
import { requireAuth } from "../auth/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import { uploadRepositoryZip } from "./upload.controller";
import { repositoryZipUploadMiddleware } from "./multer.config";
import { uploadProjectParamsSchema } from "./upload.schemas";

export const uploadRouter = Router();

uploadRouter.post(
  "/projects/:projectId/repository-upload",
  requireAuth,
  validateRequest({ params: uploadProjectParamsSchema }),
  repositoryZipUploadMiddleware,
  asyncHandler(uploadRepositoryZip),
);

