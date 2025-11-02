import { useState, useEffect, useContext } from "react";
import { SSEContext } from "../contexts/SSEContext";
import { capitalizeCodename } from "../utils";
import "./VoteStatusPage.scss";

interface LeaderboardEntry {
  id: number;
  name: string;
  codename: string;
  voteCount: number;
}

interface Winner {
  id: number;
  name: string;
  codename: string;
}

interface EventStatus {
  id: number;
  status: string;
  eventStarted: boolean;
}

export default function VoteStatusPage() {
  // Try to use SSE context if available, otherwise null
  const sseContext = useContext(SSEContext);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("http://localhost:5000/votes/leaderboard");
      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      console.error("Failed to fetch vote leaderboard:", err);
    }
  };

  const fetchWinners = async () => {
    try {
      const response = await fetch("http://localhost:5000/votes/winners");
      const data = await response.json();
      setWinners(data);
    } catch (err) {
      console.error("Failed to fetch winners:", err);
    }
  };

  const fetchEventStatus = async () => {
    try {
      const response = await fetch("http://localhost:5000/event-status");
      const data = await response.json();
      setEventStatus(data);
    } catch (err) {
      console.error("Failed to fetch event status:", err);
    }
  };

  const handleEndVoting = async () => {
    try {
      const response = await fetch("http://localhost:5000/event-status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: 'FINALE' }),
      });
      const data = await response.json();
      setEventStatus(data);
    } catch (err) {
      console.error("Failed to end voting:", err);
      alert("Failed to end voting");
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchEventStatus();

    const handleSSEEvent = (data: any) => {
      if (data.type === 'VOTE_CAST') {
        fetchLeaderboard();
      }
      if (data.type === 'EVENT_STATUS_CHANGED') {
        setEventStatus(data.eventStatus);
      }
    };

    // Use SSE context if available, otherwise create own EventSource
    if (sseContext) {
      const unsubscribe = sseContext.subscribe(handleSSEEvent);
      return unsubscribe;
    } else {
      // Set up SSE connection for real-time updates (fallback when not in App)
      const eventSource = new EventSource("http://localhost:5000/activities/stream");
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleSSEEvent(data);
      };

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
      };

      return () => {
        eventSource.close();
      };
    }
  }, [sseContext]);

  useEffect(() => {
    if (eventStatus?.status === 'FINALE') {
      fetchWinners();
    }
  }, [eventStatus]);

  // Split leaderboard into two columns
  const leftColumn = leaderboard.slice(0, 8);
  const rightColumn = leaderboard.slice(8, 16);
  
  // Calculate max votes for bar scaling
  const maxVotes = leaderboard.length > 0 ? leaderboard[0].voteCount : 1;

  // Show winners if FINALE, otherwise show leaderboard
  const isFinale = eventStatus?.status === 'FINALE';

  return (
    <div className="vote-status-container">
      <div className="vote-status-content">
        <h1 className="vote-status-title">XXXPULSE the IMPOSTOR</h1>
        {isFinale ? (
          <>
            <h3 className="vote-status-subtitle">🏆 Winners:</h3>
            <div className="vote-status-winners">
              {winners.length > 0 ? (
                winners.map((winner) => (
                  <div key={winner.id} className="vote-status-winner">
                    <span className="vote-codename-winner">🎉 {capitalizeCodename(winner.codename)}</span>
                  </div>
                ))
              ) : (
                <div className="vote-status-empty">No winners</div>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="vote-status-subtitle">Current votes:</h3>
            <div className="vote-status-grid">
              <div className="vote-status-column">
                {leftColumn.map((entry, index) => (
                  <div key={entry.id} className="vote-status-entry">
                    <span className="vote-rank">{index + 1}</span>
                    <span className="vote-codename">{capitalizeCodename(entry.codename)}</span>
                    <span className="vote-count">{entry.voteCount} {entry.voteCount === 1 ? 'vote' : 'votes'}</span>
                    <div className="vote-status-bar">
                      <div 
                        className="vote-status-bar-fill" 
                        style={{ width: `${(entry.voteCount / maxVotes) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {leftColumn.length === 0 && (
                  <div className="vote-status-empty">No votes yet</div>
                )}
              </div>
              
              <div className="vote-status-column">
                {rightColumn.map((entry, index) => (
                  <div key={entry.id} className="vote-status-entry">
                    <span className="vote-rank">{index + 9}</span>
                    <span className="vote-codename">{capitalizeCodename(entry.codename)}</span>
                    <span className="vote-count">{entry.voteCount} {entry.voteCount === 1 ? 'vote' : 'votes'}</span>
                    <div className="vote-status-bar">
                      <div 
                        className="vote-status-bar-fill" 
                        style={{ width: `${(entry.voteCount / maxVotes) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {eventStatus?.status === 'FINAL_TASK_COMPLETE' && (
              <div className="vote-status-actions">
                <button onClick={handleEndVoting} className="btn btn-primary finale-button">
                  End Voting
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

