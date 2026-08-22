// src/App.tsx
import { Routes, Route, useNavigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import Community from "./pages/Community";
import Simulator from "./pages/Simulator";
import MyProject from "./pages/MyProject";

export default function App() {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            onSelectBoard={(boardId) => navigate(`/simulator?board=${boardId}`)}
          />
        }
      />
      <Route
        path="/community"
        element={<Community />}
      />
      <Route
        path="/simulator"
        element={<Simulator onBackToHome={() => navigate("/")} />}
      />
      <Route
        path="/my-projects"
        element={<MyProject />}
      />
    </Routes>
  );
}