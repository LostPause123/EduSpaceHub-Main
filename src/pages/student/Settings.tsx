import type { Navigate } from '../../types'
import { Card, Button, Divider } from '../../components/ui'

interface SettingsProps { navigate: Navigate }

export default function Settings({ navigate }: SettingsProps) {
  return (
    <div className="px-6 lg:px-8 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Settings</h1>

      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Account settings</h3>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Update profile information', desc: 'Edit your name, email, and bio', action: () => navigate('profile') },
              { label: 'Change password', desc: 'Update your account password', action: () => navigate('profile') },
              { label: 'Notification preferences', desc: 'Manage email and push notifications', action: () => navigate('profile') },
            ].map(({ label, desc, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors text-left w-full"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Privacy & data</h3>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p className="leading-relaxed">
              EduSpace stores your booking history, profile information, and learning materials. Your data is encrypted and never shared with third parties.
            </p>
            <div className="flex gap-3">
              <button className="text-primary font-medium hover:underline">Download my data</button>
              <button className="text-primary font-medium hover:underline">Privacy policy</button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">App preferences</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Language</p>
                <p className="text-xs text-muted-foreground">Display language for the interface</p>
              </div>
              <select className="border border-border rounded-md bg-white text-sm px-3 py-1.5 text-foreground focus:outline-none">
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>French</option>
                <option>Spanish</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="pt-2">
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={() => navigate('login')}
          >
            Sign out of EduSpace
          </Button>
        </div>
      </div>
    </div>
  )
}
