import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../context/CartContext';
import Swal from 'sweetalert2';

function ProductOptionsModal({
    isOpen,
    onClose,
    product,
    initialQuantity = 1,
    initialOptions = null,
    initialFlavors = null,
    initialExtras = [],
    initialSauces = [],
    initialComment = '',
    onSave,
    isEditing = false
}) {
    const modalRef = useRef();
    const { theme } = useTheme();
    const [quantity, setQuantity] = useState(1);
    const [selectedOption, setSelectedOption] = useState(null);
    const [selectedFlavor, setSelectedFlavor] = useState(null);
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [selectedSauces, setSelectedSauces] = useState([]);
    const [errorOption, setErrorOption] = useState('');
    const [errorFlavor, setErrorFlavor] = useState('');
    const [allOptions, setAllOptions] = useState([]);
    const [allFlavors, setAllFlavors] = useState([]);
    const [allExtras, setAllExtras] = useState([]);
    const [allSauces, setAllSauces] = useState([]);
    const [comment, setComment] = useState('');
    const { addToCart } = useCart();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                event.target.closest('.swal2-container') ||
                event.target.classList.contains('swal2-container')
            ) {
                return;
            }
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {

            setQuantity(initialQuantity);
            setSelectedExtras(initialExtras);
            setSelectedSauces(initialSauces);
            setComment(initialComment);
            setErrorOption('');
            setErrorFlavor('');

            if (product && product.options && product.options.length === 1) {
                setSelectedOption(product.options[0]);
            } else {
                setSelectedOption(initialOptions);
            }

            if (product && product.flavors && product.flavors.length === 1) {
                setSelectedFlavor(product.flavors[0]);
            } else {
                setSelectedFlavor(initialFlavors);
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

            const selectedIds = initialExtras.map(e => e.id_extra);
            const combinedExtras = [
                ...initialExtras,
                ...catalogExtras.filter(e => !selectedIds.includes(e.id_extra))
            ];

            let catalogSauces = [];
            try {
                const saucesStr = sessionStorage.getItem('sauces');
                if (saucesStr) {
                    catalogSauces = JSON.parse(saucesStr);
                }
            } catch (e) {
                catalogSauces = [];
            }

            const selectedSauceIds = initialSauces.map(e => e.id_sauce);
            const combinedSauces = [
                ...initialSauces,
                ...catalogSauces.filter(e => !selectedSauceIds.includes(e.id_sauce))
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

            const originalProduct = catalogProducts.find(p => p.id_product === product.id_product);
            const options = originalProduct?.options || product.options || [];
            const flavors = originalProduct?.flavors || product.flavors || [];
            if (options.length === 1) {
                setSelectedOption(options[0]);
            } else {
                setSelectedOption(Array.isArray(initialOptions) ? initialOptions[0] : initialOptions);
            }
            if (flavors.length === 1) {
                console.log(flavors[0] , "if");
                setSelectedFlavor(flavors[0]);
            } else {
                console.log(initialFlavors, "else");
                setSelectedFlavor(Array.isArray(initialFlavors) ? initialFlavors[0] : initialFlavors);
            }

            setAllOptions(options);
            setAllFlavors(flavors);
            setAllExtras(combinedExtras);
            setAllSauces(combinedSauces);
            
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, product?.id_product]);

    const handleOptionClick = (option) => {
        setSelectedOption(option);
        setErrorOption('');
    };

    const handleFlavorClick = (flavor) => {
        setSelectedFlavor(flavor);
        setErrorFlavor('');
    };

    const handleExtraClick = async (extra, event) => {
        event.stopPropagation();
        const alreadySelected = selectedExtras.some(e => e.id_extra === extra.id_extra);
        const result = await Swal.fire({
            title: "¿Que cantidad de extra quieres agregar?",
            input: "text",
            inputPlaceholder: "Ingresa la cantidad",
            inputValue: 1,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value || isNaN(value) || parseInt(value) < 1) {
                    return '¡Debes agregar al menos 1 extra!';
                }
            }
        });

        if (result.isConfirmed) {
            const quantity = parseInt(result.value);
            setSelectedExtras((prev) => {
                if (alreadySelected) {
                    return prev.map(e =>
                        e.id_extra === extra.id_extra ? { ...e, quantity } : e
                    );
                }
                return [...prev, { ...extra, quantity }];
            });
        } else if (result.isDismissed && alreadySelected) {
            setSelectedExtras((prev) =>
                prev.filter((e) => e.id_extra !== extra.id_extra)
            );
        }
    };

    const handleSauceClick = (sauce) => {
        setSelectedSauces((prev) =>
        prev.includes(sauce)
            ? prev.filter((s) => s !== sauce)
            : [...prev, sauce]
        );
    }

    const handleSave = () => {
        if (product.options && product.options.length > 1 && !selectedOption) {
            setErrorOption('Seleccione una opción.');
            return;
        }

        if (product.flavors && product.flavors.length > 1 && !selectedFlavor) {
            setErrorFlavor('Seleccione un sabor.');
            return;
        }

        const productData = {
            ...product,
            options: [selectedOption],
            flavors: [selectedFlavor],
            quantity: quantity,
            extras: selectedExtras,
            sauces: selectedSauces,
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
                className={`w-full sm:w-[800px] h-[100vh] max-h-[100vh] rounded-t-xl p-4 shadow-lg
                ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
            >
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                    <h2 className="text-lg font-semibold">{product.name}</h2>
                    <button onClick={onClose} className="text-xl font-bold"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <div className="h-[90vh] overflow-y-scroll">
                    <div className="container-options w-full h-[100vh] text-center text-gray-400 dark:text-gray-500">
                        <p className="text-xl ...">Tamaños</p>
                        <div className="manager-sizes w-full h-[30vh] flex overflow-x-auto whitespace-nowrap w-full">
                            {allOptions.length === 0 ? (
                                <div className="col-span-3 text-center text-gray-500">
                                    No hay tamaños para mostrar.
                                </div>
                            ) : (
                                allOptions.map((option, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-[10vh] min-w-[10vh] h-[12vh] m-2 aspect-square bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col text-white hover:bg-blue-600 ${
                                            selectedOption?.id_variant === option.id_variant
                                                ? 'border-2 border-blue-700'
                                                : 'border-1 border-transparent'
                                        }`}
                                        onClick={() => handleOptionClick(option)}
                                    >
                                        <img
                                            src="https://picsum.photos/200/300?random=1"
                                            alt={option.size}
                                            className={`w-full h-2/3 object-cover ${
                                                selectedOption?.id_variant === option.id_variant ? 'grayscale' : ''
                                            }`}
                                        />
                                        <div className="h-1/3 flex flex-col items-center justify-center px-2 text-center text-sm font-semibold text-black dark:text-white">
                                            <p className="text-black dark:text-white">{option.size}</p>
                                            <p className="text-black dark:text-white">+ ${option.price}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {errorOption && (
                            <div className="w-full text-red-600 font-semibold mb-2">{errorOption}</div>
                        )}

                        <p className="text-xl ...">Sabores</p>
                        <div className="manager-flavors w-full h-[30vh] flex overflow-x-auto whitespace-nowrap w-full">
                            {allFlavors.length === 0 ? (
                                <div className="col-span-3 text-center text-gray-500">
                                    No hay Sabores para mostrar.
                                </div>
                            ) : (
                                allFlavors.map((flavor, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-[10vh] min-w-[10vh] h-[12vh] m-2 aspect-square bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col text-white hover:bg-blue-600 ${
                                            selectedFlavor?.id_flavor === flavor.id_flavor
                                                ? 'border-2 border-blue-700'
                                                : 'border-1 border-transparent'
                                        }`}
                                        onClick={() => handleFlavorClick(flavor)}
                                    >
                                        <img
                                            src="https://picsum.photos/200/300?random=2"
                                            alt={flavor.name}
                                            className={`w-full h-2/3 object-cover ${
                                                selectedFlavor?.id_flavor === flavor.id_flavor ? 'grayscale' : ''
                                            }`}
                                        />
                                        <div className="h-1/3 flex flex-col items-center justify-center px-2 text-center text-sm font-semibold text-black dark:text-white">
                                            <p className="text-black dark:text-white">{flavor.name}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {errorFlavor && (
                            <div className="w-full text-red-600 font-semibold mb-2">{errorFlavor}</div>
                        )}

                        <div className="manager-quantity w-full h-[5vh] mb-0 flex flex-wrap gap-2 justify-center">
                            <button
                                className="px-4 py-2 rounded border border-gray-500 hover:border-gray-600"
                                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                            >
                                <MinusIcon className="w-5 h-5" />
                            </button>
                            <span className="text-lg font-semibold">Cantidad: {quantity}</span>
                            <button
                                className="px-4 py-2 rounded border border-gray-500 hover:border-gray-800"
                                onClick={() => setQuantity((prev) => prev + 1)}
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className='manager-extras-sauces w-full h-[50vh] overflow-y-auto space-y-2 mb-5 flex flex-row gap-2'>
                            <div className='content-extras flex flex-col flex-nowrap items-start w-1/2'>
                                <p className="mt-5 text-xl ...">Extras</p>
                                <div className='manager-extras w-full h-[25vh] overflow-y-scroll overflow-x-hidden pr-2'>
                                    {allExtras.length === 0 ? (
                                        <div className="col-span-3 text-center text-gray-500">
                                            No hay extras para mostrar.
                                        </div>
                                    ) : (
                                        allExtras.map((extra) => (
                                            <div
                                                key={extra.id_extra}
                                                className={`flex items-center px-4 py-3 rounded cursor-pointer transition-all duration-200
                                                    ${selectedExtras.some(e => e.id_extra === extra.id_extra)
                                                    ? 'border border-green-500 mb-1'
                                                    : 'border border-gray-500 hover:border-gray-800 mb-1'}
                                                `}
                                                onClick={e => handleExtraClick(extra, e)}
                                            >
                                                <img
                                                    src={extra.image || 'https://picsum.photos/200/300?random=' + extra.id_extra}
                                                    alt={extra.name}
                                                    className="w-12 h-12 rounded-full object-cover mr-4"
                                                />

                                                {/* Nombre y Precio en vertical */}
                                                <div className="flex flex-col flex-1 text-left text-xs text-sm/4">
                                                    <p className="font-medium text-gray-900">{extra.name}</p>
                                                    <p className="text-sm font-semibold text-right text-gray-500">+ ${extra.price}</p>
                                                    <p className="text-sm font-semibold text-right text-gray-500">Qty: {selectedExtras.find(e => e.id_extra === extra.id_extra)?.quantity || 1}</p>
                                                    <input
                                                        type='hidden'
                                                        className={`extra-` + extra.id_extra}
                                                        value={
                                                            selectedExtras.find(e => e.id_extra === extra.id_extra)?.quantity || 1
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className='content-sauces flex flex-col flex-nowrap items-end w-1/2'>
                                <p className="mt-5 text-xl pr-2">Salsas</p>
                                <div className='manager-sauces w-full h-[25vh] overflow-y-scroll overflow-x-hidden pr-2'>
                                    {allSauces.length === 0 ? (
                                        <div className="col-span-3 text-center text-gray-500">
                                            No hay salsas para mostrar.
                                        </div>
                                    ) : (
                                        allSauces.map((sauce) => (
                                            <div
                                                key={sauce.id_sauce}
                                                className={`flex items-center justify-between px-4 py-3 rounded cursor-pointer transition-all duration-200
                                                    ${selectedSauces.some(e => e.id_sauce === sauce.id_sauce)
                                                    ? 'border border-blue-500 mb-1'
                                                    : 'border border-gray-500 hover:border-gray-800 mb-1'}
                                                `}
                                                onClick={() => handleSauceClick(sauce)}
                                            >
                                                {/* Nombre y Precio verticalmente */}
                                                <div className="flex flex-col flex-1 text-left text-xs text-sm/4">
                                                    <p className="font-medium text-gray-900 text-right">{sauce.name}</p>
                                                </div>

                                                {/* Imagen al lado derecho */}
                                                <img
                                                    src={sauce.image || 'https://picsum.photos/200/300?random=' + sauce.id_sauce}
                                                    alt={sauce.name}
                                                    className="w-12 aspect-square rounded-full object-cover ml-4"
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className='manager-comments w-full h-[20vh] mb-5 flex flex-col gap-2'>
                            <p className="w-full h-[4vh] mt-0 text-xl p-0">Comentarios</p>
                            <textarea
                                className="w-full h-[10vh] mt-2 border-2 border-gray-300 rounded p-0"
                                placeholder="Escribe tus comentarios aquí..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>

                        <button
                            className="w-full h-[10vh] bg-green-500 text-white rounded hover:bg-green-600"
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
