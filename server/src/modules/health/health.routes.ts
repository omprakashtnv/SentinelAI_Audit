import { Router } from "express";

import { asyncHandler } from "../../shared/utils/async-handler";
import { getHealth } from "./health.controller";

export const healthRouter = Router();

healthRouter.get("/", asyncHandler(getHealth));

