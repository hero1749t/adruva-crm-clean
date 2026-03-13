import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or publishable key");
}

const ownerEmail = "owner@adruva.com";
const ownerPassword = "Adruva@2026#Owner";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const stamp = Date.now();
const summary = [];
const cleanup = [];

function pushResult(name, ok, details = "") {
  summary.push({ name, ok, details });
}

function must(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runStep(name, fn) {
  try {
    const details = await fn();
    pushResult(name, true, details || "");
  } catch (error) {
    pushResult(name, false, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  const signIn = await supabase.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  });
  if (signIn.error) {
    throw signIn.error;
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  must(userId, "No authenticated user");

  await runStep("dashboard counts", async () => {
    const [leads, clients, tasks] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("is_deleted", false),
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("tasks").select("id", { count: "exact", head: true }),
    ]);
    if (leads.error) throw leads.error;
    if (clients.error) throw clients.error;
    if (tasks.error) throw tasks.error;
    return `leads=${leads.count || 0}, clients=${clients.count || 0}, tasks=${tasks.count || 0}`;
  });

  await runStep("notifications read", async () => {
    const { error } = await supabase.from("notifications").select("id").limit(5);
    if (error) throw error;
    return "notifications query ok";
  });

  await runStep("notification preferences upsert", async () => {
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: userId,
        due_tomorrow: true,
        due_today: true,
        overdue: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;
    return "preferences upsert ok";
  });

  await runStep("integrations crud", async () => {
    const payload = {
      name: `Smoke Integration ${stamp}`,
      provider: "custom",
      api_key_encrypted: `key-${stamp}`,
      is_active: true,
      config: {},
    };
    const created = await supabase.from("integrations").insert(payload).select("id").single();
    if (created.error) throw created.error;
    const integrationId = created.data.id;
    cleanup.push(() => supabase.from("integrations").delete().eq("id", integrationId));

    const toggled = await supabase.from("integrations").update({ is_active: false }).eq("id", integrationId);
    if (toggled.error) throw toggled.error;
    return `integration=${integrationId}`;
  });

  await runStep("service templates crud", async () => {
    const template = await supabase
      .from("service_templates")
      .insert({
        name: `Smoke Service ${stamp}`,
        description: "Smoke test template",
        category: "general",
        is_active: true,
      })
      .select("id")
      .single();
    if (template.error) throw template.error;
    const templateId = template.data.id;
    cleanup.push(() => supabase.from("service_templates").delete().eq("id", templateId));

    const step = await supabase
      .from("service_template_steps")
      .insert({
        template_id: templateId,
        title: "Smoke Step",
        sort_order: 1,
        deadline_offset_days: 3,
        priority: "medium",
      })
      .select("id")
      .single();
    if (step.error) throw step.error;
    return `template=${templateId}, step=${step.data.id}`;
  });

  await runStep("automation rules crud", async () => {
    const created = await supabase
      .from("automation_rules")
      .insert({
        name: `Smoke Automation ${stamp}`,
        description: "Smoke test automation",
        trigger_event: "lead_status_changed",
        trigger_conditions: { status: "lead_won" },
        actions: [{ type: "create_activity_log", config: { content: "Smoke test" } }],
        created_by: userId,
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    const ruleId = created.data.id;
    cleanup.push(() => supabase.from("automation_rules").delete().eq("id", ruleId));

    const disabled = await supabase.from("automation_rules").update({ is_active: false }).eq("id", ruleId);
    if (disabled.error) throw disabled.error;
    return `rule=${ruleId}`;
  });

  await runStep("custom roles crud", async () => {
    const permissions = {
      leads: { access: "view", create: false, read: true, update: false, delete: false },
      clients: { access: "none", create: false, read: false, update: false, delete: false },
      tasks: { access: "none", create: false, read: false, update: false, delete: false },
      invoices: { access: "none", create: false, read: false, update: false, delete: false },
      payments: { access: "none", create: false, read: false, update: false, delete: false },
      properties: { access: "none", create: false, read: false, update: false, delete: false },
      campaigns: { access: "none", create: false, read: false, update: false, delete: false },
      communications: { access: "none", create: false, read: false, update: false, delete: false },
      reports: { access: "none", create: false, read: false, update: false, delete: false },
      team: { access: "none", create: false, read: false, update: false, delete: false },
      settings: { access: "none", create: false, read: false, update: false, delete: false },
      roles: { access: "none", create: false, read: false, update: false, delete: false },
      integrations: { access: "none", create: false, read: false, update: false, delete: false },
      customFields: { access: "none", create: false, read: false, update: false, delete: false },
      automations: { access: "none", create: false, read: false, update: false, delete: false },
    };

    const created = await supabase
      .from("custom_roles")
      .insert({
        name: `Smoke Role ${stamp}`,
        description: "Smoke test role",
        permissions,
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    const roleId = created.data.id;
    cleanup.push(() => supabase.from("custom_roles").delete().eq("id", roleId));

    const updated = await supabase.from("custom_roles").update({ description: "Updated smoke role" }).eq("id", roleId);
    if (updated.error) throw updated.error;
    return `role=${roleId}`;
  });

  await runStep("lead detail activities", async () => {
    const created = await supabase
      .from("leads")
      .insert({
        name: `Smoke Lead ${stamp}`,
        company_name: "Smoke Co",
        email: `smoke-lead-${stamp}@example.com`,
        phone: "9999999999",
        source: "website",
        status: "new_lead",
        assigned_to: userId,
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    const leadId = created.data.id;
    cleanup.push(() => supabase.from("leads").update({ is_deleted: true }).eq("id", leadId));

    const activity = await supabase
      .from("lead_activities")
      .insert({
        lead_id: leadId,
        type: "note",
        content: "Smoke activity",
        created_by: userId,
      })
      .select("id")
      .single();
    if (activity.error) throw activity.error;

    const status = await supabase.from("leads").update({ status: "in_progress" }).eq("id", leadId);
    if (status.error) throw status.error;
    return `lead=${leadId}, activity=${activity.data.id}`;
  });

  await runStep("activity logs write/read", async () => {
    const created = await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        entity: "security",
        entity_id: "00000000-0000-0000-0000-000000000000",
        action: "updated",
        metadata: { source: "smoke-test" },
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    return `log=${created.data.id}`;
  });

  await runStep("recurring task templates crud", async () => {
    const created = await supabase
      .from("recurring_task_templates")
      .insert({
        title: `Smoke Recurring ${stamp}`,
        priority: "medium",
        schedule_type: "weekly",
        schedule_day: 1,
        deadline_offset_days: 3,
        assigned_to: userId,
        is_active: true,
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    const templateId = created.data.id;
    cleanup.push(() => supabase.from("recurring_task_templates").delete().eq("id", templateId));
    return `recurring=${templateId}`;
  });

  await runStep("onboarding templates crud", async () => {
    const created = await supabase
      .from("onboarding_templates")
      .insert({
        title: `Smoke Onboarding ${stamp}`,
        description: "Smoke step",
        sort_order: 999,
        is_active: true,
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    const templateId = created.data.id;
    cleanup.push(() => supabase.from("onboarding_templates").delete().eq("id", templateId));
    return `onboarding=${templateId}`;
  });

  await runStep("client onboarding checklist", async () => {
    const lead = await supabase
      .from("leads")
      .insert({
        name: `Smoke Won ${stamp}`,
        company_name: "Smoke Won Co",
        email: `smoke-won-${stamp}@example.com`,
        phone: "8888888888",
        source: "website",
        status: "new_lead",
        assigned_to: userId,
      })
      .select("id")
      .single();
    if (lead.error) throw lead.error;
    const leadId = lead.data.id;
    cleanup.push(() => supabase.from("leads").update({ is_deleted: true }).eq("id", leadId));

    const won = await supabase.from("leads").update({ status: "lead_won" }).eq("id", leadId);
    if (won.error) throw won.error;

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("lead_id", leadId)
      .maybeSingle();
    if (clientError) throw clientError;
    must(client?.id, "Client not created from lead_won");

    const { data: items, error: itemsError } = await supabase
      .from("onboarding_checklist_items")
      .select("id")
      .eq("client_id", client.id);
    if (itemsError) throw itemsError;
    return `client=${client.id}, checklist=${items?.length || 0}`;
  });

  for (const fn of cleanup.reverse()) {
    try {
      await fn();
    } catch {
      // Best-effort cleanup only.
    }
  }

  console.log(JSON.stringify(summary, null, 2));

  const failures = summary.filter((item) => !item.ok);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
