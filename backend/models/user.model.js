import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["faculty", "security", "admin", "hod", "pending"],
      default: "pending",
    },
    department: {
      type: String,
      enum: [
        "Accounts",
        "Admission",
        "Automobile",
        "CAMS",
        "Chemistry",
        "Civil",
        "CSE",
        "CSE-AIML&IOT",
        "CSE-(CyS,DS)_and_AI&DS",
        "Director",
        "EEE",
        "ECE",
        "EIE",
        "English",
        "GRO",
        "HR",
        "Humanity and sciences(H&S)",
        "Mathematics",
        "IQAC",
        "IT",
        "MECH",
        "Other",
        "PAAC",
        "Placement",
        "Physics",
        "Principal",
        "Purchase",
        "RCC",
        "SSC",
        "VJ_Hub"
      ],
      required: function () {
        // Department is required for faculty and HOD
        return this.role === "faculty" || this.role === "hod";
      },
    },
    facultyId: {
      type: String,
      required: function () {
        return this.role === "faculty";
      },
      unique: true,
      sparse: true,
    },

    // ── NEW FIELDS ──────────────────────────────────────────
    // Tracks whether faculty has completed the dept-picker step
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    // Populated automatically for HODs from their email prefix
    isHOD: {
      type: Boolean,
      default: false,
    },
    // ────────────────────────────────────────────────────────

    // OAuth fields
    googleId: {
      type: String,
      required: true,
      unique: true,
    },
    provider: {
      type: String,
      enum: ["google"],
      default: "google",
      required: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    keyUsage: {
      type: Map,
      of: Number,
      default: {},
    },
    favoriteKeys: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;