import { useState } from "react";
import { AGENT_CODENAMES } from "../constants";
import type { User } from "../types";
import "./LoginPage.scss";

interface LoginPageProps {
  onLogin: (user: User) => void;
  usedCodenames: string[];
}

export default function LoginPage({ onLogin, usedCodenames }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Form states
  const [loginCodename, setLoginCodename] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [regName, setRegName] = useState("");
  const [regCodename, setRegCodename] = useState("");
  const [regPin, setRegPin] = useState("");
  
  const handleLoginPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits and limit to 4 characters
    if (value === '' || (/^\d+$/.test(value) && value.length <= 4)) {
      setLoginPin(value);
    }
  };
  
  const handleRegPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits and limit to 4 characters
    if (value === '' || (/^\d+$/.test(value) && value.length <= 4)) {
      setRegPin(value);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate PIN is exactly 4 digits
    if (loginPin.length !== 4 || !/^\d{4}$/.test(loginPin)) {
      setError("PIN must be exactly 4 digits");
      setLoading(false);
      return;
    }

    try {
      // First, fetch all users to find matching codename (case-insensitive)
      const response = await fetch("http://localhost:5000/users");
      const users: User[] = await response.json();
      
      const foundUser = users.find((u) => u.codename.toLowerCase() === loginCodename.toLowerCase());
      
      if (!foundUser) {
        setError("Invalid codename or PIN");
        setLoading(false);
        return;
      }

      // In a real app, you would check the PIN against hashed password
      // For now, we'll fetch the user details to verify they exist
      const userResponse = await fetch(`http://localhost:5000/users/${foundUser.id}`);
      const userData = await userResponse.json();

      // Simple PIN check (in production, this should be hashed)
      if (userData.pin === loginPin) {
        onLogin(userData);
        setLoginCodename("");
        setLoginPin("");
      } else {
        setError("Invalid codename or PIN");
      }
    } catch (err) {
      setError("Failed to connect to server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate PIN is exactly 4 digits
    if (regPin.length !== 4 || !/^\d{4}$/.test(regPin)) {
      setError("PIN must be exactly 4 digits");
      setLoading(false);
      return;
    }

    try {
      // Validate codename is in the allowed list (case-insensitive)
      const upperCodename = regCodename.toUpperCase();
      if (!AGENT_CODENAMES.some(cn => cn === upperCodename)) {
        setError(`Invalid codename. Please choose from: ${AGENT_CODENAMES.join(', ')}`);
        setLoading(false);
        return;
      }

      // Check if codename already exists (case-insensitive)
      const usersResponse = await fetch("http://localhost:5000/users");
      const users: User[] = await usersResponse.json();
      
      if (users.some((u) => u.codename.toLowerCase() === regCodename.toLowerCase())) {
        setError("Codename already exists");
        setLoading(false);
        return;
      }

      // Create new user (send lowercase to backend)
      const response = await fetch("http://localhost:5000/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: regName,
          codename: regCodename, // Backend will convert to lowercase
          pin: regPin,
        }),
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const newUser = await response.json();
      
      // Auto-login after registration
      onLogin(newUser);
      setRegName("");
      setRegCodename("");
      setRegPin("");
    } catch (err) {
      setError("Registration failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Matt's Mirthday Mystery 🔐</h1>
        
        <div className="btn-tab-group">
          <button
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
            className={`btn-tab ${isLogin ? 'active' : 'inactive'}`}
          >
            Login
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
            className={`btn-tab ${!isLogin ? 'active-success' : 'inactive'}`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Codename</label>
              <input
                type="text"
                value={loginCodename}
                onChange={(e) => setLoginCodename(e.target.value)}
                required
                className="form-input"
                placeholder="Enter your codename"
              />
            </div>

            <div className="form-group-spacing">
              <label className="form-label">PIN</label>
              <input
                type="text"
                value={loginPin}
                onChange={handleLoginPinChange}
                required
                className="form-input"
                placeholder="Enter your 4-digit PIN"
                maxLength={4}
                inputMode="numeric"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Loading..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                className="form-input"
                placeholder="Enter your name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Codename</label>
              <select
                value={regCodename}
                onChange={(e) => setRegCodename(e.target.value)}
                required
                className="form-select"
              >
                <option value="" disabled className="form-option">
                  Choose a codename
                </option>
                {AGENT_CODENAMES.filter(codename => !usedCodenames.includes(codename.toLowerCase())).map((codename) => (
                  <option key={codename} value={codename} className="form-option">
                    {codename}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-spacing">
              <label className="form-label">PIN (4 digits, not your bank PIN pls)</label>
              <input
                type="text"
                value={regPin}
                onChange={handleRegPinChange}
                required
                className="form-input"
                placeholder="Create a 4-digit PIN"
                maxLength={4}
                inputMode="numeric"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-success"
            >
              {loading ? "Loading..." : "Register"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
