'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from './ui/switch';

interface EditorSettings {
  id: string;
  showTypographySection: boolean;
  showLayoutSection: boolean;
  showSizeSection: boolean;
  showSpaceSection: boolean;
  showPositionSection: boolean;
  showEffectsSection: boolean;
  showBackgroundSection: boolean;
  showBordersSection: boolean;
}

interface EditorSettingsProps {
  initialSettings?: EditorSettings;
  onSave?: (settings: EditorSettings) => void;
}

export default function EditorSettings({ initialSettings, onSave }: EditorSettingsProps) {
  const [settings, setSettings] = useState<EditorSettings | null>(initialSettings || null);
  const [loading, setLoading] = useState(!initialSettings);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      setLoading(false);
      setHasChanges(false);
    } else {
      loadSettings();
    }
  }, [initialSettings]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/editor-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof EditorSettings, value: boolean) => {
    if (!settings) return;

    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    setHasChanges(true);
  };

  const saveSettings = async () => {
    if (!settings || !hasChanges) return;

    try {
      setSaving(true);
      const response = await fetch('/api/editor-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const savedSettings = await response.json();
      setSettings(savedSettings);
      setHasChanges(false);

      if (onSave) {
        onSave(savedSettings);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => {
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-200">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Editor Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure which options to show or hide in the GrapesJS editor
        </p>
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Style Manager Sections</h3>
        <div className="space-y-1">
          <ToggleSwitch
            label="Typography Section"
            checked={settings.showTypographySection}
            onChange={(checked) => updateSetting('showTypographySection', checked)}
          />
          <ToggleSwitch
            label="Layout Section"
            checked={settings.showLayoutSection}
            onChange={(checked) => updateSetting('showLayoutSection', checked)}
          />
          <ToggleSwitch
            label="Size Section"
            checked={settings.showSizeSection}
            onChange={(checked) => updateSetting('showSizeSection', checked)}
          />
          <ToggleSwitch
            label="Space Section"
            checked={settings.showSpaceSection}
            onChange={(checked) => updateSetting('showSpaceSection', checked)}
          />
          <ToggleSwitch
            label="Position Section"
            checked={settings.showPositionSection}
            onChange={(checked) => updateSetting('showPositionSection', checked)}
          />
          <ToggleSwitch
            label="Effects Section"
            checked={settings.showEffectsSection}
            onChange={(checked) => updateSetting('showEffectsSection', checked)}
          />
          <ToggleSwitch
            label="Background Section"
            checked={settings.showBackgroundSection}
            onChange={(checked) => updateSetting('showBackgroundSection', checked)}
          />
          <ToggleSwitch
            label="Borders Section"
            checked={settings.showBordersSection}
            onChange={(checked) => updateSetting('showBordersSection', checked)}
          />
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-300 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            if (initialSettings) {
              setSettings(initialSettings);
              setHasChanges(false);
            }
          }}
          disabled={!hasChanges || saving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={saveSettings}
          disabled={!hasChanges || saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
