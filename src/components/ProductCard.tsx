import Link from "next/link";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  shopName?: string;
}

export default function ProductCard({
  id,
  title,
  price,
  imageUrl,
  shopName,
}: ProductCardProps) {
  return (
    <Link
      href={`/product/${id}`}
      className="group bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/40 transition-all hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="aspect-square bg-surface-raised relative overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4">
        <h3 className="font-medium text-sm text-primary truncate">{title}</h3>
        <div className="flex items-center justify-between mt-2">
          <p className="text-accent font-bold text-base">
            ${(price / 100).toFixed(2)}
          </p>
          {shopName && (
            <p className="text-xs text-muted-foreground truncate ml-2">
              {shopName}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
