'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useImpersonation } from '@/context/ImpersonationContext';

export function useEffectiveUser() {
  const { targetUser, isImpersonating } = useImpersonation();
  const [userId, setUserId] = useState<string | null>(null);
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getAuthUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setLoggedInUserId(user.id);
      }
      setLoading(false);
    }
    getAuthUser();
  }, []);

  // The effective ID is the target user if impersonating, otherwise the logged-in user
  const effectiveId = isImpersonating ? targetUser?.id : loggedInUserId;

  return { 
    userId: effectiveId, 
    loggedInUserId, 
    isImpersonating, 
    targetUserName: targetUser?.full_name,
    loading 
  };
}
