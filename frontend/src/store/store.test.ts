import { describe, it, expect } from 'vitest';
import { store } from './index';
import { setCredentials, logOut } from './authSlice';

describe('Redux Store & Auth Slice', () => {
  it('should initialize with correct default state', () => {
    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.user).toBeNull();
  });

  it('should set credentials correctly when setCredentials is dispatched', () => {
    const mockUser = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'teste@email.com',
      first_name: 'Teste',
      last_name: 'Cliente',
      cpf: '123.456.789-00',
      phone: '11999999999',
      role: 'CLIENTE' as const,
      is_active: true,
      must_change_password: false,
    };

    store.dispatch(setCredentials(mockUser));

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(true);
    expect(state.auth.user).toEqual(mockUser);
  });

  it('should clear credentials when logOut is dispatched', () => {
    store.dispatch(logOut());

    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.user).toBeNull();
  });
});
