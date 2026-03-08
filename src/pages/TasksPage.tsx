import { useState } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const taskPriorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "bg-destructive/20 text-destructive" },
  high: { label: "High", color: "bg-orange-500/20 text-orange-400" },
  medium: { label: "Medium", color: "bg-warning/20 text-warning" },
  low: { label: "Low", color: "bg-success/20 text-success" },
};

const taskStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", color: "bg-primary/20 text-primary" },
  completed: { label: "Completed", color: "bg-success/20 text-success" },
  overdue: { label: "Overdue", color: "bg-destructive/20 text-destructive" },
};

const TasksPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const { profile } = useAuth();
  const isOwnerOrAdmin = profile?.role === "owner" || profile?.role === "admin";

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", statusFilter, priorityFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*, clients!tasks_client_id_fkey(client_name), profiles!tasks_assigned_to_fkey(name)")
        .order("deadline", { ascending: true });

      if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
      if (priorityFilter !== "all") query = query.eq("priority", priorityFilter as any);
      if (search) query = query.ilike("task_title", `%${search}%`);

      const { data } = await query;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tasks.length} tasks</p>
        </div>
        {isOwnerOrAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-border bg-muted/30 pl-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36 border-border bg-muted/30 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(taskStatusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 w-36 border-border bg-muted/30 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {Object.entries(taskPriorityConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-primary">Task</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-primary">Client</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-primary">Priority</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-primary">Status</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-primary">Assigned To</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-primary">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                  ))}
                </tr>
              ))
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No tasks found</td>
              </tr>
            ) : (
              tasks.map((task) => {
                const priorityConf = taskPriorityConfig[task.priority || "medium"];
                const statusConf = taskStatusConfig[task.status || "pending"];
                const isOverdue = task.status === "overdue";
                const clientName = (task as any).clients?.client_name || "—";
                const assignedName = (task as any).profiles?.name || "Unassigned";
                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "border-b border-border/50 transition-colors hover:bg-primary/[0.03] cursor-pointer",
                      isOverdue && "border-l-2 border-l-destructive"
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{task.task_title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{clientName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider ${priorityConf.color}`}>
                        {priorityConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider ${statusConf.color}`}>
                        {statusConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{assignedName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{task.deadline ? new Date(task.deadline).toLocaleDateString() : "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TasksPage;
