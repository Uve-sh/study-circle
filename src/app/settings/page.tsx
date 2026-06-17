'use client';

import { Bell, Clock, Database, Moon, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const settingsOptions = [
    { icon: Bell, label: 'Notifications', description: 'Reminders and alerts' },
    { icon: Clock, label: 'Session Configuration', description: 'Times and durations' },
    { icon: Moon, label: 'Theme Preferences', description: 'Dark mode settings' },
    { icon: Database, label: 'Data Export', description: 'Download your data' },
  ];

  return (
    <div className="p-4 pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Settings</h1>
        <p className="text-muted text-sm">Manage your preferences</p>
      </div>

      <div className="flex flex-col gap-3">
        {settingsOptions.map((option, idx) => {
          const Icon = option.icon;
          return (
            <button key={idx} className="flex items-center gap-4 p-5 rounded-lg border border-border bg-card transition-colors hover:bg-border/50 text-left">
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0 text-muted">
                <Icon size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold">{option.label}</span>
                <span className="text-muted text-sm">{option.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
