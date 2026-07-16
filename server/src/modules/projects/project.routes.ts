import { Router } from "express";

import { validateRequest } from "../../middleware/validate-request.middleware";
import { requireAuth } from "../auth/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createProject,
  deleteProject,
  getMyProjects,
  getProject,
  getProjectDashboardStatistics,
  updateProject,
} from "./project.controller";
import {
  createProjectSchema,
  getProjectsQuerySchema,
  projectIdParamsSchema,
  updateProjectSchema,
} from "./project.schemas";

export const projectRouter = Router();

projectRouter.use(requireAuth);

projectRouter.post("/", validateRequest({ body: createProjectSchema }), asyncHandler(createProject));
projectRouter.get("/", validateRequest({ query: getProjectsQuerySchema }), asyncHandler(getMyProjects));
projectRouter.get("/dashboard/statistics", asyncHandler(getProjectDashboardStatistics));
projectRouter.get("/:projectId", validateRequest({ params: projectIdParamsSchema }), asyncHandler(getProject));
projectRouter.patch(
  "/:projectId",
  validateRequest({ params: projectIdParamsSchema, body: updateProjectSchema }),
  asyncHandler(updateProject),
);
projectRouter.delete("/:projectId", validateRequest({ params: projectIdParamsSchema }), asyncHandler(deleteProject));

