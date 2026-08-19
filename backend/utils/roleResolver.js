/**
 * roleResolver.js
 * Determines role, department, isHOD, and isProfileComplete
 * from a @vnrvjiet.in email address.
 *
 * Priority order (checked top to bottom):
 *   1. Not @vnrvjiet.in domain                  → null (reject)
 *   2. Email in ADMIN_EMAILS (.env)              → admin
 *   3. Email in SECURITY_EMAILS (.env)           → security
 *   4. Prefix matches [dept]head pattern         → hod + department auto-set
 *   5. Matches student roll number pattern       → null (reject)
 *   6. Everything else                           → faculty (dept picker needed)
 */

/**
 * HOD email prefix → department mapping
 * Key   : prefix before @vnrvjiet.in (lowercase)
 * Value : department string — must match user.model.js enum exactly
 */
const HOD_EMAIL_MAP = {
    // CSE family
    "csehead": "CSE",
    "csehead.dscs": "CSE-(CyS,DS)_and_AI&DS",
    "csehead.aimliot": "CSE-AIML&IOT",

    // Core engineering
    "eeehead": "EEE",
    "ecehead": "ECE",
    "eiehead": "EIE",
    "mechhead": "MECH",
    "aehead": "Automobile",
    "civilhead": "Civil",
    "ithead": "IT",
    "handshead": "Humanity and sciences(H&S)",

    // Sciences & others
    "chemhead": "Chemistry",
    "physhead": "Physics",
    "mathhead": "Mathematics",
    "mbhead": "CAMS",
};

// Student roll number pattern: 5 digits + 1 letter + 4 digits
// e.g. 25075a0520@vnrvjiet.in
const STUDENT_PATTERN = /^\d{5}[a-z]\d{4}@vnrvjiet\.in$/i;

/**
 * Resolves user info from email.
 *
 * @param {string} email
 * @returns {{
 *   role: 'admin'|'security'|'hod'|'faculty',
 *   department: string|null,
 *   isHOD: boolean,
 *   isProfileComplete: boolean
 * } | null}  null means the email is rejected (not allowed to log in)
 */
export const resolveUserFromEmail = (email) => {
    if (!email) return null;

    const normalized = email.toLowerCase().trim();
    const allowedDomain = process.env.ALLOWED_DOMAIN || "vnrvjiet.in";

    // ── Rule 1: Admin emails from .env (Bypasses domain restriction) ──
    const adminEmails = [
        ...(process.env.ADMIN_EMAILS || "").split(","),
        "25075a0520@vnrvjiet.in" // Hardcoded admin email
    ]
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    if (adminEmails.includes(normalized)) {
        return {
            role: "admin",
            department: null,
            isHOD: false,
            isProfileComplete: true,
        };
    }

    // ── Rule 2: Security emails from .env (Bypasses domain restriction) ──
    const securityEmails = (process.env.SECURITY_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    if (securityEmails.includes(normalized)) {
        return {
            role: "security",
            department: null,
            isHOD: false,
            isProfileComplete: true,
        };
    }

    // ── Rule 3: Domain Restriction for Faculty/Students/HODs ──
    if (!normalized.endsWith(`@${allowedDomain}`)) return null;

    const prefix = normalized.replace(`@${allowedDomain}`, "");

    // ── Rule 4: HOD emails — known prefix map ──
    if (HOD_EMAIL_MAP[prefix]) {
        return {
            role: "hod",                      // proper hod role
            department: HOD_EMAIL_MAP[prefix], // dept auto-resolved from email
            isHOD: true,
            isProfileComplete: true,           // HODs skip the dept picker
        };
    }

    // Rule 4b: Unknown [x]head pattern — future-proof catch
    if (prefix.endsWith("head")) {
        console.warn(`⚠️  Unknown HOD email prefix: "${prefix}" — add to HOD_EMAIL_MAP in roleResolver.js`);
        return {
            role: "hod",
            department: null,       // unknown dept — admin must set manually
            isHOD: true,
            isProfileComplete: false, // must complete profile since dept unknown
        };
    }

    // ── Rule 5: Reject student roll number emails ──
    if (STUDENT_PATTERN.test(normalized)) {
        return null;
    }

    // ── Rule 6: Regular faculty ──
    return {
        role: "faculty",
        department: null,          // will be set via dept picker on first login
        isHOD: false,
        isProfileComplete: false,  // must go through dept picker
    };
};

/**
 * Backward-compatible simple role resolver.
 * Used in places that only need the role string.
 * @param {string} email
 * @returns {string|null}
 */
export const resolveRoleFromEmail = (email) => {
    const result = resolveUserFromEmail(email);
    return result ? result.role : null;
};

/**
 * Quick allowed-check.
 * @param {string} email
 * @returns {boolean}
 */
export const isEmailAllowed = (email) => {
    return resolveUserFromEmail(email) !== null;
};