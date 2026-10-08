import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.client';
import type { DatosPerfil, Perfil, Rol } from './models/perfil.model';

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

  // registro con correo (rf-01). los 7 datos viajan como metadata y el trigger de la base crea el perfil.
  // el rol no se envia: el trigger lo fija siempre en 'cliente'
  registrar(email: string, password: string, datos: DatosPerfil) {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { ...datos }, emailRedirectTo: window.location.origin },
    });
  }

  // oauth (rf-03). supabase redirige al proveedor y vuelve a esta misma url con la sesion abierta
  loginConProveedor(provider: 'google' | 'github') {
    return supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
  }

  // completa los datos que el proveedor no entrega. la base solo permite editar estas columnas (ver grants en 003)
  async completarPerfil(datos: DatosPerfil): Promise<void> {
    const uid = this.session()?.user.id;
    if (!uid) throw new Error('No hay sesión iniciada.');
    const { error } = await supabase
      .from('perfiles')
      .update({ ...datos, perfil_completo: true })
      .eq('id', uid);
    if (error) throw error;
    await this.cargarPerfil(uid);
  }

  // pantalla de inicio segun el rol (rf-02)
  rutaInicio(): string {
    switch (this.rol()) {
      case 'admin':
        return '/admin';
      case 'empleado':
        return '/empleado';
      default:
        return '/';
    }
  }

  logout() {
    return supabase.auth.signOut();
  }
}
