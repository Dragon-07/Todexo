'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { 
  UserPlus, 
  Shield, 
  ShieldCheck,
  User as UserIcon, 
  Search, 
  Crown,
  Mail,
  Lock,
  X,
  Users,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  MonitorCheck
} from 'lucide-react';
import clsx from 'clsx';
import { useImpersonation } from '@/context/ImpersonationContext';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  email: string; // Añadido email
  created_at: string;
}

export default function UsersPage() {
  const { role: currentUserRole, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario de creación/edición
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('standard');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { startImpersonation } = useImpersonation();
  const router = useRouter();

  const handleStartSupervision = (user: Profile) => {
    startImpersonation({
      id: user.id,
      full_name: user.full_name || 'Usuario'
    });
    router.push('/');
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      // Usar RPC para obtener emails
      const { data, error } = await supabase.rpc('get_users_with_emails');

      if (error) throw error;
      setUsers((data || []) as Profile[]);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUserRole === 'owner' || currentUserRole === 'admin') {
      fetchUsers();
    }
  }, [currentUserRole, fetchUsers]);

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    setEmail('');
    setPassword('');
    setFullName('');
    setNewRole('standard');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: Profile) => {
    setIsEditMode(true);
    setEditingUserId(user.id);
    setEmail(user.email);
    setPassword(''); // No mostrar contraseña actual
    setFullName(user.full_name || '');
    setNewRole(user.role);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      if (isEditMode && editingUserId) {
        // ACTUALIZACIÓN
        const { data, error: rpcError } = await supabase.rpc('admin_update_user', {
          target_user_id: editingUserId,
          new_email: email,
          new_password: password || null,
          new_full_name: fullName,
          new_role: newRole,
        });

        if (rpcError) throw rpcError;
        if (data && typeof data === 'object' && !data.success) {
          throw new Error(data.error || 'Error al actualizar usuario');
        }

        setSuccessMsg(`Usuario "${fullName}" actualizado.`);
      } else {
        // CREACIÓN
        const { data, error: rpcError } = await supabase.rpc('admin_create_user', {
          target_email: email,
          target_password: password,
          target_full_name: fullName,
          target_role: newRole,
        });

        if (rpcError) throw rpcError;
        if (data && typeof data === 'object' && !data.success) {
          throw new Error(data.error || 'Error al crear usuario');
        }

        setSuccessMsg(`Usuario "${fullName}" creado exitosamente.`);
      }

      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Error en la operación');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: Profile) => {
    if (user.id === (await supabase.auth.getUser()).data.user?.id) {
      alert("No puedes eliminarte a ti mismo.");
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${user.full_name || user.email}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        target_user_id: user.id
      });

      if (error) throw error;
      
      if (data && typeof data === 'object' && !data.success) {
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      setSuccessMsg(`Usuario eliminado correctamente.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchUsers();
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      alert(err.message || 'Error al eliminar usuario');
    } finally {
      setLoading(false);
    }
  };



  // --- Pantalla de carga ---
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
            <Users size={20} className="text-primary" />
          </div>
          <p className="text-on-surface-variant text-sm">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // --- Acceso denegado ---
  if (currentUserRole === 'standard') {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center">
            <Shield size={32} className="text-error/60" />
          </div>
          <h1 className="text-2xl font-black text-on-surface">Acceso Denegado</h1>
          <p className="text-on-surface-variant text-sm">No tienes permisos para administrar usuarios.</p>
        </div>
      </div>
    );
  }

  // --- Filtro de búsqueda ---
  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return { label: 'Dueño', icon: Crown, bgClass: 'bg-amber-500/15', textClass: 'text-amber-500', borderClass: 'border-amber-500/25', avatarBg: 'bg-gradient-to-br from-amber-500 to-orange-600' };
      case 'admin':
        return { label: 'Admin', icon: ShieldCheck, bgClass: 'bg-primary/15', textClass: 'text-primary', borderClass: 'border-primary/25', avatarBg: 'bg-gradient-to-br from-primary to-blue-600' };
      case 'standard':
        return { label: 'Estándar', icon: UserIcon, bgClass: 'bg-on-surface-variant/10', textClass: 'text-on-surface-variant', borderClass: 'border-on-surface-variant/20', avatarBg: 'bg-surface-variant' };
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto pb-32">
      {/* Mensaje de éxito */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-green-500/20 border border-green-500/40 text-green-400 px-5 py-3 rounded-2xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 shadow-lg backdrop-blur-sm">
          <ShieldCheck size={16} />
          {successMsg}
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-tertiary/20 flex items-center justify-center">
              <Users size={20} className="text-tertiary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-on-surface tracking-tight">Usuarios</h1>
          </div>
          <p className="text-on-surface-variant text-sm ml-[52px]">
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2.5 bg-primary hover:bg-primary-dim text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl glow-primary active:scale-[0.97]"
        >
          <UserPlus size={18} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-surface-container border border-surface-variant rounded-2xl p-3 mb-8 flex items-center gap-3 focus-within:border-primary/50 transition-colors">
        <Search className="text-on-surface-variant ml-1 shrink-0" size={18} />
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none focus:outline-none flex-1 text-sm text-on-surface placeholder:text-on-surface-variant/40"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Lista de usuarios */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-container border border-surface-variant rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-surface-variant"></div>
                <div className="flex-1">
                  <div className="h-4 bg-surface-variant rounded w-32 mb-2"></div>
                  <div className="h-3 bg-surface-variant rounded w-20"></div>
                </div>
              </div>
            </div>
          ))
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 bg-surface-container rounded-3xl border border-dashed border-surface-variant">
            <UserIcon size={40} className="mx-auto text-on-surface-variant/20 mb-3" />
            <p className="text-on-surface-variant text-sm">
              {search ? 'No se encontraron resultados.' : 'No hay usuarios registrados.'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const info = getRoleInfo(user.role);
            const RoleIcon = info.icon;
            return (
              <div
                key={user.id}
                className="bg-surface-container border border-surface-variant rounded-2xl p-4 md:p-5 flex items-center gap-4 hover:bg-surface-container-high transition-all group"
              >
                {/* Avatar */}
                <div className={clsx(
                  "w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md",
                  info.avatarBg
                )}>
                  {user.role === 'owner'
                    ? <Crown size={18} />
                    : (user.full_name?.charAt(0) || 'U').toUpperCase()
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-on-surface truncate text-sm md:text-base">
                      {user.full_name || 'Sin nombre'}
                    </h3>
                    <span className={clsx(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      info.bgClass, info.textClass, info.borderClass
                    )}>
                      <RoleIcon size={10} />
                      {info.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant/60 font-medium truncate">
                    {user.email}
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                   <div className="hidden md:block text-right mr-4">
                      <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Creado</p>
                      <p className="text-xs font-medium text-on-surface-variant mt-0.5">
                        {new Date(user.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                   </div>
                   
                    {/* Botón Supervisar */}
                    {(currentUserRole === 'owner' || (currentUserRole === 'admin' && user.role !== 'owner')) && (
                      <button
                        onClick={() => handleStartSupervision(user)}
                        className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 group"
                        title={`Supervisar a ${user.full_name}`}
                      >
                        <MonitorCheck size={18} className="group-hover:scale-110 transition-transform" />
                      </button>
                    )}

                    {/* Botón editar */}
                    {(currentUserRole === 'owner' || (currentUserRole === 'admin' && user.role !== 'owner')) && (
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="p-3 rounded-xl bg-surface-variant/30 text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
                        title="Editar usuario"
                      >
                        <Pencil size={18} />
                      </button>
                    )}

                    {/* Botón eliminar */}
                    {(currentUserRole === 'owner' || (currentUserRole === 'admin' && user.role !== 'owner')) && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-3 rounded-xl bg-error/10 text-error/60 hover:bg-error hover:text-white transition-all active:scale-90"
                        title="Eliminar usuario"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============= MODAL CREAR/EDITAR USUARIO ============= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Card */}
          <div className="relative bg-white text-slate-900 w-full max-w-md rounded-3xl p-8 ambient-shadow overflow-hidden shadow-2xl">
            {/* Decoración */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            {/* Botón cerrar */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                {isEditMode ? <Pencil size={18} className="text-primary" /> : <UserPlus size={18} className="text-primary" />}
              </div>
              <h2 className="text-xl font-black text-slate-900">
                {isEditMode ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-xs text-center font-medium">
                  {formError}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Nombre completo
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-slate-300"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-slate-300"
                    placeholder="usuario@email.com"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  {isEditMode ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required={!isEditMode}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-11 py-3 text-sm text-slate-900 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-slate-300"
                    placeholder={isEditMode ? 'Sin cambios' : 'Mínimo 6 caracteres'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Selector de Rol */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Rol
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isEditMode && newRole === 'owner'}
                    onClick={() => setNewRole('admin')}
                    className={clsx(
                      "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-xs",
                      newRole === 'admin'
                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300",
                      isEditMode && newRole === 'owner' && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ShieldCheck size={15} />
                    Administrador
                  </button>
                  <button
                    type="button"
                    disabled={isEditMode && newRole === 'owner'}
                    onClick={() => setNewRole('standard')}
                    className={clsx(
                      "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-xs",
                      newRole === 'standard'
                        ? "bg-slate-100 border-slate-400 text-slate-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300",
                      isEditMode && newRole === 'owner' && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <UserIcon size={15} />
                    Estándar
                  </button>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-primary-dim text-white font-bold py-3 rounded-xl transition-all shadow-lg glow-primary disabled:opacity-50 text-sm active:scale-[0.97]"
                >
                  {submitting ? 'Cargando...' : isEditMode ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
