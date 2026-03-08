import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navigate } from "react-router-dom";

const roleBadge: Record<string, string> = {
  owner: "bg-destructive/20 text-destructive",
  admin: "bg-primary/20 text-primary",
  team: "bg-success/20 text-success",
};

const statusBadge: Record<string, string> = {
  active: "bg-success/20 text-success",
  inactive: "bg-muted text-muted-foreground",
};

const TeamPage = () => {
  const { profile } = useAuth();

  if (profile && profile.role !== "owner") {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: team = [], isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">{team.length} members</p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Create User
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-primary">Name</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-primary">Role</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-primary">Status</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-primary">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                  ))}
                </tr>
              ))
            ) : (
              team.map((member) => (
                <tr key={member.id} className="border-b border-border/50 transition-colors hover:bg-primary/[0.03]">
                  <td className="px-4 py-3 font-medium text-foreground">{member.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider ${roleBadge[member.role] || ""}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider ${statusBadge[member.status] || ""}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{member.created_at ? new Date(member.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamPage;
