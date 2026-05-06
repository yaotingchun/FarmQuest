/**
 * Service to interact with the Google Calendar API
 */

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface CalendarEventParams {
  accessToken: string;
  plantName: string;
  description: string;
  startDate: Date;
  endDate: Date;
}

export async function createCalendarEvent({
  accessToken,
  plantName,
  description,
  startDate,
  endDate,
}: CalendarEventParams): Promise<string | null> {
  try {
    const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `🌱 FarmQuest: ${plantName} Quest`,
        description: description,
        start: {
          date: startDate.toISOString().split('T')[0], // All-day event
        },
        end: {
          date: endDate.toISOString().split('T')[0],
        },
        colorId: '2', // Green
        reminders: {
          useDefault: true,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error creating calendar event:', errorData);
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return null;
  }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<boolean> {
  try {
    const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json();
      console.error('Error deleting calendar event:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    return false;
  }
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  updates: Partial<{ summary: string; description: string; colorId: string }>
): Promise<boolean> {
  try {
    const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error updating calendar event:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    return false;
  }
}
export async function listCalendarEvents(accessToken: string, timeMin: string, timeMax: string): Promise<any[]> {
  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error listing calendar events:', errorData);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to list calendar events:', error);
    return [];
  }
}

export async function syncDailyTasksToGoogle(accessToken: string, dateStr: string, tasks: any[]): Promise<boolean> {
  try {
    const summary = '🌱 FarmQuest Daily Tasks';
    
    // Format description
    const pending = tasks.filter(t => !t.completed);
    const completed = tasks.filter(t => t.completed);
    
    let description = 'Here is your daily plant care schedule:\\n\\n';
    
    if (pending.length > 0) {
      description += '⏳ **Pending Tasks:**\\n';
      pending.forEach(t => description += `- [ ] ${t.label} (${t.plant_name || 'General'})\\n`);
      description += '\\n';
    }
    
    if (completed.length > 0) {
      description += '✅ **Completed Tasks:**\\n';
      completed.forEach(t => description += `- [x] ${t.label} (${t.plant_name || 'General'})\\n`);
    }

    if (tasks.length === 0) {
      description += 'No tasks scheduled for today. Relax and enjoy your plants!';
    }

    // Prepare event dates (all-day event)
    const startDate = new Date(dateStr);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // Exclusive end date

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Find existing event
    const timeMin = new Date(dateStr).toISOString();
    const timeMax = new Date(dateStr + 'T23:59:59Z').toISOString(); // Use UTC for bounding
    
    const events = await listCalendarEvents(accessToken, timeMin, timeMax);
    const existingEvent = events.find(e => e.summary === summary && e.start?.date === startStr);

    if (tasks.length === 0) {
      if (existingEvent) {
        return await deleteCalendarEvent(accessToken, existingEvent.id);
      }
      return true;
    }

    const eventBody = {
      summary,
      description,
      start: { date: startStr },
      end: { date: endStr },
      colorId: '10', // Basil green
    };

    let url = `${CALENDAR_API_BASE}/calendars/primary/events`;
    let method = 'POST';

    if (existingEvent) {
      url = `${url}/${existingEvent.id}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error ${method === 'POST' ? 'creating' : 'updating'} daily tasks event:`, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to sync daily tasks to Google Calendar:', error);
    return false;
  }
}
