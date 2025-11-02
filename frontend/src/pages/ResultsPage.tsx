import { useState, useEffect } from "react";
import type { User } from "../types";
import { capitalizeCodename } from "../utils";
import "./ResultsPage.scss";

interface ResultsPageProps {
  user: User;
}

interface UserStats {
  tasksCompleted: number;
  avgCompletionSeconds: number;
  isWinner: boolean;
}

// Helper function to format seconds as MM:SS
function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ResultsPage({ user }: ResultsPageProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`http://localhost:5000/votes/stats/${user.id}`);
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user.id]);

  if (loading) {
    return (
      <div className="results-container">
        <div className="results-content">
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="results-container">
        <div className="results-content">
          <p>Failed to load results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <div className="results-content">
        <h1 className="results-title">
          {stats.isWinner ? "🎉 You Win!" : "🙂 You Tried!"}
        </h1>
        
        <p className="results-message">
          {stats.isWinner 
            ? `Great job, ${capitalizeCodename(user.codename)}! You correctly identified the impostor!` 
            : `Thanks for playing, ${capitalizeCodename(user.codename)}! You may not have identified the impostor, but you did a great job anyways!`}
        </p>

        <div className="results-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.tasksCompleted}</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
          
          {stats.tasksCompleted > 0 && (
            <div className="stat-card">
              <div className="stat-value">{formatTime(stats.avgCompletionSeconds)}</div>
              <div className="stat-label">Avg Completion Time</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

