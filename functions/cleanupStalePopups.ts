import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const INACTIVITY_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profiles = await base44.asServiceRole.entities.UserProfile.filter({
      is_popped_up: true,
    });

    const now = Date.now();
    let poppedDownCount = 0;

    for (const profile of profiles) {
      const activitySource =
        profile.last_location_update || profile.updated_date || profile.created_date;
      const activityTs = new Date(activitySource || now).getTime();

      if (Number.isNaN(activityTs)) continue;

      if (now - activityTs >= INACTIVITY_MS) {
        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          is_popped_up: false,
          popup_message: '',
        });
        poppedDownCount += 1;
      }
    }

    return Response.json({
      success: true,
      poppedDownCount,
      scannedCount: profiles.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
