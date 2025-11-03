/**
 * Formatea un número con separador de miles usando punto
 * @param value - Número a formatear
 * @returns String formateado (ej: "2.000.000")
 */
export const formatNumber = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value;

  if (isNaN(numValue)) {
    return '';
  }

  return numValue.toLocaleString('es-CL', {
    maximumFractionDigits: 0,
    useGrouping: true
  });
};

/**
 * Parsea un string formateado a número
 * @param value - String formateado (ej: "2.000.000")
 * @returns Número sin formato
 */
export const parseNumber = (value: string): number => {
  if (!value) return 0;

  // Remover puntos de separador de miles
  const cleaned = value.replace(/\./g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formatea un valor de input mientras el usuario escribe
 * @param value - Valor del input
 * @returns Valor formateado
 */
export const formatInputNumber = (value: string): string => {
  // Remover todo excepto números
  const numbers = value.replace(/\D/g, '');

  if (!numbers) return '';

  // Convertir a número y formatear
  return formatNumber(parseInt(numbers));
};
