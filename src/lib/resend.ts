import { Resend } from 'resend';

// Initialiser Resend avec la clé API depuis les variables d'environnement
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envoie un email de notification de nouvelle partie à un seul joueur
 * @param createur - Nom du créateur de la partie
 * @param mise - Mise en HTG
 * @param emailDestinataire - Email du destinataire
 * @returns true si succès, false si échec
 */
export async function envoyerEmail(
  createur: string,
  mise: number,
  emailDestinataire: string
): Promise<boolean> {
  try {
    const subject = `🎮 ${createur} a créé une partie sur WinCashX !`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a1a; color: #fff; border-radius: 16px;">
        <h2 style="color: #00d2ff;">⚔️ Nouvelle partie disponible !</h2>
        <p><strong style="color: #fff;">${createur}</strong> a créé une partie avec une mise de <strong style="color: #00d2ff;">${mise} HTG</strong>.</p>
        <p>Rejoins-le maintenant :</p>
        <p style="text-align: center;">
          <a href="https://wincashx.com" style="background: #00d2ff; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
            🚀 Rejoindre la partie
          </a>
        </p>
        <p style="color: #aaa;">💰 Gagne de l'argent réel en jouant au Tic-Tac-Toe.</p>
        <p style="color: #aaa;">À très vite sur WinCashX !</p>
        <hr style="border-color: #333;">
        <p style="color: #555; font-size: 12px;">Email automatique - Ne pas répondre.</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'WinCashX <noreply@wincashx.com>',
      to: emailDestinataire,
      subject,
      html,
    });

    if (error) {
      console.error(`Erreur envoi email à ${emailDestinataire}:`, error);
      return false;
    }

    console.log(`Email envoyé avec succès à ${emailDestinataire}:`, data);
    return true;
  } catch (error) {
    console.error(`Erreur exception lors de l'envoi à ${emailDestinataire}:`, error);
    return false;
  }
}

/**
 * Récupère tous les emails des joueurs depuis Firebase et envoie les notifications en parallèle
 * @param createur - Nom du créateur de la partie
 * @param mise - Mise en HTG
 * @returns Objet avec succès, total et durée d'exécution
 */
export async function notifierTousLesJoueurs(
  createur: string,
  mise: number
): Promise<{ succes: number; total: number; duree: number }> {
  const startTime = Date.now();
  
  try {
    // Récupérer tous les utilisateurs depuis Firebase Realtime Database
    const firebaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    if (!firebaseUrl) {
      throw new Error('NEXT_PUBLIC_FIREBASE_DATABASE_URL non défini');
    }

    const response = await fetch(`${firebaseUrl}/users.json`);
    if (!response.ok) {
      throw new Error('Erreur récupération utilisateurs depuis Firebase');
    }

    const users = await response.json();
    
    // Extraire tous les emails valides
    const emails: string[] = [];
    if (users) {
      Object.values(users).forEach((user: any) => {
        if (user?.email && typeof user.email === 'string' && user.email.includes('@')) {
          emails.push(user.email);
        }
      });
    }

    console.log(`📧 ${emails.length} emails à notifier`);

    if (emails.length === 0) {
      return { succes: 0, total: 0, duree: Date.now() - startTime };
    }

    // Envoyer tous les emails en parallèle avec Promise.all
    const results = await Promise.all(
      emails.map(email => envoyerEmail(createur, mise, email))
    );

    const succesCount = results.filter(r => r === true).length;
    const duree = Date.now() - startTime;

    console.log(`✅ ${succesCount}/${emails.length} emails envoyés en ${duree}ms`);

    return {
      succes: succesCount,
      total: emails.length,
      duree
    };
  } catch (error) {
    console.error('Erreur lors de la notification de tous les joueurs:', error);
    return {
      succes: 0,
      total: 0,
      duree: Date.now() - startTime
    };
  }
}
