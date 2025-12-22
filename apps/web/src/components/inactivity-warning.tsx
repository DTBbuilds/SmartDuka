'use client';

import { useState, useEffect } from 'react';
import { inactivityManager, InactivityState } from '@/lib/inactivity-manager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

export function InactivityWarning() {
  const [state, setState] = useState<InactivityState>(inactivityManager.getState());
  const [timeDisplay, setTimeDisplay] = useState('');

  useEffect(() => {
    const unsubscribe = inactivityManager.subscribe(setState);
    return unsubscribe;
  }, []);

  // Update time display every second when warning is shown
  useEffect(() => {
    if (!state.showWarning) return;

    const interval = setInterval(() => {
      setTimeDisplay(inactivityManager.formatTimeUntilLogout());
    }, 1000);

    // Initial update
    setTimeDisplay(inactivityManager.formatTimeUntilLogout());

    return () => clearInterval(interval);
  }, [state.showWarning]);

  const handleStayLoggedIn = () => {
    inactivityManager.extendSession();
  };

  const handleLogout = () => {
    inactivityManager.logout();
  };

  if (!state.showWarning) return null;

  const minutes = state.timeUntilLogout ? Math.floor(state.timeUntilLogout / 60) : 0;
  const isUrgent = minutes < 2;

  return (
    <Dialog open={state.showWarning} onOpenChange={(open) => !open && inactivityManager.dismissWarning()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              isUrgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
            }`}>
              <Clock className={`h-6 w-6 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <DialogTitle className="text-lg">Session Expiring Soon</DialogTitle>
              <DialogDescription className="text-sm">
                You&apos;ve been inactive for a while
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className={`text-center p-6 rounded-xl ${
            isUrgent 
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          }`}>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              You will be logged out in
            </p>
            <p className={`text-4xl font-bold font-mono ${
              isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {timeDisplay}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              minutes : seconds
            </p>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 text-center">
            For your security, we automatically log you out after 30 minutes of inactivity.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2 w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4" />
            Log Out Now
          </Button>
          <Button
            onClick={handleStayLoggedIn}
            className="gap-2 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
