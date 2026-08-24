/** @doc Withdraw earned affiliate commission to PayPal or bank. */
// Withdraw — editorial redesign using SubShell (matches account/workspace settings).
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeErrorMessage } from "@/lib/sanitizeError";
import { SubShell, SubSection, SubCard, SubStatStrip } from "@/components/settings/SubShell";
import { cn } from "@/lib/utils";

const MIN_WITHDRAWAL = 10;
const WITHDRAWALS_PER_MONTH = 2;

interface PaymentMethod {
  id: string;
  method_type: string;
  label: string;
  instructions: string;
  status: "pending" | "approved" | "rejected";
  admin_note?: string | null;
  created_at: string;
}

const statusLabel = (s: string) =>
  (
    ({ approved: "Approved", pending: "Pending", rejected: "Rejected", paid: "Paid" }) as Record<
      string,
      string
    >
  )[s] ?? s;

const statusClasses = (s: string) => {
  if (s === "approved" || s === "paid")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (s === "rejected") return "border-rose-500/30 bg-rose-500/10 text-rose-400";
  return "border-amber-500/30 bg-amber-500/10 text-amber-400";
};

const WithdrawPage = () => {
  const [available, setAvailable] = useState(0);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [usedThisMonth, setUsedThisMonth] = useState(0);

  const [amount, setAmount] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [address, setAddress] = useState("");
  const [submittingWd, setSubmittingWd] = useState(false);

  const [openMethod, setOpenMethod] = useState(false);
  const [newType, setNewType] = useState<"bank" | "custom">("bank");
  const [newLabel, setNewLabel] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [submittingMethod, setSubmittingMethod] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [earnsRes, wdsRes, methodsRes] = await Promise.all([
      supabase.from("referral_earnings").select("amount").eq("referrer_id", user.id),
      supabase
        .from("withdrawal_requests")
        .select("amount, status, created_at")
        .eq("user_id", user.id),
      supabase
        .from("user_payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    const totalEarned = (earnsRes.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
    const committed = (wdsRes.data ?? [])
      .filter((w: any) => w.status !== "rejected")
      .reduce((s, r: any) => s + Number(r.amount), 0);
    setAvailable(totalEarned - committed);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const used = (wdsRes.data ?? []).filter(
      (w: any) => w.status !== "rejected" && new Date(w.created_at) >= monthStart,
    ).length;
    setUsedThisMonth(used);
    setMethods((methodsRes.data ?? []) as PaymentMethod[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const callFlow = async (op: string, payload: Record<string, unknown>) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        "X-User-Flow": "1",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ op, ...payload }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  };

  const submitMethod = async () => {
    if (!newLabel.trim() || !newInstructions.trim()) {
      toast.error("Enter the method name and details");
      return;
    }
    setSubmittingMethod(true);
    try {
      await callFlow("submit_method", {
        method_type: newType,
        label: newLabel.trim(),
        instructions: newInstructions.trim(),
      });
      toast.success("Request sent for review.");
      setOpenMethod(false);
      setNewLabel("");
      setNewInstructions("");
      setNewType("bank");
      load();
    } catch (e: any) {
      toast.error(sanitizeErrorMessage(e, "Failed to send"));
    } finally {
      setSubmittingMethod(false);
    }
  };

  const submitWithdrawal = async () => {
    const amt = parseFloat(amount);
    if (!selectedMethodId) return toast.error("Select an approved payment method");
    if (!address.trim()) return toast.error("Enter a payout address");
    if (!Number.isFinite(amt) || amt < MIN_WITHDRAWAL)
      return toast.error(`Minimum withdrawal is $${MIN_WITHDRAWAL}`);
    if (amt > available) return toast.error("Insufficient balance");
    if (usedThisMonth >= WITHDRAWALS_PER_MONTH)
      return toast.error("Monthly withdrawal limit exceeded");
    setSubmittingWd(true);
    try {
      await callFlow("submit_withdrawal", {
        amount: amt,
        payment_method_id: selectedMethodId,
        payment_address: address.trim(),
      });
      toast.success("Withdrawal request sent.");
      setAmount("");
      setAddress("");
      setSelectedMethodId("");
      load();
    } catch (e: any) {
      toast.error(sanitizeErrorMessage(e, "Failed to send"));
    } finally {
      setSubmittingWd(false);
    }
  };

  const approvedMethods = methods.filter((m) => m.status === "approved");
  const remainingThisMonth = Math.max(WITHDRAWALS_PER_MONTH - usedThisMonth, 0);

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl bg-foreground/[0.04] border border-border/70 text-[13.5px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-foreground/40 transition";
  const labelCls =
    "block text-[11.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground mb-1.5";

  return (
    <SubShell
      title="Withdraw"
      subtitle="Cash out your affiliate commission to a bank or custom payment method."
      backTo="/settings/referrals"
      action={
        <button
          onClick={() => setOpenMethod(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border/70 text-foreground text-[12.5px] font-medium hover:bg-foreground/[0.05] transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add method
        </button>
      }
    >
      <SubSection title="Balance" description="Available for withdrawal and monthly limit.">
        <SubStatStrip
          items={[
            { label: "Available", value: `$${available.toFixed(2)}` },
            { label: "Minimum", value: `$${MIN_WITHDRAWAL}` },
            {
              label: "Remaining",
              value: `${remainingThisMonth}/${WITHDRAWALS_PER_MONTH}`,
              sub: "this month",
            },
          ]}
        />
      </SubSection>

      <SubSection
        title="Payment methods"
        description="Add and manage where withdrawals get sent. New methods are reviewed before activation."
      >
        <SubCard flush>
          {methods.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              No payment methods added yet.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {methods.map((m) => (
                <div key={m.id} className="px-4 py-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-foreground truncate">{m.label}</p>
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-foreground/[0.06] text-muted-foreground">
                        {m.method_type === "bank" ? "Bank" : "Custom"}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-muted-foreground mt-1 whitespace-pre-line line-clamp-2">
                      {m.instructions}
                    </p>
                    {m.admin_note && (
                      <p className="text-[11.5px] text-muted-foreground/70 mt-1">
                        Admin: {m.admin_note}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-medium border",
                      statusClasses(m.status),
                    )}
                  >
                    {statusLabel(m.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SubCard>
      </SubSection>

      <SubSection
        title="New withdrawal"
        description="We confirm the payout address every time to prevent mistakes."
      >
        <SubCard>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Method</label>
              {approvedMethods.length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground">
                  No approved methods yet. Add one above.
                </p>
              ) : (
                <select
                  value={selectedMethodId}
                  onChange={(e) => setSelectedMethodId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select method</option>
                  {approvedMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className={labelCls}>Amount (USD)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min={MIN_WITHDRAWAL}
                  max={available}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={MIN_WITHDRAWAL.toString()}
                  className={inputCls}
                />
                <button
                  type="button"
                  disabled={available <= 0}
                  onClick={() => setAmount(available.toFixed(2))}
                  className="px-4 rounded-xl text-[12.5px] font-medium border border-border/70 hover:bg-foreground/[0.05] disabled:opacity-40 transition"
                >
                  Max
                </button>
              </div>
            </div>

            <div>
              <label className={labelCls}>Payout address</label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Account number, email, wallet address..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <button
              onClick={submitWithdrawal}
              disabled={submittingWd || approvedMethods.length === 0 || remainingThisMonth === 0}
              className="w-full h-11 rounded-xl bg-foreground text-background text-[13.5px] font-medium disabled:opacity-40 hover:opacity-90 transition inline-flex items-center justify-center gap-2"
            >
              {submittingWd && <Loader2 className="w-4 h-4 animate-spin" />}
              {submittingWd
                ? "Sending…"
                : remainingThisMonth === 0
                  ? "Monthly limit exceeded"
                  : "Submit request"}
            </button>
          </div>
        </SubCard>
      </SubSection>

      {openMethod && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center bg-background/70 backdrop-blur-sm"
          onClick={() => setOpenMethod(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-border/70 bg-background p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
                  Add payment method
                </h3>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Your request will be reviewed before activation.
                </p>
              </div>
              <button
                onClick={() => setOpenMethod(false)}
                className="w-8 h-8 rounded-full border border-border/70 grid place-items-center hover:bg-foreground/[0.05] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className={labelCls}>Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["bank", "custom"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewType(t)}
                      className={cn(
                        "rounded-xl px-4 py-2.5 text-[13px] font-medium border transition",
                        newType === t
                          ? "border-foreground/40 bg-foreground/[0.06] text-foreground"
                          : "border-border/70 text-muted-foreground hover:bg-foreground/[0.03]",
                      )}
                    >
                      {t === "bank" ? "Bank account" : "Custom"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Method name</label>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className={inputCls}
                  placeholder={
                    newType === "bank" ? "My National Bank Account" : "Vodafone Cash / PayPal"
                  }
                />
              </div>

              <div>
                <label className={labelCls}>Payout details</label>
                <textarea
                  rows={5}
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder={
                    newType === "bank"
                      ? "Bank name, account number / IBAN, account holder name..."
                      : "Wallet number, service name, phone number..."
                  }
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setOpenMethod(false)}
                className="flex-1 h-11 rounded-xl border border-border/70 text-[13px] font-medium hover:bg-foreground/[0.05] transition"
              >
                Cancel
              </button>
              <button
                onClick={submitMethod}
                disabled={submittingMethod}
                className="flex-1 h-11 rounded-xl bg-foreground text-background text-[13px] font-medium disabled:opacity-40 hover:opacity-90 transition inline-flex items-center justify-center gap-2"
              >
                {submittingMethod && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </SubShell>
  );
};

export default WithdrawPage;
