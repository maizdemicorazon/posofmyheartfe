import { useState, useEffect, useRef } from 'react';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';

// ✅ IMPORTAR NUEVAS UTILIDADES DE API
import { getDailyEarnings } from '../../utils/api';

function EarningsChart({ onBack }) {
  const [chartData, setChartData] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [period1, setPeriod1] = useState(7);
  const [period2, setPeriod2] = useState(30);
  const [chartType, setChartType] = useState('line');
  const [loading, setLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(true);
  const { setMessage } = useMessage();
  const { theme } = useTheme();

  // ✅ Usar useRef para evitar dobles peticiones
  const hasFetched = useRef(false);
  const isCurrentlyFetching = useRef(false);

  // ✅ Función para obtener datos de ganancias - MIGRADA
  const fetchEarningsData = async (days, label) => {
    try {
      console.log(`🔍 Fetching earnings data for ${days} days (${label})`);

      // ✅ USAR NUEVA FUNCIÓN DE API
      const data = await getDailyEarnings(days);
      console.log(`${label} Data:`, data);

      return data.daily_earnings?.map((day, index) => ({
        date: new Date(day.date).toLocaleDateString('es-ES', {
          month: 'short',
          day: 'numeric'
        }),
        fullDate: day.date,
        dateObj: new Date(day.date),
        grossSells: Math.round(day.gross_sells || 0),
        grossProfit: Math.round(day.gross_profit || 0),
        netProfit: Math.round(day.earnings_summary?.net_profit || 0),
        orders: day.count_orders || 0,
        terminalDiscount: Math.round(day.commission?.terminal_discount || 0),
        dayIndex: index
      })) || [];

    } catch (error) {
      console.error(`Error fetching ${label}:`, error);
      let errorMessage = 'Error al cargar las ganancias.';

      if (error.name === 'TimeoutError') {
        errorMessage = 'Tiempo de espera agotado. Verifica que el backend esté corriendo.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté corriendo.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'Error de CORS. Verifica la configuración del backend.';
      }

      setMessage({
        text: errorMessage,
        type: 'error'
      });
      throw error;
    }
  };

  // ✅ Función para cargar datos de ambos períodos
  const loadChartData = async () => {
    if (isCurrentlyFetching.current) {
      console.log('🚫 Ya hay una petición en curso, saltando...');
      return;
    }

    isCurrentlyFetching.current = true;
    setLoading(true);

    try {
      console.log('📊 Cargando datos del gráfico...');

      // Cargar datos del período principal
      const primaryData = await fetchEarningsData(period1, `Últimos ${period1} días`);
      setChartData(primaryData);

      // Si se muestra comparación, cargar datos del segundo período
      if (showComparison && period2 !== period1) {
        const secondaryData = await fetchEarningsData(period2, `Últimos ${period2} días`);

        // Combinar datos para comparación
        const combinedData = primaryData.map((day, index) => {
          const compareDay = secondaryData[index] || {};
          return {
            ...day,
            compareGrossSells: compareDay.grossSells || 0,
            compareGrossProfit: compareDay.grossProfit || 0,
            compareNetProfit: compareDay.netProfit || 0,
            compareOrders: compareDay.orders || 0
          };
        });

        setCompareData(combinedData);
      } else {
        setCompareData([]);
      }

      hasFetched.current = true;
      setMessage(null);

    } catch (error) {
      console.error('❌ Error al cargar datos del gráfico:', error);
      hasFetched.current = false;

      // Mostrar error con SweetAlert2
      await Swal.fire({
        title: 'Error al cargar datos',
        text: 'No se pudieron cargar los datos de ganancias. Verifica tu conexión.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ef4444'
      });

    } finally {
      setLoading(false);
      isCurrentlyFetching.current = false;
    }
  };

  // ✅ Cargar datos al montar el componente
  useEffect(() => {
    if (!hasFetched.current) {
      loadChartData();
    }
  }, []);

  // ✅ Recargar datos cuando cambien los períodos
  useEffect(() => {
    if (hasFetched.current) {
      hasFetched.current = false;
      loadChartData();
    }
  }, [period1, period2, showComparison]);

  // ✅ Función para refrescar datos manualmente
  const refreshData = async () => {
    hasFetched.current = false;
    await loadChartData();
  };

  // ✅ Cambiar período
  const handlePeriodChange = async (newPeriod, isPrimary = true) => {
    if (newPeriod === 'custom') {
      const result = await Swal.fire({
        title: 'Período personalizado',
        text: 'Ingresa el número de días (máximo 365):',
        input: 'number',
        inputAttributes: {
          min: 1,
          max: 365,
          step: 1
        },
        inputValue: isPrimary ? period1 : period2,
        showCancelButton: true,
        confirmButtonText: 'Aplicar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value) return '¡Debes ingresar un número!';
          if (value < 1) return '¡Mínimo 1 día!';
          if (value > 365) return '¡Máximo 365 días!';
        }
      });

      if (result.isConfirmed) {
        if (isPrimary) {
          setPeriod1(parseInt(result.value));
        } else {
          setPeriod2(parseInt(result.value));
        }
      }
    } else {
      if (isPrimary) {
        setPeriod1(parseInt(newPeriod));
      } else {
        setPeriod2(parseInt(newPeriod));
      }
    }
  };

  // ✅ Calcular estadísticas
  const calculateStats = (data) => {
    if (!data || data.length === 0) return {};

    const totalSales = data.reduce((sum, day) => sum + day.grossSells, 0);
    const totalProfit = data.reduce((sum, day) => sum + day.grossProfit, 0);
    const totalOrders = data.reduce((sum, day) => sum + day.orders, 0);
    const avgSales = totalSales / data.length;
    const avgProfit = totalProfit / data.length;
    const avgOrders = totalOrders / data.length;

    return {
      totalSales,
      totalProfit,
      totalOrders,
      avgSales,
      avgProfit,
      avgOrders,
      avgTicket: totalOrders > 0 ? totalSales / totalOrders : 0
    };
  };

  const stats = calculateStats(chartData);

  // ✅ Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-600 text-white'
            : 'bg-white border-gray-300 text-gray-900'
        }`}>
          <p className="font-bold mb-2">{`📅 ${label}`}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between">
                <span
                  className="text-sm font-medium flex items-center"
                  style={{ color: entry.color }}
                >
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: entry.color }}
                  ></span>
                  {entry.name}:
                </span>
                <span className="text-sm font-bold ml-2">
                  ${entry.value?.toLocaleString() || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // ✅ Formatear moneda para ejes
  const formatCurrency = (value) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  // ✅ Formatear tooltip
  const formatTooltipValue = (value, name) => {
    return [`$${value?.toLocaleString() || 0}`, name];
  };

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
              Cargando datos de ganancias...
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
                  Gráfico de Ganancias
                </h1>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Análisis detallado de ingresos y ganancias
                </p>
              </div>
            </div>

            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowTrendingUpIcon className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} />
              Actualizar
            </button>
          </div>

          {/* Controles */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Período Principal */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Período Principal
              </label>
              <select
                value={period1}
                onChange={(e) => handlePeriodChange(e.target.value, true)}
                className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value={7}>Últimos 7 días</option>
                <option value={14}>Últimos 14 días</option>
                <option value={30}>Últimos 30 días</option>
                <option value={60}>Últimos 60 días</option>
                <option value={90}>Últimos 90 días</option>
                <option value="custom">Personalizado...</option>
              </select>
            </div>

            {/* Comparación */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Período Comparación
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className={`p-2 rounded-lg border transition-colors ${
                    showComparison
                      ? 'bg-green-600 text-white border-green-600'
                      : theme === 'dark'
                        ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {showComparison ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                </button>
                <select
                  value={period2}
                  onChange={(e) => handlePeriodChange(e.target.value, false)}
                  disabled={!showComparison}
                  className={`flex-1 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value={14}>Últimos 14 días</option>
                  <option value={30}>Últimos 30 días</option>
                  <option value={60}>Últimos 60 días</option>
                  <option value={90}>Últimos 90 días</option>
                  <option value="custom">Personalizado...</option>
                </select>
              </div>
            </div>

            {/* Tipo de Gráfico */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Tipo de Gráfico
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="line">Líneas</option>
                <option value="bar">Barras</option>
                <option value="area">Área</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
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
                  Ventas Totales
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.totalSales?.toLocaleString() || 0}
                </p>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Promedio: ${stats.avgSales?.toFixed(0) || 0}/día
                </p>
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
                  Ganancias Brutas
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  ${stats.totalProfit?.toLocaleString() || 0}
                </p>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Promedio: ${stats.avgProfit?.toFixed(0) || 0}/día
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
                  {stats.totalOrders || 0}
                </p>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Promedio: {stats.avgOrders?.toFixed(1) || 0}/día
                </p>
              </div>
              <CalendarIcon className="w-12 h-12 text-purple-600" />
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
                  Ticket Promedio
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  ${stats.avgTicket?.toFixed(2) || 0}
                </p>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Por orden
                </p>
              </div>
              <ArrowTrendingUpIcon className="w-12 h-12 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <div className={`rounded-xl shadow-sm border p-6 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Evolución de Ganancias - Últimos {period1} días
          </h2>

          {chartData.length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' && (
                  <LineChart data={showComparison ? compareData : chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis
                      dataKey="date"
                      stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="grossSells"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Ventas Brutas"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="grossProfit"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="Ganancia Bruta"
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="netProfit"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      name="Ganancia Neta"
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    />
                    {showComparison && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="compareGrossSells"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name={`Ventas (${period2}d)`}
                          dot={{ fill: '#10b981', strokeWidth: 1, r: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="compareGrossProfit"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name={`Ganancia (${period2}d)`}
                          dot={{ fill: '#3b82f6', strokeWidth: 1, r: 2 }}
                        />
                      </>
                    )}
                  </LineChart>
                )}

                {chartType === 'bar' && (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis
                      dataKey="date"
                      stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="grossSells" fill="#10b981" name="Ventas Brutas" />
                    <Bar dataKey="grossProfit" fill="#3b82f6" name="Ganancia Bruta" />
                    <Bar dataKey="netProfit" fill="#8b5cf6" name="Ganancia Neta" />
                  </BarChart>
                )}

                {chartType === 'area' && (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis
                      dataKey="date"
                      stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="grossSells"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Ventas Brutas"
                    />
                    <Area
                      type="monotone"
                      dataKey="grossProfit"
                      stackId="2"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Ganancia Bruta"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
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
                  No se encontraron datos de ganancias para el período seleccionado.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EarningsChart;