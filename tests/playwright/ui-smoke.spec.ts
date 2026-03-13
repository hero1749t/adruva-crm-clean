import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment for UI cleanup");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ownerEmail = "owner@adruva.com";
const ownerPassword = "Adruva@2026#Owner";

test.beforeAll(async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  });
  if (error) {
    throw error;
  }
});

test.describe("UI smoke coverage", () => {
  test("navigates through protected owner pages", async ({ page }) => {
    const pages = [
      { link: "Dashboard", heading: /dashboard/i, url: "/dashboard" },
      { link: "Leads", heading: /leads/i, url: "/leads" },
      { link: "Clients", heading: /clients|my clients/i, url: "/clients" },
      { link: "Tasks", heading: /tasks/i, url: "/tasks" },
      { link: "Calendar", heading: /calendar/i, url: "/calendar" },
      { link: "Payments", heading: /payments/i, url: "/payments" },
      { link: "Reports", heading: /reports/i, url: "/reports" },
      { link: "Team", heading: /team/i, url: "/team" },
      { link: "Custom Fields", heading: /custom fields/i, url: "/custom-fields" },
      { link: "Integrations", heading: /integrations/i, url: "/integrations" },
      { link: "Settings", heading: /settings/i, url: "/settings" },
      { link: "Logs", heading: /activity logs/i, url: "/logs" },
      { link: "My Profile", heading: /profile/i, url: "/profile" },
    ];

    await page.goto("/dashboard");

    for (const item of pages) {
      await page.getByRole("link", { name: item.link }).click();
      await page.waitForURL(`**${item.url}`);
      await expect(page.locator("h1").filter({ hasText: item.heading })).toBeVisible();
    }
  });

  test("creates core records and opens key dialogs", async ({ page }) => {
    const stamp = Date.now();
    const leadName = `UI Smoke Lead ${stamp}`;
    const leadEmail = `ui-smoke-lead-${stamp}@example.com`;
    const clientName = `UI Smoke Client ${stamp}`;
    const clientEmail = `ui-smoke-client-${stamp}@example.com`;
    const fieldName = `UI Smoke Field ${stamp}`;

    try {
      await page.goto("/leads");
      await page.getByRole("button", { name: /new lead/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByPlaceholder("Full name").fill(leadName);
      await page.getByPlaceholder("lead@company.com").fill(leadEmail);
      await page.getByPlaceholder("+91 98765 43210").fill("9876543210");
      await page.getByPlaceholder("Company name").fill("UI Smoke Co");
      await page.getByRole("button", { name: /create lead/i }).click();
      await expect(page.getByText(/lead created successfully/i).first()).toBeVisible();
      await page.getByRole("textbox", { name: /search name, email, phone/i }).fill(leadName);
      await expect(page.getByText(leadName, { exact: true })).toBeVisible();

      await page.goto("/clients");
      await page.getByRole("button", { name: /new client/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.locator("#client_name").fill(clientName);
      await page.locator("#email").fill(clientEmail);
      await page.locator("#phone").fill("9988776655");
      await page.locator("#company_name").fill("UI Client Co");
      await page.locator("#plan").fill("Pro");
      await page.locator("#monthly_payment").fill("12000");
      await page.getByRole("button", { name: /^add client$/i }).click();
      await expect(page.getByText(new RegExp(`Client \"${clientName}\" added successfully`, "i")).first()).toBeVisible();
      await page.getByPlaceholder(/search clients/i).fill(clientName);
      await expect(page.getByText(clientName, { exact: true })).toBeVisible();

      await page.goto("/custom-fields");
      await page.getByRole("button", { name: /add field/i }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByPlaceholder(/project budget|property type/i).fill(fieldName);
      await page.getByRole("button", { name: /^add field$/i }).click();
      await expect(page.getByText(/field added/i).first()).toBeVisible();

      await page.goto("/settings");
      await expect(page.getByRole("heading", { name: /notification preferences/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /task templates/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /automation engine/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /service templates/i })).toBeVisible();
      await page.getByRole("button", { name: /add template/i }).first().click();
      await expect(page.getByPlaceholder("Task title")).toBeVisible();

      await page.goto("/integrations");
      await expect(page.getByText(/connect external apis/i)).toBeVisible();
      await page.getByRole("button", { name: /add integration/i }).click();
      await expect(page.getByPlaceholder(/my whatsapp business/i)).toBeVisible();
      await page.getByRole("button", { name: /cancel/i }).click();
    } finally {
      await cleanupSmokeData({ leadEmail, clientEmail, fieldName });
    }
  });

  test("shows seeded custom fields on lead and client detail pages", async ({ page }) => {
    const stamp = Date.now();
    const seeded = await seedCustomFieldDetailData(stamp);

    try {
      await page.goto(`/leads/${seeded.lead.id}`);
      await expect(page.getByText(/custom fields/i).first()).toBeVisible();
      await expect(page.getByText(seeded.lead.fieldLabel, { exact: true })).toBeVisible();
      await expect(page.getByText(seeded.lead.fieldValue, { exact: true })).toBeVisible();

      await page.goto(`/clients/${seeded.client.id}`);
      await expect(page.getByText(/custom fields/i).first()).toBeVisible();
      await expect(page.getByText(seeded.client.fieldLabel, { exact: true })).toBeVisible();
      await expect(page.getByText(seeded.client.fieldValue, { exact: true })).toBeVisible();
    } finally {
      await cleanupSeededCustomFieldDetailData(seeded);
    }
  });
});

async function cleanupSmokeData({
  leadEmail,
  clientEmail,
  fieldName,
}: {
  leadEmail: string;
  clientEmail: string;
  fieldName: string;
}) {
  const leadLookup = await supabase.from("leads").select("id").eq("email", leadEmail);
  const leadIds = (leadLookup.data || []).map((item) => item.id);
  if (leadIds.length > 0) {
    await supabase.from("leads").update({ is_deleted: true }).in("id", leadIds);
  }

  const clientLookup = await supabase.from("clients").select("id").eq("email", clientEmail);
  const clientIds = (clientLookup.data || []).map((item) => item.id);
  if (clientIds.length > 0) {
    await supabase.from("clients").delete().in("id", clientIds);
  }

  const fieldLookup = await supabase
    .from("custom_field_definitions")
    .select("id")
    .eq("label", fieldName);
  const fieldIds = (fieldLookup.data || []).map((item) => item.id);
  if (fieldIds.length > 0) {
    await supabase.from("custom_field_definitions").delete().in("id", fieldIds);
  }
}

async function seedCustomFieldDetailData(stamp: number) {
  const lead = await supabase
    .from("leads")
    .select("id")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (lead.error) {
    throw lead.error;
  }

  const client = await supabase
    .from("clients")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (client.error) {
    throw client.error;
  }

  const leadFieldLabel = `PW Lead CF ${stamp}`;
  const clientFieldLabel = `PW Client CF ${stamp}`;
  const leadFieldValue = `Lead CF value ${stamp}`;
  const clientFieldValue = `Client CF value ${stamp}`;

  const leadDef = await supabase
    .from("custom_field_definitions")
    .insert({
      entity_type: "lead",
      field_key: `pw_lead_cf_${stamp}`,
      label: leadFieldLabel,
      field_type: "text",
      options: [],
      is_required: false,
      is_visible: true,
      sort_order: 1,
    })
    .select("id")
    .single();
  if (leadDef.error) {
    throw leadDef.error;
  }

  const clientDef = await supabase
    .from("custom_field_definitions")
    .insert({
      entity_type: "client",
      field_key: `pw_client_cf_${stamp}`,
      label: clientFieldLabel,
      field_type: "text",
      options: [],
      is_required: false,
      is_visible: true,
      sort_order: 1,
    })
    .select("id")
    .single();
  if (clientDef.error) {
    throw clientDef.error;
  }

  const leadVal = await supabase.from("custom_field_values").insert({
    entity_type: "lead",
    entity_id: lead.data.id,
    field_definition_id: leadDef.data.id,
    value: leadFieldValue,
  });
  if (leadVal.error) {
    throw leadVal.error;
  }

  const clientVal = await supabase.from("custom_field_values").insert({
    entity_type: "client",
    entity_id: client.data.id,
    field_definition_id: clientDef.data.id,
    value: clientFieldValue,
  });
  if (clientVal.error) {
    throw clientVal.error;
  }

  return {
    lead: {
      id: lead.data.id,
      definitionId: leadDef.data.id,
      fieldLabel: leadFieldLabel,
      fieldValue: leadFieldValue,
    },
    client: {
      id: client.data.id,
      definitionId: clientDef.data.id,
      fieldLabel: clientFieldLabel,
      fieldValue: clientFieldValue,
    },
  };
}

async function cleanupSeededCustomFieldDetailData(seeded: Awaited<ReturnType<typeof seedCustomFieldDetailData>>) {
  await supabase.from("custom_field_values").delete().in("field_definition_id", [
    seeded.lead.definitionId,
    seeded.client.definitionId,
  ]);
  await supabase.from("custom_field_definitions").delete().in("id", [
    seeded.lead.definitionId,
    seeded.client.definitionId,
  ]);
}
