const jsonConverter = <T>(payload: string | T, method: "parse" | "stringify"): T | string | null => {
    try {
        if (method === "parse") {
            return JSON.parse(payload as string) as T;
        } else if (method === "stringify") {
            return JSON.stringify(payload);
        }
        throw new Error("Invalid method. Use 'parse' or 'stringify'.");
    } catch (error:any) {
        console.error(`JSON conversion error: ${error.message}`);
        return null;
    }
};

class ApiError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(
        statusCode: number,
        message: string | undefined,
        isOperational = true,
        stack = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export {jsonConverter, ApiError}