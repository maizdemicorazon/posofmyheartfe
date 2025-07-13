// src/components/cart/SimpleCartProtection.jsx

import { useEffect, useRef } from 'react';
import { useCart } from '../../context/CartContext';

/**
 * Componente simple para protección del carrito
 * Integración mínima que se puede agregar a cualquier componente existente
 * 
 * USO: 
 * import SimpleCartProtection from './components/cart/SimpleCartProtection';
 * 
 * // En tu componente principal (App.jsx, Home.jsx, etc.)
 * <SimpleCartProtection />
 */
function SimpleCartProtection() {
  const { cart } = useCart();
  const isProtectionActive = useRef(false);

  useEffect(() => {
    // ✅ Función para manejar el evento beforeunload
    const handleBeforeUnload = (event) => {
      // Solo mostrar advertencia si hay productos en el carrito
      if (cart.length === 0) {
        return;
      }

      console.log('🚨 Usuario intentando recargar página con', cart.length, 'productos en carrito');

      // Prevenir el evento por defecto
      event.preventDefault();
      
      // Mensaje personalizado (navegadores modernos pueden ignorarlo)
      const message = `Tienes ${cart.length} producto${cart.length !== 1 ? 's' : ''} en tu carrito. ¿Estás seguro de que quieres recargar la página?`;
      event.returnValue = message;
      
      return message;
    };

    // ✅ Registrar o desregistrar el event listener según el estado del carrito
    if (cart.length > 0 && !isProtectionActive.current) {
      // Activar protección
      window.addEventListener('beforeunload', handleBeforeUnload);
      isProtectionActive.current = true;
      console.log('🛡️ Protección de carrito ACTIVADA - Items en carrito:', cart.length);
    } else if (cart.length === 0 && isProtectionActive.current) {
      // Desactivar protección
      window.removeEventListener('beforeunload', handleBeforeUnload);
      isProtectionActive.current = false;
      console.log('🛡️ Protección de carrito DESACTIVADA - Carrito vacío');
    }

    // ✅ Cleanup al desmontar el componente
    return () => {
      if (isProtectionActive.current) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        isProtectionActive.current = false;
      }
    };
  }, [cart.length]); // Dependencia: solo el length del carrito

  return null;
}

export default SimpleCartProtection;
