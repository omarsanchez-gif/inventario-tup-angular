import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import type {
  AssetModelCatalogs,
  AssetModelDraft,
  AssetModelImageAccess,
  AssetModelsGateway,
  AssetModelsListResult,
  AssetModelUpdate,
} from './asset-models.gateway';

@Injectable()
export class FirebaseAssetModelsGateway implements AssetModelsGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async list(): Promise<AssetModelsListResult> {
    return (
      await httpsCallable<Record<string, never>, AssetModelsListResult>(
        this.functions,
        'listAssetModels',
      )({})
    ).data;
  }

  async catalogs(): Promise<AssetModelCatalogs> {
    return (
      await httpsCallable<Record<string, never>, AssetModelCatalogs>(
        this.functions,
        'getAssetModelCatalogs',
      )({})
    ).data;
  }

  async create(input: AssetModelDraft): Promise<string> {
    const result = await httpsCallable<AssetModelDraft, { documentId: string }>(
      this.functions,
      'createAssetModel',
    )(input);
    return result.data.documentId;
  }

  async update(input: AssetModelUpdate): Promise<void> {
    await httpsCallable<AssetModelUpdate, unknown>(this.functions, 'updateAssetModel')(input);
  }

  async setStatus(documentId: string, activo: boolean): Promise<void> {
    await httpsCallable<{ documentId: string; activo: boolean }, unknown>(
      this.functions,
      'setAssetModelStatus',
    )({ documentId, activo });
  }

  async delete(documentId: string): Promise<void> {
    await httpsCallable<{ documentId: string }, unknown>(
      this.functions,
      'deleteAssetModel',
    )({
      documentId,
    });
  }

  async setImage(documentId: string, file: File, base64: string): Promise<void> {
    await httpsCallable<
      { documentId: string; fileName: string; contentType: string; base64: string },
      unknown
    >(
      this.functions,
      'setAssetModelImage',
    )({
      documentId,
      fileName: file.name,
      contentType: file.type,
      base64,
    });
  }

  async removeImage(documentId: string): Promise<void> {
    await httpsCallable<{ documentId: string }, unknown>(
      this.functions,
      'removeAssetModelImage',
    )({ documentId });
  }

  async imageAccess(
    documentId: string,
    variant: 'thumbnail' | 'original' | 'both',
  ): Promise<AssetModelImageAccess> {
    return (
      await httpsCallable<
        { documentId: string; variant: 'thumbnail' | 'original' | 'both' },
        AssetModelImageAccess
      >(
        this.functions,
        'getAssetModelImageAccess',
      )({ documentId, variant })
    ).data;
  }
}
