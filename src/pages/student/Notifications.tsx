import { useState } from 'react'
import type { Navigate } from '../../types'
import { Card, Button, Tabs, Badge } from '../../components/ui'
import { notifications as allNotifications } from '../../data/mockData'
import type { Notification } from '../../types'

interface NotificationsProps { navigate: Navigate }

export default function Notifications({ navigate }: NotificationsProps) {
  const [activeTab, setActiveTab] = useState('all')
  const [localNotifs, setLocalNotifs] = useState(allNotifications)

  const unread = localNotifs.filter((n) => !n.read)
  const displayed = activeTab === 'unread' ? unread : localNotifs

  function markAllRead() {
    setLocalNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function markRead(id: string) {
    setLocalNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="px-6 lg:px-8 py-8 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          {unread.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unread.length} unread
            </p>
          )}
        </div>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs
        tabs={[
          { id: 'all', label: 'All', count: localNotifs.length },
          { id: 'unread', label: 'Unread', count: unread.length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {displayed.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">
            {activeTab === 'unread' ? "You're all caught up! No unread notifications." : 'No notifications yet.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayed.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onRead={() => markRead(notif.id)}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationItem({
  notification: n,
  onRead,
  navigate,
}: {
  notification: Notification
  onRead: () => void
  navigate: Navigate
}) {
  const icons: Record<Notification['type'], React.ReactNode> = {
    booking: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    reminder: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    material: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    system: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    cancellation: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  }

  const bgByType: Record<Notification['type'], string> = {
    booking: 'bg-primary-50 text-primary',
    reminder: 'bg-warning-50 text-warning',
    material: 'bg-secondary text-muted-foreground',
    system: 'bg-secondary text-muted-foreground',
    cancellation: 'bg-destructive/10 text-destructive',
  }

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/40 ${
        n.read ? 'bg-card border-border' : 'bg-card border-border border-l-2 border-l-primary'
      }`}
      onClick={onRead}
    >
      <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${bgByType[n.type]}`}>
        {icons[n.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium ${n.read ? 'text-foreground' : 'text-foreground'}`}>
            {n.title}
          </p>
          {!n.read && (
            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.description}</p>
        <p className="text-xs text-muted-foreground mt-1.5">{n.timestamp}</p>
      </div>
    </div>
  )
}
