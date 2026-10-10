import { errorRestriccionEdad } from './restriccion-edad';

// fecha fija para que las pruebas no dependan del dia en que se corren
const hoy = new Date(2026, 9, 10); // 10/10/2026

describe('errorRestriccionEdad', () => {
  it('una pelicula sin restriccion no exige fecha ni edad', () => {
    expect(errorRestriccionEdad(0, null, hoy)).toBeNull();
  });

  it('una pelicula con restriccion pide la fecha de nacimiento', () => {
    expect(errorRestriccionEdad(18, null, hoy)).toContain('fecha de nacimiento');
  });

  it('bloquea a un menor de 18 en una pelicula +18', () => {
    // cumple 18 manana: todavia tiene 17
    expect(errorRestriccionEdad(18, '2008-10-11', hoy)).toContain('mayores de 18');
  });

  it('permite comprar el dia que cumple 18', () => {
    expect(errorRestriccionEdad(18, '2008-10-10', hoy)).toBeNull();
  });

  it('bloquea a un menor de 13 en una pelicula +13 y permite a quien ya cumplio 13', () => {
    expect(errorRestriccionEdad(13, '2014-06-01', hoy)).toContain('mayores de 13');
    expect(errorRestriccionEdad(13, '2013-06-01', hoy)).toBeNull();
  });

  it('rechaza una fecha inexistente', () => {
    expect(errorRestriccionEdad(18, '2000-02-31', hoy)).toContain('no es válida');
  });
});