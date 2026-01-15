import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
      user_email: user.email 
    });
    
    if (profiles.length > 0 && profiles[0].is_popped_up) {
      await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, { 
        is_popped_up: false,
        popup_message: ''
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});