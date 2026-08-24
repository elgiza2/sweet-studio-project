/** @doc Manage MCP (Model Context Protocol) server connections.
 *  Users add remote MCP endpoints; probe lists tools; the chat backend
 *  will consume enabled servers as extra tool sources.
 */
import { useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Trash2, Zap, ZapOff, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SubShell, SubSection, SubCard } from "@/components/settings/SubShell";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface McpRow {
  id: string;
  name: string;
  url: string;
  transport: string;
  state: string;
  tool_names: string[];
  last_error: string | null;
  enabled: boolean;
  auth_headers: Record<string, string>;
  created_at: string;
}

async function callMcpManage(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("crawl-url", {
    body: { action: `mcp_${action}`, ...payload },
  });

  if (error) throw new Error(error.message);
  return data as { ok?: boolean; error?: string; tools?: { name: string }[]; tool_names?: string[] };
}

export default function McpSettingsPage() {
  const [rows, setRows] = useState<McpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [saving, setSaving] = useState(false);
  const [probing, setProbing] = useState(false);

  // Test-tool dialog
  const [testOpen, setTestOpen] = useState(false);
  const [testRow, setTestRow] = useState<McpRow | null>(null);
  const [testTool, setTestTool] = useState("");
  const [testArgs, setTestArgs] = useState("{}");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  function openTest(row: McpRow) {
    setTestRow(row);
    setTestTool(row.tool_names?.[0] ?? "");
    setTestArgs("{}");
    setTestResult(null);
    setTestOpen(true);
  }

  async function runTest() {
    if (!testRow || !testTool.trim()) {
      toast.error("Tool name required");
      return;
    }
    let args: Record<string, unknown> = {};
    try {
      args = testArgs.trim() ? JSON.parse(testArgs) : {};
    } catch {
      toast.error("Arguments must be valid JSON");
      return;
    }
    setTestRunning(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("crawl-url", {
        body: { action: "mcp_call_tool", id: testRow.id, tool: testTool.trim(), arguments: args },
      });
      if (error) throw new Error(error.message);
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setTestResult(String((err as Error).message ?? err));
    } finally {
      setTestRunning(false);
    }
  }

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("mcp_connections")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as McpRow[]);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function parseHeaders(text: string): Record<string, string> {
    if (!text.trim()) return {};
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === "object") return obj as Record<string, string>;
    } catch {
      /* fall through to line parser */
    }
    const out: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) {
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim();
        if (k) out[k] = v;
      }
    }
    return out;
  }

  async function handleAdd() {
    if (!name.trim() || !url.trim()) {
      toast.error("Name and URL are required");
      return;
    }
    if (!/^https:\/\//i.test(url.trim())) {
      toast.error("URL must start with https://");
      return;
    }
    const headers = parseHeaders(headersText);
    setSaving(true);
    setProbing(true);
    try {
      // 1. probe first
      const probe = await callMcpManage("probe", { url: url.trim(), headers });
      setProbing(false);
      const toolNames = probe.tool_names ?? probe.tools?.map((t) => t.name) ?? [];
      const state = probe.ok ? "ready" : "failed";
      const last_error = probe.ok ? null : probe.error ?? "probe failed";

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase.from("mcp_connections").insert({
        user_id: user.id,
        name: name.trim(),
        url: url.trim(),
        transport: "http",
        auth_headers: headers,
        state,
        tool_names: toolNames,
        last_error,
      });
      if (error) throw error;
      toast.success(probe.ok ? `Connected — ${toolNames.length} tools` : `Saved but not ready: ${last_error}`);
      setOpen(false);
      setName("");
      setUrl("");
      setHeadersText("");
      load();
    } catch (err) {
      toast.error(String((err as Error).message ?? err));
    } finally {
      setSaving(false);
      setProbing(false);
    }
  }

  async function handleRefresh(row: McpRow) {
    setRefreshingId(row.id);
    try {
      const res = await callMcpManage("refresh", { id: row.id });
      if (res.ok) {
        toast.success(`Refreshed — ${res.tools?.length ?? 0} tools`);
      } else {
        toast.error(res.error ?? "refresh failed");
      }
      load();
    } catch (err) {
      toast.error(String((err as Error).message ?? err));
    } finally {
      setRefreshingId(null);
    }
  }

  async function handleDelete(row: McpRow) {
    if (!confirm(`Delete "${row.name}"?`)) return;
    const { error } = await supabase.from("mcp_connections").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    load();
  }

  async function handleToggle(row: McpRow) {
    const { error } = await supabase
      .from("mcp_connections")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  }

  return (
    <SubShell
      title="MCP Connections"
      subtitle="Connect Model Context Protocol servers (GitHub, Notion, Linear, custom…) to your chat."
      action={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      }
    >
      <SubSection
        title="Your MCP servers"
        description="Enabled servers are auto-available in chat — Megsy routes tool-calling turns through Kimi K2. HTTPS only."
      >

        {loading ? (
          <SubCard>
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          </SubCard>
        ) : rows.length === 0 ? (
          <SubCard>
            <div className="p-6 text-sm text-muted-foreground text-center">
              No MCP servers yet. Click <span className="text-foreground font-medium">Add</span> to connect one.
            </div>
          </SubCard>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <SubCard key={row.id}>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{row.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            row.state === "ready"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : row.state === "failed"
                                ? "bg-red-500/15 text-red-500"
                                : "bg-yellow-500/15 text-yellow-600"
                          }`}
                        >
                          {row.state}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{row.url}</div>
                      {row.last_error && (
                        <div className="text-xs text-red-500 mt-1 line-clamp-2">{row.last_error}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTest(row)}
                        disabled={row.state !== "ready" || !row.enabled}
                        title="Test a tool"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(row)}
                        title={row.enabled ? "Disable" : "Enable"}
                      >
                        {row.enabled ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4 opacity-50" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRefresh(row)}
                        disabled={refreshingId === row.id}
                      >
                        {refreshingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {row.tool_names?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {row.tool_names.slice(0, 12).map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                      {row.tool_names.length > 12 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          +{row.tool_names.length - 12} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </SubCard>
            ))}
          </div>
        )}
      </SubSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add MCP Server</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="mcp-name">Name</Label>
              <Input
                id="mcp-name"
                placeholder="e.g. GitHub MCP"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mcp-url">URL (HTTPS Streamable HTTP endpoint)</Label>
              <Input
                id="mcp-url"
                placeholder="https://api.example.com/mcp"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mcp-headers">Auth headers (optional)</Label>
              <Textarea
                id="mcp-headers"
                placeholder={"Authorization: Bearer sk-...\n\nor JSON: {\"Authorization\":\"Bearer sk-...\"}"}
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                rows={4}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Stored encrypted at rest and forwarded server-side only.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {probing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" /> Probing…
                </>
              ) : saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving…
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Test tool — {testRow?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-tool">Tool name</Label>
              <Input
                id="test-tool"
                value={testTool}
                onChange={(e) => setTestTool(e.target.value)}
                list="mcp-tool-list"
              />
              <datalist id="mcp-tool-list">
                {(testRow?.tool_names ?? []).map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="test-args">Arguments (JSON)</Label>
              <Textarea
                id="test-args"
                value={testArgs}
                onChange={(e) => setTestArgs(e.target.value)}
                rows={4}
                className="font-mono text-xs"
              />
            </div>
            {testResult && (
              <div>
                <Label>Result</Label>
                <pre className="mt-1 max-h-64 overflow-auto rounded-md border bg-muted p-3 text-[11px] font-mono whitespace-pre-wrap">
                  {testResult}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestOpen(false)} disabled={testRunning}>
              Close
            </Button>
            <Button onClick={runTest} disabled={testRunning}>
              {testRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" /> Running…
                </>
              ) : (
                "Run"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SubShell>
  );
}
