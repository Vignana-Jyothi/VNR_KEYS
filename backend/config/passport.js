import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model.js";
import { config } from "../utils/config.js";
import { resolveUserFromEmail } from "../utils/roleResolver.js";

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
          console.log("========================================");
          console.log("🔥 GOOGLE STRATEGY CALLBACK REACHED");
          console.log("🔥 Profile ID:", profile?.id);
          console.log("🔥 Profile displayName:", profile?.displayName);
          console.log("🔥 Profile emails:", profile?.emails);
          console.log("========================================");

          const googleEmail = profile.emails?.[0]?.value;

          if (!googleEmail) {
            console.warn("❌ No email provided by Google");
            return done(new Error("NO_EMAIL_PROVIDED"), null);
          }

          console.log("🔍 Auth attempt:", googleEmail);

          // ── STEP 1: Resolve role/dept/isHOD from email ──
          const userInfo = resolveUserFromEmail(googleEmail);

          if (!userInfo) {
            console.warn("❌ Access denied for:", googleEmail);
            return done(new Error("ACCESS_DENIED"), null);
          }

          console.log(`✅ Resolved → role: ${userInfo.role} | HOD: ${userInfo.isHOD} | dept: ${userInfo.department} | complete: ${userInfo.isProfileComplete}`);

          // ── STEP 2: Find existing user ──
          let user = await User.findOne({ email: googleEmail });

          if (user) {
            // Security: reject if Google ID changed (hijack attempt)
            if (user.googleId && user.googleId !== profile.id) {
              console.warn("❌ Google ID mismatch for:", googleEmail);
              return done(new Error("GOOGLE_ID_MISMATCH"), null);
            }

            // Link Google ID if not already linked
            if (!user.googleId) {
              user.googleId = profile.id;
            }

            // Sync role + HOD status from email
            // (picks up .env changes without manual DB edits)
            user.role = userInfo.role;
            user.isHOD = userInfo.isHOD;

            // Sync department only if resolved (don't overwrite manually set dept)
            if (userInfo.department) {
              user.department = userInfo.department;
            }

            // Mark profile complete for non-faculty roles
            // Don't overwrite if faculty already completed their profile
            if (userInfo.isProfileComplete && !user.isProfileComplete) {
              user.isProfileComplete = true;
            }

            user.provider = "google";
            user.avatar = profile.photos?.[0]?.value || user.avatar;
            user.lastLogin = new Date();

            await user.save();
            console.log("✅ Existing user updated:", googleEmail, "→ role:", user.role, "| complete:", user.isProfileComplete);
            return done(null, user);
          }

          // ── STEP 3: New user — auto-create ──
          console.log("🆕 Creating new user:", googleEmail);

          // facultyId is required for faculty role in the schema
          // but not available at OAuth time — temporarily use email prefix
          // Admin can update it later via Manage Users page
          const newUserData = {
            email: googleEmail,
            name: profile.displayName || googleEmail.split("@")[0],
            googleId: profile.id,
            provider: "google",
            avatar: profile.photos?.[0]?.value || "",
            role: userInfo.role,
            department: userInfo.department || "Other",
            isHOD: userInfo.isHOD,
            isVerified: true,
            isProfileComplete: userInfo.isProfileComplete,
            lastLogin: new Date(),
          };

          // facultyId is required for faculty — set a temp value
          // (they can update via profile page)
          if (userInfo.role === "faculty") {
            newUserData.facultyId = `TEMP-${googleEmail.split("@")[0]}-${Date.now()}`;
          }

          user = await User.create(newUserData);

          console.log(
            `✅ New user created: ${googleEmail}`,
            `→ role: ${user.role}`,
            `| HOD: ${user.isHOD}`,
            `| dept: ${user.department}`,
            `| complete: ${user.isProfileComplete}`
          );

          return done(null, user);

        } catch (error) {
          console.error("❌ Google OAuth error:", error.message);
          return done(error, null);
        }
      }
    )
  );
} else {
  console.warn("⚠️ Google OAuth credentials not found. OAuth disabled.");
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