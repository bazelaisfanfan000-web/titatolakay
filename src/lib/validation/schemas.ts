/**
 * Schémas de validation Zod
 * 
 * Validation structurée pour toutes les opérations sensibles
 */

import { z } from 'zod';

/**
 * Schéma pour les dépôts
 */
export const depositSchema = z.object({
  amount: z.number()
    .min(25, 'Le dépôt minimum est de 25 HTG')
    .max(10000, 'Le dépôt maximum est de 10000 HTG')
    .int('Le montant doit être un entier'),
  returnUrl: z.string().url('URL de retour invalide').optional(),
});

/**
 * Schéma pour les retraits
 */
export const withdrawalSchema = z.object({
  amount: z.number()
    .min(100, 'Le retrait minimum est de 100 HTG')
    .max(10000, 'Le retrait maximum est de 10000 HTG')
    .int('Le montant doit être un entier'),
  moncashNumber: z.string()
    .regex(/^\d{8}$/, 'Numéro MonCash invalide (8 chiffres requis)')
    .transform(val => `509${val}`),
});

/**
 * Schéma pour la création de jeu
 */
export const createGameSchema = z.object({
  bet: z.number()
    .min(25, 'La mise minimum est de 25 HTG')
    .max(5000, 'La mise maximum est de 5000 HTG')
    .int('La mise doit être un entier'),
  maxPlayers: z.number()
    .min(2, 'Minimum 2 joueurs')
    .max(4, 'Maximum 4 joueurs')
    .int('Le nombre de joueurs doit être un entier'),
});

/**
 * Schéma pour rejoindre un jeu
 */
export const joinGameSchema = z.object({
  roomId: z.string().min(1, 'ID de room requis'),
});

/**
 * Schéma pour les mouvements de jeu
 */
export const gameMoveSchema = z.object({
  roomId: z.string().min(1, 'ID de room requis'),
  row: z.number()
    .int('La ligne doit être un entier')
    .min(0, 'La ligne doit être >= 0')
    .max(2, 'La ligne doit être <= 2'),
  col: z.number()
    .int('La colonne doit être un entier')
    .min(0, 'La colonne doit être >= 0')
    .max(2, 'La colonne doit être <= 2'),
});

/**
 * Schéma pour les rewards admin
 */
export const adminRewardSchema = z.object({
  uid: z.string().min(1, 'UID utilisateur requis'),
  amount: z.number()
    .min(1, 'Le montant minimum est de 1 HTG')
    .max(100000, 'Le montant maximum est de 100000 HTG')
    .int('Le montant doit être un entier'),
  message: z.string().max(500, 'Le message ne peut pas dépasser 500 caractères').optional(),
});

/**
 * Schéma pour les demandes de revanche
 */
export const revengeRequestSchema = z.object({
  opponentUid: z.string().min(1, 'UID de l\'opposant requis'),
  betAmount: z.number()
    .min(25, 'La mise minimum est de 25 HTG')
    .max(5000, 'La mise maximum est de 5000 HTG')
    .int('La mise doit être un entier'),
});

/**
 * Type des schémas exportés
 */
export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type GameMoveInput = z.infer<typeof gameMoveSchema>;
export type AdminRewardInput = z.infer<typeof adminRewardSchema>;
export type RevengeRequestInput = z.infer<typeof revengeRequestSchema>;
