import { useState, useEffect, useRef } from 'react';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CreditCardIcon,
  CalculatorIcon,
  ArrowPathIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';

// ✅ IMPORTAR NUEVAS UTILIDADES DE API
import { getDailyEarnings, getEarningsWithPercentage } from '../../utils/api';

function DailyEarnings({ onBack }) {
  const [metricsData, setMetricsData] = useState(null);
  const [daysBack, setDaysBack] = useState(0);
  const [filterType, setFilterType] = useState('today');
  const [loading, setLoading] = useState(false);
  const [profitPercentage, setProfitPercentage] = useState(30);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { setMessage } = useMessage();
  const { theme } = useTheme();

  // ✅ Usar useRef para evitar dobles peticiones
  const hasFetched = useRef(false);
  const isCurrentlyFetching = useRef(false);

  // ✅ Función para obtener métricas - MIGRADA
  const fetchMetrics = async (days, percentage = null) => {
    console.log('🔍 Iniciando fetchMetrics...');
    if (isCurrentlyFetching.current) {
      console.log('🚫 Ya hay una petición en curso, saltando...');
      return;
    }

    isCurrentlyFetching.current = true;
    setLoading(true);
    try {
      console.log(`📊 Fetching metrics for ${days} days back${percentage ? ` with ${percentage}% profit` : ''}`);

      let data;
      if (percentage !== null) {
        // ✅ USAR NUEVA FUNCIÓN DE API CON PORCENTAJE
        data = await getEarningsWithPercentage(percentage);
      } else {
        // ✅ USAR NUEVA FUNCIÓN DE API ESTÁNDAR
        data = await getDailyEarnings(days);
      }

      console.log('Daily Earnings Data:', data);
      setMetricsData(data);
      setMessage(null);
      hasFetched.current = true; // ✅ Marcar como cargado exitosamente

    } catch (error) {
      console.error('Error fetching daily earnings:', error);
      hasFetched.current = false; // ✅ Permitir retry en caso de error

      let errorMessage = 'Error al cargar las métricas.';

      if (error.name === 'TimeoutError') {
        errorMessage = 'Tiempo de espera agotado. Verifica que el backend esté corriendo.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté corriendo.';
      } else if (error.message.includes('HTTP error')) {
        errorMessage = `Error del servidor: ${error.message}`;
      }

      setMessage({
        text: errorMessage,
        type: 'error'
      });

      // Mostrar error con SweetAlert2
      await Swal.fire({
        title: 'Error al cargar métricas',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ef4444'
      });

    } finally {
      setLoading(false);
      isCurrentlyFetching.current = false; // ✅ Liberar el flag
    }
  };

  // ✅ Cargar métricas al montar el componente
  useEffect(() => {
    if (!hasFetched.current) {
      fetchMetrics(daysBack);
    }
  }, []);

  // ✅ Recargar cuando cambie el filtro
  useEffect(() => {
    if (hasFetched.current) {
      hasFetched.current = false;
      if (showAdvanced) {
        fetchMetrics(daysBack, profitPercentage);
      } else {
        fetchMetrics(daysBack);
      }
    }
  }, [daysBack, filterType, profitPercentage, showAdvanced]);

  // ✅ Función para refrescar datos manualmente
  const refreshMetrics = async () => {
    hasFetched.current = false;
    if (showAdvanced) {
      await fetchMetrics(daysBack, profitPercentage);
    } else {
      await fetchMetrics(daysBack);
    }
  };

  // ✅ Manejar cambio de filtro
  const handleFilterChange = async (newFilter) => {
    setFilterType(newFilter);

    let days = 0;
    switch (newFilter) {
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
      case 'custom':
        const result = await Swal.fire({
          title: 'Días hacia atrás',
          text: 'Ingresa el número de días (máximo 365):',
          input: 'number',
          inputAttributes: {
            min: 0,
            max: 365,
            step: 1
          },
          inputValue: daysBack,
          showCancelButton: true,
          confirmButtonText: 'Aplicar',
          cancelButtonText: 'Cancelar',
          inputValidator: (value) => {
            if (value === '') return '¡Debes ingresar un número!';
            if (value < 0) return '¡Mínimo 0 días!';
            if (value > 365) return '¡Máximo 365 días!';
          }
        });

        if (result.isConfirmed) {
          days = parseInt(result.value);
        } else {
          return; // No cambiar si se cancela
        }
        break;
      default:
        days = 0;
    }

    setDaysBack(days);
  };

  // ✅ Manejar cambio de porcentaje de ganancia
  const handleProfitPercentageChange = async () => {
    const result = await Swal.fire({
      title: 'Porcentaje de Ganancia',
      text: 'Ingresa el porcentaje de ganancia esperado:',
      input: 'number',
      inputAttributes: {
        min: 1,
        max: 100,
        step: 0.1
      },
      inputValue: profitPercentage,
      showCancelButton: true,
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) return '¡Debes ingresar un número!';
        if (value < 1) return '¡Mínimo 1%!';
        if (value > 100) return '¡Máximo 100%!';
      }
    });

    if (result.isConfirmed) {
      setProfitPercentage(parseFloat(result.value));
    }
  };

  // ✅ Formatear fecha
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // ✅ Formatear moneda
  const formatCurrency = (amount) => {
    try {
      const num = Number(amount);
      return isNaN(num) ? '$0.00' : new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(num);
    } catch (error) {
      return '$0.00';
    }
  };

  // ✅ Calcular estadísticas adicionales
  const calculateStats = () => {
    if (!metricsData?.daily_earnings || metricsData.daily_earnings.length === 0) {
      return {
        totalDays: 0,
        averageDaily: 0,
        bestDay: null,
        worstDay: null,
        trend: 'neutral'
      };
    }

    const earnings = metricsData.daily_earnings;
    const totalSales = earnings.reduce((sum, day) => sum + (day.gross_sells || 0), 0);
    const totalDays = earnings.length;
    const averageDaily = totalDays > 0 ? totalSales / totalDays : 0;

    const bestDay = earnings.reduce((best, day) =>
      (day.gross_sells || 0) > (best?.gross_sells || 0) ? day : best, null);

    const worstDay = earnings.reduce((worst, day) =>
      (day.gross_sells || 0) < (worst?.gross_sells || Infinity) ? day : worst, null);

    // Calcular tendencia (últimos 3 días vs primeros 3 días)
    let trend = 'neutral';
    if (totalDays >= 6) {
      const firstThree = earnings.slice(0, 3).reduce((sum, day) => sum + (day.gross_sells || 0), 0) / 3;
      const lastThree = earnings.slice(-3).reduce((sum, day) => sum + (day.gross_sells || 0), 0) / 3;

      if (lastThree > firstThree * 1.1) trend = 'up';
      else if (lastThree < firstThree * 0.9) trend = 'down';
    }

    return {
      totalDays,
      averageDaily,
      bestDay,
      worstDay,
      trend
    };
  };

  const stats = calculateStats();

  // ✅ Renderizar loading
  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 animate-pulse text-green-600" />
            <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Cargando métricas diarias...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className={`rounded-xl shadow-sm border mb-6 p-6 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              <div>
                <h1 className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Ganancias Diarias
                </h1>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Métricas detalladas de ingresos y ganancias
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  showAdvanced
                    ? 'bg-blue-600 text-white border-blue-600'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <CalculatorIcon className="w-5 h-5 mr-2 inline" />
                {showAdvanced ? 'Básico' : 'Avanzado'}
              </button>

              <button
                onClick={refreshMetrics}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>

          {/* Controles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Período de Análisis
              </label>
              <select
                value={filterType}
                onChange={(e) => handleFilterChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="today">Hoy</option>
                <option value="yesterday">Ayer</option>
                <option value="week">Últimos 7 días</option>
                <option value="month">Últimos 30 días</option>
                <option value="custom">Personalizado...</option>
              </select>
            </div>

            {showAdvanced && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Porcentaje de Ganancia
                </label>
                <button
                  onClick={handleProfitPercentageChange}
                  className={`w-full px-3 py-2 rounded-lg border text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {profitPercentage}% de ganancia
                </button>
              </div>
            )}

            <div className="flex items-end">
              <div className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {daysBack === 0 ? 'Datos de hoy' :
                 daysBack === 1 ? 'Datos de ayer' :
                 `Datos de ${daysBack} días atrás`}
              </div>
            </div>
          </div>
        </div>

        {metricsData ? (
          <>
            {/* Estadísticas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className={`p-6 rounded-xl shadow-sm border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Ventas Brutas
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(metricsData.earnings_summary?.gross_sells || 0)}
                    </p>
                    {stats.totalDays > 1 && (
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        Promedio: {formatCurrency(stats.averageDaily)}
                      </p>
                    )}
                  </div>
                  <CurrencyDollarIcon className="w-12 h-12 text-green-600" />
                </div>
              </div>

              <div className={`p-6 rounded-xl shadow-sm border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Ganancia Bruta
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(metricsData.earnings_summary?.gross_profit || 0)}
                    </p>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {((metricsData.earnings_summary?.gross_profit || 0) / (metricsData.earnings_summary?.gross_sells || 1) * 100).toFixed(1)}% del total
                    </p>
                  </div>
                  <BanknotesIcon className="w-12 h-12 text-blue-600" />
                </div>
              </div>

              <div className={`p-6 rounded-xl shadow-sm border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Total Órdenes
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {metricsData.earnings_summary?.total_orders || 0}
                    </p>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      Ticket promedio: {formatCurrency((metricsData.earnings_summary?.gross_sells || 0) / (metricsData.earnings_summary?.total_orders || 1))}
                    </p>
                  </div>
                  <ShoppingBagIcon className="w-12 h-12 text-purple-600" />
                </div>
              </div>

              <div className={`p-6 rounded-xl shadow-sm border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {showAdvanced ? 'Ganancia Neta' : 'Tendencia'}
                    </p>
                    {showAdvanced ? (
                      <>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(metricsData.earnings_summary?.net_profit || 0)}
                        </p>
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          Margen: {profitPercentage}%
                        </p>
                      </>
                    ) : (
                      <>
                        <div className={`flex items-center text-2xl font-bold ${
                          stats.trend === 'up' ? 'text-green-600' :
                          stats.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          <ArrowTrendingUpIcon className={`w-8 h-8 mr-2 ${
                            stats.trend === 'down' ? 'rotate-180' : ''
                          }`} />
                          {stats.trend === 'up' ? 'Subiendo' :
                           stats.trend === 'down' ? 'Bajando' : 'Estable'}
                        </div>
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          Últimos {stats.totalDays} días
                        </p>
                      </>
                    )}
                  </div>
                  {showAdvanced ? (
                    <CalculatorIcon className="w-12 h-12 text-orange-600" />
                  ) : (
                    <ArrowTrendingUpIcon className={`w-12 h-12 ${
                      stats.trend === 'up' ? 'text-green-600' :
                      stats.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`} />
                  )}
                </div>
              </div>
            </div>

            {/* Detalles Adicionales */}
            {showAdvanced && metricsData.commission && (
              <div className={`rounded-xl shadow-sm border p-6 mb-6 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Análisis de Comisiones y Descuentos
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          Descuento Terminal
                        </p>
                        <p className="text-xl font-bold text-red-500">
                          {formatCurrency(metricsData.commission.terminal_discount || 0)}
                        </p>
                      </div>
                      <CreditCardIcon className="w-8 h-8 text-red-500" />
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          Comisión Delivery
                        </p>
                        <p className="text-xl font-bold text-orange-500">
                          {formatCurrency(metricsData.commission.delivery_commission || 0)}
                        </p>
                      </div>
                      <ShoppingBagIcon className="w-8 h-8 text-orange-500" />
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          Total Descuentos
                        </p>
                        <p className="text-xl font-bold text-red-600">
                          {formatCurrency((metricsData.commission.terminal_discount || 0) + (metricsData.commission.delivery_commission || 0))}
                        </p>
                      </div>
                      <CalculatorIcon className="w-8 h-8 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mejores y Peores Días */}
            {stats.totalDays > 1 && (stats.bestDay || stats.worstDay) && (
              <div className={`rounded-xl shadow-sm border p-6 mb-6 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Análisis de Rendimiento
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {stats.bestDay && (
                    <div className={`p-4 rounded-lg border-2 border-green-200 ${
                      theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-green-600">Mejor Día</h3>
                        <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {formatDate(stats.bestDay.date)}
                      </p>
                      <p className="text-2xl font-bold text-green-600 mt-2">
                        {formatCurrency(stats.bestDay.gross_sells)}
                      </p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {stats.bestDay.count_orders || 0} órdenes
                      </p>
                    </div>
                  )}

                  {stats.worstDay && (
                    <div className={`p-4 rounded-lg border-2 border-red-200 ${
                      theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-red-600">Día con Menos Ventas</h3>
                        <ArrowTrendingUpIcon className="w-6 h-6 text-red-600 rotate-180" />
                      </div>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {formatDate(stats.worstDay.date)}
                      </p>
                      <p className="text-2xl font-bold text-red-600 mt-2">
                        {formatCurrency(stats.worstDay.gross_sells)}
                      </p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {stats.worstDay.count_orders || 0} órdenes
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Historial Diario */}
            {metricsData.daily_earnings && metricsData.daily_earnings.length > 1 && (
              <div className={`rounded-xl shadow-sm border p-6 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Historial Diario ({stats.totalDays} días)
                </h2>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={`${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Fecha
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Ventas Brutas
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Ganancia Bruta
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Órdenes
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Ticket Promedio
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${
                      theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                    }`}>
                      {metricsData.daily_earnings.map((day, index) => (
                        <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {formatDate(day.date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-green-600">
                              {formatCurrency(day.gross_sells)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-blue-600">
                              {formatCurrency(day.gross_profit)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {day.count_orders || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {formatCurrency((day.gross_sells || 0) / (day.count_orders || 1))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </>
        ) : (
          <div className={`rounded-xl shadow-sm border p-12 text-center ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <ChartBarIcon className={`w-16 h-16 mx-auto mb-4 ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-lg font-medium mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              No hay datos disponibles
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              No se encontraron métricas para el período seleccionado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyEarnings;