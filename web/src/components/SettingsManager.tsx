import { useState } from "react";
import { DraftKingsSettings } from "./settings/DraftKingsSettings";
import { PlayersSettings } from "./settings/PlayersSettings";
import { TeamsSettings } from "./settings/TeamsSettings";
import { WeeksSettings } from "./settings/WeeksSettings";
import { TipsSettings } from "./settings/TipsSettings";
import {
  Settings,
  Users,
  Shield,
  Calendar,
  ChevronRight,
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
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("draftkings");

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
    <div className="flex h-full">
      {/* Left Navigation */}
      <div className="w-64 border-r bg-card flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-medium">Settings</h2>
          </div>

          <nav className="space-y-1">
            {settingsSections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <section.icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {section.label}
                    </div>
                    <div className="text-xs opacity-75 truncate">
                      {section.description}
                    </div>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Content Header */}
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center gap-3">
            {currentSection && (
              <>
                <currentSection.icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h1 className="text-xl font-medium">
                    {currentSection.label}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {currentSection.description}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
