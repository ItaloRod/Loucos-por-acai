import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'CLIENTE' | 'FUNCIONARIO' | 'GERENTE';

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  cpf: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    logOut: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setCredentials, logOut, setLoading } = authSlice.actions;
export default authSlice.reducer;
