import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../context/CartContext';

function ProductOptionsModal({
    isOpen,
    onClose,
    product,
    extras,
    initialQuantity = 1,
    initialOptions = null,
    initialExtras = [],
    initialComment = '',
    onSave,
    isEditing = false
}) {
    const modalRef = useRef();
    const { theme } = useTheme();
    const [quantity, setQuantity] = useState(1);
    const [selectedOption, setSelectedOption] = useState(null);
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');
    const [allOptions, setAllOptions] = useState([]);
    const [allExtras, setAllExtras] = useState([]);
    const { addToCart } = useCart();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {

            console.log('Product:', product);
            console.log('Product options:', product.options);
            console.log('extras:', extras);
            
            setQuantity(initialQuantity);
            setSelectedExtras(initialExtras);
            setComment(initialComment);
            setError('');

            if (product && product.options && product.options.length === 1) {
                setSelectedOption(product.options[0]);
            } else {
                setSelectedOption(initialOptions);
            }

            let catalogExtras = [];
            try {
                const extrasStr = sessionStorage.getItem('extras');
                if (extrasStr) {
                    catalogExtras = JSON.parse(extrasStr);
                }
            } catch (e) {
                catalogExtras = [];
            }

            const selectedIds = initialExtras.map(e => e.id);
            const combinedExtras = [
                ...initialExtras,
                ...catalogExtras.filter(e => !selectedIds.includes(e.id))
            ];

            let catalogProducts = [];
            try {
                const productsStr = sessionStorage.getItem('products');
                if (productsStr) {
                    catalogProducts = JSON.parse(productsStr);
                }
            } catch (e) {
                catalogProducts = [];
            }

            const originalProduct = catalogProducts.find(p => p.id === product.id);
            const options = originalProduct?.options || product.options || [];
            if (options.length === 1) {
                setSelectedOption(options[0]);
            } else {
                setSelectedOption(Array.isArray(initialOptions) ? initialOptions[0] : initialOptions);

            }

            setAllOptions(options);
            setAllExtras(combinedExtras);
            
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, product?.id]);

    const handleOptionClick = (option) => {
        setSelectedOption(option);
        setError('');
    };

    const handleExtraClick = (extra) => {
        setSelectedExtras((prev) =>
        prev.includes(extra)
            ? prev.filter((e) => e !== extra)
            : [...prev, extra]
        );
    };

    const handleSave = () => {
        if (product.options && product.options.length > 1 && !selectedOption) {
            setError('Seleccione una opción.');
            return;
        }

        const productData = {
            ...product,
            options: [selectedOption],
            quantity: quantity,
            extras: selectedExtras,
            comment,
        };

        if (isEditing && onSave) {
            onSave(productData);
        } else {
            addToCart(productData);
        }

        onClose();
    };

    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
            <div
                ref={modalRef}
                className={`w-full sm:w-[500px] max-h-[100vh] rounded-t-xl p-4 shadow-lg
                ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
            >
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                    <h2 className="text-lg font-semibold">{product.name}</h2>
                    <button onClick={onClose} className="text-xl font-bold"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <div className="text-center text-gray-400 dark:text-gray-500">
                    <div className="manager-options flex flex-wrap gap-2 justify-center">
                        {allOptions.map((option, idx) => (
                            <button
                                key={idx}
                                className={`px-4 py-2 rounded ${
                                    selectedOption?.size === option.size
                                        ? 'bg-blue-700'
                                        : 'bg-blue-500'
                                } text-white hover:bg-blue-600`}
                                onClick={() => handleOptionClick(option)}
                            >
                                {option.size} - ${option.price}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="text-red-600 font-semibold mt-2">{error}</div>
                    )}

                    <div className="manager-quantity flex flex-wrap gap-2 justify-center mt-5">
                        <button
                            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                        >
                            <MinusIcon className="w-5 h-5" />
                        </button>
                        <span className="text-lg font-semibold">Cantidad: {quantity}</span>
                        <button
                            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                            onClick={() => setQuantity((prev) => prev + 1)}
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="mt-5 text-xl ...">Extras</p>
                    <div className='manager-extras border-2 border-red-500 w-full h-[25vh] overflow-y-scroll'>
                        {allExtras.map((extra) => (
                            <button
                                key={extra.id}
                                className={`w-full h-[5vh] mb-2 rounded ${
                                selectedExtras.some(e => e.id === extra.id)
                                    ? 'bg-blue-700'
                                    : 'bg-blue-500'
                                } text-white hover:bg-blue-600`}
                                onClick={() => handleExtraClick(extra)}
                            >
                                {extra.name} (+${extra.price})
                            </button>
                        ))}
                    </div>
                    <p className="mt-5 text-xl ...">Comentarios</p>
                    <textarea
                        className="w-full h-[8vh] mb-5 border-2 border-gray-300 rounded p-2 mt-2"
                        placeholder="Escribe tus comentarios aquí..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                    <button
                        className="w-full h-[7vh] bg-green-500 text-white rounded hover:bg-green-600"
                        onClick={handleSave}
                    >
                        {isEditing ? 'Guardar cambios' : 'Agregar al carrito'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProductOptionsModal;
