import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const DEPARTMENTS = [
    "Accounts", "Admission", "Automobile", "CAMS", "Chemistry",
    "Civil", "CSE", "CSE-AIML&IOT", "CSE-(CyS,DS)_and_AI&DS",
    "EEE", "ECE", "EIE", "English", "GRO", "HR",
    "Humanity and sciences(H&S)", "IQAC", "IT", "Mathematics",
    "MECH", "PAAC", "Physics", "Placement", "Principal",
    "Purchase", "RCC", "SSC", "VJ_Hub", "Other"
];

const CompleteProfilePage = () => {
    const [department, setDepartment] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async () => {
        if (!department) {
            setError("Please select your department");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/be/api/auth/complete-profile`,
                { department },
                { withCredentials: true }
            );

            if (res.data.success) {
                navigate("/dashboard/faculty", { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#0f1117",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
        }}>
            <div style={{
                background: "#1a1d27",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "20px",
                padding: "2.5rem",
                width: "100%",
                maxWidth: "420px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}>

                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{
                        width: "60px", height: "60px",
                        background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                        borderRadius: "16px",
                        display: "flex", alignItems: "center",
                        justifyContent: "center",
                        fontSize: "28px",
                        margin: "0 auto 1rem",
                    }}>
                        🎓
                    </div>
                    <h1 style={{
                        color: "#ffffff", fontSize: "22px",
                        fontWeight: "700", margin: "0 0 8px",
                    }}>
                        Complete Your Profile
                    </h1>
                    <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                        Select your department to continue
                    </p>
                </div>

                {/* Department dropdown */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{
                        display: "block",
                        fontSize: "11px", fontWeight: "600",
                        color: "#475569", textTransform: "uppercase",
                        letterSpacing: "0.08em", marginBottom: "8px",
                    }}>
                        Department
                    </label>
                    <select
                        value={department}
                        onChange={(e) => {
                            setDepartment(e.target.value);
                            setError("");
                        }}
                        style={{
                            width: "100%", padding: "12px 14px",
                            background: "#12151f",
                            border: `1px solid ${error ? "#ef4444" : "rgba(255,255,255,0.08)"}`,
                            borderRadius: "12px",
                            color: department ? "#ffffff" : "#475569",
                            fontSize: "14px", outline: "none",
                            cursor: "pointer",
                            appearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 14px center",
                            paddingRight: "40px",
                        }}
                    >
                        <option value="" disabled>Select your department...</option>
                        {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}
                                style={{ background: "#1a1d27", color: "#ffffff" }}>
                                {dept}
                            </option>
                        ))}
                    </select>

                    {error && (
                        <p style={{
                            color: "#ef4444", fontSize: "12px",
                            marginTop: "6px", marginBottom: 0,
                        }}>
                            {error}
                        </p>
                    )}
                </div>

                {/* Submit button */}
                <button
                    onClick={handleSubmit}
                    disabled={loading || !department}
                    style={{
                        width: "100%", padding: "14px",
                        background: loading || !department
                            ? "rgba(59,130,246,0.4)"
                            : "linear-gradient(135deg, #3b82f6, #6366f1)",
                        border: "none", borderRadius: "12px",
                        color: "#ffffff", fontSize: "15px",
                        fontWeight: "700", cursor: loading || !department
                            ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                    }}
                >
                    {loading ? "Saving..." : "Continue to Dashboard →"}
                </button>

                {/* Note */}
                <p style={{
                    color: "#334155", fontSize: "12px",
                    textAlign: "center", marginTop: "1rem", marginBottom: 0,
                }}>
                    This can be changed later from your Profile page
                </p>

            </div>
        </div>
    );
};

export default CompleteProfilePage;