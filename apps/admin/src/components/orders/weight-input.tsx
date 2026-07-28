"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface WeightInputProps {
  value: number;
  onChange: (value: number) => void;
}

/** Business Rule: Weight > 0 - يُستخدم لخدمات KG (وزن عشري) */
export function WeightInput({ value, onChange }: WeightInputProps) {
  const [raw, setRaw] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setRaw(String(value));
  }

  function handleChange(next: string) {
    setRaw(next);
    const n = Number(next);
    if (next.trim() === "" || !Number.isFinite(n) || n <= 0) {
      setError("أكبر من صفر");
      return;
    }
    setError(null);
    onChange(n);
  }

  return (
    <div className="w-24">
      <Input
        type="number"
        min="0.01"
        step="0.1"
        dir="ltr"
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="الوزن بالكيلوجرام"
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
