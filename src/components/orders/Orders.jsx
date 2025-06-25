import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';
import {
  CalendarIcon,
  ShoppingBagIcon,
  PencilIcon,
  ArrowLeftIcon,
  FunnelIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  EyeIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import ProductModal from '../grid/ProductModal';
import Swal from 'sweetalert2';
import { getOrders, updateOrder, getProductById, getPaymentMethods } from '../../utils/api';
import { handleApiError, formatPrice, debugLog } from '../../utils/helpers';

function Orders({ onBack }) {
  const { theme } = useTheme();
  const { setLoading } = useLoading();
  const { setMessage } = useMessage();

  // Estados principales
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filter, setFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  // Estados para edición de productos individuales
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(null);

  // Estados para edición completa de orden
  const [isEditingFullOrder, setIsEditingFullOrder] = useState(false);
  const [fullOrderEdit, setFullOrderEdit] = useState({
    id_order: null,
    client_name: '',
    comment: '',
    id_payment_method: null,
    items: []
  });
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Cargar órdenes al montar el componente
  useEffect(() => {
    loadOrders();
  }, [filter]);

  // Filtrar órdenes por búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order =>
        order.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id_order.toString().includes(searchTerm) ||
        order.items?.some(item =>
          item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredOrders(filtered);
    }
  }, [orders, searchTerm]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setIsLoading(true);
      debugLog('ORDERS', 'Loading orders with filter:', filter);

      const response = await getOrders(filter);
      const ordersData = Array.isArray(response) ? response : response?.data || [];

      debugLog('ORDERS', 'Orders loaded successfully:', {
        count: ordersData.length,
        filter
      });

      setOrders(ordersData);
    } catch (error) {
      debugLog('ERROR', 'Failed to load orders:', error);
      handleApiError(error, setMessage);
      setOrders([]);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const methods = await getPaymentMethods();
      setPaymentMethods(Array.isArray(methods) ? methods : []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setPaymentMethods([
        { id_payment_method: 1, name: 'Efectivo' },
        { id_payment_method: 2, name: 'Tarjeta' },
        { id_payment_method: 3, name: 'Transferencia' }
      ]);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const toggleOrderExpansion = (orderId) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  // ✅ FUNCIÓN PARA EDITAR PRODUCTO INDIVIDUAL
  const handleEditOrderItem = async (order, itemIndex) => {
    try {
      const item = order.items[itemIndex];
      if (!item || !item.id_product) {
        setMessage({
          text: 'No se puede editar este producto',
          type: 'error'
        });
        return;
      }

      setLoading(true);
      debugLog('ORDERS', 'Editing order item:', { orderId: order.id_order, itemIndex, item });

      const productData = await getProductById(item.id_product);

      if (!productData) {
        setMessage({
          text: 'No se pudo cargar la información del producto',
          type: 'error'
        });
        return;
      }

      setEditingOrder(order);
      setCurrentItemIndex(itemIndex);
      setEditingItem(item);
      setEditingProduct(productData);

    } catch (error) {
      debugLog('ERROR', 'Failed to load product for editing:', error);
      handleApiError(error, setMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN PARA GUARDAR CAMBIOS EN PRODUCTO INDIVIDUAL
  const handleSaveItemChanges = async (itemData) => {
    try {
      setLoading(true);

      const updatedItems = [...editingOrder.items];
      const updatedItem = {
        ...updatedItems[currentItemIndex],
        quantity: itemData.quantity,
        ...(itemData.selectedOption && {
          id_variant: itemData.selectedOption.id_variant,
          variant_size: itemData.selectedOption.size,
          unit_price: parseFloat(itemData.selectedOption.price)
        }),
        ...(itemData.selectedFlavor && {
          id_flavor: itemData.selectedFlavor.id_flavor,
          flavor_name: itemData.selectedFlavor.name
        }),
        extras: itemData.selectedExtras || [],
        sauces: itemData.selectedSauces || [],
        comment: itemData.comment || '',
        total_price: itemData.totalPrice
      };

      updatedItems[currentItemIndex] = updatedItem;

      const newTotal = updatedItems.reduce((sum, item) => {
        return sum + (parseFloat(item.total_price) || 0);
      }, 0);

      const orderUpdateData = {
        id_order: editingOrder.id_order,
        total_amount: newTotal,
        updated_items: updatedItems.map(item => ({
          id_order_detail: item.id_order_detail,
          id_product: item.id_product,
          id_variant: item.id_variant,
          id_flavor: item.id_flavor,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          comment: item.comment || '',
          extras: item.extras || [],
          sauces: item.sauces || []
        }))
      };

      await updateOrder(orderUpdateData);

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id_order === editingOrder.id_order
            ? { ...order, items: updatedItems, total_amount: newTotal }
            : order
        )
      );

      setEditingOrder(null);
      setEditingItem(null);
      setEditingProduct(null);
      setCurrentItemIndex(null);

      setMessage({
        text: 'Producto actualizado exitosamente',
        type: 'success'
      });

    } catch (error) {
      debugLog('ERROR', 'Failed to update order item:', error);
      handleApiError(error, setMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEditModal = () => {
    setEditingOrder(null);
    setEditingItem(null);
    setEditingProduct(null);
    setCurrentItemIndex(null);
  };

  // ✅ FUNCIÓN PARA EDITAR ORDEN COMPLETA
  const handleEditFullOrder = async (order) => {
    try {
      await loadPaymentMethods();
      setFullOrderEdit({
        id_order: order.id_order,
        client_name: order.client_name || '',
        comment: order.comment || '',
        id_payment_method: order.payment_method?.id_payment_method || null,
        items: [...(order.items || [])]
      });
      setIsEditingFullOrder(true);
    } catch (error) {
      debugLog('ERROR', 'Failed to open full order edit:', error);
      handleApiError(error, setMessage);
    }
  };

  // ✅ FUNCIÓN PARA GUARDAR ORDEN COMPLETA
  const handleSaveFullOrder = async () => {
    try {
      if (!fullOrderEdit.id_payment_method) {
        Swal.fire({
          title: 'Error de validación',
          text: 'Debes seleccionar un método de pago',
          icon: 'warning',
          confirmButtonText: 'Entendido',
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          color: theme === 'dark' ? '#f9fafb' : '#111827'
        });
        return;
      }

      setLoading(true);

      const newTotal = fullOrderEdit.items.reduce((sum, item) => {
        return sum + (parseFloat(item.total_price) || 0);
      }, 0);

      const orderUpdateData = {
        id_order: fullOrderEdit.id_order,
        client_name: fullOrderEdit.client_name,
        comment: fullOrderEdit.comment,
        id_payment_method: fullOrderEdit.id_payment_method,
        total_amount: newTotal,
        updated_items: fullOrderEdit.items.map(item => ({
          id_order_detail: item.id_order_detail,
          id_product: item.id_product,
          id_variant: item.id_variant,
          id_flavor: item.id_flavor,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          comment: item.comment || '',
          extras: item.extras || [],
          sauces: item.sauces || []
        }))
      };

      await updateOrder(orderUpdateData);

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id_order === fullOrderEdit.id_order
            ? {
                ...order,
                ...fullOrderEdit,
                total_amount: newTotal,
                payment_method: paymentMethods.find(pm => pm.id_payment_method === fullOrderEdit.id_payment_method)
              }
            : order
        )
      );

      setIsEditingFullOrder(false);
      setMessage({
        text: 'Orden actualizada exitosamente',
        type: 'success'
      });

    } catch (error) {
      debugLog('ERROR', 'Failed to update full order:', error);
      handleApiError(error, setMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN PARA ELIMINAR PRODUCTO DE LA ORDEN
  const handleRemoveItem = (itemIndex) => {
    Swal.fire({
      title: '¿Eliminar producto?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      background: theme === 'dark' ? '#1f2937' : '#ffffff',
      color: theme === 'dark' ? '#f9fafb' : '#111827'
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedItems = fullOrderEdit.items.filter((_, index) => index !== itemIndex);
        setFullOrderEdit(prev => ({
          ...prev,
          items: updatedItems
        }));
      }
    });
  };

  const getFilterStats = () => {
    const total = filteredOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
    return {
      count: filteredOrders.length,
      total: total
    };
  };

  const filterOptions = [
    { value: 'today', label: 'Hoy', icon: ClockIcon },
    { value: 'week', label: 'Esta semana', icon: CalendarIcon },
    { value: 'month', label: 'Este mes', icon: CalendarIcon },
    { value: 'all', label: 'Todas', icon: ShoppingBagIcon }
  ];

  const stats = getFilterStats();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header Compacto */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-4 gap-4">
            {/* Título y navegación */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <ShoppingBagIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Órdenes
                  </h1>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stats.count} órdenes • ${formatPrice(stats.total)}
                  </p>
                </div>
              </div>
            </div>

            {/* Controles */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Búsqueda */}
              <div className="relative">
                <MagnifyingGlassIcon className={`w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  placeholder="Buscar órdenes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 pr-4 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Filtro temporal */}
              <div className="flex items-center gap-2">
                <FunnelIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={`border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {filterOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className={`ml-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Cargando órdenes...
            </span>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="grid gap-4">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrders.has(order.id_order);
              return (
                <div
                  key={order.id_order}
                  className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  } overflow-hidden transition-all duration-200 hover:shadow-md`}
                >
                  {/* Header de la orden */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* ID y Estado */}
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'} flex items-center justify-center`}>
                          <span className={`text-lg font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            #{order.id_order}
                          </span>
                        </div>
                        <div>
                          <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {order.client_name || 'Cliente genérico'}
                          </h3>
                          <div className="flex items-center gap-4 text-sm">
                            <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              <ClockIcon className="w-4 h-4" />
                              {formatDate(order.order_date)}
                            </span>
                            <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              <CreditCardIcon className="w-4 h-4" />
                              {order.payment_name || 'Sin método'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Total */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatPrice(order.bill)}
                        </div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {order.items?.length || 0} producto{order.items?.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleOrderExpansion(order.id_order)}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'text-gray-400 hover:bg-gray-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title={isExpanded ? 'Contraer' : 'Expandir'}
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="w-5 h-5" />
                          ) : (
                            <ChevronDownIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Vista previa rápida de productos */}
                  {!isExpanded && order.items && order.items.length > 0 && (
                    <div className={`px-4 pb-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="pt-3 flex flex-wrap gap-2">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                            theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                          }`}>
                            <span className="font-medium">{item.product_name}</span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                              x{item.quantity}
                            </span>
                            <button
                              onClick={() => handleEditOrderItem(order, index)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                              title="Editar producto"
                            >
                              <PencilIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm ${
                            theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                          }`}>
                            +{order.items.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Detalles expandidos */}
                  {isExpanded && (
                    <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      {/* Comentarios de la orden */}
                      {order.comment && (
                        <div className="px-4 py-3 bg-opacity-50">
                          <div className="flex items-start gap-2">
                            <ChatBubbleLeftRightIcon className={`w-4 h-4 mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                            <div>
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Comentarios:
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {order.comment}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Lista detallada de productos */}
                      <div className="p-4">
                        <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                           Producto de la orden:
                        </h4>
                        <div className="space-y-2">
                          {order.items?.map((item, index) => (
                            <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                            }`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h5 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                      {item.product_name || 'Producto'}<span> • </span>{item.variant_name}
                                    </h5>
                                    {/* Extras y salsas */}
                                    {((item.extras && item.extras.length > 0) || (item.sauces && item.sauces.length > 0)) && (
                                      <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                        {item.extras && item.extras.length > 0 && (
                                          <span>Extras: {item.extras.map(e => e.name).join(', ')}</span>
                                        )}
                                        {item.sauces && item.sauces.length > 0 && (
                                          <span>
                                            {item.extras && item.extras.length > 0 && ' • '}
                                            Salsas: {item.sauces.map(s => s.name).join(', ')}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="font-semibold text-green-600">
                                    {formatPrice(item.product_price)}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleEditOrderItem(order, index)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    theme === 'dark'
                                      ? 'text-blue-400 hover:bg-blue-900/20'
                                      : 'text-blue-600 hover:bg-blue-50'
                                  }`}
                                  title="Editar producto"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBagIcon className={`w-16 h-16 mx-auto mb-4 ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-lg font-medium mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {searchTerm ? 'No se encontraron órdenes' : 'No hay órdenes'}
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {searchTerm
                ? `No hay resultados para "${searchTerm}"`
                : filter === 'today'
                  ? 'No se encontraron órdenes para hoy.'
                  : `No se encontraron órdenes para el filtro "${filter}".`
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal de edición de producto individual usando ProductModal */}
      {editingProduct && editingItem && editingOrder && (
        <ProductModal
          isOpen={true}
          onClose={handleCloseEditModal}
          product={editingProduct}
          initialQuantity={editingItem.quantity || 1}
          initialOptions={editingItem.id_variant ?
            editingProduct.options?.filter(opt => opt.id_variant === editingItem.id_variant) || [] : []
          }
          initialFlavors={editingItem.id_flavor ?
            editingProduct.flavors?.filter(flavor => flavor.id_flavor === editingItem.id_flavor) || [] : []
          }
          initialExtras={editingItem.extras || []}
          initialSauces={editingItem.sauces || []}
          initialComment={editingItem.comment || ''}
          onSave={handleSaveItemChanges}
          isEditing={true}
        />
      )}

      {/* Modal de edición completa de orden - Versión compacta */}
      {isEditingFullOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl transition-all duration-300 ease-out ${
            theme === 'dark'
              ? 'bg-gray-900 text-white border border-gray-700'
              : 'bg-white text-gray-900 border border-gray-200'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <Cog6ToothIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <h2 className="text-lg font-bold">Editar Orden #{fullOrderEdit.id_order}</h2>
              </div>
              <button
                onClick={() => setIsEditingFullOrder(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-4">
              <div className="space-y-4">
                {/* Información básica - Grid compacto */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cliente</label>
                    <input
                      type="text"
                      value={fullOrderEdit.client_name}
                      onChange={(e) => setFullOrderEdit(prev => ({ ...prev, client_name: e.target.value }))}
                      className={`w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Método de Pago</label>
                    <select
                      value={fullOrderEdit.id_payment_method || ''}
                      onChange={(e) => setFullOrderEdit(prev => ({
                        ...prev,
                        id_payment_method: e.target.value ? Number(e.target.value) : null
                      }))}
                      className={`w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="">Seleccionar...</option>
                      {paymentMethods.map(method => (
                        <option key={method.id_payment_method} value={method.id_payment_method}>
                          {method.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Total</label>
                    <div className={`p-2 rounded-lg text-sm font-bold text-green-600 ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      ${formatPrice(fullOrderEdit.items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0))}
                    </div>
                  </div>
                </div>

                {/* Comentarios */}
                <div>
                  <label className="block text-sm font-medium mb-1">Comentarios</label>
                  <textarea
                    value={fullOrderEdit.comment}
                    onChange={(e) => setFullOrderEdit(prev => ({ ...prev, comment: e.target.value }))}
                    rows={2}
                    className={`w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300'
                    }`}
                    placeholder="Comentarios adicionales..."
                  />
                </div>

                {/* Lista de productos compacta */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Productos ({fullOrderEdit.items.length})</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {fullOrderEdit.items.map((item, index) => (
                      <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${
                        theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.product_name}</h4>
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {item.variant_size} • Cant: {item.quantity} • ${formatPrice(item.total_price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleEditOrderItem(
                              { ...fullOrderEdit, items: fullOrderEdit.items },
                              index
                            )}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Editar"
                          >
                            <PencilIcon className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Eliminar"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end gap-3 p-4 border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                onClick={() => setIsEditingFullOrder(false)}
                className={`px-4 py-2 border rounded-lg transition-colors text-sm ${
                  theme === 'dark'
                    ? 'text-gray-300 border-gray-600 hover:bg-gray-700'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFullOrder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <CheckIcon className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;