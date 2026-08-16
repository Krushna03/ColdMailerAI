import UserModel from "../models/User.model.js";
import { generateAccessAndRefreshTokens } from "../utils/token.js";
import { getCookieOptions } from "../utils/cookie.js";


const register = async (req, res) => {
  const { username, email, password } = req.body;

  const existingUser = await UserModel.findOne({ email });

  if (existingUser) {
    return res.status(409).json(
      {
        success: false,
        message: 'User already Exists',
      }
    );
  }

  const user = await UserModel.create({
    username,
    email,
    password,
  });

  if (!user) {
    return res.status(500).json(
      {
        success: false,
        message: "Error registering user | Try registering again !",
      },
    );
  }

  const { accessToken } = await generateAccessAndRefreshTokens(user?._id)

  const options = getCookieOptions()

  return res.status(201)
    .cookie('accessToken', accessToken, options)
    .json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email
        },
        accessToken
      }
    });
}



const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json(
      {
        success: false,
        message: "username or email is required !",
      },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await UserModel.findOne({
    $expr: {
      $eq: [
        { $toLower: "$email" },
        normalizedEmail
      ]
    }
  })

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User does not exist. Please enter correct email !",
    });
  }

  const isPaswordValidate = await user.isPasswordCorrect(password)

  if (!isPaswordValidate) {
    return res.status(401).json(
      {
        success: false,
        message: "Password does not matched, Please enter correct password !",
      }
    );
  }

  const { accessToken } = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await UserModel.findById(user._id).select("-password -refreshToken")

  const options = getCookieOptions()

  return res.status(200)
    .cookie('accessToken', accessToken, options)
    .json({
      success: true,
      message: "User logged In successfully",
      data: {
        user: loggedInUser,
        accessToken
      }
    })
}



const currentUser = async (req, res) => {
  const user = req.user;

  return res.status(200)
    .json({
      success: true,
      message: "Get current User Successfully",
      data: user,
    })
}



const logoutUser = async (req, res) => {
  await UserModel.findByIdAndUpdate(
    req.user?._id,
    {
      $unset: {
        refreshToken: 1
      }
    },
    {
      new: true
    }
  )

  const options = getCookieOptions()

  return res.status(200)
    .clearCookie("accessToken", options)
    .json({
      success: false,
      message: "User logged out successfully"
    })
}



const getUserCount = async (req, res) => {
  try {
    const userCount = await UserModel.countDocuments();

    return res.status(200).json({
      success: true,
      message: 'User count retrieved successfully',
      data: {
        totalUsers: userCount
      }
    });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching user count',
      error: error.message
    });
  }
};


export { register, login, logoutUser, currentUser, getUserCount }