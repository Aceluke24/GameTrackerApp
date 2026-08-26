import { useEffect, useState } from 'react';

// The renderer is a normal Chromium context, so navigator.onLine and the
// online/offline window events work here — a free, instant "OS reports no
// network" signal. It can't see "wifi's fine but Supabase/IGDB is down"
// (that's what App.jsx's onNetworkTrouble hook covers instead).
export default function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() { setOnline(true); }
    function handleOffline() { setOnline(false); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
