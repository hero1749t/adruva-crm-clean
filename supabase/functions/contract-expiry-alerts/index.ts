import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const alertDays = [30, 15, 7];
    let notificationsCreated = 0;

    for (const days of alertDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      // Find active clients whose contract ends on the target date
      const { data: clients, error } = await supabase
        .from("clients")
        .select("id, client_name, contract_end_date, assigned_manager")
        .eq("status", "active")
        .eq("contract_end_date", targetDateStr);

      if (error) {
        console.error(`Error fetching clients for ${days}-day alert:`, error);
        continue;
      }

      if (!clients || clients.length === 0) continue;

      for (const client of clients) {
        // Check if this alert was already sent today for this client
        const todayStr = now.toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("type", "contract_expiry")
          .eq("notification_date", todayStr)
          .ilike("message", `%${client.client_name}%${days} day%`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Get all owners and admins to notify
        const { data: managers } = await supabase
          .from("profiles")
          .select("id, role")
          .in("role", ["owner", "admin"])
          .eq("status", "active");

        const notifyUsers = new Set<string>();

        // Add owners and admins
        if (managers) {
          managers.forEach((m) => notifyUsers.add(m.id));
        }

        // Add assigned manager
        if (client.assigned_manager) {
          notifyUsers.add(client.assigned_manager);
        }

        // Create notifications for each user
        for (const userId of notifyUsers) {
          const { error: insertErr } = await supabase
            .from("notifications")
            .insert({
              user_id: userId,
              title: "Contract Expiring Soon",
              message: `${client.client_name}'s contract expires in ${days} day${days > 1 ? "s" : ""} (${targetDateStr}). Plan for renewal.`,
              type: "contract_expiry",
              notification_date: todayStr,
            });

          if (insertErr) {
            console.error(`Failed to notify ${userId} about ${client.client_name}:`, insertErr);
            continue;
          }
          notificationsCreated++;
        }
      }
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      entity: "client",
      entity_id: "00000000-0000-0000-0000-000000000000",
      action: "contract_expiry_check",
      metadata: {
        notifications_created: notificationsCreated,
        date: now.toISOString().split("T")[0],
        alert_windows: alertDays,
      },
    });

    console.log(`Contract expiry alerts: ${notificationsCreated} notifications created`);

    return new Response(
      JSON.stringify({
        message: `Created ${notificationsCreated} contract expiry notifications`,
        notifications: notificationsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("contract-expiry-alerts error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
