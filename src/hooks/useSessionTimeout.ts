"use client";

import { useEffect, useState, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes en millisecondes
const SESSION_KEY = 'session_last_activity';

export function useSessionTimeout() {
  const [isSessionActive, setIsSessionActive] = useState(true);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Éviter l'initialisation multiple
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    // Mettre à jour le timestamp d'activité
    const updateActivity = () => {
      localStorage.setItem(SESSION_KEY, Date.now().toString());
    };

    // Vérifier si la session est expirée
    const checkSessionExpiry = () => {
      const lastActivity = localStorage.getItem(SESSION_KEY);
      if (!lastActivity) {
        updateActivity();
        return;
      }

      const elapsed = Date.now() - parseInt(lastActivity);
      
      if (elapsed > SESSION_TIMEOUT) {
        // Session expirée - déconnecter l'utilisateur
        console.log('[SESSION] Session expirée, déconnexion...');
        signOut(auth).catch(error => {
          console.error('[SESSION] Erreur déconnexion:', error);
        });
        localStorage.removeItem(SESSION_KEY);
        setIsSessionActive(false);
      } else {
        // Session toujours active
        setIsSessionActive(true);
      }
    };

    // Initialiser la session
    updateActivity();
    checkSessionExpiry();

    // Écouter les événements d'activité utilisateur
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Vérifier l'expiration toutes les 30 secondes
    const checkInterval = setInterval(checkSessionExpiry, 30000);

    // Nettoyage
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(checkInterval);
    };
  }, []);

  const resetSession = () => {
    localStorage.setItem(SESSION_KEY, Date.now().toString());
    setIsSessionActive(true);
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsSessionActive(false);
  };

  return { isSessionActive, resetSession, clearSession };
}
