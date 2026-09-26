import UserModel from "../models/User.model.js";

const generateAccessAndRefreshTokens = async (userID: any) => {
  try {
    const user: any = await UserModel.findById(userID);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };

  } catch (error) {
    console.error("Token generation error:", error);
    throw new Error("Something went wrong while generating tokens.");
  }
};

export { generateAccessAndRefreshTokens };
