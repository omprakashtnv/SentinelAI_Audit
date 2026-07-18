import { Router } from "express";

import { validateRequest } from "../../middleware/validate-request.middleware";
import { requireAuth } from "../auth/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createFinding,
  deleteFinding,
  dismissFinding,
  getFinding,
  getFindingExplanation,
  getFindings,
  resolveFinding,
  updateFinding,
} from "../findings/finding.controller";
import {
  createFindingSchema,
  findingParamsSchema,
  findingProjectParamsSchema,
  getFindingsQuerySchema,
  updateFindingSchema,
} from "../findings/finding.schemas";
import { importGitHubRepository } from "../github-imports/github-import.controller";
import {
  githubImportProjectParamsSchema,
  importGitHubRepositorySchema,
} from "../github-imports/github-import.schemas";
import {
  getRepositoryExplorer,
  getRepositoryFileContent,
  getRepositorySource,
} from "../repository-explorer/repository-explorer.controller";
import {
  repositoryExplorerProjectParamsSchema,
  repositoryFileQuerySchema,
} from "../repository-explorer/repository-explorer.schemas";
import {
  cancelScan,
  createScan,
  getScan,
  getScans,
  retryScan,
} from "../scans/scan.controller";
import { streamScanProgress } from "../scans/scan-progress.controller";
import { scanListQuerySchema, scanParamsSchema, scanProjectParamsSchema } from "../scans/scan.schemas";
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
projectRouter.post(
  "/:projectId/github-import",
  validateRequest({ params: githubImportProjectParamsSchema, body: importGitHubRepositorySchema }),
  asyncHandler(importGitHubRepository),
);
projectRouter.get(
  "/:projectId/repository/source",
  validateRequest({ params: repositoryExplorerProjectParamsSchema }),
  asyncHandler(getRepositorySource),
);
projectRouter.get(
  "/:projectId/repository",
  validateRequest({ params: repositoryExplorerProjectParamsSchema }),
  asyncHandler(getRepositoryExplorer),
);
projectRouter.get(
  "/:projectId/repository/files",
  validateRequest({ params: repositoryExplorerProjectParamsSchema, query: repositoryFileQuerySchema }),
  asyncHandler(getRepositoryFileContent),
);
projectRouter.post(
  "/:projectId/scans",
  validateRequest({ params: scanProjectParamsSchema }),
  asyncHandler(createScan),
);
projectRouter.get(
  "/:projectId/scans",
  validateRequest({ params: scanProjectParamsSchema, query: scanListQuerySchema }),
  asyncHandler(getScans),
);
projectRouter.get(
  "/:projectId/scans/:scanId",
  validateRequest({ params: scanParamsSchema }),
  asyncHandler(getScan),
);
projectRouter.get(
  "/:projectId/scans/:scanId/progress",
  validateRequest({ params: scanParamsSchema }),
  asyncHandler(streamScanProgress),
);
projectRouter.post(
  "/:projectId/scans/:scanId/cancel",
  validateRequest({ params: scanParamsSchema }),
  asyncHandler(cancelScan),
);
projectRouter.post(
  "/:projectId/scans/:scanId/retry",
  validateRequest({ params: scanParamsSchema }),
  asyncHandler(retryScan),
);
projectRouter.post(
  "/:projectId/findings",
  validateRequest({ params: findingProjectParamsSchema, body: createFindingSchema }),
  asyncHandler(createFinding),
);
projectRouter.get(
  "/:projectId/findings",
  validateRequest({ params: findingProjectParamsSchema, query: getFindingsQuerySchema }),
  asyncHandler(getFindings),
);
projectRouter.get(
  "/:projectId/findings/:findingId/explanation",
  validateRequest({ params: findingParamsSchema }),
  asyncHandler(getFindingExplanation),
);
projectRouter.get(
  "/:projectId/findings/:findingId",
  validateRequest({ params: findingParamsSchema }),
  asyncHandler(getFinding),
);
projectRouter.patch(
  "/:projectId/findings/:findingId",
  validateRequest({ params: findingParamsSchema, body: updateFindingSchema }),
  asyncHandler(updateFinding),
);
projectRouter.post(
  "/:projectId/findings/:findingId/dismiss",
  validateRequest({ params: findingParamsSchema }),
  asyncHandler(dismissFinding),
);
projectRouter.post(
  "/:projectId/findings/:findingId/resolve",
  validateRequest({ params: findingParamsSchema }),
  asyncHandler(resolveFinding),
);
projectRouter.delete(
  "/:projectId/findings/:findingId",
  validateRequest({ params: findingParamsSchema }),
  asyncHandler(deleteFinding),
);
projectRouter.get("/:projectId", validateRequest({ params: projectIdParamsSchema }), asyncHandler(getProject));
projectRouter.patch(
  "/:projectId",
  validateRequest({ params: projectIdParamsSchema, body: updateProjectSchema }),
  asyncHandler(updateProject),
);
projectRouter.delete("/:projectId", validateRequest({ params: projectIdParamsSchema }), asyncHandler(deleteProject));
