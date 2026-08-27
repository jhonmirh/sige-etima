import * as path from 'node:path';
import { publicBrandAsset } from './reports';

describe('recursos gráficos de reportes', () => {
  it('resuelve un logo existente dentro de web/public', () => {
    expect(publicBrandAsset('/brand/escudo.png')).toBe(
      path.resolve(process.cwd(), '../web/public/brand/escudo.png'),
    );
  });

  it.each([
    '../../package.json',
    '/../../package.json',
    '/brand/no-existe.png',
    '',
    null,
  ])('rechaza rutas externas o inexistentes: %s', (value) => {
    expect(publicBrandAsset(value)).toBeNull();
  });
});
