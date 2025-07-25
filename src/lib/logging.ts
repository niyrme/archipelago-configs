import winston from "winston";

const logger = winston.createLogger({
	level: "info",
	format: winston.format.printf(
		({ level, message, label = "" }) => `[${level.toUpperCase()}]${label && ` [${label}]`} ${message}`,
	),
	transports: [new winston.transports.Console()],
});

export default logger;
