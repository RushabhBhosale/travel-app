import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import dayjs from "dayjs";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import EmptyState from "../../components/ui/EmptyState";
import Sheet from "../../components/ui/Sheet";
import TextField from "../../components/ui/TextField";
import { api } from "../../lib/api";
import { useTripMutation } from "../../lib/queries";
import { CURRENCIES, formatMoney } from "../../lib/format";
import { colors, shadow } from "../../theme";
import type { Expense, Trip } from "../../lib/types";

export const EXPENSE_CATEGORIES: { name: string; icon: any; color: string }[] = [
  { name: "Flights", icon: "airplane", color: "#2563EB" },
  { name: "Lodging", icon: "bed", color: "#7C3AED" },
  { name: "Food", icon: "restaurant", color: "#EA580C" },
  { name: "Transport", icon: "car", color: "#0891B2" },
  { name: "Activities", icon: "ticket", color: "#DB2777" },
  { name: "Shopping", icon: "bag-handle", color: "#CA8A04" },
  { name: "Drinks", icon: "wine", color: "#9333EA" },
  { name: "Other", icon: "ellipsis-horizontal", color: "#64748B" },
];

const categoryOf = (name: string) =>
  EXPENSE_CATEGORIES.find((c) => c.name === name) ??
  // Older expenses used slightly different category names.
  EXPENSE_CATEGORIES.find((c) => name.toLowerCase().startsWith(c.name.toLowerCase().slice(0, 4))) ??
  EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

type Form = { description: string; amount: string; category: string; paidBy: string; splitBy: string; date: string };

const BudgetTab = ({ trip }: { trip: Trip }) => {
  const { user } = useUser();
  const me = user?.firstName || "Me";
  const empty: Form = { description: "", amount: "", category: "Food", paidBy: me, splitBy: "Don't split", date: dayjs().format("YYYY-MM-DD") };

  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [currency, setCurrency] = useState(trip.currency ?? "INR");
  const [formError, setFormError] = useState("");

  const cur = trip.currency ?? "INR";
  const total = trip.expenses.reduce((s, e) => s + e.price, 0);
  const remaining = trip.budget - total;
  const pct = trip.budget ? Math.min(100, (total / trip.budget) * 100) : 0;

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    trip.expenses.forEach((e) => {
      const c = categoryOf(e.category).name;
      m.set(c, (m.get(c) ?? 0) + e.price);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [trip.expenses]);

  const sorted = useMemo(() => [...trip.expenses].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")), [trip.expenses]);

  const save = useTripMutation(
    trip._id,
    (f: Form & { id?: string }) => {
      const body = { description: f.description.trim(), price: Number(f.amount.replace(/,/g, "")), category: f.category, paidBy: f.paidBy, splitBy: f.splitBy, date: f.date };
      return f.id ? api.updateExpense(trip._id, f.id, body) : api.addExpense(trip._id, body);
    },
    { success: "Expense saved" }
  );
  const remove = useTripMutation(trip._id, (id: string) => api.removeExpense(trip._id, id), {
    optimistic: (t, id) => ({ ...t, expenses: t.expenses.filter((e) => e._id !== id) }),
  });
  const setBudget = useTripMutation(trip._id, (b: { budget: number; currency: string }) => api.updateTrip(trip._id, b), { success: "Budget updated" });

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      description: e.description,
      amount: String(e.price),
      category: categoryOf(e.category).name,
      paidBy: e.paidBy || me,
      splitBy: e.splitBy || "Don't split",
      date: e.date || dayjs().format("YYYY-MM-DD"),
    });
    setFormError("");
    setFormOpen(true);
  };

  const submit = async () => {
    const amount = Number(form.amount.replace(/,/g, ""));
    if (!form.description.trim()) return setFormError("Add a short description");
    if (!amount || amount <= 0) return setFormError("Enter an amount greater than 0");
    try {
      await save.mutateAsync({ ...form, id: editing?._id });
      setFormOpen(false);
    } catch {}
  };

  return (
    <View className="px-5 pt-4">
      <View className="mb-5 rounded-3xl bg-slate-900 p-5" style={shadow(2)}>
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total spent</Text>
            <Text className="mt-1 text-3xl font-bold text-white">{formatMoney(total, cur)}</Text>
          </View>
          <Pressable
            onPress={() => {
              setBudgetInput(trip.budget ? String(trip.budget) : "");
              setCurrency(cur);
              setBudgetOpen(true);
            }}
            className="flex-row items-center rounded-full bg-white/10 px-3 py-1.5"
          >
            <Ionicons name="create-outline" size={14} color="#fff" />
            <Text className="ml-1 text-xs font-semibold text-white">{trip.budget ? "Edit budget" : "Set budget"}</Text>
          </Pressable>
        </View>
        {trip.budget > 0 ? (
          <>
            <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: remaining < 0 ? "#F87171" : pct > 80 ? "#FBBF24" : "#34D399" }} />
            </View>
            <View className="mt-2 flex-row justify-between">
              <Text className="text-xs text-slate-400">Budget {formatMoney(trip.budget, cur)}</Text>
              <Text className={`text-xs font-semibold ${remaining < 0 ? "text-red-300" : "text-emerald-300"}`}>
                {remaining < 0 ? `${formatMoney(-remaining, cur)} over` : `${formatMoney(remaining, cur)} left`}
              </Text>
            </View>
          </>
        ) : (
          <Text className="mt-3 text-xs text-slate-400">Set a budget to track how much you have left.</Text>
        )}
      </View>

      {byCategory.length > 0 && (
        <View className="mb-5 rounded-3xl bg-white p-4" style={shadow(1)}>
          <Text className="mb-3 text-[15px] font-bold text-slate-900">By category</Text>
          {byCategory.map(([name, amount]) => {
            const c = categoryOf(name);
            return (
              <View key={name} className="mb-3">
                <View className="mb-1 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name={c.icon} size={14} color={c.color} />
                    <Text className="ml-1.5 text-[13px] font-semibold text-slate-700">{name}</Text>
                  </View>
                  <Text className="text-[13px] font-semibold text-slate-900">{formatMoney(amount, cur)}</Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <View className="h-full rounded-full" style={{ width: `${(amount / total) * 100}%`, backgroundColor: c.color }} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-slate-900">Expenses</Text>
        <Button title="Add expense" icon="add" size="sm" onPress={openNew} />
      </View>

      {sorted.length === 0 ? (
        <View className="rounded-3xl bg-white" style={shadow(1)}>
          <EmptyState compact icon="receipt-outline" title="No expenses yet" subtitle="Log flights, stays and meals to see where your money goes." />
        </View>
      ) : (
        sorted.map((e) => {
          const c = categoryOf(e.category);
          return (
            <Pressable
              key={e._id}
              onPress={() => openEdit(e)}
              onLongPress={() =>
                Alert.alert("Delete expense?", e.description, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => remove.mutate(e._id) },
                ])
              }
              className="mb-2.5 flex-row items-center rounded-2xl bg-white p-3 active:opacity-70"
              style={shadow(1)}
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${c.color}1A` }}>
                <Ionicons name={c.icon} size={18} color={c.color} />
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="text-[15px] font-semibold text-slate-900">
                  {e.description}
                </Text>
                <Text className="text-xs text-slate-500">
                  {[e.date ? dayjs(e.date).format("D MMM") : null, e.paidBy ? `Paid by ${e.paidBy}` : null, e.splitBy && e.splitBy !== "Don't split" ? `Split ${e.splitBy.toLowerCase()}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Text className="text-[15px] font-bold text-slate-900">{formatMoney(e.price, cur)}</Text>
            </Pressable>
          );
        })
      )}
      {sorted.length > 0 && <Text className="mt-1 text-[11px] text-slate-400">Tap to edit · long-press to delete</Text>}

      <Sheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit expense" : "New expense"}
        footer={
          <View className="flex-row gap-3">
            {editing && (
              <Button
                title="Delete"
                variant="danger"
                onPress={() => {
                  remove.mutate(editing._id);
                  setFormOpen(false);
                }}
              />
            )}
            <Button title={editing ? "Save changes" : "Add expense"} loading={save.isPending} onPress={submit} className="flex-1" />
          </View>
        }
      >
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
          <TextField
            label={`Amount (${cur})`}
            icon="cash-outline"
            keyboardType="decimal-pad"
            placeholder="0"
            value={form.amount}
            onChangeText={(amount) => setForm((f) => ({ ...f, amount }))}
            autoFocus={!editing}
            containerClassName="mb-4"
          />
          <TextField
            label="Description"
            icon="create-outline"
            placeholder="e.g. Dinner at the beach shack"
            value={form.description}
            onChangeText={(description) => setForm((f) => ({ ...f, description }))}
            containerClassName="mb-4"
          />
          <Text className="mb-2 text-[13px] font-semibold text-slate-700">Category</Text>
          <View className="mb-3 flex-row flex-wrap">
            {EXPENSE_CATEGORIES.map((c) => (
              <Chip key={c.name} label={c.name} icon={c.icon} color={c.color} selected={form.category === c.name} onPress={() => setForm((f) => ({ ...f, category: c.name }))} className="mb-2 mr-2" />
            ))}
          </View>
          <TextField
            label="Paid by"
            icon="person-outline"
            value={form.paidBy}
            onChangeText={(paidBy) => setForm((f) => ({ ...f, paidBy }))}
            containerClassName="mb-4"
          />
          <Text className="mb-2 text-[13px] font-semibold text-slate-700">Split</Text>
          <View className="mb-2 flex-row">
            {["Don't split", "Equally"].map((s) => (
              <Chip key={s} label={s} selected={form.splitBy === s} onPress={() => setForm((f) => ({ ...f, splitBy: s }))} className="mr-2" />
            ))}
          </View>
          {!!formError && <Text className="mt-2 text-sm text-red-600">{formError}</Text>}
        </ScrollView>
      </Sheet>

      <Sheet
        visible={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title="Trip budget"
        subtitle="How much do you plan to spend in total?"
        footer={
          <Button
            title="Save budget"
            loading={setBudget.isPending}
            onPress={async () => {
              await setBudget.mutateAsync({ budget: Number(budgetInput.replace(/,/g, "")) || 0, currency }).catch(() => {});
              setBudgetOpen(false);
            }}
          />
        }
      >
        <View className="px-5">
          <TextField label="Budget" icon="wallet-outline" keyboardType="decimal-pad" placeholder="e.g. 30000" value={budgetInput} onChangeText={setBudgetInput} autoFocus containerClassName="mb-4" />
          <Text className="mb-2 text-[13px] font-semibold text-slate-700">Currency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {CURRENCIES.map((c) => (
              <Chip key={c.code} label={c.code} selected={currency === c.code} onPress={() => setCurrency(c.code)} className="mr-2" color={colors.success} />
            ))}
          </ScrollView>
        </View>
      </Sheet>
    </View>
  );
};

export default BudgetTab;
