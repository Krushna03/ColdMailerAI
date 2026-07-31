import { communityTemplateData } from "../data/communityTemplates.js";

const getCommunityTemplates = (req, res) => {
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
