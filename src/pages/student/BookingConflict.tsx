'use client'

import type { Navigate } from '../../types'
import { Card, Button, Badge, CalendarIcon, ClockIcon } from '../../components/ui'

interface BookingConflictProps { navigate: Navigate }

export default function BookingConflict({ navigate }: BookingConflictProps) {
  return (
    <div className="px-6 lg:px-8 py-16 max-w-lg mx-auto">
      {/* Conflict icon */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-warning-50 flex items-center justify-center mx-auto mb-5 border border-warning/20">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Time slot unavailable</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
          The time you selected (10:00 on Tuesday 15 Sep) has just been booked by another student.
        </p>
      </div>

      {/* Conflict details */}
      <Card className="p-5 mb-6 border-warning/30">
        <p className="text-sm font-semibold text-foreground mb-3">Requested slot</p>
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground mb-1">
          <CalendarIcon size={14} />
          Tuesday, 15 September 2026
        </div>
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <ClockIcon size={14} />
          10:00 · 60 minutes
        </div>
        <Badge variant="warning" className="mt-3">Unavailable</Badge>
      </Card>

      {/* Suggested alternatives */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-foreground mb-3">Available alternatives</p>
        <div className="flex flex-col gap-2">
          {[
            { date: 'Tuesday, 15 September 2026', time: '11:00', label: 'Same day, next slot' },
            { date: 'Tuesday, 15 September 2026', time: '15:00', label: 'Same day, afternoon' },
            { date: 'Wednesday, 16 September 2026', time: '10:00', label: 'Next day, same time' },
          ].map((alt) => (
            <button
              key={`${alt.date}-${alt.time}`}
              onClick={() => navigate('booking-confirmation')}
              className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary hover:bg-primary-50 transition-colors text-left group"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{alt.time}</p>
                <p className="text-xs text-muted-foreground">{alt.date}</p>
                <span className="text-[10px] text-primary font-medium">{alt.label}</span>
              </div>
              <Badge variant="success">Available</Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button
          fullWidth
          size="lg"
          onClick={() => navigate('booking')}
        >
          Choose a different time
        </Button>
        <Button
          fullWidth
          variant="outline"
          size="lg"
          onClick={() => navigate('find-sessions')}
        >
          Back to search
        </Button>
      </div>
    </div>
  )
}
