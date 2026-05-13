/**
 * Genkit Tools — Google Calendar Integration
 *
 * These tools wrap the Google Calendar API functions so that the AI agent
 * can autonomously schedule, update, and delete farming events.
 */
import { z } from 'genkit';
import { ai } from './genkit.js';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// ── Tool: Create Calendar Event ──
export const createCalendarEventTool = ai.defineTool(
  {
    name: 'createCalendarEvent',
    description:
      'Creates a new all-day event on the user\'s Google Calendar for a farming quest. ' +
      'Use this when a user starts a new planting quest and wants to track milestones on their calendar.',
    inputSchema: z.object({
      accessToken: z.string().describe('OAuth2 access token for Google Calendar API'),
      plantName: z.string().describe('Name of the plant being grown'),
      description: z.string().describe('Description of the quest or milestone'),
      startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
      endDate: z.string().describe('End date in ISO format (YYYY-MM-DD)'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      eventId: z.string().nullable(),
    }),
  },
  async ({ accessToken, plantName, description, startDate, endDate }) => {
    try {
      const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: `🌱 FarmQuest: ${plantName} Quest`,
          description,
          start: { date: startDate },
          end: { date: endDate },
          colorId: '2',
          reminders: { useDefault: true },
        }),
      });

      if (!response.ok) {
        console.error('[CalendarTool] Create failed:', await response.text());
        return { success: false, eventId: null };
      }

      const data = await response.json();
      return { success: true, eventId: data.id };
    } catch (error) {
      console.error('[CalendarTool] Create error:', error);
      return { success: false, eventId: null };
    }
  }
);

// ── Tool: Delete Calendar Event ──
export const deleteCalendarEventTool = ai.defineTool(
  {
    name: 'deleteCalendarEvent',
    description:
      'Deletes an existing event from the user\'s Google Calendar. ' +
      'Use this when a user abandons or completes a quest and wants to clean up their calendar.',
    inputSchema: z.object({
      accessToken: z.string().describe('OAuth2 access token for Google Calendar API'),
      eventId: z.string().describe('The Google Calendar event ID to delete'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
    }),
  },
  async ({ accessToken, eventId }) => {
    try {
      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok && response.status !== 404) {
        console.error('[CalendarTool] Delete failed:', await response.text());
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      console.error('[CalendarTool] Delete error:', error);
      return { success: false };
    }
  }
);

// ── Tool: Sync Daily Tasks to Calendar ──
export const syncDailyTasksTool = ai.defineTool(
  {
    name: 'syncDailyTasksToCalendar',
    description:
      'Syncs the user\'s daily plant care tasks to Google Calendar as an all-day event. ' +
      'Creates or updates an event summarizing pending and completed tasks for the day.',
    inputSchema: z.object({
      accessToken: z.string().describe('OAuth2 access token for Google Calendar API'),
      dateStr: z.string().describe('Date string in YYYY-MM-DD format'),
      tasks: z.array(
        z.object({
          label: z.string(),
          plant_name: z.string().optional(),
          completed: z.boolean(),
        })
      ).describe('Array of daily tasks to sync'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
    }),
  },
  async ({ accessToken, dateStr, tasks }) => {
    try {
      const summary = '🌱 FarmQuest Daily Tasks';
      const pending = tasks.filter(t => !t.completed);
      const completed = tasks.filter(t => t.completed);

      let description = 'Here is your daily plant care schedule:\n\n';
      if (pending.length > 0) {
        description += '⏳ Pending Tasks:\n';
        pending.forEach(t => (description += `- [ ] ${t.label} (${t.plant_name || 'General'})\n`));
        description += '\n';
      }
      if (completed.length > 0) {
        description += '✅ Completed Tasks:\n';
        completed.forEach(t => (description += `- [x] ${t.label} (${t.plant_name || 'General'})\n`));
      }
      if (tasks.length === 0) {
        description += 'No tasks scheduled for today. Relax and enjoy your plants!';
      }

      const startDate = new Date(dateStr);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Check for existing event
      const timeMin = new Date(dateStr).toISOString();
      const timeMax = new Date(dateStr + 'T23:59:59Z').toISOString();

      const listResponse = await fetch(
        `${CALENDAR_API_BASE}/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      let existingEventId: string | null = null;
      if (listResponse.ok) {
        const listData = await listResponse.json();
        const existing = (listData.items || []).find(
          (e: any) => e.summary === summary && e.start?.date === startStr
        );
        if (existing) existingEventId = existing.id;
      }

      // If no tasks and existing event, delete it
      if (tasks.length === 0 && existingEventId) {
        await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${existingEventId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        return { success: true };
      }

      const eventBody = {
        summary,
        description,
        start: { date: startStr },
        end: { date: endStr },
        colorId: '10',
      };

      let url = `${CALENDAR_API_BASE}/calendars/primary/events`;
      let method = 'POST';
      if (existingEventId) {
        url = `${url}/${existingEventId}`;
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
        console.error('[CalendarTool] Sync failed:', await response.text());
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      console.error('[CalendarTool] Sync error:', error);
      return { success: false };
    }
  }
);

console.log('[Genkit] Calendar tools registered: createCalendarEvent, deleteCalendarEvent, syncDailyTasksToCalendar');
