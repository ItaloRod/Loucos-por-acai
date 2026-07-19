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
      id: 1,
      cpf: '123.456.789-00',
      nome: 'Teste Cliente',
      email: 'teste@email.com',
      role: 'CLIENTE' as const,
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
