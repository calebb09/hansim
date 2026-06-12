import axios from "axios";
import prisma from "../config/db.js";
import {validate} from "../middleware/validate.js";
import {
  createUser,
  customeClaims,
  getUserByEmail,
  revokeUser,
} from "../services/firebase.service.js";
import {registerSchema} from "../validations/index.js";
const API_KEY = process.env.FIREBASE_WEB_API_KEY;
const AUTH_URL = process.env.FIREBASE_AUTH_URL;

export const revoke = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({where: {uuid: req.params.uid}});
    if (!user) {
      return res.status(404).json({success: false, message: "User not found"});
    }
    await revokeUser(uid);

    await prisma.user.update({
      where: {id: user.id},
      data: {isAcountActive: false},
    });

    res.json({success: true, message: "User tokens revoked successfully"});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const register = [
  validate(registerSchema), // ← Validation Middleware
  async (req, res) => {
    try {
      const {fullName, email, password, role} = req.body;

      const existingUser = await prisma.user.findUnique({where: {email}});
      if (existingUser) {
        return res
          .status(400)
          .json({success: false, message: "User already exists"});
      }
      // check firebase existence
      const firebaseUser = await getUserByEmail(email);
      if (firebaseUser.status === 200) {
        return res
          .status(400)
          .json({success: false, message: "User already exists in Firebase"});
      }

      // Create user in Firebase
      const firebaseResponse = await createUser(email, password, fullName);
      if (firebaseResponse.status !== 201) {
        return res
          .status(500)
          .json({success: false, message: "Failed to create user in Firebase"});
      }
      const user = await prisma.user.create({
        data: {fullName, email, role, uuid: firebaseResponse.data.uid},
        select: {id: true, fullName: true, email: true, role: true, uuid: true},
      });

      // custom claims
      const customClaims = {role};
      await customeClaims(firebaseResponse.data.uid, customClaims);

      res
        .status(201)
        .json({success: true, message: "User registered successfully", user});
    } catch (error) {
      res.status(500).json({success: false, message: error.message});
    }
  },
];

export const login = async (req, res) => {
  try {
    const {email, password} = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Optional: Check if user exists in your database
    const user = await prisma.user.findUnique({where: {email}});
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Call Firebase Auth
    const response = await axios.post(
      `${AUTH_URL}:signInWithPassword?key=${API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      },
    );

    const data = response.data;

    res.json({
      success: true,
      message: "Login successful",
      uid: data.localId,
      email: data.email,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      // You can also return user data from your DB
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    // ✅ Better error handling for Firebase
    console.error("Login Error:", error.response?.data || error.message);
    if (error.response?.data?.error) {
      const firebaseError = error.response.data.error;

      let message = "Invalid credentials";

      switch (firebaseError.message) {
        case "EMAIL_NOT_FOUND":
          message = "No account found with this email";
          break;
        case "INVALID_PASSWORD":
          message = "Incorrect password";
          break;
        case "INVALID_EMAIL":
          message = "Invalid email format";
          break;
        case "USER_DISABLED":
          message = "This account has been disabled";
          break;
        default:
          message = firebaseError.message || "Authentication failed";
      }

      return res.status(400).json({
        success: false,
        message,
        firebaseCode: firebaseError.message,
      });
    }
    console.error("Login Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const {refreshToken} = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "refreshToken is required",
      });
    }

    // ✅ Correct way: Use URLSearchParams
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);

    const response = await axios.post(
      `${process.env.FIREBASE_REFRESH_URL}?key=${API_KEY}`,
      params, // ← This is the important part
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const data = response.data;

    res.json({
      success: true,
      idToken: data.id_token,
      refreshToken: data.refresh_token || refreshToken, // Use new one if returned
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    });
  } catch (error) {
    console.error(
      "Refresh token error:",
      error.response?.data || error.message,
    );

    const errorMsg =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      error.message ||
      "Failed to refresh token";

    return res.status(401).json({
      success: false,
      error: errorMsg,
    });
  }
};
