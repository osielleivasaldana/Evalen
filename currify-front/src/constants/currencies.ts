export interface Currency {
  code: string;
  name: string;
  symbol: string;
  country: string;
}

export const CURRENCIES: Currency[] = [
  // Latinoamérica
  { code: 'CLP', name: 'Peso Chileno', symbol: '$', country: 'Chile' },
  { code: 'UF', name: 'Unidad de Fomento', symbol: 'UF', country: 'Chile' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$', country: 'Argentina' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', country: 'Brasil' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$', country: 'México' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$', country: 'Colombia' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', country: 'Perú' },
  { code: 'UYU', name: 'Peso Uruguayo', symbol: '$', country: 'Uruguay' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs.', country: 'Bolivia' },
  { code: 'PYG', name: 'Guaraní', symbol: '₲', country: 'Paraguay' },
  { code: 'VES', name: 'Bolívar', symbol: 'Bs.', country: 'Venezuela' },
  { code: 'DOP', name: 'Peso Dominicano', symbol: 'RD$', country: 'Rep. Dominicana' },
  { code: 'CRC', name: 'Colón Costarricense', symbol: '₡', country: 'Costa Rica' },
  { code: 'GTQ', name: 'Quetzal', symbol: 'Q', country: 'Guatemala' },
  { code: 'PAB', name: 'Balboa', symbol: 'B/.', country: 'Panamá' },

  // Principales internacionales
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', country: 'Estados Unidos' },
  { code: 'EUR', name: 'Euro', symbol: '€', country: 'Zona Euro' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£', country: 'Reino Unido' },
  { code: 'CAD', name: 'Dólar Canadiense', symbol: 'C$', country: 'Canadá' },
  { code: 'CHF', name: 'Franco Suizo', symbol: 'CHF', country: 'Suiza' },
  { code: 'JPY', name: 'Yen Japonés', symbol: '¥', country: 'Japón' },
  { code: 'CNY', name: 'Yuan Chino', symbol: '¥', country: 'China' },
  { code: 'AUD', name: 'Dólar Australiano', symbol: 'A$', country: 'Australia' },
  { code: 'NZD', name: 'Dólar Neozelandés', symbol: 'NZ$', country: 'Nueva Zelanda' },

  // Europa
  { code: 'SEK', name: 'Corona Sueca', symbol: 'kr', country: 'Suecia' },
  { code: 'NOK', name: 'Corona Noruega', symbol: 'kr', country: 'Noruega' },
  { code: 'DKK', name: 'Corona Danesa', symbol: 'kr', country: 'Dinamarca' },
  { code: 'PLN', name: 'Zloty Polaco', symbol: 'zł', country: 'Polonia' },
  { code: 'CZK', name: 'Corona Checa', symbol: 'Kč', country: 'República Checa' },

  // Asia y Medio Oriente
  { code: 'INR', name: 'Rupia India', symbol: '₹', country: 'India' },
  { code: 'SGD', name: 'Dólar de Singapur', symbol: 'S$', country: 'Singapur' },
  { code: 'HKD', name: 'Dólar de Hong Kong', symbol: 'HK$', country: 'Hong Kong' },
  { code: 'KRW', name: 'Won Surcoreano', symbol: '₩', country: 'Corea del Sur' },
  { code: 'AED', name: 'Dirham de EAU', symbol: 'د.إ', country: 'Emiratos Árabes' },
  { code: 'SAR', name: 'Riyal Saudí', symbol: '﷼', country: 'Arabia Saudita' },
  { code: 'ILS', name: 'Nuevo Shekel', symbol: '₪', country: 'Israel' },

  // África
  { code: 'ZAR', name: 'Rand Sudafricano', symbol: 'R', country: 'Sudáfrica' },
];

export const getCurrencyByCode = (code: string): Currency | undefined => {
  return CURRENCIES.find(c => c.code === code);
};

export const formatCurrency = (amount: number, currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) return `${currencyCode} ${amount.toLocaleString()}`;

  return `${currency.symbol} ${amount.toLocaleString('es-CL')}`;
};

export const WIZARD_CURRENCIES = [
  { symbol: '$', label: '$ CLP — Peso Chileno', code: 'CLP' },
  { symbol: 'US$', label: 'US$ USD — Dólar', code: 'USD' },
  { symbol: '€', label: '€ EUR — Euro', code: 'EUR' },
  { symbol: 'UF', label: 'UF — Unidad de Fomento', code: 'UF' },
];
