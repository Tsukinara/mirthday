import type { User } from "../types";
import { capitalizeCodename } from "../utils";
import "./PlayerStandbyPage.scss";

interface PlayerStandbyPageProps {
  user: User;
  onLogout: () => void;
}

export default function PlayerStandbyPage({ user, onLogout }: PlayerStandbyPageProps) {
  return (
    <div className="standby-container">
      <div className="standby-card">
        <div className="standby-icon">⏳</div>
        <h1>Event Not Started</h1>
        <p className="subtitle">Please wait for the admin to start the event</p>
        <p className="standby-subtitle">Agent {capitalizeCodename(user.codename)}</p>
        <button onClick={onLogout} className="btn btn-danger btn-compact">
          Logout
        </button>
      </div>
    </div>
  );
}

