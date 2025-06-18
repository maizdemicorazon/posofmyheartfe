import { useState, useEffect } from 'react';
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

  // Función para obtener datos del reporte
  const fetchSalesReport = async (days) => {
    try {
      const response = await fetch(`http://localhost:8081/api/reports/sales/${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Agregar token de autenticación si es necesario
          // 'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Sales Report Data:', data);

      // Procesar datos para asegurar formato correcto
      return processReportData(data);
    } catch (error) {
      console.error('Error fetching sales report:', error);
      setMessage({
        text: `Error al cargar el reporte: ${error.message}`,
        type: 'error'
      });
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

  // Cargar datos iniciales
  useEffect(() => {
    loadReportData();
  }, [period, customDays]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const days = period === 'custom' ? customDays : getPeriodDays(period);
      const data = await fetchSalesReport(days);
      setReportData(data);

      // Mensaje de éxito solo si no hay errores
      if (data && !data.error) {
        setMessage({
          text: 'Reporte cargado exitosamente',
          type: 'success'
        });
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error loading sales report:', error);
      setMessage({
        text: 'Error al cargar el reporte de ventas',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getPeriodDays = (periodType) => {
    switch (periodType) {
      case 'today': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 7;
    }
  };

  const handlePeriodChange = async (newPeriod) => {
    if (newPeriod === 'custom') {
      const result = await Swal.fire({
        title: 'Período personalizado',
        input: 'number',
        inputLabel: 'Número de días',
        inputPlaceholder: 'Ej: 15, 45, 60',
        inputValue: customDays,
        inputAttributes: {
          min: 1,
          max: 365,
          step: 1
        },
        showCancelButton: true,
        confirmButtonText: 'Aplicar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        inputValidator: (value) => {
          if (!value || value < 1) return '¡Mínimo 1 día!';
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

  const exportReport = async (format) => {
    if (!reportData) return;

    try {
      const response = await fetch(`http://localhost:8081/api/reports/sales/${reportData.period}/export/${format}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-ventas-${reportData.period}-dias.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setMessage({
          text: `Reporte exportado en ${format.toUpperCase()}`,
          type: 'success'
        });
      } else {
        throw new Error('Error al exportar el reporte');
      }
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value || 0).toFixed(1)}%`;
  };

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

  // Función para verificar si hay datos disponibles
  const hasData = (data) => {
    return data && data.length > 0;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <BusinessHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className={`rounded-xl shadow-sm border p-12 text-center ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Generando reporte de ventas...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <BusinessHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className={`rounded-xl shadow-sm border mb-6 p-6 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="font-medium">Volver</span>
              </button>

              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold flex items-center gap-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  <ChartBarIcon className="w-8 h-8 text-blue-600" />
                  Reporte de Ventas
                </h1>
                <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Análisis detallado de rendimiento comercial
                </p>
              </div>
            </div>

            {/* Controles */}
            <div className="flex flex-wrap gap-2">
              {/* Selector de período */}
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[
                  { key: 'today', label: 'Hoy', icon: '📅' },
                  { key: 'week', label: 'Semana', icon: '📊' },
                  { key: 'month', label: 'Mes', icon: '📈' },
                  { key: 'quarter', label: 'Trimestre', icon: '📋' },
                  { key: 'custom', label: 'Custom', icon: '⚙️' }
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handlePeriodChange(p.key)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      period === p.key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : theme === 'dark'
                        ? 'text-gray-300 hover:bg-gray-600'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                    title={p.label}
                  >
                    {p.icon}
                  </button>
                ))}
              </div>

              {/* Botones de acción */}
              <button
                onClick={() => exportReport('pdf')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                PDF
              </button>

              <button
                onClick={loadReportData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                )}
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {reportData && (
          <>
            {/* Métricas principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className={`p-6 rounded-xl shadow-sm border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Ventas Totales
                    </p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(reportData.totalSales)}
                    </p>
                    {compareWithPrevious && (
                      <div className="flex items-center mt-1">
                        {reportData.growthRate >= 0 ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm ml-1 ${
                          reportData.growthRate >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {formatPercentage(reportData.growthRate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-xl shadow-sm border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <ChartBarIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Órdenes
                    </p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {(reportData.totalOrders || 0).toLocaleString()}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {reportData.ordersAverage || 0}/día promedio
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-xl shadow-sm border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Ticket Promedio
                    </p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(reportData.averageTicket)}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Por orden
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-xl shadow-sm border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                    <CalendarIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Promedio Diario
                    </p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(reportData.dailyAverage)}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Últimos {reportData.period} días
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navegación por vistas */}
            <div className={`rounded-xl shadow-sm border mb-6 p-4 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'overview', label: '📊 Resumen', desc: 'Vista general' },
                  { key: 'trends', label: '📈 Tendencias', desc: 'Gráficas temporales' },
                  { key: 'categories', label: '🏷️ Categorías', desc: 'Análisis por productos' },
                  { key: 'weekdays', label: '📅 Días', desc: 'Rendimiento semanal' }
                ].map((view) => (
                  <button
                    key={view.key}
                    onClick={() => setSelectedView(view.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedView === view.key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : theme === 'dark'
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={view.desc}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido por vista */}
            {selectedView === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ventas diarias */}
                <div className={`p-6 rounded-xl shadow-sm border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    📈 Ventas Diarias
                  </h3>
                  {hasData(reportData.dailyData) ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reportData.dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#6b7280' }}
                          />
                          <YAxis
                            tickFormatter={formatCurrency}
                            tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#6b7280' }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="sales"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            name="Ventas"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        No hay datos disponibles para este período
                      </p>
                    </div>
                  )}
                </div>

                {/* Top productos */}
                <div className={`p-6 rounded-xl shadow-sm border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    🏆 Top Categorías
                  </h3>
                  {hasData(reportData.categoryAnalysis) ? (
                    <div className="space-y-4">
                      {reportData.categoryAnalysis.map((category, index) => (
                        <div key={category.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`}
                                 style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                              {index + 1}
                            </div>
                            <div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {category.name}
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {category.orders} órdenes
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {formatCurrency(category.sales)}
                            </p>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {category.percentage}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        No hay datos de categorías disponibles
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedView === 'trends' && (
              <div className={`p-6 rounded-xl shadow-sm border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  📈 Tendencias de Ventas y Órdenes
                </h3>
                {hasData(reportData.dailyData) ? (
                  <>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#6b7280' }}
                          />
                          <YAxis
                            yAxisId="sales"
                            orientation="left"
                            tickFormatter={formatCurrency}
                            tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#6b7280' }}
                          />
                          <YAxis
                            yAxisId="orders"
                            orientation="right"
                            tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#6b7280' }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar
                            yAxisId="sales"
                            dataKey="sales"
                            fill="#10b981"
                            name="Ventas ($)"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            yAxisId="orders"
                            dataKey="orders"
                            fill="#3b82f6"
                            name="Órdenes"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Análisis de tendencias */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                        <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          📊 Mejor Día
                        </h4>
                        <p className={`text-lg font-bold text-green-600`}>
                          {reportData.dailyData.reduce((max, day) =>
                            day.sales > max.sales ? day : max
                          ).date}
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatCurrency(Math.max(...reportData.dailyData.map(d => d.sales)))}
                        </p>
                      </div>

                      <div className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                        <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          📉 Día Más Bajo
                        </h4>
                        <p className={`text-lg font-bold text-orange-600`}>
                          {reportData.dailyData.reduce((min, day) =>
                            day.sales < min.sales ? day : min
                          ).date}
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatCurrency(Math.min(...reportData.dailyData.map(d => d.sales)))}
                        </p>
                      </div>

                      <div className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                        <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          🎯 Variación
                        </h4>
                        <p className={`text-lg font-bold text-purple-600`}>
                          {(((Math.max(...reportData.dailyData.map(d => d.sales)) -
                              Math.min(...reportData.dailyData.map(d => d.sales))) /
                              reportData.dailyAverage) * 100).toFixed(1)}%
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Volatilidad
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      No hay datos de tendencias disponibles
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedView === 'categories' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfica de pastel */}
                <div className={`p-6 rounded-xl shadow-sm border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    🥧 Distribución por Categorías
                  </h3>
                  {hasData(reportData.categoryAnalysis) ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.categoryAnalysis}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({name, percentage}) => `${name} ${percentage}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="sales"
                          >
                            {reportData.categoryAnalysis.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        No hay datos de categorías disponibles
                      </p>
                    </div>
                  )}
                </div>

                {/* Análisis detallado por categoría */}
                <div className={`p-6 rounded-xl shadow-sm border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    📋 Análisis Detallado
                  </h3>
                  {hasData(reportData.categoryAnalysis) ? (
                    <div className="space-y-4">
                      {reportData.categoryAnalysis.map((category, index) => (
                        <div key={category.name} className={`p-4 rounded-lg border ${
                          theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              ></div>
                              <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {category.name}
                              </h4>
                            </div>
                            <span className={`text-sm font-bold ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {category.percentage}%
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                Ventas
                              </p>
                              <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {formatCurrency(category.sales)}
                              </p>
                            </div>
                            <div>
                              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                Órdenes
                              </p>
                              <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {category.orders}
                              </p>
                            </div>
                            <div>
                              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                Ticket Promedio
                              </p>
                              <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {formatCurrency(category.sales / (category.orders || 1))}
                              </p>
                            </div>
                            <div>
                              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                Órdenes/Día
                              </p>
                              <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {(category.orders / (reportData.period || 1)).toFixed(1)}
                              </p>
                            </div>
                          </div>

                          {/* Barra de progreso */}
                          <div className="mt-3">
                            <div className={`w-full rounded-full h-2 ${
                              theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                            }`}>
                              <div
                                className="h-2 rounded-full transition-all duration-500"
                                style={{
                                  width: `${category.percentage}%`,
                                  backgroundColor: COLORS[index % COLORS.length]
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        No hay datos de categorías disponibles
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedView === 'weekdays' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfica de días de la semana */}
                <div className={`p-6 rounded-xl shadow-sm border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    📅 Rendimiento por Día de la Semana
                  </h3>
                  {hasData(reportData.weekdayAnalysis) ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.weekdayAnalysis} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} />
                          <XAxis
                            type="number"
                            tickFormatter={formatCurrency}
                            tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#6b7280' }}
                          />
                          <YAxis
                            type="category"
                            dataKey="day"
                            tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#6b7280' }}
                            width={80}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar
                            dataKey="averageSales"
                            fill="#10b981"
                            name="Promedio Ventas"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        No hay datos de días disponibles
                      </p>
                    </div>
                  )}
                </div>

                {/* Horarios pico */}
                <div className={`p-6 rounded-xl shadow-sm border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    ⏰ Horarios Pico
                  </h3>
                  {hasData(reportData.peakHours) ? (
                    <>
                      <div className="space-y-3">
                        {reportData.peakHours.map((hour, index) => (
                          <div key={hour.hour} className={`flex items-center justify-between p-3 rounded-lg ${
                            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                index === 0 ? 'bg-yellow-500' :
                                index === 1 ? 'bg-gray-400' :
                                index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {hour.hour}
                                </p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {hour.percentage}% del total
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {formatCurrency(hour.sales)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Recomendaciones */}
                      <div className={`mt-6 p-4 rounded-lg border-l-4 border-blue-500 ${
                        theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                      }`}>
                        <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                          💡 Recomendaciones
                        </h4>
                        <ul className={`text-sm space-y-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                          <li>• Reforzar personal en horarios pico</li>
                          <li>• Preparar más inventario antes de las {reportData.peakHours[0]?.hour}</li>
                          <li>• Considerar promociones en horarios bajos</li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        No hay datos de horarios disponibles
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumen y conclusiones */}
            <div className={`mt-6 p-6 rounded-xl shadow-sm border ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                📝 Resumen Ejecutivo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    🎯 Puntos Clave
                  </h4>
                  <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✅</span>
                      <span>
                        Ventas totales: <strong>{formatCurrency(reportData.totalSales)}</strong>
                        en {reportData.period} días
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">📊</span>
                      <span>
                        Ticket promedio: <strong>{formatCurrency(reportData.averageTicket)}</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={reportData.growthRate >= 0 ? "text-green-500" : "text-red-500"}>
                        {reportData.growthRate >= 0 ? "📈" : "📉"}
                      </span>
                      <span>
                        Crecimiento: <strong>{formatPercentage(reportData.growthRate)}</strong>
                        vs período anterior
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500">🏆</span>
                      <span>
                        Categoría top: <strong>{reportData.categoryAnalysis[0]?.name || 'N/A'}</strong>
                        {reportData.categoryAnalysis[0]?.percentage && ` (${reportData.categoryAnalysis[0].percentage}%)`}
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    🚀 Oportunidades
                  </h4>
                  <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500">💡</span>
                      <span>
                        {reportData.peakHours?.[0] ?
                          `Optimizar horarios de ${reportData.peakHours[0].hour} (pico de ventas)` :
                          'Analizar horarios de mayor demanda'
                        }
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500">🎯</span>
                      <span>
                        {reportData.categoryAnalysis?.length > 0 ?
                          `Promocionar ${reportData.categoryAnalysis[reportData.categoryAnalysis.length - 1].name} (menor participación)` :
                          'Identificar categorías con potencial de crecimiento'
                        }
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-500">📅</span>
                      <span>
                        Analizar días de menor venta para estrategias especiales
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-500">💰</span>
                      <span>
                        Meta próximo período: {formatCurrency(reportData.totalSales * 1.1)}
                        (+10%)
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Mensaje cuando no hay datos */}
        {!loading && !reportData && (
          <div className={`rounded-xl shadow-sm border p-12 text-center ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <ChartBarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              No hay datos de reporte disponibles
            </p>
            <button
              onClick={loadReportData}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Cargar Reporte
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SalesReport;