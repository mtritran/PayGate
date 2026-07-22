import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MerchantService } from '../../../core/services/merchant.service';
import { Merchant } from '../../../core/models/merchant.model';
import { MerchantFormComponent } from '../merchant-form/merchant-form.component';

@Component({
  selector: 'app-merchant-list',
  standalone: true,
  imports: [CommonModule, MerchantFormComponent],
  template: `
    <div class="space-y-6">
      <!-- Top Title & Action Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 backdrop-blur-xl">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-2">
            <span class="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
              </svg>
            </span>
            Merchant Management
          </h1>
          <p class="text-slate-400 text-sm mt-1">Manage registered business partners, webhooks, and automatic wallet provisions.</p>
        </div>

        <button
          (click)="openCreateModal()"
          class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Register Merchant
        </button>
      </div>

      <!-- Merchant List Table Card -->
      <div class="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-700/60 bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th class="px-6 py-4">Merchant</th>
                <th class="px-6 py-4">Code</th>
                <th class="px-6 py-4">Contact</th>
                <th class="px-6 py-4">Webhook URL</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/40 text-sm">
              <tr *ngFor="let m of merchants" class="hover:bg-slate-700/30 transition-colors group">
                <!-- Merchant Info -->
                <td class="px-6 py-4 font-medium text-white">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {{ m.name.substring(0, 2).toUpperCase() }}
                    </div>
                    <div>
                      <div class="font-semibold text-white">{{ m.name }}</div>
                      <div class="text-xs text-slate-400">Account: {{ m.accountNumber || 'Pending' }}</div>
                    </div>
                  </div>
                </td>

                <!-- Code -->
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-indigo-300">
                    {{ m.merchantCode }}
                  </span>
                </td>

                <!-- Contact -->
                <td class="px-6 py-4 text-slate-300">
                  <div>{{ m.contactEmail }}</div>
                  <div class="text-xs text-slate-400">{{ m.contactPhone || 'No phone' }}</div>
                </td>

                <!-- Webhook URL -->
                <td class="px-6 py-4 text-slate-300 max-w-xs truncate" [title]="m.webhookUrl">
                  <span class="text-slate-400 font-mono text-xs">{{ m.webhookUrl }}</span>
                </td>

                <!-- Status -->
                <td class="px-6 py-4">
                  <span
                    [ngClass]="{
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': m.status === 'ACTIVE',
                      'bg-amber-500/10 text-amber-400 border-amber-500/20': m.status === 'INACTIVE',
                      'bg-rose-500/10 text-rose-400 border-rose-500/20': m.status === 'SUSPENDED'
                    }"
                    class="inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold"
                  >
                    {{ m.status }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 text-right">
                  <button
                    (click)="openEditModal(m)"
                    class="p-2 rounded-xl bg-slate-700/50 hover:bg-indigo-600/20 hover:text-indigo-400 text-slate-300 transition-all"
                    title="Edit Merchant"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </td>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="!loading && merchants.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
                  </svg>
                  No merchants found. Click "Register Merchant" to create one.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="px-6 py-4 border-t border-slate-700/60 flex items-center justify-between bg-slate-800/40">
          <div class="text-xs text-slate-400">
            Showing page {{ currentPage + 1 }} of {{ totalPages || 1 }} ({{ totalElements }} items)
          </div>
          <div class="flex items-center gap-2">
            <button
              [disabled]="currentPage === 0 || loading"
              (click)="changePage(currentPage - 1)"
              class="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-700/50 disabled:opacity-40 transition-all"
            >
              Previous
            </button>
            <button
              [disabled]="currentPage >= totalPages - 1 || loading"
              (click)="changePage(currentPage + 1)"
              class="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-700/50 disabled:opacity-40 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Merchant Form Modal -->
      <app-merchant-form
        *ngIf="showModal"
        [merchant]="selectedMerchant"
        (saved)="onModalSaved()"
        (close)="showModal = false"
      ></app-merchant-form>
    </div>
  `
})
export class MerchantListComponent implements OnInit {
  merchants: Merchant[] = [];
  loading = false;
  showModal = false;
  selectedMerchant: Merchant | null = null;

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  constructor(private merchantService: MerchantService) {}

  ngOnInit(): void {
    this.loadMerchants();
  }

  loadMerchants(): void {
    this.loading = true;
    this.merchantService.getAll(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.merchants = res.data.content;
          this.totalPages = res.data.totalPages;
          this.totalElements = res.data.totalElements;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.selectedMerchant = null;
    this.showModal = true;
  }

  openEditModal(merchant: Merchant): void {
    this.selectedMerchant = merchant;
    this.showModal = true;
  }

  onModalSaved(): void {
    this.showModal = false;
    this.loadMerchants();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadMerchants();
  }
}
