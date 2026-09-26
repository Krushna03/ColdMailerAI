import { Request, Response, NextFunction, RequestHandler } from "express";

const asyncHandler = (
  requestHandler: (req: Request, res: Response, next: NextFunction) => Promise<any> | any
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
