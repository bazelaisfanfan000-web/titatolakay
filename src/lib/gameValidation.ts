/**
 * Validation côté serveur du jeu de Tic-Tac-Toe
 * Empêche la triche en recalculant le gagnant à partir du plateau
 */

const BOARD_SIZE = 10;
const WIN_LENGTH = 4;

/**
 * Vérifie si un joueur a gagné sur le plateau
 */
export function checkWinner(board: Record<string, string>, symbol: string): boolean {
  const positions = Object.keys(board).filter(key => board[key] === symbol);
  
  if (positions.length < WIN_LENGTH) return false;
  
  // Convertir les positions en coordonnées
  const coords = positions.map(pos => {
    const [row, col] = pos.split('-').map(Number);
    return { row, col };
  });
  
  // Vérifier toutes les combinaisons possibles
  for (let i = 0; i < coords.length; i++) {
    for (let j = i + 1; j < coords.length; j++) {
      for (let k = j + 1; k < coords.length; k++) {
        for (let l = k + 1; l < coords.length; l++) {
          const p1 = coords[i];
          const p2 = coords[j];
          const p3 = coords[k];
          const p4 = coords[l];
          
          // Vérifier horizontal
          if (p1.row === p2.row && p2.row === p3.row && p3.row === p4.row) {
            const cols = [p1.col, p2.col, p3.col, p4.col].sort((a, b) => a - b);
            if (cols[3] - cols[0] === 3 && cols[1] - cols[0] === 1 && cols[2] - cols[1] === 1) {
              return true;
            }
          }
          
          // Vérifier vertical
          if (p1.col === p2.col && p2.col === p3.col && p3.col === p4.col) {
            const rows = [p1.row, p2.row, p3.row, p4.row].sort((a, b) => a - b);
            if (rows[3] - rows[0] === 3 && rows[1] - rows[0] === 1 && rows[2] - rows[1] === 1) {
              return true;
            }
          }
          
          // Vérifier diagonal (haut-gauche vers bas-droite)
          if (p2.row - p1.row === 1 && p2.col - p1.col === 1 &&
              p3.row - p2.row === 1 && p3.col - p2.col === 1 &&
              p4.row - p3.row === 1 && p4.col - p3.col === 1) {
            return true;
          }
          
          // Vérifier diagonal (bas-gauche vers haut-droite)
          if (p2.row - p1.row === -1 && p2.col - p1.col === 1 &&
              p3.row - p2.row === -1 && p3.col - p2.col === 1 &&
              p4.row - p3.row === -1 && p4.col - p3.col === 1) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

/**
 * Détermine le gagnant à partir du plateau
 * Retourne 'X', 'O', ou null si pas de gagnant
 */
export function determineWinner(board: Record<string, string>): string | null {
  if (checkWinner(board, 'X')) return 'X';
  if (checkWinner(board, 'O')) return 'O';
  return null;
}

/**
 * Valide que le gagnant déclaré correspond au plateau réel
 */
export function validateWinner(board: Record<string, string>, declaredWinner: string): boolean {
  const actualWinner = determineWinner(board);
  
  if (!actualWinner) {
    // Pas de gagnant réel
    return false;
  }
  
  return actualWinner === declaredWinner;
}
