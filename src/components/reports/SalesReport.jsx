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
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ShareIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import BusinessHeader from '../menu/BusinessHeader';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';

// ✅ IMPORTAR NUEVAS UTILIDADES DE API
import { getSalesReport } from '../../utils/api';
import { API_CONFIG } from '../../config/config.server';

function SalesReport({ onBack }) {
  const [reportData, setReportData] = useState(null);
  const [period, setPeriod] = useState('week');
  const [customDays, setCustomDays] = useState(7);
  const [compareWithPrevious, setCompareWithPrevious] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState('overview');
  const { setMessage } = useMessage();
  const { theme } = useTheme();

  // Colores para gráficas
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  // ✅ Usar useRef para evitar dobles peticiones
  const hasFetched = useRef(false);
  const isCurrentlyFetching = useRef(false);

  // ✅ Función para obtener datos del reporte - MIGRADA
  const fetchSalesReport = async (days) => {
    try {
      console.log(`🔍 Fetching sales report for ${days} days`);

      // ✅ USAR NUEVA FUNCIÓN DE API
      const data = await getSalesReport(days);
      console.log('Sales Report Data:', data);

      // Procesar datos para asegurar formato correcto
      return processReportData(data);
    } catch (error) {
      console.error('Error fetching sales report:', error);
      setMessage({
        text: `Error al cargar el reporte: ${error.message}`,
        type: 'error'
      });
      throw error;
    }
  };

  // Procesar datos del backend para asegurar compatibilidad
  const processReportData = (data) => {
    return {
      ...data,
      // Asegurar que los números sean números JavaScript
      totalSales: Number(data.total_sales || 0),
      totalOrders: Number(data.total_orders || 0),
      averageTicket: Number(data.average_ticket || 0),
      dailyAverage: Number(data.daily_average || 0),
      ordersAverage: Number(data.orders_average || 0),
      growthRate: Number(data.growth_rate || 0),
      previousPeriodSales: Number(data.previous_period_sales || 0),

      // Procesar datos diarios
      dailyData: (data.daily_data || []).map(day => ({
        ...day,
        sales: Number(day.sales || 0),
        orders: Number(day.orders || 0),
        averageTicket: Number(day.average_ticket || 0)
      })),

      // Procesar análisis por categorías
      categoryAnalysis: (data.category_analysis || []).map(cat => ({
        ...cat,
        sales: Number(cat.sales || 0),
        orders: Number(cat.orders || 0),
        percentage: Number(cat.percentage || 0)
      })),

      // Procesar análisis por días de semana
      weekdayAnalysis: (data.weekday_analysis || []).map(day => ({
        ...day,
        averageSales: Number(day.average_sales || 0),
        averageOrders: Number(day.average_orders || 0),
        totalSales: Number(day.total_sales || 0),
        totalOrders: Number(day.total_orders || 0)
      })),

      // Procesar horarios pico
      peakHours: (data.peak_hours || []).map(hour => ({
        ...hour,
        sales: Number(hour.sales || 0),
        percentage: Number(hour.percentage || 0)
      }))
    };
  };

  // ✅ Cargar datos del reporte
  const loadReportData = async () => {
    if (isCurrentlyFetching.current) {
      console.log('🚫 Ya hay una petición en curso, saltando...');
      return;
    }

    isCurrentlyFetching.current = true;
    setLoading(true);
    try {
      const days = period === 'custom' ? customDays :
                   period === 'week' ? 7 :
                   period === 'month' ? 30 :
                   period === 'quarter' ? 90 : 7;

      const data = await fetchSalesReport(days);
      setReportData(data);
      hasFetched.current = true;
      setMessage(null);

    } catch (error) {
      console.error('❌ Error al cargar reporte:', error);
      hasFetched.current = false;

      let errorMessage = 'Error al cargar el reporte de ventas.';

      if (error.name === 'TimeoutError') {
        errorMessage = 'Tiempo de espera agotado. Verifica que el backend esté corriendo.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = `No se puede conectar al servidor. Verifica que esté corriendo en ${API_CONFIG.BASE_URL}`;
      } else if (error.message.includes('HTTP error')) {
        errorMessage = `Error del servidor: ${error.message}`;
      }

      // Mostrar error con SweetAlert2
      await Swal.fire({
        title: 'Error al cargar reporte',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ef4444'
      });

    } finally {
      setLoading(false);
      isCurrentlyFetching.current = false;
    }
  };

  // ✅ Cargar datos iniciales
  useEffect(() => {
    if (!hasFetched.current) {
      loadReportData();
    }
  }, []);

  // ✅ Recargar cuando cambie el período
  useEffect(() => {
    if (hasFetched.current) {
      hasFetched.current = false;
      loadReportData();
    }
  }, [period, customDays]);

  // ✅ Función para refrescar datos manualmente
  const refreshData = async () => {
    hasFetched.current = false;
    await loadReportData();
  };

  // ✅ Cambiar período
  const handlePeriodChange = async (newPeriod) => {
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
        inputValue: customDays,
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
        setCustomDays(parseInt(result.value));
        setPeriod('custom');
      }
    } else {
      setPeriod(newPeriod);
    }
  };

  // ✅ Exportar reporte (simulado)
  const exportReport = async (format) => {
    if (!reportData) return;

    try {
      // En un entorno real, esto haría una llamada al backend para exportar
      // Por ahora, simularemos la exportación
      await Swal.fire({
        title: `Exportar reporte en ${format.toUpperCase()}`,
        text: 'Esta funcionalidad estará disponible próximamente.',
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3b82f6'
      });

      setMessage({
        text: `Funcionalidad de exportación en desarrollo`,
        type: 'info'
      });

    } catch (error) {
      console.error('Error exporting report:', error);
      await Swal.fire({
        title: `Exportar reporte en ${format.toUpperCase()}`,
        text: 'Error al exportar el reporte. Por favor intente nuevamente.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  // ✅ Formatear moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value || 0);
  };

  // ✅ Formatear porcentaje
  const formatPercentage = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value || 0).toFixed(1)}%`;
  };

  // ✅ Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-600 text-white'
            : 'bg-white border-gray-300'
        }`}>
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.name.includes('Sales') || entry.name.includes('Ventas')
                ? formatCurrency(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // ✅ Función para verificar si hay datos disponibles
  const hasData = (data) => {
    return data && data.length > 0;
  };

  // ✅ Renderizar loading
  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <BusinessHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 animate-pulse text-green-600" />
            <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Generando reporte de ventas...
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
      <BusinessHeader />

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
                  Reporte de Ventas
                </h1>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Análisis completo de ventas y rendimiento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowTrendingUpIcon className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} />
                Actualizar
              </button>

              <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg">
                <button
                  onClick={() => exportReport('pdf')}
                  className={`p-2 rounded-l-lg hover:bg-gray-100 transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Exportar PDF"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => exportReport('excel')}
                  className={`p-2 hover:bg-gray-100 transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Exportar Excel"
                >
                  <ShareIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => window.print()}
                  className={`p-2 rounded-r-lg hover:bg-gray-100 transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Imprimir"
                >
                  <PrinterIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Período del Reporte
              </label>
              <select
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="week">Esta semana (7 días)</option>
                <option value="month">Este mes (30 días)</option>
                <option value="quarter">Este trimestre (90 días)</option>
                <option value="custom">Personalizado...</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Vista del Reporte
              </label>
              <select
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="overview">Resumen General</option>
                <option value="daily">Análisis Diario</option>
                <option value="categories">Por Categorías</option>
                <option value="trends">Tendencias</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="compareWithPrevious"
                  checked={compareWithPrevious}
                  onChange={(e) => setCompareWithPrevious(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                />
                <label
                  htmlFor="compareWithPrevious"
                  className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Comparar con período anterior
                </label>
              </div>
            </div>
          </div>
        </div>

        {reportData ? (
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
                      Ventas Totales
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(reportData.totalSales)}
                    </p>
                    {compareWithPrevious && reportData.growthRate && (
                      <p className={`text-sm flex items-center ${
                        reportData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {reportData.growthRate >= 0 ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                        )}
                        {formatPercentage(reportData.growthRate)}
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
                      Total Órdenes
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {reportData.totalOrders || 0}
                    </p>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      Promedio: {reportData.ordersAverage?.toFixed(1) || 0}/día
                    </p>
                  </div>
                  <ChartBarIcon className="w-12 h-12 text-blue-600" />
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
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(reportData.averageTicket)}
                    </p>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      Por orden
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
                      Promedio Diario
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(reportData.dailyAverage)}
                    </p>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      Por día
                    </p>
                  </div>
                  <ArrowTrendingUpIcon className="w-12 h-12 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Gráficos según la vista seleccionada */}
            {selectedView === 'overview' && hasData(reportData.dailyData) && (
              <div className={`rounded-xl shadow-sm border p-6 mb-6 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Evolución de Ventas
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                      <XAxis
                        dataKey="date"
                        stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                        fontSize={12}
                      />
                      <YAxis
                        tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                        stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                        fontSize={12}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="#10b981"
                        strokeWidth={3}
                        name="Ventas"
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        name="Órdenes"
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        yAxisId="right"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {selectedView === 'daily' && hasData(reportData.dailyData) && (
              <div className={`rounded-xl shadow-sm border p-6 mb-6 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Análisis Diario Detallado
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                      <XAxis
                        dataKey="date"
                        stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                        fontSize={12}
                      />
                      <YAxis
                        tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                        stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                        fontSize={12}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="sales" fill="#10b981" name="Ventas" />
                      <Bar dataKey="averageTicket" fill="#8b5cf6" name="Ticket Promedio" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {selectedView === 'categories' && hasData(reportData.categoryAnalysis) && (
              <div className={`rounded-xl shadow-sm border p-6 mb-6 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Ventas por Categoría
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.categoryAnalysis}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="sales"
                      >
                        {reportData.categoryAnalysis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
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
              No se encontraron datos de ventas para el período seleccionado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SalesReport;