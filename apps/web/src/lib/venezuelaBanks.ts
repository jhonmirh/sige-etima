export type VenezuelaBank = {
  code: string;
  name: string;
};

// Catálogo bancario venezolano de uso común para cuentas de personas.
// El código se muestra al usuario, mientras que bankName conserva el nombre normalizado.
export const VENEZUELA_BANKS: VenezuelaBank[] = [
  { code: '0102', name: 'BANCO DE VENEZUELA' },
  { code: '0104', name: 'BANCO VENEZOLANO DE CRÉDITO' },
  { code: '0105', name: 'MERCANTIL BANCO' },
  { code: '0108', name: 'BBVA PROVINCIAL' },
  { code: '0114', name: 'BANCARIBE' },
  { code: '0115', name: 'BANCO EXTERIOR' },
  { code: '0128', name: 'BANCO CARONÍ' },
  { code: '0134', name: 'BANESCO' },
  { code: '0137', name: 'BANCO SOFITASA' },
  { code: '0138', name: 'BANCO PLAZA' },
  { code: '0146', name: 'BANGENTE' },
  { code: '0151', name: 'BFC BANCO FONDO COMÚN' },
  { code: '0156', name: '100% BANCO' },
  { code: '0157', name: 'DELSUR BANCO UNIVERSAL' },
  { code: '0163', name: 'BANCO DEL TESORO' },
  { code: '0166', name: 'BANCO AGRÍCOLA DE VENEZUELA' },
  { code: '0168', name: 'BANCRECER' },
  { code: '0169', name: 'R4 BANCO MICROFINANCIERO' },
  { code: '0171', name: 'BANCO ACTIVO' },
  { code: '0172', name: 'BANCAMIGA' },
  { code: '0173', name: 'BANCO INTERNACIONAL DE DESARROLLO' },
  { code: '0174', name: 'BANPLUS' },
  { code: '0175', name: 'BANCO DIGITAL DE LOS TRABAJADORES' },
  { code: '0177', name: 'BANFANB' },
  { code: '0178', name: 'N58 BANCO DIGITAL' },
  { code: '0191', name: 'BANCO NACIONAL DE CRÉDITO' },
];

export function bankOptionLabel(bank: VenezuelaBank) {
  return `${bank.code} · ${bank.name}`;
}

export function hasCatalogBankName(value?: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLocaleUpperCase('es-VE');
  return VENEZUELA_BANKS.some((bank) => bank.name === normalized);
}
