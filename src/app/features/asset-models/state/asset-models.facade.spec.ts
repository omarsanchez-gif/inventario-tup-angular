import { TestBed } from '@angular/core/testing';

import { ASSET_MODELS_GATEWAY } from '../data/asset-models.gateway';
import { AssetModelsFacade } from './asset-models.facade';

describe('AssetModelsFacade save recovery', () => {
  it('MOD-041 preserves the confirmed document id when refreshing the list fails', async () => {
    const gateway = {
      list: vi.fn().mockRejectedValue(new Error('injected read failure')),
      catalogs: vi.fn(),
      create: vi.fn().mockResolvedValue('created-model'),
      update: vi.fn(),
      setStatus: vi.fn(),
      delete: vi.fn(),
      setImage: vi.fn(),
      removeImage: vi.fn(),
      imageAccess: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [AssetModelsFacade, { provide: ASSET_MODELS_GATEWAY, useValue: gateway }],
    });
    const facade = TestBed.inject(AssetModelsFacade);

    const result = await facade.save({
      nombre: 'Modelo confirmado',
      categoriaId: 'category',
      fabricanteId: 'manufacturer',
      modeloNo: null,
      notas: null,
    });

    expect(result).toEqual({
      documentId: 'created-model',
      dataSaved: true,
      listRefreshed: false,
    });
    expect(facade.error()).toContain('quedó guardado');
    expect(gateway.create).toHaveBeenCalledOnce();
  });
});
