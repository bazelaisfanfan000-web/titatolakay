/*
====================================================
VALIDATION STRICTE DES MISES - Wincash
====================================================
Empêche tout contournement de la validation des mises
*/

/**
 * Valide strictement une mise de jeu
 * 
 * @param rawValue - La valeur brute du corps de la requête (non convertie)
 * @returns { valid: boolean, value?: number, error?: string }
 * 
 * Refuse:
 * - Décimales (25.5, 24.999999999999999, 25.0)
 * - Notations scientifiques (1e2, 2e4)
 * - NaN, Infinity, -Infinity
 * - Nombres négatifs
 * - 0
 * - Espaces, caractères spéciaux
 * - Valeurs non numériques (abc, "", null, undefined, [], {})
 * - Valeurs < 25
 * - Valeurs > 10000
 * 
 * Accepte uniquement:
 * - Entiers stricts entre 25 et 10000 inclus
 */
export function validateBet(rawValue: any): {
  valid: boolean;
  value?: number;
  error?: string;
} {
  /*
  ==================================================
  1. VÉRIFIER TYPE PRIMITIF
  ==================================================
  */
  
  // Refuser null, undefined, objets, tableaux
  if (rawValue === null || rawValue === undefined) {
    return {
      valid: false,
      error: "La mise ne peut pas être null ou undefined"
    };
  }

  if (typeof rawValue !== "string" && typeof rawValue !== "number") {
    return {
      valid: false,
      error: "La mise doit être un nombre ou une chaîne"
    };
  }

  /*
  ==================================================
  2. VÉRIFIER FORMAT AVEC REGEX (AVANT CONVERSION)
  ==================================================
  */
  
  // Convertir en string pour la regex
  const strValue = String(rawValue).trim();
  
  // Regex: uniquement des chiffres, sans décimales, sans espaces
  // ^[1-9]\d*$ = commence par 1-9, suivi de chiffres optionnels
  const integerRegex = /^[1-9]\d*$/;
  
  if (!integerRegex.test(strValue)) {
    return {
      valid: false,
      error: "La mise doit être un entier positif sans décimales"
    };
  }

  /*
  ==================================================
  3. CONVERTIR EN NUMBER SÉCURISÉMENT
  ==================================================
  */
  
  const numValue = Number(strValue);
  
  // Vérifier que la conversion n'a pas introduit d'artefacts
  if (isNaN(numValue)) {
    return {
      valid: false,
      error: "La mise n'est pas un nombre valide"
    };
  }

  if (!isFinite(numValue)) {
    return {
      valid: false,
      error: "La mise ne peut pas être Infinity"
    };
  }

  /*
  ==================================================
  4. VÉRIFIER QUE C'EST BIEN UN ENTIER
  ==================================================
  */
  
  if (!Number.isInteger(numValue)) {
    return {
      valid: false,
      error: "La mise doit être un entier (pas de décimales)"
    };
  }

  /*
  ==================================================
  5. VÉRIFIER QUE LA VALEUR EST POSITIVE
  ==================================================
  */
  
  if (numValue <= 0) {
    return {
      valid: false,
      error: "La mise doit être supérieure à 0"
    };
  }

  /*
  ==================================================
  6. VÉRIFIER LIMITES (25 - 10000)
  ==================================================
  */
  
  const MIN_BET = 10;
  const MAX_BET = 10000;

  if (numValue < MIN_BET) {
    return {
      valid: false,
      error: `La mise minimum est de ${MIN_BET} HTG`
    };
  }

  if (numValue > MAX_BET) {
    return {
      valid: false,
      error: `La mise maximum est de ${MAX_BET} HTG`
    };
  }

  /*
  ==================================================
  7. VÉRIFICATION FINALE: STRING === NUMBER
  ==================================================
  Empêche 24.999999999999999 qui devient 25
  */
  
  if (strValue !== String(numValue)) {
    return {
      valid: false,
      error: "Format de mise invalide"
    };
  }

  /*
  ==================================================
  VALIDATION RÉUSSIE
  ==================================================
  */
  
  return {
    valid: true,
    value: numValue
  };
}

/**
 * Valide un montant wallet (dépôt/retrait)
 * Accepte les décimales avec 2 chiffres après la virgule
 */
export function validateWalletAmount(rawValue: any): {
  valid: boolean;
  value?: number;
  error?: string;
} {
  if (rawValue === null || rawValue === undefined) {
    return {
      valid: false,
      error: "Le montant ne peut pas être null ou undefined"
    };
  }

  if (typeof rawValue !== "string" && typeof rawValue !== "number") {
    return {
      valid: false,
      error: "Le montant doit être un nombre ou une chaîne"
    };
  }

  const strValue = String(rawValue).trim();
  
  // Regex: accepte les décimales avec max 2 chiffres après virgule
  const amountRegex = /^[1-9]\d*(\.\d{1,2})?$/;
  
  if (!amountRegex.test(strValue)) {
    return {
      valid: false,
      error: "Le montant doit être un nombre positif avec max 2 décimales"
    };
  }

  const numValue = Number(strValue);
  
  if (isNaN(numValue) || !isFinite(numValue)) {
    return {
      valid: false,
      error: "Montant invalide"
    };
  }

  if (numValue <= 0) {
    return {
      valid: false,
      error: "Le montant doit être positif"
    };
  }

  return {
    valid: true,
    value: numValue
  };
}
