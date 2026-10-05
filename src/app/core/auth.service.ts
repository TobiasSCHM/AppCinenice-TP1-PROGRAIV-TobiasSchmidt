import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.client';
import type { Perfil, Rol } from './models/perfil.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // estado de sesion y perfil como signals: la ui se actualiza sola
  readonly session = signal<Session | null>(null);
  readonly perfil = signal<Perfil | null>(null);
  readonly rol = computed<Rol | null>(() => this.perfil()?.rol ?? null);
  readonly logueado = computed(() => this.session() !== null);

  // se resuelve cuando supabase informo la sesion inicial y se cargo el perfil
  readonly initialized: Promise<void>;
  private cargaPerfil: Promise<void> = Promise.resolve();

  constructor() {
    let resolverInicial!: () => void;
    this.initialized = new Promise<void>((r) => (resolverInicial = r));

    supabase.auth.onAuthStateChange((evento, session) => {
      this.session.set(session);
      // al renovar el token no cambia el usuario: no hace falta recargar el perfil
      if (evento === 'TOKEN_REFRESHED') return;

      // no se hace await de llamadas a supabase dentro de este callback (puede trabar el cliente),
      // por eso se difiere con settimeout
      this.cargaPerfil = new Promise<void>((resolver) => {
        setTimeout(() => {
          void this.cargarPerfil(session?.user.id).finally(() => {
            resolver();
            resolverInicial();
          });
        }, 0);
      });
    });
  }

  // los guards usan esto para leer sesion y rol ya resueltos
  async esperarPerfil(): Promise<void> {
    await this.initialized;
    await this.cargaPerfil;
  }

  async cargarPerfil(uid: string | undefined): Promise<void> {
    if (!uid) {
      this.perfil.set(null);
      return;
    }
    const { data, error } = await supabase.from('perfiles').select('*').eq('id', uid).maybeSingle();
    this.perfil.set(error ? null : (data as Perfil | null));
  }

  loginConCorreo(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  logout() {
    return supabase.auth.signOut();
  }
}
