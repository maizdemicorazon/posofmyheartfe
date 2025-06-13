import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';

function ProductOptionsModal({
  isOpen,
  onClose,
  product,
  initialQuantity = 1,
  initialOptions = [],
  initialFlavors = [],
  initialExtras = [],
  initialSauces = [],
  initialComment = '',
  onSave,
  isEditing = false,
  onAddedToCart
}) {
  const { theme } = useTheme();
  const { addToCart, extras, sauces } = useCart();

  // Estados locales
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedFlavor, setSelectedFlavor] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedSauces, setSelectedSauces] = useState([]);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});

  // Resetear estados cuando se abre/cierra el modal o cambia el producto
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(initialQuantity || 1);
      setSelectedExtras(Array.isArray(initialExtras) ? [...initialExtras] : []);
      setSelectedSauces(Array.isArray(initialSauces) ? [...initialSauces] : []);
      setComment(initialComment || '');
      setErrors({});

      // Configurar opciones
      if (product.options && product.options.length > 0) {
        if (product.options.length === 1) {
          setSelectedOption(product.options[0]);
        } else if (isEditing && initialOptions && initialOptions.length > 0) {
          setSelectedOption(initialOptions[0]);
        } else {
          setSelectedOption(null);
        }
      } else {
        setSelectedOption(null);
      }

      // Configurar sabores
      if (product.flavors && product.flavors.length > 0) {
        if (product.flavors.length === 1) {
          setSelectedFlavor(product.flavors[0]);
        } else if (isEditing && initialFlavors && initialFlavors.length > 0) {
          setSelectedFlavor(initialFlavors[0]);
        } else {
          setSelectedFlavor(null);
        }
      } else {
        setSelectedFlavor(null);
      }
    } else if (!isOpen) {
      // Limpiar estados cuando se cierra el modal
      setQuantity(1);
      setSelectedOption(null);
      setSelectedFlavor(null);
      setSelectedExtras([]);
      setSelectedSauces([]);
      setComment('');
      setErrors({});
    }
  }, [isOpen, product?.id_product, isEditing, initialQuantity, initialOptions, initialFlavors, initialExtras, initialSauces, initialComment]);

  // CORREGIDO: Usar SweetAlert2 para cantidad de extras
  const handleExtraClick = async (extra) => {
    const result = await Swal.fire({
      title: '¿Qué cantidad de extra quieres agregar?',
      input: 'number',
      inputLabel: extra.name,
      inputPlaceholder: 'Cantidad',
      inputValue: 1,
      inputAttributes: {
        min: 1,
        max: 10,
        step: 1
      },
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => {
        if (!value || value < 1) {
          return '¡Debes agregar al menos 1 extra!';
        }
        if (value > 10) {
          return '¡Máximo 10 extras por producto!';
        }
      }
    });

    if (result.isConfirmed) {
      const qty = parseInt(result.value);
      setSelectedExtras(prev => {
        const existing = prev.find(e => e.id_extra === extra.id_extra);
        if (existing) {
          return prev.map(e =>
            e.id_extra === extra.id_extra ? { ...e, quantity: qty } : e
          );
        }
        return [...prev, { ...extra, quantity: qty }];
      });

      // Mostrar mensaje de confirmación
      await Swal.fire({
        title: '¡Extra agregado!',
        text: `${qty} ${extra.name} agregado al producto`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  const removeExtra = async (extraId, extraName) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Quieres quitar ${extraName} del producto?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      setSelectedExtras(prev => prev.filter(e => e.id_extra !== extraId));

      await Swal.fire({
        title: '¡Extra removido!',
        text: `${extraName} quitado del producto`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  const handleSauceClick = (sauce) => {
    setSelectedSauces(prev => {
      const existing = prev.find(s => s.id_sauce === sauce.id_sauce);
      if (existing) {
        return prev.filter(s => s.id_sauce !== sauce.id_sauce);
      }
      return [...prev, sauce];
    });
  };

  const handleSave = async () => {
    const newErrors = {};

    // Validar opciones requeridas
    if (product.options && product.options.length > 1 && !selectedOption) {
      newErrors.option = 'Por favor selecciona un tamaño.';
    }

    // Validar sabores requeridos
    if (product.flavors && product.flavors.length > 1 && !selectedFlavor) {
      newErrors.flavor = 'Por favor selecciona un sabor.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      // Mostrar error con SweetAlert2
      await Swal.fire({
        title: '¡Faltan datos!',
        text: 'Por favor completa todos los campos requeridos.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    const productData = {
      ...product,
      options: selectedOption ? [selectedOption] : [],
      flavors: selectedFlavor ? [selectedFlavor] : [],
      quantity: quantity,
      extras: selectedExtras,
      sauces: selectedSauces,
      comment: comment,
    };

    if (isEditing && onSave) {
      onSave(productData);
      await Swal.fire({
        title: '¡Producto actualizado!',
        text: 'Los cambios se han guardado correctamente',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      addToCart(productData);
      if (typeof onAddedToCart === 'function') {
        onAddedToCart();
      }
      await Swal.fire({
        title: '¡Agregado al carrito!',
        text: `${product.name} se agregó correctamente`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
    onClose();
  };

  // No renderizar si no está abierto o no hay producto
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div
        className={`w-full sm:w-[800px] h-[100vh] max-h-[100vh] rounded-t-xl p-4 shadow-lg
        ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
      >
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h2 className="text-lg font-semibold">{product.name}</h2>
          <button onClick={onClose} className="text-xl font-bold">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="h-[90vh] overflow-y-scroll">
          <div className="space-y-6">
            {/* Imagen del producto */}
            <div className="flex justify-center">
              <img
                src={product.image || 'https://via.placeholder.com/200'}
                alt={product.name}
                className="w-32 h-32 object-cover rounded-lg shadow-md"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/200?text=' + encodeURIComponent(product.name);
                }}
              />
            </div>

            {/* Tamaños/Opciones */}
            {product.options && product.options.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Tamaños</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {product.options.map((option, idx) => (
                    <div
                      key={`option-${option.id_variant}-${idx}`}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedOption?.id_variant === option.id_variant
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => {
                        setSelectedOption(option);
                        setErrors(prev => ({ ...prev, option: '' }));
                      }}
                    >
                      <div className="text-center">
                        <p className="font-medium">{option.size}</p>
                        <p className="text-sm text-gray-600">${option.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.option && (
                  <p className="text-red-500 text-sm mt-1">{errors.option}</p>
                )}
              </div>
            )}

            {/* Sabores */}
            {product.flavors && product.flavors.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Sabores</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {product.flavors.map((flavor, idx) => (
                    <div
                      key={`flavor-${flavor.id_flavor}-${idx}`}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedFlavor?.id_flavor === flavor.id_flavor
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => {
                        setSelectedFlavor(flavor);
                        setErrors(prev => ({ ...prev, flavor: '' }));
                      }}
                    >
                      <div className="text-center">
                        <p className="font-medium">{flavor.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.flavor && (
                  <p className="text-red-500 text-sm mt-1">{errors.flavor}</p>
                )}
              </div>
            )}

            {/* Cantidad */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Cantidad</h3>
              <div className="flex items-center justify-center gap-4">
                <button
                  className="p-2 rounded-full border border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                >
                  <MinusIcon className="w-5 h-5" />
                </button>
                <span className="text-2xl font-bold px-4">{quantity}</span>
                <button
                  className="p-2 rounded-full border border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setQuantity(prev => prev + 1)}
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Extras */}
            {extras && extras.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Extras</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {extras.map((extra, idx) => (
                    <div
                      key={`extra-${extra.id_extra}-${idx}`}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedExtras.some(e => e.id_extra === extra.id_extra)
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleExtraClick(extra)}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{extra.name}</p>
                        <p className="text-sm text-gray-600">+${extra.price}</p>
                        {selectedExtras.find(e => e.id_extra === extra.id_extra) && (
                          <p className="text-xs text-orange-600">
                            Qty: {selectedExtras.find(e => e.id_extra === extra.id_extra)?.quantity}
                          </p>
                        )}
                      </div>
                      {selectedExtras.some(e => e.id_extra === extra.id_extra) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeExtra(extra.id_extra, extra.name);
                          }}
                          className="ml-2 p-1 text-red-500 hover:bg-red-100 rounded"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Salsas */}
            {sauces && sauces.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Salsas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {sauces.map((sauce, idx) => (
                    <div
                      key={`sauce-${sauce.id_sauce}-${idx}`}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedSauces.some(s => s.id_sauce === sauce.id_sauce)
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleSauceClick(sauce)}
                    >
                      <div className="flex-1 text-center">
                        <p className="font-medium text-sm">{sauce.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comentarios */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Comentarios</h3>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                rows="3"
                placeholder="Escribe tus comentarios aquí..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {/* Botón guardar/agregar */}
            <button
              className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
              onClick={handleSave}
            >
              {isEditing ? 'Guardar cambios' : 'Agregar al carrito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductOptionsModal;