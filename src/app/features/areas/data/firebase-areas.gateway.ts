import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import type {
  AreaCatalogsResult,
  AreaDraft,
  AreaReconciliationResult,
  AreasGateway,
  AreasListResult,
  AreaUpdate,
} from './areas.gateway';

@Injectable()
export class FirebaseAreasGateway implements AreasGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);
  async list(): Promise<AreasListResult> {
    return (
      await httpsCallable<Record<string, never>, AreasListResult>(this.functions, 'listAreas')({})
    ).data;
  }
  async catalogs(currentCampusId?: string): Promise<AreaCatalogsResult> {
    return (
      await httpsCallable<{ currentCampusId?: string }, AreaCatalogsResult>(
        this.functions,
        'getAreaCatalogs',
      )(currentCampusId ? { currentCampusId } : {})
    ).data;
  }
  async create(input: AreaDraft): Promise<{ readonly documentId: string }> {
    return (
      await httpsCallable<AreaDraft, { documentId: string }>(this.functions, 'createArea')(input)
    ).data;
  }
  async update(input: AreaUpdate): Promise<void> {
    await httpsCallable<AreaUpdate, unknown>(this.functions, 'updateArea')(input);
  }
  async setStatus(documentId: string, activo: boolean): Promise<void> {
    await httpsCallable(this.functions, 'setAreaStatus')({ documentId, activo });
  }
  async delete(documentId: string): Promise<void> {
    await httpsCallable(this.functions, 'deleteArea')({ documentId });
  }
  async reconcile(): Promise<AreaReconciliationResult> {
    return (
      await httpsCallable<Record<string, never>, AreaReconciliationResult>(
        this.functions,
        'reconcileAreaCounts',
      )({})
    ).data;
  }
}
