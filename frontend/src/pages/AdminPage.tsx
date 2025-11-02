import { useState, useEffect } from "react";
import type { User, Task } from "../types";
import { capitalizeCodename } from "../utils";
import { useSSE } from "../contexts/SSEContext";
import "./AdminPage.scss";

interface AdminPageProps {
  user: User;
  eventStarted: boolean;
  onToggleEvent: (started: boolean) => void;
  onLogout: () => void;
}

interface EventStatus {
  id: number;
  status: string;
  eventStarted: boolean;
}

export default function AdminPage({ user, eventStarted, onToggleEvent, onLogout }: AdminPageProps) {
  const sse = useSSE();
  const [players, setPlayers] = useState<User[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [randomTaskCount, setRandomTaskCount] = useState<string>("");
  const [loadingRandomTasks, setLoadingRandomTasks] = useState(false);
  const [loadingSolveAllObjectives, setLoadingSolveAllObjectives] = useState(false);
  const [votePlayerId, setVotePlayerId] = useState<string>("");
  const [voteAmount, setVoteAmount] = useState<string>("");
  const [loadingGiveVotes, setLoadingGiveVotes] = useState(false);
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);

  // Fetch event status on mount
  useEffect(() => {
    const fetchEventStatus = async () => {
      try {
        const response = await fetch("http://localhost:5000/event-status");
        const status = await response.json();
        setEventStatus(status);
      } catch (err) {
        console.error("Failed to fetch event status:", err);
      }
    };

    fetchEventStatus();
  }, []);

  // Listen for SSE events to auto-refresh
  useEffect(() => {
    const unsubscribe = sse.subscribe((data) => {
      // Refresh when tasks or objectives are updated
      if (data.type === 'TASK_SOLVED' || data.type === 'OBJECTIVE_CLEARED') {
        // Refresh player list and selected task
        if (eventStarted) {
          fetch("http://localhost:5000/users")
            .then(res => res.json())
            .then(users => {
              const playerUsers = users.filter((u: User) => u.role === 'PLAYER');
              setPlayers(playerUsers);
            })
            .catch(err => console.error("Failed to refresh players:", err));
        }

        // Refresh selected task if one is selected
        if (selectedPlayerId) {
          fetch(`http://localhost:5000/tasks/user/${selectedPlayerId}`)
            .then(res => res.json())
            .then(task => setSelectedTask(task))
            .catch(err => console.error("Failed to refresh task:", err));
        }
      }
      
      // Update event status
      if (data.type === 'EVENT_STATUS_CHANGED') {
        setEventStatus(data.eventStatus);
      }
    });

    return unsubscribe;
  }, [sse, eventStarted, selectedPlayerId]);

  // Fetch players when event starts
  useEffect(() => {
    const fetchPlayers = async () => {
      if (eventStarted) {
        try {
          const response = await fetch("http://localhost:5000/users");
          const users = await response.json();
          // Filter out admin users
          const playerUsers = users.filter((u: User) => u.role === 'PLAYER');
          setPlayers(playerUsers);
        } catch (err) {
          console.error("Failed to fetch players:", err);
        }
      } else {
        setPlayers([]);
      }
    };

    fetchPlayers();
  }, [eventStarted]);

  // Fetch task for selected player
  useEffect(() => {
    const fetchPlayerTask = async () => {
      if (!selectedPlayerId) {
        setSelectedTask(null);
        return;
      }

      setLoadingTask(true);
      try {
        const response = await fetch(`http://localhost:5000/tasks/user/${selectedPlayerId}`);
        const task = await response.json();
        setSelectedTask(task);
      } catch (err) {
        console.error("Failed to fetch player task:", err);
        setSelectedTask(null);
      } finally {
        setLoadingTask(false);
      }
    };

    fetchPlayerTask();
  }, [selectedPlayerId]);

  const handleToggleEvent = async (started: boolean) => {
    try {
      const response = await fetch("http://localhost:5000/event-status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventStarted: started }),
      });
      const status = await response.json();
      onToggleEvent(status.eventStarted);
    } catch (err) {
      console.error("Failed to update event status:", err);
    }
  };

  const handleMarkRandomTasks = async () => {
    const count = parseInt(randomTaskCount);
    if (isNaN(count) || count <= 0) {
      alert("Please enter a valid positive number");
      return;
    }

    setLoadingRandomTasks(true);
    try {
      const response = await fetch("http://localhost:5000/tasks/admin/mark-random", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ count }),
      });
      const result = await response.json();
      alert(result.message || "Tasks marked successfully");
      setRandomTaskCount("");
    } catch (err) {
      console.error("Failed to mark random tasks:", err);
      alert("Failed to mark random tasks");
    } finally {
      setLoadingRandomTasks(false);
    }
  };

  const handleSolveAllObjectives = async () => {
    setLoadingSolveAllObjectives(true);
    try {
      // First, fetch all objectives with answers (admin endpoint)
      const objectivesResponse = await fetch("http://localhost:5000/objectives/admin/all");
      const objectives = await objectivesResponse.json();
      
      // Filter out objectives that are already solved
      const unsolvedObjectives = objectives.filter((obj: any) => obj.status !== 'SOLVED');
      
      if (unsolvedObjectives.length === 0) {
        alert("All objectives are already solved!");
        setLoadingSolveAllObjectives(false);
        return;
      }
      
      // Verify each unsolved objective with its answer
      for (const objective of unsolvedObjectives) {
        try {
          await fetch(`http://localhost:5000/objectives/verify/${objective.id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ answer: objective.answer }),
          });
        } catch (err) {
          console.error(`Failed to verify objective ${objective.id}:`, err);
        }
      }
      
      alert(`Successfully solved ${unsolvedObjectives.length} objective(s)!`);
    } catch (err) {
      console.error("Failed to solve all objectives:", err);
      alert("Failed to solve all objectives");
    } finally {
      setLoadingSolveAllObjectives(false);
    }
  };

  const handleGiveVotes = async () => {
    const amount = parseInt(voteAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive number");
      return;
    }

    if (!votePlayerId) {
      alert("Please select a player");
      return;
    }

    setLoadingGiveVotes(true);
    try {
      const response = await fetch("http://localhost:5000/votes/admin/give-votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: parseInt(votePlayerId), additionalVotes: amount }),
      });
      const result = await response.json();
      
      if (response.ok) {
        alert(result.message || "Votes given successfully");
        setVotePlayerId("");
        setVoteAmount("");
        // Refresh players to show updated vote counts
        const playersResponse = await fetch("http://localhost:5000/users");
        const users = await playersResponse.json();
        const playerUsers = users.filter((u: User) => u.role === 'PLAYER');
        setPlayers(playerUsers);
      } else {
        alert(result.error || "Failed to give votes");
      }
    } catch (err) {
      console.error("Failed to give votes:", err);
      alert("Failed to give votes");
    } finally {
      setLoadingGiveVotes(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h1 className="admin-title">🛡️ Admin Control Panel</h1>
        <p className="subtitle">Welcome, {user.name} ({capitalizeCodename(user.codename)})</p>
        
        <div className="toggle-container">
          <label className="toggle-label">
            <span className="toggle-text">Start Event</span>
            <button
              onClick={() => handleToggleEvent(!eventStarted)}
              className={`toggle-switch ${eventStarted ? 'active' : ''}`}
            >
              <div className="toggle-slider" />
            </button>
          </label>
          <div className="toggle-status-group">
            <p className="toggle-status">
              {eventStarted ? "Event is running" : "Event is not started"}
            </p>
            {eventStatus && (
              <p className="toggle-status-detail">
                Status: {eventStatus.status.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>

        {eventStarted && players.length > 0 && (
          <div className="player-task-viewer">
            <h3 className="viewer-title">View Player Task</h3>
            <label className="dropdown-label">
              <span>Select Player:</span>
              <select
                value={selectedPlayerId || ""}
                onChange={(e) => setSelectedPlayerId(e.target.value ? parseInt(e.target.value) : null)}
                className="player-dropdown"
              >
                <option value="">-- Select a player --</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {capitalizeCodename(player.codename)} ({player.name})
                  </option>
                ))}
              </select>
            </label>

            {selectedPlayerId && (
              <div className="task-display">
                {loadingTask ? (
                  <p className="loading-text">Loading task...</p>
                ) : selectedTask ? (
                  <div className="task-info">
                    <h4 className="task-info-title">Assigned Task</h4>
                    <div className="task-detail">
                      <span className="task-label">Status:</span>
                      <span className={`task-value ${selectedTask.status === 'SOLVED' ? 'task-solved' : 'task-unsolved'}`}>
                        {selectedTask.status}
                      </span>
                    </div>
                    <div className="task-detail">
                      <span className="task-label">Code:</span>
                      <span className="task-value">{selectedTask.code}</span>
                    </div>
                    <div className="task-detail">
                      <span className="task-label">Location:</span>
                      <span className="task-value">{selectedTask.location}</span>
                    </div>
                    <div className="task-detail">
                      <span className="task-label">Contents:</span>
                      <span className="task-value">{selectedTask.contents}</span>
                    </div>
                    <div className="task-detail">
                      <span className="task-label">Prefix:</span>
                      <span className="task-value">{selectedTask.prefixText}</span>
                    </div>
                  </div>
                ) : (
                  <p className="no-task-text">No task assigned to this player</p>
                )}
              </div>
            )}
          </div>
        )}

        {eventStarted && (
          <div className="admin-actions">
            <h3 className="actions-title">Admin Actions</h3>
            
            <div className="action-group">
              <label className="dropdown-label">
                <span>Mark Random Tasks Complete:</span>
                <div className="mark-random-tasks">
                  <input
                    type="number"
                    value={randomTaskCount}
                    onChange={(e) => setRandomTaskCount(e.target.value)}
                    placeholder="Number of tasks"
                    className="random-task-input"
                    min="1"
                  />
                  <button
                    onClick={handleMarkRandomTasks}
                    disabled={loadingRandomTasks}
                    className="btn btn-primary action-button"
                  >
                    {loadingRandomTasks ? "Loading..." : "Mark Tasks"}
                  </button>
                </div>
              </label>
            </div>

            <div className="action-group">
              <label className="dropdown-label">
                <span>Complete All Objectives:</span>
                <button
                  onClick={handleSolveAllObjectives}
                  disabled={loadingSolveAllObjectives}
                  className="btn btn-primary action-button"
                >
                  {loadingSolveAllObjectives ? "Loading..." : "Solve All Objectives"}
                </button>
              </label>
            </div>

            <div className="action-group">
              <label className="dropdown-label">
                <span>Give Votes to Player:</span>
                <div className="give-votes-form">
                  <select
                    value={votePlayerId}
                    onChange={(e) => setVotePlayerId(e.target.value)}
                    className="give-votes-select"
                  >
                    <option value="">-- Select a player --</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {capitalizeCodename(player.codename)} ({player.name})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={voteAmount}
                    onChange={(e) => setVoteAmount(e.target.value)}
                    placeholder="Votes to add"
                    className="give-votes-input"
                    min="1"
                  />
                  <button
                    onClick={handleGiveVotes}
                    disabled={loadingGiveVotes}
                    className="btn btn-primary action-button"
                  >
                    {loadingGiveVotes ? "Loading..." : "Give Votes"}
                  </button>
                </div>
              </label>
            </div>
          </div>
        )}

        <button onClick={onLogout} className="btn btn-primary btn-danger">
          Logout
        </button>
      </div>
    </div>
  );
}

