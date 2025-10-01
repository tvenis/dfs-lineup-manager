"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DraftKingsSettings } from "./settings/DraftKingsSettings";
import { PlayersSettings } from "./settings/PlayersSettings";
import { TeamsSettings } from "./settings/TeamsSettings";
import { WeeksSettings } from "./settings/WeeksSettings";
import { TipsSettings } from "./settings/TipsSettings";
import {
  Users,
  Shield,
  Calendar,
  Gamepad2,
  Lightbulb,
} from "lucide-react";

type SettingsSection =
  | "draftkings"
  | "players"
  | "teams"
  | "weeks"
  | "tips";

const settingsSections = [
  {
    id: "draftkings" as SettingsSection,
    label: "DraftKings",
    description: "Game styles and configurations",
    icon: Gamepad2,
  },
  {
    id: "players" as SettingsSection,
    label: "Players",
    description: "Manage player database",
    icon: Users,
  },
  {
    id: "teams" as SettingsSection,
    label: "Teams",
    description: "NFL teams and divisions",
    icon: Shield,
  },
  {
    id: "weeks" as SettingsSection,
    label: "Weeks",
    description: "Schedule and week data",
    icon: Calendar,
  },
  {
    id: "tips" as SettingsSection,
    label: "Player Pool Tips",
    description: "Customize strategy guidance",
    icon: Lightbulb,
  },
];

export function SettingsManager() {
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("draftkings");

  // Read section from URL parameters
  useEffect(() => {
    const section = searchParams?.get('section') as SettingsSection;
    if (section && settingsSections.some(s => s.id === section)) {
      setActiveSection(section);
    }
  }, [searchParams]);

  const renderContent = () => {
    switch (activeSection) {
      case "draftkings":
        return <DraftKingsSettings />;
      case "players":
        return <PlayersSettings />;
      case "teams":
        return <TeamsSettings />;
      case "weeks":
        return <WeeksSettings />;
      case "tips":
        return <TipsSettings />;
      default:
        return <DraftKingsSettings />;
    }
  };

  const currentSection = settingsSections.find(
    (section) => section.id === activeSection,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {currentSection && (
          <>
            <currentSection.icon className="w-6 h-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-semibold">
                {currentSection.label}
              </h1>
              <p className="text-muted-foreground">
                {currentSection.description}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
