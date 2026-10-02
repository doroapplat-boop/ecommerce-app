import multer from "multer";
import { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 12 },
});

/** Only run multer when the request is multipart — JSON body requests skip it. */
export const uploadSingleIfMultipart = (field: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentType = String(req.headers["content-type"] || "");
        if (!contentType.includes("multipart/form-data")) {
            return next();
        }
        return upload.single(field)(req, res, next);
    };
};

export const uploadArrayIfMultipart = (field: string, maxCount: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentType = String(req.headers["content-type"] || "");
        if (!contentType.includes("multipart/form-data")) {
            return next();
        }
        return upload.array(field, maxCount)(req, res, next);
    };
};

export default upload;
