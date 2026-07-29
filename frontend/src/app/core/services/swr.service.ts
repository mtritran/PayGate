import { Injectable, signal, Signal } from '@angular/core';
import { Observable, timer, BehaviorSubject, of, catchError, switchMap, tap, shareReplay, Subscription } from 'rxjs';

export interface SwrOptions<T> {
  refreshInterval?: number; // Delay in ms (default 5000ms = 5s)
  revalidateOnFocus?: boolean; // Auto-fetch when window gets focused
  dedupingInterval?: number; // Prevent duplicate requests within this ms
}

export interface SwrState<T> {
  data: T | null;
  error: any | null;
  isValidating: boolean;
}

@Injectable({ providedIn: 'root' })
export class SwrService {
  private cache = new Map<string, any>();
  private subjects = new Map<string, BehaviorSubject<any>>();

  /**
   * Universal SWR Hook for Angular RxJS / Signals.
   * Auto-polls data every X seconds & revalidates on window focus.
   */
  useSWR<T>(
    key: string,
    fetcher: () => Observable<T>,
    options: SwrOptions<T> = {}
  ): {
    data$: Observable<T | null>;
    dataSignal: Signal<T | null>;
    mutate: (data?: T, shouldRevalidate?: boolean) => void;
    revalidate: () => void;
  } {
    const refreshInterval = options.refreshInterval ?? 5000; // Default 5s auto polling
    const revalidateOnFocus = options.revalidateOnFocus ?? true;

    if (!this.subjects.has(key)) {
      const initialValue = this.cache.has(key) ? this.cache.get(key) : null;
      this.subjects.set(key, new BehaviorSubject<T | null>(initialValue));
    }

    const subject$ = this.subjects.get(key)!;
    const signalData = signal<T | null>(this.cache.get(key) || null);

    const revalidate = () => {
      fetcher().pipe(
        catchError(err => {
          console.warn(`[SWR] Error fetching key "${key}":`, err);
          return of(null);
        })
      ).subscribe(res => {
        if (res !== null) {
          this.cache.set(key, res);
          subject$.next(res);
          signalData.set(res);
        }
      });
    };

    // Auto-polling timer
    const pollSubscription = timer(0, refreshInterval).pipe(
      switchMap(() => fetcher().pipe(
        catchError(err => of(null))
      ))
    ).subscribe(res => {
      if (res !== null) {
        this.cache.set(key, res);
        subject$.next(res);
        signalData.set(res);
      }
    });

    // Revalidate on Window Focus
    if (revalidateOnFocus && typeof window !== 'undefined') {
      const focusListener = () => revalidate();
      window.addEventListener('focus', focusListener);
    }

    const mutate = (newData?: T, shouldRevalidate = true) => {
      if (newData !== undefined) {
        this.cache.set(key, newData);
        subject$.next(newData);
        signalData.set(newData);
      }
      if (shouldRevalidate) {
        revalidate();
      }
    };

    return {
      data$: subject$.asObservable(),
      dataSignal: signalData.asReadonly(),
      mutate,
      revalidate
    };
  }
}
