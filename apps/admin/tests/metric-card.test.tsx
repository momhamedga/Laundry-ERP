import { render, screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import { describe, expect, it } from "vitest";
import { MetricCard } from "@/components/cards/metric-card";

describe("<MetricCard /> (component render)", () => {
  it("renders the title and value", () => {
    render(<MetricCard title="إجمالي الإيراد" value="1٬000 ج.م" icon={Wallet} />);
    expect(screen.getByText("إجمالي الإيراد")).toBeInTheDocument();
    expect(screen.getByText("1٬000 ج.م")).toBeInTheDocument();
  });

  it("applies the destructive tone classes when requested", () => {
    const { container } = render(
      <MetricCard title="عجز" value="-5" icon={Wallet} tone="destructive" />,
    );
    expect(container.querySelector(".text-destructive")).not.toBeNull();
  });
});
