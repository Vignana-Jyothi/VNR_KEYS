import express from "express";
import {
	logout,
	checkAuth,
	getUserById,
	updateProfile,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import passport from "../config/passport.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { config } from "../utils/config.js";
import User from "../models/user.model.js";

const router = express.Router();

// ── Standard auth routes ──────────────────────────────────────────
router.get("/check-auth", verifyToken, checkAuth);
router.get("/user/:userId", verifyToken, getUserById);
router.put("/update-profile", verifyToken, updateProfile);
router.post("/logout", logout);

// ── Complete profile (faculty dept picker) ────────────────────────
router.post("/complete-profile", verifyToken, async (req, res) => {
	try {
		const { department } = req.body;

		if (!department) {
			return res.status(400).json({
				success: false,
				message: "Department is required",
			});
		}

		const user = await User.findById(req.user.userId);

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}

		user.department = department;
		user.isProfileComplete = true;
		await user.save();

		console.log(`✅ Profile completed: ${user.email} → dept: ${department}`);

		return res.json({
			success: true,
			message: "Profile completed successfully",
			user: {
				_id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
				department: user.department,
				isProfileComplete: user.isProfileComplete,
			},
		});
	} catch (error) {
		console.error("❌ Complete profile error:", error);
		return res.status(500).json({
			success: false,
			message: "Server error",
		});
	}
});

// ── Development only — clear all users ───────────────────────────
if (process.env.NODE_ENV === "development") {
	router.delete("/clear-users", async (req, res) => {
		try {
			const result = await User.deleteMany({});
			console.log(`🗑️ Cleared ${result.deletedCount} users from database`);
			res.json({
				success: true,
				message: `Cleared ${result.deletedCount} users`,
				deletedCount: result.deletedCount,
			});
		} catch (error) {
			console.error("Error clearing users:", error);
			res.status(500).json({ success: false, message: "Failed to clear users" });
		}
	});
}

// ── OAuth routes ──────────────────────────────────────────────────
router.get(
	"/google",
	passport.authenticate("google", { scope: ["profile", "email"] })
);

// OAuth error handler
const handleOAuthError = (err, req, res, next) => {
	if (err) {
		console.error("❌ OAuth error:", err.message);
		const frontendURL = config.urls.client;

		const errorMap = {
			INVALID_EMAIL_DOMAIN: "invalid_domain",
			USER_NOT_IN_DATABASE: "user_not_registered",
			GOOGLE_ID_MISMATCH: "google_mismatch",
			ACCESS_DENIED: "access_denied",   // student / wrong domain
			NO_EMAIL_PROVIDED: "no_email",
		};

		const errorParam = errorMap[err.message] || "auth_failed";
		const redirectURL = `${frontendURL}/login?error=${errorParam}`;
		console.log("🔗 Redirecting with error:", redirectURL);
		return res.redirect(redirectURL);
	}
	next();
};

// OAuth callback
router.get(
	"/google/callback",
	(req, res, next) => {
		passport.authenticate("google", { session: false }, (err, user, info) => {
			if (err) return handleOAuthError(err, req, res, next);

			if (!user) {
				return handleOAuthError(new Error("USER_NOT_FOUND"), req, res, next);
			}

			try {
				const frontendURL = config.urls.client;

				// ── Restrict HOD users ──
				if (user.role === "hod") {
					console.log(`🚫 HOD role login attempt blocked: ${user.email}`);
					return res.redirect(`${frontendURL}/login?error=hod_restricted`);
				}

				// Generate JWT and set cookie
				generateTokenAndSetCookie(res, user._id, user.role);

				// ── Faculty with incomplete profile → dept picker ──
				if (
					(user.role === "faculty" || user.role === "hod") &&
					!user.isProfileComplete
				) {
					const redirectURL = `${frontendURL}/complete-profile`;
					console.log("🔀 Incomplete profile → redirecting to:", redirectURL);
					return res.redirect(redirectURL);
				}

				// ── Role-based dashboard redirect ──
				const roleRedirects = {
					admin: `${frontendURL}/dashboard/admin`,
					security: `${frontendURL}/dashboard/security`,
					faculty: `${frontendURL}/dashboard/faculty`,
					hod: `${frontendURL}/dashboard/faculty`, // HODs use faculty dashboard
				};

				const redirectURL =
					roleRedirects[user.role] || `${frontendURL}/dashboard/faculty`;

				console.log(`✅ ${user.role} authenticated → ${redirectURL}`);
				return res.redirect(redirectURL);

			} catch (error) {
				console.error("❌ OAuth callback error:", error);
				return handleOAuthError(error, req, res, next);
			}
		})(req, res, next);
	}
);

export default router;