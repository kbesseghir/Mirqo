import { NextRequest } from "next/server";
import {
  calendarAccessToken,
  createEvent,
  ownedSubscription,
  updateEvent,
} from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
  let body: { subscriptionId?: string };
  try {
    body = (await request.json()) as { subscriptionId?: string };
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.subscriptionId) {
    return Response.json({ error: "Missing subscription." }, { status: 400 });
  }

  const owned = await ownedSubscription(body.subscriptionId);
  if (!owned) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const accessToken = await calendarAccessToken(owned.user.id);
  if (!accessToken) {
    return Response.json(
      { connectUrl: `/api/calendar/connect?subscriptionId=${owned.subscription.id}` },
      { status: 409 },
    );
  }

  try {
    if (owned.subscription.calendar_event_id) {
      await updateEvent(
        accessToken,
        owned.subscription.calendar_event_id,
        owned.subscription,
      );
    } else {
      const event = await createEvent(accessToken, owned.subscription);
      const { error } = await owned.supabase
        .from("subscriptions")
        .update({ calendar_event_id: event.id })
        .eq("id", owned.subscription.id)
        .eq("user_id", owned.user.id);
      if (error) throw error;
    }
    return Response.json({ success: true });
  } catch {
    return Response.json(
      { error: "Google Calendar could not be synchronized." },
      { status: 502 },
    );
  }
}
