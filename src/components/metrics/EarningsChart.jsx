import { useState, useEffect, useRef } from 'react';
import { useLoading } from '../../context/LoadingContext';
import { useMessage } from '../../context/MessageContext';
import { useTheme } from '../../context/ThemeContext'; // AGREGADO
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
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';

function EarningsChart({ onBack }) {
  const [chartData, setChartData] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [period1, setPeriod1] = useState(7);
  const [period2, setPeriod2] = useState(30);
  const [chartType, setChartType] = useState('line');
  const [loading, setLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(true);
  const { setMessage } = useMessage();
  const { theme } = useTheme(); // AGREGADO

   // ✅ Usar useRef para evitar dobles peticiones
    const hasFetched = useRef(false);
    const isCurrentlyFetching = useRef(false);

  // Función para obtener datos de ganancias
  const fetchEarningsData = async (days, label) => {
    try {
      const response = await fetch(`http://localhost:8081/api/metrics/daily-earnings/${days}`);

      console.log('🔍 Iniciando fetchOrders...');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
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
        let errorMessage = 'Error al cargar las órdenes.';

        if (error.name === 'TimeoutError') {
            errorMessage = 'Tiempo de espera agotado. Verifica que el backend esté corriendo.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté corriendo en http://localhost:8081';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'Error de CORS. Verifica la configuración del backend.';
        } else if (error.message.includes('HTTP error')) {
          errorMessage = `Error del servidor: ${error.message}`;
        }

        setMessage({
        text: errorMessage,
        type: 'error'
        });
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
     if (isCurrentlyFetching.current) {
      console.log('🚫 Ya hay una petición en curso, saltando...');
      return;
    }

    isCurrentlyFetching.current = true;
    setLoading(true);
    try {
      const [data1, data2] = await Promise.all([
        fetchEarningsData(period1, `Período ${period1} días`),
        fetchEarningsData(period2, `Período ${period2} días`)
      ]);

      setChartData(data1);
      setCompareData(data2);
      setMessage(null);
      hasFetched.current = true; // ✅ Marcar como cargado exitosamente
    } catch (error) {
      console.error('Error loading chart data:', error);
      hasFetched.current = false; // ✅ Permitir retry en caso de error
      setMessage({
        text: 'Error al cargar los datos de la gráfica',
        type: 'error'
      });
    } finally {
      setLoading(false);
      isCurrentlyFetching.current = false;
    }
  };

  // Función para cambiar períodos
  const handlePeriodChange = async (periodType) => {
    const result = await Swal.fire({
      title: `Seleccionar período ${periodType === 'period1' ? '1' : '2'}`,
      input: 'select',
      inputOptions: {
        '1': 'Ayer (1 día)',
        '7': 'Última semana (7 días)',
        '15': 'Últimos 15 días',
        '30': 'Último mes (30 días)',
        '60': 'Últimos 2 meses',
        '90': 'Últimos 3 meses',
        'custom': 'Personalizado...'
      },
      inputValue: periodType === 'period1' ? period1.toString() : period2.toString(),
      showCancelButton: true,
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      let days = parseInt(result.value);

      if (result.value === 'custom') {
        const customResult = await Swal.fire({
          title: 'Días personalizados',
          input: 'number',
          inputLabel: 'Número de días',
          inputPlaceholder: 'Ej: 45',
          inputAttributes: {
            min: 1,
            max: 365,
            step: 1
          },
          inputValidator: (value) => {
            if (value < 1) return '¡Mínimo 1 día!';
            if (value > 365) return '¡Máximo 365 días!';
          }
        });

        if (!customResult.isConfirmed) return;
        days = parseInt(customResult.value);
      }

      if (periodType === 'period1') {
        setPeriod1(days);
      } else {
        setPeriod2(days);
      }

      // Recargar datos después de cambiar período
      setTimeout(() => {
        loadChartData();
      }, 100);
    }
  };

  // Combinar datos para comparación
  const combinedData = chartData.map((item, index) => {
    const compareItem = compareData[index] || {};
    return {
      ...item,
      // Datos del período 2 para comparación
      grossSells2: compareItem.grossSells || 0,
      grossProfit2: compareItem.grossProfit || 0,
      netProfit2: compareItem.netProfit || 0,
      orders2: compareItem.orders || 0
    };
  });

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-4 border rounded-lg shadow-lg max-w-xs ${
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

  // Formatear moneda para ejes
  const formatCurrency = (value) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  // Formatear tooltip
  const formatTooltipValue = (value, name) => {
    return [`$${value?.toLocaleString() || 0}`, name];
  };

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
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="font-medium">Volver</span>
              </button>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <ChartBarIcon className="w-8 h-8 text-purple-600" />
                  Gráfica de Ganancias
                </h1>
                <p className="text-gray-600 mt-1">Análisis comparativo y tendencias de ingresos</p>
              </div>
            </div>

            {/* Controles */}
            <div className="flex flex-wrap gap-2">
              {/* Tipo de gráfica */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {[
                  { type: 'line', icon: '📈', label: 'Línea' },
                  { type: 'bar', icon: '📊', label: 'Barras' },
                  { type: 'area', icon: '🔵', label: 'Área' }
                ].map((chart) => (
                  <button
                    key={chart.type}
                    onClick={() => setChartType(chart.type)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      chartType === chart.type
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                    title={chart.label}
                  >
                    {chart.icon}
                  </button>
                ))}
              </div>

              {/* Toggle comparación */}
              <button
                onClick={() => setShowComparison(!showComparison)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showComparison
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showComparison ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                Comparar
              </button>

              {/* Actualizar */}
              <button
                onClick={loadChartData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                )}
                {loading ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>

        {/* Controles de período */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  Período Principal:
                </span>
                <button
                  onClick={() => handlePeriodChange('period1')}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors border border-blue-200"
                >
                  📊 {period1} días
                </button>
              </div>

              {showComparison && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Comparar con:</span>
                  <button
                    onClick={() => handlePeriodChange('period2')}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors border border-green-200"
                  >
                    📈 {period2} días
                  </button>
                </div>
              )}
            </div>

            {chartData.length > 0 && (
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                📅 Mostrando {chartData.length} días de datos
              </div>
            )}
          </div>
        </div>

        {/* Gráfica */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Cargando datos de ganancias...</p>
              <p className="text-gray-500 text-sm mt-2">Procesando información financiera</p>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {chartType === 'line' && '📈 Tendencias de Ganancias'}
                {chartType === 'bar' && '📊 Comparación por Días'}
                {chartType === 'area' && '🔵 Volumen de Ganancias'}
              </h3>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Ventas Brutas ({period1}d)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Ganancia Bruta ({period1}d)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Ganancia Neta ({period1}d)</span>
                </div>
                {showComparison && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-300 rounded-full border-2 border-green-500"></div>
                      <span>Ventas Brutas ({period2}d)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-300 rounded-full border-2 border-blue-500"></div>
                      <span>Ganancia Bruta ({period2}d)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-300 rounded-full border-2 border-purple-500"></div>
                      <span>Ganancia Neta ({period2}d)</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' && (
                  <LineChart data={showComparison ? combinedData : chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={formatTooltipValue}
                    />
                    <Legend />

                    {/* Líneas principales */}
                    <Line
                      type="monotone"
                      dataKey="grossSells"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name={`💰 Ventas Brutas (${period1}d)`}
                    />
                    <Line
                      type="monotone"
                      dataKey="grossProfit"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name={`📊 Ganancia Bruta (${period1}d)`}
                    />
                    <Line
                      type="monotone"
                      dataKey="netProfit"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name={`💎 Ganancia Neta (${period1}d)`}
                    />

                    {/* Líneas de comparación */}
                    {showComparison && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="grossSells2"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="8 4"
                          dot={{ r: 2 }}
                          name={`💰 Ventas Brutas (${period2}d)`}
                        />
                        <Line
                          type="monotone"
                          dataKey="grossProfit2"
                          stroke="#3b82f6"
                          strokeWidth={1}
                          strokeDasharray="8 4"
                          dot={{ r: 2 }}
                          name={`📊 Ganancia Bruta (${period2}d)`}
                        />
                        <Line
                          type="monotone"
                          dataKey="netProfit2"
                          stroke="#8b5cf6"
                          strokeWidth={1}
                          strokeDasharray="8 4"
                          dot={{ r: 2 }}
                          name={`💎 Ganancia Neta (${period2}d)`}
                        />
                      </>
                    )}
                  </LineChart>
                )}

                {chartType === 'bar' && (
                  <BarChart data={showComparison ? combinedData : chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={formatTooltipValue}
                    />
                    <Legend />

                    <Bar dataKey="grossSells" fill="#10b981" name={`💰 Ventas Brutas (${period1}d)`} />
                    <Bar dataKey="grossProfit" fill="#3b82f6" name={`📊 Ganancia Bruta (${period1}d)`} />
                    <Bar dataKey="netProfit" fill="#8b5cf6" name={`💎 Ganancia Neta (${period1}d)`} />

                    {showComparison && (
                      <>
                        <Bar dataKey="grossSells2" fill="#10b981" fillOpacity={0.5} name={`💰 Ventas Brutas (${period2}d)`} />
                        <Bar dataKey="grossProfit2" fill="#3b82f6" fillOpacity={0.5} name={`📊 Ganancia Bruta (${period2}d)`} />
                        <Bar dataKey="netProfit2" fill="#8b5cf6" fillOpacity={0.5} name={`💎 Ganancia Neta (${period2}d)`} />
                      </>
                    )}
                  </BarChart>
                )}

                {chartType === 'area' && (
                  <AreaChart data={showComparison ? combinedData : chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={formatTooltipValue}
                    />
                    <Legend />

                    <Area
                      type="monotone"
                      dataKey="grossSells"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.8}
                      name={`💰 Ventas Brutas (${period1}d)`}
                    />
                    <Area
                      type="monotone"
                      dataKey="grossProfit"
                      stackId="2"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name={`📊 Ganancia Bruta (${period1}d)`}
                    />
                    <Area
                      type="monotone"
                      dataKey="netProfit"
                      stackId="3"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.6}
                      name={`💎 Ganancia Neta (${period1}d)`}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ChartBarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay datos disponibles</h3>
            <p className="text-gray-600 mb-6">No se encontraron datos de ganancias para mostrar en la gráfica.</p>
            <button
              onClick={loadChartData}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              🔄 Reintentar carga de datos
            </button>
          </div>
        )}

        {/* Estadísticas resumidas */}
        {!loading && chartData.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Promedio Ventas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(chartData.reduce((sum, d) => sum + d.grossSells, 0) / chartData.length).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Últimos {period1} días</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Promedio Ganancia</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(chartData.reduce((sum, d) => sum + d.grossProfit, 0) / chartData.length).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Ganancia bruta diaria</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100">
                  <BanknotesIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Mejor Día</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${Math.max(...chartData.map(d => d.grossSells)).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Máximo en ventas</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <ChartBarIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Órdenes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {chartData.reduce((sum, d) => sum + d.orders, 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">En {period1} días</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EarningsChart;