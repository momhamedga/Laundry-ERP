"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
}

/** Business Rule: Quantity > 0 - يُستخدم لخدمات PIECE */
export function QuantityInput({ value, onChange }: QuantityInputProps) {
  const [raw, setRaw] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  // مزامنة مع تغيّر خارجي بلا Effect ("تعديل الحالة أثناء الرسم")
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
    <div className="w-20">
      <Input
        type="number"
        min="1"
        step="1"
        dir="ltr"
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="الكمية"
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
