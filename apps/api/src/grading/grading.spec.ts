describe('Reglas académicas base',()=>{
  const letter=(s:number)=>s>=18?'A':s>=16?'B':s>=12?'C':'D';
  it('convierte Orientación a A/B/C/D',()=>{expect(letter(20)).toBe('A');expect(letter(17)).toBe('B');expect(letter(12)).toBe('C');expect(letter(9)).toBe('D')});
  it('clasifica por número de materias reprobadas',()=>{const c=(n:number)=>n===0?'REGULAR':n<=2?'MATERIA_PENDIENTE':'REPITIENTE';expect(c(0)).toBe('REGULAR');expect(c(2)).toBe('MATERIA_PENDIENTE');expect(c(3)).toBe('REPITIENTE')});
});
