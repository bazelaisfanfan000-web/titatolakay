"use client";

import { motion } from "framer-motion";
import Link from "next/link";


export default function AntiFraude(){

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
Politique anti-fraude
</h1>


<p className="text-gray-400 text-center mb-8">
Dernière mise à jour : Juillet 2026
</p>



<section className="space-y-8">



<div>
<h2 className="text-xl font-bold text-blue-400">
1. Objectif
</h2>

<p className="text-gray-300 mt-2">
Titato met en place des mesures de sécurité afin
de protéger les joueurs, les transactions et
l'équité des parties.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
2. Activités interdites
</h2>

<p className="text-gray-300 mt-2">
Il est interdit d'utiliser Titato pour :
</p>


<ul className="list-disc pl-5 mt-3 text-gray-300 space-y-2">

<li>Créer plusieurs comptes pour obtenir un avantage.</li>

<li>Utiliser des logiciels ou outils de triche.</li>

<li>Modifier ou manipuler le fonctionnement du jeu.</li>

<li>Exploiter volontairement des bugs.</li>

<li>Utiliser des moyens de paiement frauduleux.</li>

<li>Collaborer pour fausser les résultats.</li>

</ul>


</div>




<div>
<h2 className="text-xl font-bold text-blue-400">
3. Surveillance de sécurité
</h2>

<p className="text-gray-300 mt-2">
Titato peut analyser certaines activités afin
de détecter les comportements suspects,
les abus ou les tentatives de fraude.
</p>

</div>




<div>
<h2 className="text-xl font-bold text-blue-400">
4. Vérification des comptes
</h2>

<p className="text-gray-300 mt-2">
Dans certaines situations, Titato peut demander
des informations supplémentaires afin de confirmer
la sécurité d'un compte ou d'une transaction.
</p>

</div>




<div>
<h2 className="text-xl font-bold text-blue-400">
5. Suspension temporaire
</h2>

<p className="text-gray-300 mt-2">
Un compte peut être temporairement suspendu lorsqu'une
activité inhabituelle est détectée.
Cette mesure permet de protéger les utilisateurs
pendant une vérification.
</p>

</div>




<div>
<h2 className="text-xl font-bold text-blue-400">
6. Fermeture définitive
</h2>

<p className="text-gray-300 mt-2">
Un compte impliqué dans une fraude confirmée,
une triche ou une violation grave des règles
peut être définitivement fermé.
</p>

</div>




<div>
<h2 className="text-xl font-bold text-blue-400">
7. Sécurité des paiements
</h2>

<p className="text-gray-300 mt-2">
Titato travaille uniquement avec des méthodes
de paiement autorisées et peut bloquer toute
transaction considérée comme suspecte.
</p>

</div>




<div>
<h2 className="text-xl font-bold text-blue-400">
8. Signalement
</h2>

<p className="text-gray-300 mt-2">
Les utilisateurs peuvent signaler tout comportement
suspect au support Titato afin de maintenir
une plateforme équitable.
</p>

</div>




<div>
<h2 className="text-xl font-bold text-blue-400">
9. Contact
</h2>

<p className="text-gray-300 mt-2">
Pour toute question concernant la sécurité,
contactez l'équipe Titato.
</p>

</div>



</section>


</motion.div>


</div>

</div>

);

}