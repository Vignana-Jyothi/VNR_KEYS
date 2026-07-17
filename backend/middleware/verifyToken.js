import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const verifyToken = async (req, res, next) => {
	// Try to get token from cookies first, then from Authorization header
	let token = req.cookies.token;

	// If no cookie token, check Authorization header
	if (!token) {
		const authHeader = req.headers.authorization;
		if (authHeader && authHeader.startsWith('Bearer ')) {
			token = authHeader.substring(7);
		}
	}

	// SECURITY: Do not log sensitive information like tokens or cookies
	// Only log minimal info for debugging in development
	if (process.env.NODE_ENV === 'development') {
		console.log(`[${req.method}] ${req.url} - Token: ${token ? 'Present' : 'Missing'}`);
	}

	if (!token) {
		return res.status(401).json({ success: false, message: "Unauthorized - no token provided" });
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		if (!decoded) {
			return res.status(401).json({ success: false, message: "Unauthorized - invalid token" });
		}

		req.userId = decoded.userId;
		req.userRole = decoded.role;

		// Check if the role in the token matches the current role in the database
		// This handles cases where user roles have been updated but the token is still old
		try {
			const user = await User.findById(decoded.userId).select('role');
			if (user && user.role !== decoded.role) {
				// SECURITY: Log role mismatch without exposing user ID in production
				if (process.env.NODE_ENV === 'development') {
					console.log(`🔄 Role mismatch detected - Token: ${decoded.role}, Database: ${user.role}`);
					console.log(`🔄 Updating role from ${decoded.role} to ${user.role} for user ${decoded.userId}`);
				}
				req.userRole = user.role; // Use the current role from database
			}
		} catch (dbError) {
			// SECURITY: Do not log detailed error messages in production
			if (process.env.NODE_ENV === 'development') {
				console.log('⚠️ Warning: Could not verify role from database:', dbError.message);
			}
			// Continue with token role if database check fails
		}

		// SECURITY: Do not log user ID in production
		if (process.env.NODE_ENV === 'development') {
			console.log(`✅ Token verified for user: ${decoded.userId} (${req.userRole})`);
		}

		// Restrict HOD users from accessing the application
		if (req.userRole === 'hod') {
			return res.status(403).json({
				success: false,
				message: "Your account is registered as a Head of Department. This role is configured only to receive department summary emails. No web portal is available for this role."
			});
		}

		next();
	} catch (error) {
		// SECURITY: Do not log detailed error messages in production
		if (process.env.NODE_ENV === 'development') {
			console.log("❌ Token verification error:", error.message);
		}
		return res.status(500).json({ success: false, message: "Server error" });
	}
};
