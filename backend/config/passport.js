import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model.js";
import { config } from "../utils/config.js";

// Configure Google OAuth strategy
console.log("🔍 Configuring Google OAuth strategy...");
console.log("GOOGLE_CLIENT_ID:", config.auth.google.clientId ? "✅ Set" : "❌ Missing");
console.log("GOOGLE_CLIENT_SECRET:", config.auth.google.clientSecret ? "✅ Set" : "❌ Missing");

if (config.auth.google.clientId && config.auth.google.clientSecret) {
  const callbackURL = config.urls.oauthCallback;
  console.log("🔗 OAuth callback URL:", callbackURL);
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.auth.google.clientId,
        clientSecret: config.auth.google.clientSecret,
        callbackURL: callbackURL,
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // SECURITY: Do not log complete Google profile - only log minimal info
        console.log("🔍 Google OAuth authentication attempt for email:", profile.emails?.[0]?.value || 'unknown');
        const googleEmail = profile.emails[0].value;

        // ✅ VALIDATION 1: Check if email is from @vnrvjiet.in domain
        if (!googleEmail.endsWith('@vnrvjiet.in')) {
          console.warn("❌ Invalid email domain. Email must be @vnrvjiet.in:", googleEmail);
          return done(new Error('INVALID_EMAIL_DOMAIN'), null);
        }

        // ✅ VALIDATION 2: Check if user exists in DB with this email
        let user = await User.findOne({ email: googleEmail });

        if (!user) {
          console.warn("❌ User not found in database:", googleEmail);
          return done(new Error('USER_NOT_IN_DATABASE'), null);
        }

        // ✅ VALIDATION 3: Prevent Google ID hijacking - reject if different Google ID
        if (user.googleId && user.googleId !== profile.id) {
          console.warn("❌ Google ID mismatch for user:", googleEmail);
          console.warn("❌ Existing Google ID:", user.googleId, "vs new Google ID:", profile.id);
          return done(new Error('GOOGLE_ID_MISMATCH'), null);
        }

        // ✅ VALIDATION 4: Link Google account if not already linked
        if (!user.googleId) {
          console.log("🔗 Linking Google account to existing user:", googleEmail);
          user.googleId = profile.id;
        }

        user.provider = "google";
        user.avatar = profile.photos[0]?.value || user.avatar;
        user.lastLogin = new Date();

        await user.save();
        console.log("✅ Google user authenticated:", googleEmail, "with role:", user.role);
        return done(null, user);
      } catch (error) {
        console.error("❌ Google OAuth error:", error.message);
        return done(error, null);
      }
    }
  )
);
} else {
  console.warn("⚠️ Google OAuth credentials not found. OAuth authentication will be disabled.");
  console.warn("Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file");
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
