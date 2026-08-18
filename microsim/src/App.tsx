import { useState } from "react";
import { LandingPage } from "./pages/LandingPage";
import { SimulatorPage } from "./pages/SimulatorPage";

type View = "landing" | "simulator";

export default function App() {
  const [view, setView] = useState<View>("landing");

  if (view === "simulator") {
    return <SimulatorPage onBackToHome={() => setView("landing")} />;
  }

  return <LandingPage onSelectBoard={() => setView("simulator")} />;
}
