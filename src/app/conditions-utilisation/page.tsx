"use client";

import { motion } from "framer-motion";
import Link from "next/link";


export default function ConditionsUtilisation(){

return (

<div className="min-h-screen bg-black text-white px-5 py-10">

<div className="max-w-4xl mx-auto">


<Link
href="/"
className="text-blue-400 hover:text-blue-300"
>
← Retour
</Link>


<motion.div
initial={{opacity:0,y:20}}
animate={{opacity:1,y:0}}
className="mt-8 bg-zinc-900 rounded-3xl p-6 md:p-10 border border-zinc-800"
>


<h1 className="text-3xl md:text-5xl font-bold text-center mb-8">
Conditions d'utilisation
</h1>


<p className="text-gray-400 mb-8 text-center">
Dernière mise à jour : Juillet 2026
</p>



<section className="space-y-8">


<div>
<h2 className="text-xl font-bold text-blue-400">
1. Acceptation des conditions
</h2>

<p className="text-gray-300 mt-2">
En créant un compte ou en utilisant Titato,
vous acceptez les présentes conditions d'utilisation.
Si vous n'acceptez pas ces conditions,
vous ne devez pas utiliser la plateforme.
</p>
</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
2. Présentation de Titato
</h2>

<p className="text-gray-300 mt-2">
Titato est une plateforme permettant aux utilisateurs
de participer à des parties et défis avec des mises.
Les utilisateurs peuvent utiliser leur portefeuille
pour participer aux activités disponibles sur la plateforme.
</p>
</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
3. Création d'un compte
</h2>

<p className="text-gray-300 mt-2">
L'utilisateur doit fournir des informations exactes.
Chaque personne doit utiliser un seul compte.
L'utilisateur est responsable de la sécurité de son compte
et de ses informations de connexion.
</p>
</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
4. Portefeuille et transactions
</h2>

<p className="text-gray-300 mt-2">
Les dépôts sont ajoutés au portefeuille après confirmation
du paiement.
Les transactions peuvent être vérifiées afin de protéger
la sécurité de la plateforme et des utilisateurs.
</p>
</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
5. Parties et mises
</h2>

<p className="text-gray-300 mt-2">
Avant chaque partie, l'utilisateur voit clairement
le montant de la mise.
Une fois la partie commencée, la mise engagée
ne peut plus être annulée.
</p>
</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
6. Gains et commissions
</h2>

<p className="text-gray-300 mt-2">
Le gagnant reçoit la récompense prévue selon les règles
de la partie.
Titato peut appliquer une commission sur certaines opérations
afin de couvrir les frais de fonctionnement de la plateforme.
</p>
</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
7. Utilisations interdites
</h2>

<ul className="text-gray-300 mt-2 list-disc pl-5 space-y-2">

<li>Créer plusieurs comptes pour tricher.</li>
<li>Utiliser des logiciels de triche.</li>
<li>Exploiter des bugs de la plateforme.</li>
<li>Manipuler les résultats des parties.</li>
<li>Utiliser des moyens de paiement frauduleux.</li>

</ul>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
8. Suspension d'un compte
</h2>

<p className="text-gray-300 mt-2">
Titato peut suspendre ou fermer un compte en cas
de fraude, comportement abusif ou violation des règles.
</p>
</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
9. Problèmes techniques
</h2>

<p className="text-gray-300 mt-2">
En cas de problème technique affectant une partie,
Titato peut effectuer une vérification et prendre
les mesures nécessaires pour protéger les utilisateurs.
</p>
</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
10. Modification des conditions
</h2>

<p className="text-gray-300 mt-2">
Titato peut modifier ces conditions afin d'améliorer
la sécurité et le fonctionnement du service.
</p>
</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
11. Contact
</h2>

<p className="text-gray-300 mt-2">
Pour toute question concernant ces conditions,
les utilisateurs peuvent contacter le support Titato.
</p>
</div>



</section>


</motion.div>


</div>

</div>

);

}