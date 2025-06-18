function CartBadge({ count, variant = "red", size = "md", className = "" }) {
  // No mostrar badge si no hay items
  if (!count || count === 0) return null;

  // Formatear número (máximo 99+)
  const displayCount = count > 99 ? "99+" : count.toString();

  // Estilos base del badge
  const baseStyles = "absolute flex items-center justify-center font-bold text-xs border-2 border-white rounded-full transition-all duration-200";

  // Variantes de color
  const colorVariants = {
    red: "bg-red-500 text-white",
    yellow: "bg-[#e8e314] text-[#1b2230]",
    green: "bg-[#1b7f2c] text-white"
  };

  // Tamaños
  const sizeVariants = {
    sm: "w-4 h-4 text-xs -top-1 -right-1",
    md: "w-5 h-5 text-xs -top-2 -right-2",
    lg: "w-6 h-6 text-xs -top-2 -right-2"
  };

  const badgeClasses = `${baseStyles} ${colorVariants[variant]} ${sizeVariants[size]} ${className}`;

  return (
    <span className={badgeClasses}>
      {displayCount}
    </span>
  );
}

export default CartBadge;