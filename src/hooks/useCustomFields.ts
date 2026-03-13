import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isMissingRelationError } from "@/lib/supabase-errors";

export interface CustomFieldDef {
  id: string;
  label: string;
  field_key: string;
  field_type: string;
  entity_type: string;
  options: any;
  is_visible: boolean;
  sort_order: number;
}

export function useCustomFieldDefs(entityType: "lead" | "client") {
  return useQuery({
    queryKey: ["custom-field-defs", entityType],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_field_definitions")
        .select("*")
        .eq("entity_type", entityType)
        .eq("is_visible", true)
        .order("sort_order");
      if (error) {
        if (isMissingRelationError(error, "custom_field_definitions")) {
          return [];
        }
        throw error;
      }
      return (data || []) as CustomFieldDef[];
    },
  });
}

export function useCustomFieldValues(entityType: "lead" | "client", entityIds: string[]) {
  return useQuery({
    queryKey: ["custom-field-values-bulk", entityType, entityIds],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (entityIds.length === 0) return {};
      const { data, error } = await supabase
        .from("custom_field_values")
        .select("entity_id, field_definition_id, value")
        .eq("entity_type", entityType)
        .in("entity_id", entityIds);
      if (error) {
        if (isMissingRelationError(error, "custom_field_values")) {
          return {};
        }
        throw error;
      }

      // Map: entityId -> { defId -> value }
      const map: Record<string, Record<string, string>> = {};
      for (const row of data || []) {
        if (!map[row.entity_id]) map[row.entity_id] = {};
        const raw = row.value;
        if (raw == null) {
          map[row.entity_id][row.field_definition_id] = "";
        } else if (typeof raw === "object" && !Array.isArray(raw)) {
          map[row.entity_id][row.field_definition_id] = (raw as any).value ?? (raw as any).label ?? JSON.stringify(raw);
        } else {
          map[row.entity_id][row.field_definition_id] = String(raw).replace(/^"|"$/g, "");
        }
      }
      return map;
    },
    enabled: entityIds.length > 0,
  });
}
