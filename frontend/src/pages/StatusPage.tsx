import { useState, useEffect, useContext } from "react";
import type { Objective, Activity } from "../types";
import { capitalizeCodename } from "../utils";
import { SSEContext } from "../contexts/SSEContext";
import "./StatusPage.scss";

interface LeaderboardEntry {
  id: number;
  name: string;
  codename: string;
  piecesFound: number;
}

interface EventStatus {
  id: number;
  status: string;
  eventStarted: boolean;
}

interface MetaObjective {
  objectiveAnswer: string;
  answers: string[];
  originalNumber: string;
  color: string;
}

const metaObjectives: MetaObjective[] = [
  {
    objectiveAnswer: "EXODUS",
    answers: ["AMOS"],
    originalNumber: "2",
    color: "red",
  },
  {
    objectiveAnswer: "TEXAS",
    answers: ["WISCONSIN"],
    originalNumber: "28",
    color: "orange",
  },
  {
    objectiveAnswer: "NIXON",
    answers: ["COOLIDGE", "CALVIN COOLIDGE"],
    originalNumber: "37",
    color: "yellow",
  },
  {
    objectiveAnswer: "SLASH",
    answers: ["RECORD SEPARATOR", "RS"],
    originalNumber: "47",
    color: "green",
  },
  {
    objectiveAnswer: "PLATINUM",
    answers: ["ZINC"],
    originalNumber: "78",
    color: "blue",
  },
  {
    objectiveAnswer: "WILLOW RD",
    answers: ["PARKWAY CALABASAS", "PKWY CALABASAS", "CALABASAS PARKWAY", "CALABASAS PKWY", "CALABASAS"],
    originalNumber: "404",
    color: "purple",
  },
  {
    objectiveAnswer: "WIGLETT",
    answers: ["NIDORINA"],
    originalNumber: "970",
    color: "black",
  },
  {
    objectiveAnswer: "COMMUNITY CHEST",
    answers: ["GO TO JAIL"],
    originalNumber: "2 / 17 / 33",
    color: "white",
  },
];

function StatusPage() {
  // Try to use SSE context if available (when rendered through App), otherwise null
  const sseContext = useContext(SSEContext);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);
  const [finalTaskAnswers, setFinalTaskAnswers] = useState<string[]>([]);
  const [finalAnswer, setFinalAnswer] = useState<string>("");
  const [finalAnswerSubmitted, setFinalAnswerSubmitted] = useState<boolean>(false);

  // Initialize final task answers array when objectives load
  useEffect(() => {
    if (objectives.length > 0) {
      setFinalTaskAnswers(new Array(objectives.length).fill(''));
    }
  }, [objectives.length]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch objectives
        const objectivesResponse = await fetch("http://localhost:5000/objectives");
        const objectivesData = await objectivesResponse.json();
        setObjectives(objectivesData);

        // Fetch leaderboard
        const leaderboardResponse = await fetch("http://localhost:5000/leaderboard");
        const leaderboardData = await leaderboardResponse.json();
        setLeaderboard(leaderboardData);

        // Fetch initial activities
        const activitiesResponse = await fetch("http://localhost:5000/activities");
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData);

        // Fetch event status
        const eventStatusResponse = await fetch("http://localhost:5000/event-status");
        const eventStatusData = await eventStatusResponse.json();
        setEventStatus(eventStatusData);
      } catch (err) {
        console.error("Failed to fetch status data:", err);
      }
    };

    // Helper function to refresh objectives and leaderboard
    const refreshData = async () => {
      try {
        const [objectivesResponse, leaderboardResponse, eventStatusResponse] = await Promise.all([
          fetch("http://localhost:5000/objectives"),
          fetch("http://localhost:5000/leaderboard"),
          fetch("http://localhost:5000/event-status"),
        ]);
        
        const objectivesData = await objectivesResponse.json();
        const leaderboardData = await leaderboardResponse.json();
        const eventStatusData = await eventStatusResponse.json();
        
        setObjectives(objectivesData);
        setLeaderboard(leaderboardData);
        setEventStatus(eventStatusData);
      } catch (err) {
        console.error("Failed to refresh data:", err);
      }
    };

    // Initial data fetch
    fetchData();
    
    const handleSSEEvent = (data: any) => {
      if (data.type !== 'connected') {
        if (data.type === 'EVENT_STATUS_CHANGED') {
          // Update event status
          setEventStatus(data.eventStatus);
          // Refresh leaderboard and objectives when status changes
          refreshData();
        } else {
          // New activity received, add to the beginning of the list
          // Keep only the 50 most recent activities
          setActivities((prevActivities) => [data, ...prevActivities].slice(0, 50));
          
          // Refresh leaderboard and objectives when activity occurs
          refreshData();
        }
      }
    };
    
    // Use SSE context if available, otherwise create own EventSource
    if (sseContext) {
      const unsubscribe = sseContext.subscribe(handleSSEEvent);
      return unsubscribe;
    } else {
      // Set up SSE connection for real-time activity updates (fallback when not in App)
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

  const handleFinalTaskAnswerChange = (index: number, value: string) => {
    const updatedAnswers = [...finalTaskAnswers];
    updatedAnswers[index] = value;
    setFinalTaskAnswers(updatedAnswers);
  };

  const getMetaObjective = (index: number): MetaObjective | undefined => {
    return metaObjectives[index];
  };

  const normalizeAnswer = (answer: string): string => {
    return answer.toLowerCase().replace(/\s+/g, '');
  };

  const isCorrectAnswer = (index: number, answer: string): boolean => {
    const metaObj = getMetaObjective(index);
    if (!metaObj) return false;
    const normalizedInput = normalizeAnswer(answer);
    return metaObj.answers.some(a => normalizeAnswer(a) === normalizedInput);
  };

  const handleFinalAnswerInput = (value: string) => {
    setFinalAnswer(value);
  };

  const handleFinalAnswerSubmit = async () => {
    // Check if correct answer
    const normalizedInput = normalizeAnswer(finalAnswer);
    const correctAnswer = normalizeAnswer("XXXPULSE IMPOSTOR");
    
    if (normalizedInput === correctAnswer) {
      if (eventStatus?.status === 'OBJECTIVES_COMPLETE') {
        try {
          // Update event status to FINAL_TASK_COMPLETE
          const response = await fetch("http://localhost:5000/event-status", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: 'FINAL_TASK_COMPLETE' }),
          });
          
          const updatedStatus = await response.json();
          setEventStatus(updatedStatus);
          setFinalAnswerSubmitted(true);
        } catch (err) {
          console.error("Failed to update event status:", err);
        }
      } else if (eventStatus?.status === 'FINAL_TASK_COMPLETE') {
        // Already in FINAL_TASK_COMPLETE, just mark as submitted locally
        setFinalAnswerSubmitted(true);
      }
    }
  };

  return (
    <div className="status-container">
      <div className="status-content">
        {/* Objectives Section - Left */}
        <div className="objectives-section">
          <h2 className="status-section-title">Objectives</h2>
          <div className="objectives-list">
            {objectives.map((objective) => (
              <div key={objective.id} className="status-objective-card">
                <div className="status-objective-header">
                  <h3 className="status-objective-name">{objective.name}</h3>
                  <div className="status-objective-difficulty">
                    {"🌶️".repeat(Math.min(5, objective.difficulty))}
                  </div>
                </div>
                <div className="status-objective-progress">
                  <span className="status-progress-text">
                    {objective.piecesFound} of {objective.totalPieces} pieces found
                  </span>
                  <div className="status-progress-bar">
                    <div
                      className="status-progress-fill"
                      style={{
                        width: `${objective.totalPieces > 0 ? (objective.piecesFound / objective.totalPieces) * 100 : 0}%`,
                        backgroundColor: objective.piecesFound === objective.totalPieces ? "#4ade80" : "#60a5fa"
                      }}
                    />
                  </div>
                </div>
                {objective.status === "SOLVED" && objective.answer && (
                  <div className="status-objective-solved">✅ {objective.answer}</div>
                )}
              </div>
            ))}
            
            {/* Final task objective - client-side only */}
            <div className="status-objective-card status-objective-final">
              <div className="status-objective-header">
                <h3 className="status-objective-name">Unlock final task</h3>
                <div className="status-objective-difficulty">
                  {"🌶️".repeat(3)}
                </div>
              </div>
              <div className="status-objective-lock">
                {eventStatus?.status === 'FINALE' ? (
                  <div className="final-task-finale">
                    <button 
                      onClick={() => window.location.href = '/vote_status'}
                      className="btn btn-primary finale-button"
                    >
                      XXXPULSE IMPOSTOR
                    </button>
                  </div>
                ) : eventStatus?.status === 'OBJECTIVES_COMPLETE' || eventStatus?.status === 'FINAL_TASK_COMPLETE' ? (
                  <div className="final-task-unlocked">
                    <p>Turning 30 reveals your true colors...</p>
                    <div className="final-task-inputs-grid">
                      {objectives.map((objective, index) => {
                        const metaObj = getMetaObjective(index);
                        const isCorrect = metaObj && isCorrectAnswer(index, finalTaskAnswers[index]);
                        return (
                          <div key={objective.id} className="final-task-input-group">
                            {isCorrect && metaObj ? (
                              <div className={`final-task-answer-correct ${metaObj.color}`}>
                                <span className="final-task-answer">{metaObj.objectiveAnswer}</span>
                              </div>
                            ) : (
                              <div className="final-task-input-row">
                                <span className="final-task-prefix">{metaObj?.originalNumber || "?"} → 30 = </span>
                                <input
                                  type="text"
                                  value={finalTaskAnswers[index] || ''}
                                  onChange={(e) => handleFinalTaskAnswerChange(index, e.target.value)}
                                  className="final-task-input"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="final-task-numbers">
                      <div className="final-task-number-row">
                        <div className="yellow">3</div>
                        <div className="red">2</div>
                        <div className="orange">3</div>
                        <div className="blue">1</div>
                        <div className="white">5</div>
                        <div className="purple">3</div>
                        <div className="green">1</div>
                        <div className="black">5</div>
                      </div>
                      <div className="final-task-number-row">
                        <div className="black">2</div>
                        <div className="white">3</div>
                        <div className="blue">1</div>
                        <div className="red">3</div>
                        <div className="green">4</div>
                        <div className="orange">1</div>
                        <div className="yellow">4</div>
                        <div className="purple">7</div>
                      </div>
                    </div>
                    {eventStatus?.status === 'OBJECTIVES_COMPLETE' && (
                      <div className="final-task-final-input">
                        {finalAnswerSubmitted ? (
                          <button 
                            onClick={() => window.location.href = '/vote_status'}
                            className="btn btn-primary final-task-vote-button"
                          >
                            XXXPULSE IMPOSTOR
                          </button>
                        ) : (
                          <div className="final-task-submit-row">
                            <input
                              type="text"
                              value={finalAnswer}
                              onChange={(e) => handleFinalAnswerInput(e.target.value)}
                              className="final-task-input-final"
                            />
                            <button
                              onClick={handleFinalAnswerSubmit}
                              disabled={!finalAnswer.trim()}
                              className="btn btn-primary btn-verify-answer"
                              title="Submit answer"
                            >
                              ✓
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {eventStatus?.status === 'FINAL_TASK_COMPLETE' && !finalAnswerSubmitted && (
                      <div className="final-task-final-input">
                        <div className="final-task-submit-row">
                          <input
                            type="text"
                            value={finalAnswer}
                            onChange={(e) => handleFinalAnswerInput(e.target.value)}
                            placeholder="Enter final answer"
                            className="final-task-input-final"
                          />
                          <button
                            onClick={handleFinalAnswerSubmit}
                            disabled={!finalAnswer.trim()}
                            className="btn btn-primary btn-verify-answer"
                            title="Submit answer"
                          >
                            ✓
                          </button>
                        </div>
                      </div>
                    )}
                    {eventStatus?.status === 'FINAL_TASK_COMPLETE' && finalAnswerSubmitted && (
                      <div className="final-task-final-input">
                        <button 
                          onClick={() => window.location.href = '/vote_status'}
                          className="btn btn-primary final-task-vote-button"
                        >
                          XXXPULSE IMPOSTOR
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="final-task-locked">
                    <span style={{ fontSize: '2rem' }}>🔒</span>
                    <p>Unlocks when all objectives are complete</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section */}
        <div className="middle-section">
          {/* Leaderboard Section */}
          <div className="leaderboard-section">
            <h2 className="status-section-title">Top Agents</h2>
            <div className="leaderboard-list">
              {leaderboard.length === 0 ? (
                <p className="no-leaderboard-data">No players yet</p>
              ) : (
                leaderboard.map((player, index) => (
                  <div key={player.id} className="leaderboard-entry">
                    <div className="leaderboard-rank">{index + 1}</div>
                    <div className="leaderboard-info">
                      <div className="leaderboard-codename">{capitalizeCodename(player.codename)}</div>
                    </div>
                    <div className="leaderboard-pieces">{player.piecesFound} {player.piecesFound === 1 ? "piece" : "pieces"}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Feed Section */}
          <div className="activity-feed-section">
            <h2 className="status-section-title">Activity Feed</h2>
            <div className="activity-list">
              {activities.length === 0 ? (
                <p className="no-activity-data">No activity yet</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="activity-entry">
                    <div className="activity-icon">
                      {activity.type === 'TASK_SOLVED' ? '🔍' : '✅'}
                    </div>
                    <div className="activity-content">
                      <div className="activity-message">{activity.message}</div>
                      <div className="activity-time">
                        {new Date(activity.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatusPage;

