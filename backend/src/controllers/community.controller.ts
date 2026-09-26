import { Request, Response } from "express";
import { communityTemplateData } from "../data/communityTemplates.js";

const getCommunityTemplates = (_req: Request, res: Response) => {
  const { emailTemplates, promptTemplates } = communityTemplateData;

  return res.status(200).json({
    success: true,
    message: "Community templates fetched successfully",
    data: {
      emailTemplates,
      promptTemplates,
      total: emailTemplates.length + promptTemplates.length,
    },
  });
};

export { getCommunityTemplates };
