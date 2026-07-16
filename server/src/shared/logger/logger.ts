import winston from "winston";

import { environment } from "../../config/environment";

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  environment.isProduction ? winston.format.json() : winston.format.prettyPrint(),
);

export const logger = winston.createLogger({
  level: environment.logLevel,
  levels: winston.config.npm.levels,
  format: logFormat,
  defaultMeta: {
    service: "sentinelai-api",
  },
  transports: [new winston.transports.Console()],
});

