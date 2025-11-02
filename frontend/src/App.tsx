import { useState, useEffect } from "react";
import type { User } from "./types";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import PlayerStandbyPage from "./pages/PlayerStandbyPage";
import PlayerActivePage from "./pages/PlayerActivePage";
import StatusPage from "./pages/StatusPage";
import VotePage from "./pages/VotePage";
import VoteStatusPage from "./pages/VoteStatusPage";
import ResultsPage from "./pages/ResultsPage";
import { useSSE } from "./contexts/SSEContext";

type ViewType = "main" | "vote" | "vote_status";

interface EventStatus {
  id: number;
  status: string;
  eventStarted: boolean;
}

function App() {
  const sse = useSSE();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [eventStarted, setEventStarted] = useState(false);
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);
  const [usedCodenames, setUsedCodenames] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>("main");

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Failed to parse saved user:", err);
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // Fetch event status when authenticated
  useEffect(() => {
    const fetchEventStatus = async () => {
      try {
        const response = await fetch("http://localhost:5000/event-status");
        const status = await response.json();
        setEventStarted(status.eventStarted);
        setEventStatus(status);
      } catch (err) {
        console.error("Failed to fetch event status:", err);
      }
    };

    if (isAuthenticated) {
      fetchEventStatus();
    }
  }, [isAuthenticated]);

  // Listen for event status changes via SSE
  useEffect(() => {
    if (isAuthenticated) {
      const unsubscribe = sse.subscribe((data) => {
        if (data.type === 'EVENT_STATUS_CHANGED') {
          setEventStarted(data.eventStatus.eventStarted);
          setEventStatus(data.eventStatus);
        }
      });

      return unsubscribe;
    }
  }, [isAuthenticated, sse]);

  // Set admin flag when user changes
  useEffect(() => {
    if (user && user.role === "ADMIN") {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Fetch used codenames on mount (for registration dropdown)
  useEffect(() => {
    const fetchUsedCodenames = async () => {
      try {
        const response = await fetch("http://localhost:5000/users");
        const users: User[] = await response.json();
        setUsedCodenames(users.map(u => u.codename));
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };

    fetchUsedCodenames();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleToggleEvent = (started: boolean) => {
    setEventStarted(started);
  };

  // Check if user is on public routes
  const isStatusRoute = window.location.pathname === "/status";
  const isVoteStatusRoute = window.location.pathname === "/vote_status";
  const isResultsRoute = window.location.pathname === "/results";

  // Show public pages
  if (isStatusRoute) {
    return <StatusPage />;
  }

  if (isVoteStatusRoute) {
    return <VoteStatusPage />;
  }

  // Show login/registration page if not authenticated
  if (!isAuthenticated || !user) {
    return <LoginPage onLogin={handleLogin} usedCodenames={usedCodenames} />;
  }

  // Redirect player to results page if FINALE
  if (!isAdmin && eventStatus?.status === 'FINALE' && !isResultsRoute) {
    window.location.href = '/results';
    return null;
  }

  // Admin view
  if (isAdmin) {
    return <AdminPage user={user} eventStarted={eventStarted} onToggleEvent={handleToggleEvent} onLogout={handleLogout} />;
  }

  // Player view - results page
  if (isResultsRoute) {
    return <ResultsPage user={user} />;
  }

  // Player view routing
  if (currentView === "vote") {
    return <VotePage user={user} onBack={() => setCurrentView("main")} />;
  }

  if (currentView === "vote_status") {
    return <VoteStatusPage />;
  }

  // Player view - shows standby if event not started
  if (!eventStarted) {
    return <PlayerStandbyPage user={user} onLogout={handleLogout} />;
  }

  // Player view - event started
  return <PlayerActivePage user={user} eventStarted={eventStarted} onLogout={handleLogout} onNavigate={(view) => setCurrentView(view)} />;
}

export default App;
