"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useForceLogoutMutation } from "@/hooks/use-admin";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Scope = "user" | "branch" | "all";

export function ForceLogoutDialog({ open, onOpenChange }: Props) {
  const mutation = useForceLogoutMutation();
  const [scope, setScope] = useState<Scope>("user");
  const [userId, setUserId] = useState("");
  const [branchId, setBranchId] = useState("");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setScope("user");
      setUserId("");
      setBranchId("");
    }
  }

  const canSubmit =
    (scope === "user" && userId.trim()) ||
    (scope === "branch" && branchId.trim()) ||
    scope === "all";

  async function submit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({
        scope,
        userId: scope === "user" ? userId.trim() : undefined,
        branchId: scope === "branch" ? branchId.trim() : undefined,
      });
      onOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إخراج قسري</DialogTitle>
          <DialogDescription>
            إبطال جلسات نشطة فوراً. المستخدم المتأثّر سيحتاج لتسجيل الدخول من جديد.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>النطاق</Label>
            <Select value={scope} onValueChange={(v) => v && setScope(v as Scope)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">مستخدم محدد</SelectItem>
                <SelectItem value="branch">كل مستخدمي فرع</SelectItem>
                <SelectItem value="all">كل المستخدمين</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scope === "user" && (
            <div className="space-y-1.5">
              <Label htmlFor="fl-user">معرّف المستخدم *</Label>
              <Input id="fl-user" dir="ltr" value={userId} onChange={(e) => setUserId(e.target.value)} />
            </div>
          )}
          {scope === "branch" && (
            <div className="space-y-1.5">
              <Label htmlFor="fl-branch">معرّف الفرع *</Label>
              <Input id="fl-branch" dir="ltr" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
            </div>
          )}
          {scope === "all" && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              تحذير: سيتم إخراج جميع المستخدمين من النظام، بمن فيهم أنت.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={() => void submit()}
            disabled={mutation.isPending || !canSubmit}
          >
            {mutation.isPending && <Spinner />}
            تنفيذ الإخراج
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
