import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { clientId } = await req.json();
    if (!clientId) throw new Error("clientId is required");

    // Fetch client data
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();
    if (clientErr) throw clientErr;

    // Fetch tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("task_title, status, priority, deadline, completed_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch recent invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("invoice_number, status, total_amount, due_date, paid_date")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch recent communication logs
    const { data: commsLogs } = await supabase
      .from("communication_logs")
      .select("type, direction, subject, created_at")
      .eq("entity_id", clientId)
      .eq("entity_type", "client")
      .order("created_at", { ascending: false })
      .limit(15);

    // Fetch onboarding progress
    const { data: onboarding } = await supabase
      .from("onboarding_checklist_items")
      .select("title, is_completed")
      .eq("client_id", clientId);

    // Generate basic insights without external AI
    const completedTasks = tasks?.filter(t => t.status === "completed").length || 0;
    const pendingTasks = tasks?.filter(t => t.status !== "completed").length || 0;
    const completedOnboarding = onboarding?.filter(o => o.is_completed).length || 0;
    const totalOnboarding = onboarding?.length || 0;

    const insights = {
      health_prediction: {
        score: Math.min(100, Math.max(0, 
          (completedOnboarding / Math.max(1, totalOnboarding)) * 40 +
          (completedTasks / Math.max(1, completedTasks + pendingTasks)) * 30 +
          (client.status === "active" ? 30 : 10)
        )),
        trend: pendingTasks > 3 ? "declining" : completedOnboarding > 0 ? "improving" : "stable",
        summary: client.status === "active" ? "Client is active and engaged" : "Client status needs attention"
      },
      activity_summary: `Client ${client.client_name} has ${completedTasks} completed tasks and ${pendingTasks} pending tasks. Onboarding progress: ${completedOnboarding}/${totalOnboarding} items completed. Recent communications: ${commsLogs?.length || 0} logs.`,
      recommended_actions: [
        {
          action: "Review pending tasks",
          priority: pendingTasks > 0 ? "high" : "low",
          reason: `${pendingTasks} tasks still pending that may need attention`
        },
        {
          action: "Complete onboarding",
          priority: completedOnboarding < totalOnboarding ? "high" : "low",
          reason: `${totalOnboarding - completedOnboarding} onboarding items remaining`
        },
        {
          action: "Send status update",
          priority: "medium",
          reason: "Regular communication keeps clients engaged"
        }
      ],
      risk_flags: [
        ...(pendingTasks > 5 ? ["High number of pending tasks"] : []),
        ...(client.billing_status !== "paid" ? ["Payment pending"] : []),
        ...(completedOnboarding < totalOnboarding / 2 ? ["Low onboarding progress"] : [])
      ]
    };

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("client-ai-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
