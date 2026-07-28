"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface DiscountInputProps {
  value: number;
  /** إجمالي السطر الحالي قبل الخصم - الحد الأقصى المسموح للخصم */
  max: number;
  onChange: (value: number) => void;
}

/** Business Rules: Discount ≥ 0 ولا يتجاوز إجمالي السطر */
export function DiscountInput({ value, max, onChange }: DiscountInputProps) {
  const [raw, setRaw] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setRaw(String(value));
  }

  function handleChange(next: string) {
    setRaw(next);

    if (next.trim() === "") {
      setError(null);
      onChange(0);
      return;
    }

    const n = Number(next);
    if (!Number.isFinite(n) || n < 0) {
      setError("لا يقبل قيماً سالبة");
      return;
    }
    if (n > max) {
      setError("لا يتجاوز إجمالي السطر");
      return;
    }
    setError(null);
    onChange(n);
  }

  return (
    <div className="w-24">
      <Input
        type="number"
        min="0"
        step="0.01"
        dir="ltr"
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="الخصم"
        aria-invalid={!!error}
        className="h-8 text-center"
      />
      {error && (
        <p role="alert" className="mt-0.5 text-[10px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
