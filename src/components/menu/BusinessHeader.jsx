import { BUSINESS_CONFIG } from '../../utils/constants';

function BusinessHeader() {
  return (
    <div className="w-full py-3 px-4 text-center relative overflow-hidden bg-gradient-to-br from-green-600 via-green-500 to-green-600 shadow-lg">
      {/* Efecto de brillo sutil con animación */}
      <div className="absolute inset-0 opacity-20 animate-pulse">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12"></div>
      </div>

      <h1 className="text-black tracking-wide relative text-xl sm:text-2xl lg:text-3xl drop-shadow-md flex items-center justify-center gap-x-3 sm:gap-x-4">

        <img
          src="/images/maizmicorazon.png"
          alt="Logo Maíz de mi Corazón"
          className="h-8 sm:h-10 object-contain"
        />
        <span className={`cinzel-decorative-regular font-normal`}>
            {BUSINESS_CONFIG.NAME}
        </span>

        <img
          src="/images/maizmicorazon.png"
          alt="Logo Maíz de mi Corazón"
          className="h-8 sm:h-10 object-contain"
        />

      </h1>

      <p className="text-green-100 text-sm sm:text-base mt-1 relative opacity-90 font-medium">
         {BUSINESS_CONFIG.SLOGAN}
      </p>
      <style
            dangerouslySetInnerHTML={{
               __html: `
                  .cinzel-decorative-regular {
                      font-family: "Cinzel Decorative", serif;
                      font-weight: 400;
                      font-style: normal;
                   }
               `
             }}
       />
    </div>
  );
}

export default BusinessHeader;