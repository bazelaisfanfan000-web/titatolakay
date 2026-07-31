/*
====================================================
TiTaTo - Game Logic Server-Side
====================================================

Logique de validation du plateau et calcul du gagnant
côté serveur pour prévenir la triche.

Le client ne doit jamais décider du gagnant.
====================================================
*/

/**
 * Structure du plateau Titato (tableau 2D)
 * Le plateau est stocké comme un tableau 2D: board[row][col]
 */
export type BoardCell = 'X' | 'O' | null;
export type Board = string[][];

/**
 * Calcule le gagnant à partir du plateau (format tableau 2D)
 * @param board - Plateau de jeu (tableau 2D)
 * @returns 'X', 'O', ou null si pas de gagnant
 */
export function calculateWinnerFromBoard(board: Board): 'X' | 'O' | null {
  if (!board || !Array.isArray(board)) {
    return null;
  }

  const rows = board.length;
  const cols = board.length > 0 ? board[0].length : 0;

  if (rows === 0 || cols === 0) {
    return null;
  }

  // Vérifier les lignes horizontales
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - 5; c++) {
      const cell = board[r][c];
      if (cell && cell !== "") {
        let match = true;
        for (let i = 1; i < 5; i++) {
          if (board[r][c + i] !== cell) {
            match = false;
            break;
          }
        }
        if (match) {
          return cell as 'X' | 'O';
        }
      }
    }
  }

  // Vérifier les lignes verticales
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r <= rows - 5; r++) {
      const cell = board[r][c];
      if (cell && cell !== "") {
        let match = true;
        for (let i = 1; i < 5; i++) {
          if (board[r + i][c] !== cell) {
            match = false;
            break;
          }
        }
        if (match) {
          return cell as 'X' | 'O';
        }
      }
    }
  }

  // Vérifier les diagonales (haut-gauche vers bas-droite)
  for (let r = 0; r <= rows - 5; r++) {
    for (let c = 0; c <= cols - 5; c++) {
      const cell = board[r][c];
      if (cell && cell !== "") {
        let match = true;
        for (let i = 1; i < 5; i++) {
          if (board[r + i][c + i] !== cell) {
            match = false;
            break;
          }
        }
        if (match) {
          return cell as 'X' | 'O';
        }
      }
    }
  }

  // Vérifier les diagonales (haut-droite vers bas-gauche)
  for (let r = 0; r <= rows - 5; r++) {
    for (let c = 4; c < cols; c++) {
      const cell = board[r][c];
      if (cell && cell !== "") {
        let match = true;
        for (let i = 1; i < 5; i++) {
          if (board[r + i][c - i] !== cell) {
            match = false;
            break;
          }
        }
        if (match) {
          return cell as 'X' | 'O';
        }
      }
    }
  }

  return null;
}

/**
 * Vérifie si le plateau est plein
 * @param board - Plateau de jeu (tableau 2D)
 * @returns true si le plateau est plein
 */
export function isBoardFull(board: Board): boolean {
  if (!board || !Array.isArray(board)) {
    return false;
  }

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (!board[r][c] || board[r][c] === "") {
        return false;
      }
    }
  }
  return true;
}

/**
 * Vérifie si la partie est terminée
 * @param board - Plateau de jeu
 * @returns { finished: boolean, winner: 'X' | 'O' | null, isDraw: boolean }
 */
export function checkGameStatus(board: Board): {
  finished: boolean;
  winner: 'X' | 'O' | null;
  isDraw: boolean;
} {
  const winner = calculateWinnerFromBoard(board);
  
  if (winner) {
    return {
      finished: true,
      winner,
      isDraw: false,
    };
  }
  
  const full = isBoardFull(board);
  
  if (full) {
    return {
      finished: true,
      winner: null,
      isDraw: true,
    };
  }
  
  return {
    finished: false,
    winner: null,
    isDraw: false,
  };
}

/**
 * Valide un mouvement
 * @param board - Plateau actuel (tableau 2D)
 * @param row - Ligne de la cellule
 * @param col - Colonne de la cellule
 * @param playerSymbol - Symbole du joueur ('X' ou 'O')
 * @returns true si le mouvement est valide
 */
export function isValidMove(
  board: Board,
  row: number,
  col: number,
  playerSymbol: 'X' | 'O'
): boolean {
  if (!board || !Array.isArray(board)) {
    return false;
  }

  // Vérifier que les coordonnées sont valides
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
    return false;
  }

  // Vérifier que la cellule est vide
  if (board[row][col] && board[row][col] !== "") {
    return false;
  }

  // Vérifier que le symbole est valide
  if (playerSymbol !== 'X' && playerSymbol !== 'O') {
    return false;
  }

  return true;
}

/**
 * Applique un mouvement au plateau
 * @param board - Plateau actuel (tableau 2D)
 * @param row - Ligne de la cellule
 * @param col - Colonne de la cellule
 * @param playerSymbol - Symbole du joueur
 * @returns Nouveau plateau
 */
export function applyMove(
  board: Board,
  row: number,
  col: number,
  playerSymbol: 'X' | 'O'
): Board {
  const newBoard = board.map(r => [...r]);
 if (newBoard[row]) {
    newBoard[row][col] = playerSymbol;
  }
  return newBoard;
}
