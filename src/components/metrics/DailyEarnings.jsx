import { useState, useEffect, useRef } from 'react';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CreditCardIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';
import BusinessHeader from '../menu/BusinessHeader';
import Swal from 'sweetalert2';

function DailyEarnings({ onBack }) {
  const [metricsData, setMetricsData] = useState(null);
  const [daysBack, setDaysBack] = useState(0);
  const [filterType, setFilterType] = useState('today');
  const [loading, setLoading] = useState(false);
  const { setMessage } = useMessage();

    // ✅ Usar useRef para evitar dobles peticiones
    const hasFetched = useRef(false);
    const isCurrentlyFetching = useRef(false);

  // Función para obtener métricas
  const fetchMetrics = async (days) => {
    console.log('🔍 Iniciando fetchMetrics...');
    if (isCurrentlyFetching.current) {
        console.log('🚫 Ya hay una petición en curso, saltando...');
        return;
    }

    isCurrentlyFetching.current = true;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8081/api/metrics/daily-earnings/${days}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Daily Earnings Data:', data);
      setMetricsData(data);
      setMessage(null);
      hasFetched.current = true; // ✅ Marcar como cargado exitosamente
    } catch (error) {
      console.error('Error fetching daily earnings:', error);
      hasFetched.current = false; // ✅ Permitir retry en caso de error
      setMessage({
        text: 'Error al cargar las métricas. Verifica tu conexión.',
        type: 'error'
      });

      // Datos de ejemplo actualizados
      setMetricsData({
        total_count: 1,
        daily_earnings: [
          {
            date: "2025-06-12",
            count_orders: 4,
            gross_sells: 490.00,
            net_profit_product: 220.00,
            net_profit_extra: 0,
            commission: {
              count_card_pays: 1,
              terminal_discount: 7.50,
              sell_terminal: 177.50
            },
            gross_profit: 220.00,
            earnings_summary: {
              reinvestment: 220.00,
              net_profit: 88.00
            }
          }
        ]
      });
    } finally {
      setLoading(false);
      isCurrentlyFetching.current = false;
    }
  };

  // Cargar métricas al montar el componente
  useEffect(() => {
    fetchMetrics(daysBack);
  }, []);

  // Función para filtros preseleccionados
  const handleQuickFilter = (type) => {
    let days;
    switch (type) {
      case 'today':
        days = 0;
        break;
      case 'yesterday':
        days = 1;
        break;
      case 'week':
        days = 7;
        break;
      case 'month':
        days = 30;
        break;
      default:
        days = 0;
    }

    setFilterType(type);
    setDaysBack(days);
    fetchMetrics(days);
  };

  // Función para cambiar el rango de días personalizado
  const handleCustomDaysChange = async () => {
    const result = await Swal.fire({
      title: '¿Cuántos días atrás quieres ver?',
      input: 'number',
      inputLabel: 'Número de días (0 = hoy)',
      inputPlaceholder: 'Ej: 0, 7, 15, 30',
      inputValue: daysBack,
      inputAttributes: {
        min: 0,
        max: 365,
        step: 1
      },
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => {
        if (value < 0) {
          return '¡No puede ser menor que 0!';
        }
        if (value > 365) {
          return '¡Máximo 365 días!';
        }
      }
    });

    if (result.isConfirmed) {
      const newDays = parseInt(result.value);
      setDaysBack(newDays);
      setFilterType('custom');
      fetchMetrics(newDays);
    }
  };

  // Calcular totales
  const totals = metricsData?.daily_earnings?.reduce((acc, day) => ({
    orders: acc.orders + day.count_orders,
    grossSells: acc.grossSells + day.gross_sells,
    grossProfit: acc.grossProfit + day.gross_profit,
    netProfit: acc.netProfit + (day.earnings_summary?.net_profit || 0),
    cardPays: acc.cardPays + (day.commission?.count_card_pays || 0),
    terminalDiscount: acc.terminalDiscount + (day.commission?.terminal_discount || 0),
    sellTerminal: acc.sellTerminal + (day.commission?.sell_terminal || 0)
  }), {
    orders: 0,
    grossSells: 0,
    grossProfit: 0,
    netProfit: 0,
    cardPays: 0,
    terminalDiscount: 0,
    sellTerminal: 0
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFilterText = () => {
    switch (filterType) {
      case 'today':
        return 'Hoy';
      case 'yesterday':
        return 'Ayer';
      case 'week':
        return 'Últimos 7 días';
      case 'month':
        return 'Últimos 30 días';
      case 'custom':
        return `Últimos ${daysBack} días`;
      default:
        return `${daysBack} días`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BusinessHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="font-medium">Volver</span>
              </button>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
                  Ganancias Diarías
                </h1>
                <p className="text-gray-600 mt-1">Ganancias diarias - {getFilterText()}</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleQuickFilter('today')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  filterType === 'today'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Hoy
              </button>

              <button
                onClick={() => handleQuickFilter('yesterday')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  filterType === 'yesterday'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Ayer
              </button>

              <button
                onClick={() => handleQuickFilter('week')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  filterType === 'week'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                7 días
              </button>

              <button
                onClick={() => handleQuickFilter('month')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  filterType === 'month'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                30 días
              </button>

              <button
                onClick={handleCustomDaysChange}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CalendarIcon className="w-4 h-4" />
                Personalizar
              </button>

              <button
                onClick={() => fetchMetrics(daysBack)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                )}
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Resumen de totales */}
        {totals && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Órdenes</p>
                  <p className="text-2xl font-bold text-gray-900">{totals.orders}</p>
                  {totals.cardPays > 0 && (
                    <p className="text-xs text-blue-600">{totals.cardPays} con tarjeta</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ventas Brutas</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.grossSells)}</p>
                  {totals.sellTerminal > 0 && (
                    <p className="text-xs text-green-600">Terminal: {formatCurrency(totals.sellTerminal)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ganancia Bruta</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.grossProfit)}</p>
                  {totals.terminalDiscount > 0 && (
                    <p className="text-xs text-red-600">Descuento: -{formatCurrency(totals.terminalDiscount)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-emerald-100">
                  <BanknotesIcon className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ganancia Neta</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.netProfit)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de días */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando métricas...</p>
          </div>
        ) : metricsData?.daily_earnings?.length > 0 ? (
          <div className="space-y-4">
            {metricsData.daily_earnings.map((day, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">
                        {formatDate(day.date)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {day.count_orders} órdenes realizadas
                        {day.commission?.count_card_pays > 0 && (
                          <span className="ml-2 text-blue-600">
                            ({day.commission.count_card_pays} con tarjeta)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Ventas: {formatCurrency(day.gross_sells)}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{day.count_orders}</p>
                      <p className="text-sm text-gray-600">Órdenes</p>
                    </div>

                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(day.gross_sells)}</p>
                      <p className="text-sm text-gray-600">Ventas Brutas</p>
                    </div>

                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{formatCurrency(day.gross_profit)}</p>
                      <p className="text-sm text-gray-600">Ganancia Bruta</p>
                    </div>

                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(day.earnings_summary?.net_profit || 0)}
                      </p>
                      <p className="text-sm text-gray-600">Ganancia Neta</p>
                    </div>
                  </div>

                  {/* Información de comisiones */}
                  {day.commission && (day.commission.count_card_pays > 0 || day.commission.terminal_discount > 0) && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <h4 className="flex items-center gap-2 font-semibold text-blue-900 mb-2">
                        <CreditCardIcon className="w-5 h-5" />
                        Información de Terminal
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-blue-700">Pagos con Tarjeta:</p>
                          <p className="text-blue-600">{day.commission.count_card_pays}</p>
                        </div>
                        <div>
                          <p className="font-medium text-blue-700">Ventas Terminal:</p>
                          <p className="text-blue-600">{formatCurrency(day.commission.sell_terminal)}</p>
                        </div>
                        <div>
                          <p className="font-medium text-blue-700">Descuento Terminal:</p>
                          <p className="text-red-600">-{formatCurrency(day.commission.terminal_discount)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detalles adicionales */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                      <CalculatorIcon className="w-5 h-5" />
                      Desglose de Ganancias
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Ganancia Productos:</p>
                        <p className="text-gray-600">{formatCurrency(day.net_profit_product)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Ganancia Extras:</p>
                        <p className="text-gray-600">{formatCurrency(day.net_profit_extra)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Reinversión:</p>
                        <p className="text-gray-600">{formatCurrency(day.earnings_summary?.reinvestment || 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <CurrencyDollarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay datos</h3>
            <p className="text-gray-600 mb-6">No se encontraron ganancias para el período seleccionado.</p>
            <button
              onClick={() => fetchMetrics(daysBack)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyEarnings;