import { adminDB } from '@/lib/firebaseAdmin';

export type AdminAction =
  | 'USER_BAN'
  | 'USER_UNBAN'
  | 'USER_BALANCE_MODIFY'
  | 'GAME_CLOSE'
  | 'GAME_RESOLVE'
  | 'TRANSACTION_APPROVE'
  | 'TRANSACTION_REJECT'
  | 'SYSTEM_CONFIG';

export interface AdminLog {
  action: AdminAction;
  adminId: string;
  targetUser?: string;
  targetGame?: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: number;
}

export async function createAdminLog(log: AdminLog): Promise<void> {
  try {
    const logRef = adminDB.ref('adminLogs').push();
    await logRef.set({
      ...log,
      logId: logRef.key,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.error('[ADMIN_LOG_ERROR]', error);
    throw new Error('Failed to create admin log');
  }
}

export async function getAdminLogs(limit: number = 100): Promise<AdminLog[]> {
  try {
    const logsRef = adminDB.ref('adminLogs')
      .orderByChild('createdAt')
      .limitToLast(limit);
    
    const snapshot = await logsRef.get();
    
    if (!snapshot.exists()) {
      return [];
    }

    const logs = snapshot.val();
    return Object.values(logs as AdminLog[]).sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('[ADMIN_LOGS_FETCH_ERROR]', error);
    throw new Error('Failed to fetch admin logs');
  }
}
