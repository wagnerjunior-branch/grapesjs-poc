'use client';

interface TopNavProps {
  campaignName: string;
  onCampaignNameChange: (name: string) => void;
  onCancel: () => void;
  onDone: () => void;
  saving?: boolean;
}

export default function TopNav({
  campaignName,
  onCampaignNameChange,
  onCancel,
  onDone,
  saving,
}: TopNavProps) {
  return (
    <div
      className="flex items-center justify-between px-6 h-14 border-b"
      style={{
        backgroundColor: 'var(--editor-bg-topnav)',
        borderColor: 'var(--editor-border-color)',
      }}
    >
      {/* Left: Tabs */}
      <div className="flex gap-6">
        {['Compose', 'Settings', 'Preview'].map((tab, i) => (
          <button
            key={tab}
            className="pb-1 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: i === 0 ? 'var(--editor-tab-active-border)' : 'transparent',
              color: i === 0
                ? 'var(--editor-tab-active-text)'
                : 'var(--editor-tab-inactive-text)',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Center: Campaign name */}
      <input
        type="text"
        value={campaignName}
        onChange={(e) => onCampaignNameChange(e.target.value)}
        className="text-sm font-medium text-center bg-transparent border-none outline-none max-w-xs"
        style={{ color: 'var(--editor-text-primary)' }}
        placeholder="Campaign name"
      />

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-sm font-medium rounded-md border transition-colors hover:bg-gray-50"
          style={{
            borderColor: 'var(--editor-btn-secondary-border)',
            color: 'var(--editor-btn-secondary-text)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onDone}
          disabled={saving}
          className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          style={{
            backgroundColor: 'var(--editor-btn-primary-bg)',
            color: 'var(--editor-btn-primary-text)',
          }}
        >
          {saving ? 'Saving...' : 'Done'}
        </button>
      </div>
    </div>
  );
}
