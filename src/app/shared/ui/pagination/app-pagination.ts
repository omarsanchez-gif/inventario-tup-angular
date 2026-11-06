import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { AppIcon } from '../icon/app-icon';

@Component({
  selector: 'app-pagination',
  imports: [AppIcon],
  templateUrl: './app-pagination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppPagination {
  readonly totalItems = input.required<number>();
  readonly page = input.required<number>();
  readonly pageSize = input(10);
  readonly pageChange = output<number>();

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize())),
  );
  protected readonly currentPage = computed(() =>
    Math.min(Math.max(1, this.page()), this.totalPages()),
  );
  protected readonly firstItem = computed(() =>
    this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1,
  );
  protected readonly lastItem = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.totalItems()),
  );

  protected selectPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.pageChange.emit(page);
  }
}
