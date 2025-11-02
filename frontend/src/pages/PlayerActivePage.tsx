import { useState, useEffect, useMemo } from "react";
import type { User, Task, Objective } from "../types";
import { capitalizeCodename } from "../utils";
import { useSSE } from "../contexts/SSEContext";
import { API_URL } from "../constants";
import "./PlayerActivePage.scss";

interface PlayerActivePageProps {
  user: User;
  eventStarted: boolean;
  onLogout: () => void;
  onNavigate?: (view: "vote" | "vote_status") => void;
}

interface EventStatus {
  id: number;
  status: string;
  eventStarted: boolean;
}

export default function PlayerActivePage({ user, eventStarted, onLogout, onNavigate }: PlayerActivePageProps) {
  const sse = useSSE();
  const [activePlayerTab, setActivePlayerTab] = useState<"objectives" | "task">("objectives");
  const [task, setTask] = useState<Task | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [codeInput, setCodeInput] = useState<string>("");
  const [codeError, setCodeError] = useState<string>("");
  const [unassignedTasksAvailable, setUnassignedTasksAvailable] = useState<boolean>(false);
  const [cooldownTimer, setCooldownTimer] = useState<number>(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<number, string>>({});
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});

  // Fetch task when event is started
  useEffect(() => {
    const fetchTask = async () => {
      if (user && eventStarted) {
        try {
          const response = await fetch(`${API_URL}/tasks/user/${user.id}`);
          const taskData = await response.json();
          if (taskData) {
            setTask(taskData);
            // Reset image error when task changes
            setImageError(prev => {
              const newState = { ...prev };
              if (taskData.id && newState[taskData.id]) {
                delete newState[taskData.id];
              }
              return newState;
            });
          }
        } catch (err) {
          console.error("Failed to fetch task:", err);
        }
      } else {
        setTask(null);
      }
    };

    fetchTask();
  }, [user, eventStarted]);

  // Fetch objectives when event is started
  useEffect(() => {
    const fetchObjectives = async () => {
      if (user && eventStarted) {
        try {
          const response = await fetch(`${API_URL}/objectives`);
          const objectivesData = await response.json();
          setObjectives(objectivesData);
        } catch (err) {
          console.error("Failed to fetch objectives:", err);
        }
      } else {
        setObjectives([]);
      }
    };

    fetchObjectives();
  }, [user, eventStarted]);

  // Fetch event status
  useEffect(() => {
    const fetchEventStatus = async () => {
      if (user && eventStarted) {
        try {
          const response = await fetch(`${API_URL}/event-status`);
          const statusData = await response.json();
          setEventStatus(statusData);
        } catch (err) {
          console.error("Failed to fetch event status:", err);
        }
      }
    };

    fetchEventStatus();
  }, [user, eventStarted]);

  // Check if unassigned tasks are available
  useEffect(() => {
    const checkUnassignedTasks = async () => {
      if (eventStarted) {
        try {
          const response = await fetch(`${API_URL}/tasks/unassigned/available`);
          const data = await response.json();
          setUnassignedTasksAvailable(data.available);
        } catch (err) {
          console.error("Failed to check unassigned tasks:", err);
        }
      }
    };

    checkUnassignedTasks();
  }, [eventStarted, task]); // Re-check when task changes

  // Initialize cooldown from localStorage on mount
  useEffect(() => {
    const lastRequestTime = localStorage.getItem("lastTaskRequestTime");
    if (lastRequestTime) {
      const elapsed = Math.floor((Date.now() - parseInt(lastRequestTime)) / 1000);
      const remaining = Math.max(0, 1 - elapsed);
      if (remaining > 0) {
        setCooldownTimer(remaining);
      }
    }
  }, []);

  // Countdown timer for cooldown
  useEffect(() => {
    if (cooldownTimer > 0) {
      const timer = setTimeout(() => {
        setCooldownTimer(cooldownTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTimer]);

  // Listen for SSE activities to detect objective completion and event status changes
  useEffect(() => {
    const unsubscribe = sse.subscribe((data) => {
      // Refresh objectives when objective is cleared
      if (data.type === 'OBJECTIVE_CLEARED') {
        const fetchObjectives = async () => {
          try {
            const response = await fetch(`${API_URL}/objectives`);
            const objectivesData = await response.json();
            setObjectives(objectivesData);
          } catch (err) {
            console.error("Failed to fetch objectives:", err);
          }
        };
        fetchObjectives();
      }
      
      // Update event status when it changes
      if (data.type === 'EVENT_STATUS_CHANGED') {
        setEventStatus(data.eventStatus);
      }
    });

    return unsubscribe;
  }, [sse]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError("");
    
    if (!task || !codeInput.trim()) {
      setCodeError("Please enter a code");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/tasks/verify/${task.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: codeInput }),
      });

      const result = await response.json();
      
      if (result.correct) {
        setCodeError("");
        setCodeInput("");
        setCooldownTimer(0);
        // Clear the cooldown timer from localStorage
        localStorage.removeItem("lastTaskRequestTime");
        if (result.task) {
          setTask(result.task);
        }
        
        // Refresh objectives to update progress
        const objectivesResponse = await fetch(`${API_URL}/objectives`);
        const objectivesData = await objectivesResponse.json();
        setObjectives(objectivesData);
      } else {
        setCodeError("Incorrect code. Try again!");
      }
    } catch (err) {
      setCodeError("Failed to verify code. Please try again.");
      console.error(err);
    }
  };

  const handleRefresh = async () => {
    // Refresh task
    if (user && eventStarted) {
      try {
        const response = await fetch(`${API_URL}/tasks/user/${user.id}`);
        const taskData = await response.json();
        if (taskData) {
          setTask(taskData);
        }
      } catch (err) {
        console.error("Failed to fetch task:", err);
      }
    }
    
    // Refresh objectives
    if (eventStarted) {
      try {
        const response = await fetch(`${API_URL}/objectives`);
        const objectivesData = await response.json();
        setObjectives(objectivesData);
      } catch (err) {
        console.error("Failed to fetch objectives:", err);
      }
    }

    // Re-check unassigned tasks
    if (eventStarted) {
      try {
        const response = await fetch(`${API_URL}/tasks/unassigned/available`);
        const data = await response.json();
        setUnassignedTasksAvailable(data.available);
      } catch (err) {
        console.error("Failed to check unassigned tasks:", err);
      }
    }
  };

  const handleRequestNewTask = async () => {
    setCodeError("");
    if (!user) return;

    try {
      const response = await fetch(`${API_URL}/tasks/request/${user.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      
      if (result.assigned && result.task) {
        setTask(result.task);
        setCooldownTimer(1); // Start 60-second cooldown
        localStorage.setItem("lastTaskRequestTime", Date.now().toString());
      } else {
        setCodeError(result.message || "Failed to get a new task");
      }
    } catch (err) {
      setCodeError("Failed to request new task. Please try again.");
      console.error(err);
    }
  };

  const handleReleaseAndRequestNewTask = async () => {
    // Backend now automatically releases incomplete tasks when requesting a new one
    // So we can just call handleRequestNewTask
    await handleRequestNewTask();
  };

  const handleObjectiveAnswer = async (objectiveId: number, answer: string) => {
    if (!answer.trim()) return;

    try {
      const response = await fetch(`${API_URL}/objectives/verify/${objectiveId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answer: answer.trim().toUpperCase() }),
      });

      const result = await response.json();
      
      if (result.correct) {
        // Clear the input for this objective
        setObjectiveAnswers(prev => {
          const newAnswers = { ...prev };
          delete newAnswers[objectiveId];
          return newAnswers;
        });
        
        // Update objectives with the response data (which includes the answer)
        if (result.objective) {
          setObjectives(prevObjectives =>
            prevObjectives.map(obj => 
              obj.id === objectiveId ? result.objective : obj
            )
          );
        } else {
          // Fallback: refresh all objectives
          const objectivesResponse = await fetch(`${API_URL}/objectives`);
          const objectivesData = await objectivesResponse.json();
          setObjectives(objectivesData);
        }
      } else {
        // Show error (could add error state per objective if needed)
        console.error("Incorrect answer for objective");
      }
    } catch (err) {
      console.error("Failed to verify objective answer:", err);
    }
  };

  // Memoized anagram location - generates once per task location and stays consistent
  const anagramLocation = useMemo(() => {
    if (!task || task.type !== 'anagram') return '';
    
    // Use a seed based on task location for deterministic randomization
    // This ensures the same location always produces the same anagram
    const initialSeed = task.location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    let currentSeed = initialSeed;
    const seededRandomFn = (max: number) => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return Math.floor((currentSeed / 233280) * max);
    };
    
    return task.location.split(' ').map(word => {
      // Reset seed per word to ensure consistent shuffling
      currentSeed = initialSeed + word.charCodeAt(0) || 0;
      // Randomize characters in each word using seeded random
      const chars = word.split('');
      for (let i = chars.length - 1; i > 0; i--) {
        const j = seededRandomFn(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      return chars.join('');
    }).join(' ').toUpperCase();
  }, [task?.id, task?.location, task?.type]);

  // Helper function to render B_AND_A clue content
  const renderBAndAClue = (clueContent: string) => {
    // Process each line separately
    return clueContent.split(';').map(line => {
      const trimmedLine = line.trim();
      // Find first and last underscore positions in this line
      const firstUnderscoreIndex = trimmedLine.indexOf('_');
      const lastUnderscoreIndex = trimmedLine.lastIndexOf('_');
      
      if (firstUnderscoreIndex !== -1 && lastUnderscoreIndex !== -1) {
        // Add arrows before first underscore and after last underscore for this line
        const before = trimmedLine.substring(0, firstUnderscoreIndex);
        const middle = trimmedLine.substring(firstUnderscoreIndex, lastUnderscoreIndex + 1);
        const after = trimmedLine.substring(lastUnderscoreIndex + 1);
        return `${before}→ ${middle} →${after}`.toUpperCase();
      }
      
      return trimmedLine.toUpperCase();
    }).join('\n');
  };

  // Check if all objectives are complete and add client-only final task objective
  const allObjectivesComplete = objectives.length > 0 && objectives.every(obj => obj.status === 'SOLVED');
  const isFinalTaskComplete = eventStatus?.status === 'FINAL_TASK_COMPLETE';
  
  const displayObjectives = allObjectivesComplete 
    ? [
        {
          id: -1,
          name: isFinalTaskComplete ? "XXXPULSE IMPOSTOR" : "Unlock final task",
          type: "final",
          status: "UNSOLVED",
          answer: "",
          piecesFound: 0,
          totalPieces: 0,
          difficulty: isFinalTaskComplete ? 0: 3,
        },
        ...objectives,
      ]
    : objectives;

  return (
    <div className="player-container">
      <div className="player-card">
        <div className="player-header">
          <h1>Welcome, Agent {capitalizeCodename(user.codename)}! 🕵️</h1>
          <div className="header-buttons">
            <button onClick={handleRefresh} className="btn-icon" title="Refresh">
              🔄
            </button>
            <button onClick={() => setShowLogoutConfirm(true)} className="btn-icon" title="Logout">
              🚪
            </button>
          </div>
        </div>

        {/* Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="logout-confirm-overlay">
            <div className="logout-confirm-dialog">
              <p>Are you sure you want to logout?</p>
              <div className="logout-confirm-buttons">
                <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="btn btn-danger">
                  Yes
                </button>
                <button onClick={() => setShowLogoutConfirm(false)} className="btn btn-primary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            onClick={() => setActivePlayerTab("objectives")}
            className={`tab-button ${activePlayerTab === "objectives" ? "active" : ""}`}
          >
            Objectives
          </button>
          <button
            onClick={() => setActivePlayerTab("task")}
            className={`tab-button ${activePlayerTab === "task" ? "active" : ""}`}
          >
            My Task
          </button>
        </div>

        {/* Tab Content */}
        {activePlayerTab === "objectives" && (
          <div className="tab-content">
            <h2>Objective Progress</h2>
            <div className="objectives-grid">
              {displayObjectives.map((objective) => (
                <div 
                  key={objective.id} 
                  className={`objective-card ${objective.status === "SOLVED" ? "objective-solved" : ""} ${objective.id === -1 && isFinalTaskComplete ? "objective-clickable" : ""}`}
                  onClick={objective.id === -1 && isFinalTaskComplete && onNavigate ? () => onNavigate("vote") : undefined}
                >
                  <h3 className="objective-name">{objective.name}</h3>
                  <div className="objective-difficulty-container">
                    <span className="objective-difficulty">
                      {"🌶️".repeat(Math.min(5, objective.difficulty))}
                    </span>
                  </div>
                  {objective.id === -1 ? (
                    <p className="objective-progress" style={{ fontStyle: "italic", color: "#888" }}>
                      {isFinalTaskComplete ? "Click to vote" : "Report back to the living room to complete this task"}
                    </p>
                  ) : (
                    <>
                      <p className="objective-progress">
                        {objective.piecesFound} of {objective.totalPieces} pieces found
                      </p>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{
                            width: `${objective.totalPieces > 0 ? (objective.piecesFound / objective.totalPieces) * 100 : 0}%`,
                            backgroundColor: objective.piecesFound === objective.totalPieces ? "#4ade80" : "#60a5fa"
                          }}
                        />
                      </div>
                      {objective.status === "SOLVED" ? (
                        <p className="objective-solved-text">✅ {objective.answer || "Solved"} ✅</p>
                      ) : (
                        <>
                          <div className="objective-answer-input">
                            <input
                              type="text"
                              value={objectiveAnswers[objective.id] || ""}
                              onChange={(e) => {
                                const upperValue = e.target.value.toUpperCase();
                                setObjectiveAnswers(prev => ({
                                  ...prev,
                                  [objective.id]: upperValue
                                }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleObjectiveAnswer(objective.id, objectiveAnswers[objective.id] || "");
                                }
                              }}
                              placeholder="Enter answer"
                              className="objective-answer-field"
                            />
                            <button
                              onClick={() => handleObjectiveAnswer(objective.id, objectiveAnswers[objective.id] || "")}
                              className="btn btn-primary btn-verify-answer"
                              disabled={!objectiveAnswers[objective.id]?.trim()}
                              title="Submit answer"
                            >
                              ✓
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activePlayerTab === "task" && (
          <div className="tab-content">
            {task ? (
              <>
                <h2 className={task.status === "SOLVED" ? "task-completed" : "task-active"}>
                  {task.status === "SOLVED" ? "✅ Task Completed!" : `👀 ${task.prefixText}: `}
                </h2>
                
                <div className="task-details">                  
                  {/* Render clue content based on type */}
                  {task.type === 'cryptic' && task.clueContent && (
                    <div className="clue-content cryptic-clue">
                      <p className="clue-text">{task.clueContent}</p>
                      <p className="cryptic-disclaimer">
                        ⚠️ If you're not familiar with cryptic clues, seek someone who is!
                      </p>
                    </div>
                  )}
                  
                  {task.type === 'text' && task.clueContent && (
                    <div className="clue-content text-clue">
                      <p className="clue-text">{task.clueContent}</p>
                    </div>
                  )}
                  
                  {task.type === 'anagram' && (
                    <div className="clue-content anagram-clue">
                      <p className="anagram-location">{anagramLocation}</p>
                    </div>
                  )}
                  
                  {task.type === 'b_and_a' && task.clueContent && (
                    <div className="clue-content b-and-a-clue">
                      <pre className="b-and-a-text">{renderBAndAClue(task.clueContent)}</pre>
                    </div>
                  )}
                  
                  {task.type === 'image' && task.clueContent && (
                    <div className="clue-content image-clue">
                      {imageError[task.id] ? (
                        <div className="image-error">
                          <p>Image not found: {task.clueContent}</p>
                        </div>
                      ) : (
                        <img
                          src={`/${task.clueContent}`}
                          alt="Clue image"
                          className="clue-image"
                          onError={() => setImageError(prev => ({ ...prev, [task.id]: true }))}
                          onLoad={() => setImageError(prev => ({ ...prev, [task.id]: false }))}
                        />
                      )}
                    </div>
                  )}
                  
                  {task.type === 'catfish' && task.clueContent && (
                    <div className="clue-content catfish-clue">
                      <div className="catfish-list">
                        {task.clueContent.split(',').map((item, index, array) => (
                          <span key={index}>
                            {item.trim()}
                            {index < array.length - 1 && <span className="catfish-separator"> ✦ </span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {task.status === "UNSOLVED" && (
                  <form onSubmit={handleVerifyCode} className="code-form">
                    <div className="form-group">
                      <label>Enter Code:</label>
                      <div className="code-input-row">
                        <input
                          type="text"
                          value={codeInput}
                          onChange={(e) => {
                            const upperValue = e.target.value.toUpperCase();
                            setCodeInput(upperValue);
                          }}
                          maxLength={4}
                          required
                          className="code-input"
                        />
                        <button type="submit" className="btn btn-primary btn-verify">
                          Verify Code
                        </button>
                      </div>
                      {codeError && (
                        <p className="error-text">{codeError}</p>
                      )}
                    </div>
                  </form>
                )}

                {task.status === "UNSOLVED" && (
                  <>
                    <div className="stuck-section">
                      <p className="stuck-label">Stuck? Try a different task</p>
                      <button 
                        onClick={handleReleaseAndRequestNewTask} 
                        className="btn btn-primary"
                        disabled={!unassignedTasksAvailable || cooldownTimer > 0}
                      >
                        {cooldownTimer > 0 
                          ? `Cooldown: ${cooldownTimer}s` 
                          : unassignedTasksAvailable 
                            ? "Release & Request New Task" 
                            : "No unassigned tasks remain"}
                      </button>
                    </div>
                  </>
                )}

                {task.status === "SOLVED" && (
                  <>
                    <button 
                      onClick={handleRequestNewTask} 
                      className="btn btn-primary btn-full-width"
                      disabled={cooldownTimer > 0}
                    >
                      {cooldownTimer > 0 ? `Cooldown: ${cooldownTimer}s` : "Request New Task"}
                    </button>
                    {codeError && (
                      <p className="info-text-center">{codeError}</p>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="no-task">
                <p>You don't have a task yet.</p>
                <button 
                  onClick={handleRequestNewTask} 
                  className="btn btn-primary"
                  disabled={cooldownTimer > 0}
                >
                  {cooldownTimer > 0 ? `Cooldown: ${cooldownTimer}s` : "Request Task"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

