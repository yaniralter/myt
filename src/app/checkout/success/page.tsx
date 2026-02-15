import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <div className="text-center max-w-md">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground mb-6">
          Thank you for your purchase. Your t-shirt will be printed and shipped
          to you soon. You can track your order from your dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90"
          >
            View Orders
          </Link>
          <Link
            href="/marketplace"
            className="border border-border px-6 py-2.5 rounded-lg font-medium hover:bg-muted"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
