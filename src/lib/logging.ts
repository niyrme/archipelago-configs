import winston from "winston";

const logger = winston.createLogger({
	level: "info",
	format: winston.format.printf(({ level, message }) => `[${level.toUpperCase()}] ${message}`),
	transports: [new winston.transports.Console()],
});

export default logger;
