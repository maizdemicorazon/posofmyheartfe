function BusinessHeader() {
  return (
    <div className="w-full py-3 px-4 text-center relative overflow-hidden bg-gradient-to-br from-green-600 via-green-500 to-green-600 shadow-lg">
      {/* Efecto de brillo sutil con animación */}
      <div className="absolute inset-0 opacity-20 animate-pulse">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12"></div>
      </div>

      <h1 className="text-white font-bold tracking-wide relative text-xl sm:text-2xl lg:text-3xl drop-shadow-md">
        🌽 MAÍZ DE MI CORAZÓN 🌽
      </h1>

      <p className="text-green-100 text-sm sm:text-base mt-1 relative opacity-90 font-medium">
        Calidad, servicio e higiene a toda maíz
      </p>
    </div>
  );
}

export default BusinessHeader;