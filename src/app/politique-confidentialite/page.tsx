"use client";

import { motion } from "framer-motion";
import Link from "next/link";


export default function PolitiqueConfidentialite(){

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
Politique de confidentialité
</h1>


<p className="text-gray-400 text-center mb-8">
Dernière mise à jour : Juillet 2026
</p>



<section className="space-y-8">


<div>
<h2 className="text-xl font-bold text-blue-400">
1. Introduction
</h2>

<p className="text-gray-300 mt-2">
Chez Titato, nous accordons une grande importance
à la protection des informations personnelles de nos utilisateurs.
Cette politique explique comment nous collectons,
utilisons et protégeons vos données.
</p>
</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
2. Informations collectées
</h2>

<p className="text-gray-300 mt-2">
Nous pouvons collecter les informations nécessaires
au fonctionnement du service :
</p>

<ul className="list-disc pl-5 mt-3 text-gray-300 space-y-2">

<li>Nom ou pseudo utilisateur.</li>
<li>Adresse email.</li>
<li>Numéro de téléphone.</li>
<li>Historique des parties.</li>
<li>Historique des dépôts et retraits.</li>
<li>Données techniques liées à l'utilisation du site.</li>

</ul>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
3. Utilisation des informations
</h2>

<p className="text-gray-300 mt-2">
Les informations sont utilisées pour :
</p>

<ul className="list-disc pl-5 mt-3 text-gray-300 space-y-2">

<li>Créer et gérer votre compte.</li>
<li>Effectuer les transactions.</li>
<li>Améliorer la sécurité.</li>
<li>Prévenir la fraude.</li>
<li>Améliorer l'expérience utilisateur.</li>

</ul>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
4. Protection des données
</h2>

<p className="text-gray-300 mt-2">
Titato utilise des mesures de sécurité adaptées
afin de protéger les informations des utilisateurs
contre les accès non autorisés.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
5. Paiements et partenaires
</h2>

<p className="text-gray-300 mt-2">
Les informations nécessaires aux paiements peuvent être
traitées par des services de paiement partenaires.
Titato ne stocke pas les informations sensibles
de paiement qui ne sont pas nécessaires au service.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
6. Partage des informations
</h2>

<p className="text-gray-300 mt-2">
Titato ne vend pas les données personnelles des utilisateurs.
Les informations peuvent uniquement être partagées lorsque
cela est nécessaire au fonctionnement du service ou
lorsque la loi l'exige.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
7. Conservation des données
</h2>

<p className="text-gray-300 mt-2">
Les données sont conservées pendant la durée nécessaire
au fonctionnement du compte, à la sécurité de la plateforme
et au respect des obligations applicables.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
8. Droits des utilisateurs
</h2>

<p className="text-gray-300 mt-2">
Les utilisateurs peuvent demander la correction
ou la suppression de certaines informations personnelles
en contactant le support Titato.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
9. Modifications
</h2>

<p className="text-gray-300 mt-2">
Titato peut mettre à jour cette politique afin
d'améliorer la transparence et la sécurité du service.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
10. Contact
</h2>

<p className="text-gray-300 mt-2">
Pour toute question concernant la confidentialité,
contactez l'équipe Titato.
</p>

</div>



</section>


</motion.div>


</div>

</div>

);

}