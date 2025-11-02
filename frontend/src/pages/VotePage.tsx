import { useState, useEffect } from "react";
import type { User } from "../types";
import { capitalizeCodename } from "../utils";
import { useSSE } from "../contexts/SSEContext";
import "./VotePage.scss";

interface VotePageProps {
  user: User;
  onBack?: () => void;
}

export default function VotePage({ user, onBack }: VotePageProps) {
  const sse = useSSE();
  const [codenameInput, setCodenameInput] = useState("");
  const [error, setError] = useState("");
  const [votesRemaining, setVotesRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRemainingVotes = async () => {
      try {
        const response = await fetch(`http://localhost:5000/votes/remaining/${user.id}`);
        const data = await response.json();
        setVotesRemaining(data.votesRemaining);
      } catch (err) {
        console.error("Failed to fetch remaining votes:", err);
      }
    };

    fetchRemainingVotes();
  }, [user.id]);

  // Listen for vote cast events to update remaining votes
  useEffect(() => {
    const unsubscribe = sse.subscribe((data) => {
      if (data.type === 'VOTE_CAST') {
        setVotesRemaining((prev) => Math.max(0, prev - 1));
      }
    });

    return unsubscribe;
  }, [sse]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!codenameInput.trim()) {
      setError("Please enter a codename");
      return;
    }

    if (votesRemaining <= 0) {
      setError("No votes remaining");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/votes/cast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voterId: user.id,
          codename: codenameInput.trim().toUpperCase(),
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setCodenameInput("");
        setError("");
      } else {
        setError(data.error || "Failed to cast vote");
      }
    } catch (err) {
      console.error("Failed to cast vote:", err);
      setError("Failed to cast vote");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="vote-container">
      <div className="vote-card">
        <h1 className="vote-title">🗳️ Cast Your Vote</h1>
        <p className="vote-subtitle">Agent {capitalizeCodename(user.codename)}</p>
        
        <div className="votes-remaining">
          Votes Remaining: <strong>{votesRemaining}</strong>
        </div>

        <form onSubmit={handleVote} className="vote-form">
          <div className="vote-input-group">
            <label htmlFor="codename" className="vote-label">
              Vote for (Codename):
            </label>
            <input
              id="codename"
              type="text"
              value={codenameInput}
              onChange={(e) => setCodenameInput(e.target.value.toUpperCase())}
              placeholder="Enter codename"
              className="vote-input"
              autoComplete="off"
            />
          </div>

          {error && <div className="vote-error">{error}</div>}

          <div className="vote-actions">
            <button
              type="submit"
              disabled={loading || votesRemaining <= 0}
              className="btn btn-primary vote-button"
            >
              {loading ? "Voting..." : "Vote"}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="btn btn-secondary vote-button"
            >
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

