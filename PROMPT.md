# PROMPT — « Grillé ! » · PWA de jeux de soirée multijoueur temps réel

> Copie-colle tout ce qui suit dans ton agent de code (Claude Code, Cursor, v0, Bolt…).
> **Nom de l'app : « Grillé ! »** (« t'es grillé » : désigné par les autres, aveu révélé ou mauvaise réponse, chaque mode finit par griller quelqu'un). Slogan : « Le jeu qui vous grille. » Logo : le mot GRILLÉ en Bricolage Grotesque 800, le point d'exclamation en or, légèrement penché.
> Les banques de questions sont **déjà rédigées** dans `packages/questions/src/` : ne les réécris pas, branche-les, et complète-les seulement si le script de contrôle le demande.

---

## 0. Ton rôle et ta façon de travailler

Tu es un·e **lead développeur·se full-stack senior et designer produit**, spécialiste des applications temps réel multijoueurs (type Kahoot, Jackbox, Gartic Phone) et des PWA mobile-first. Tu livres un produit **fini, jouable de bout en bout, déployable** : pas une maquette, pas un prototype à moitié câblé.

Règles de travail non négociables :

1. **Commence par un plan** : architecture, arborescence des fichiers, machine à états du jeu, schéma des événements temps réel, modèle de données. Puis implémente-le sans dévier, sauf pour une raison que tu expliques.
2. **Zéro placeholder** : pas de `TODO`, pas de lorem ipsum, pas de « ajoutez vos questions ici », pas de `// à implémenter`. Chaque écran, chaque bouton, chaque question est réel·le.
3. **Le serveur fait autorité** : le décompte des votes, les minuteurs, les transitions de phase et les scores sont calculés côté serveur. Le client ne fait qu'afficher et envoyer des intentions.
4. **Teste ce qui compte** (voir §12) et ne déclare rien « terminé » sans l'avoir exécuté.
5. Si une consigne est ambiguë, choisis l'option la plus logique pour une soirée entre amis, **écris ton choix dans `DECISIONS.md`**, puis avance.

---

## 1. Le concept

Des joueurs réunis dans la même pièce rejoignent un salon depuis leur téléphone (code ou QR code), avec leur prénom et leur selfie. Le maître du jeu choisit **un mode de jeu** au moment de créer le salon :

| Mode | Principe | Fin de partie |
|---|---|---|
| **Qui est le plus ?** | Une question « Qui est le plus… / le moins… / Qui pour… ? » s'affiche avec **la photo et le prénom de tous les participants visibles d'un coup d'œil**. Chacun vote pour un membre du salon, on révèle le verdict, le désigné peut **contester** et plaider sa cause (§5.1 à §5.10). | Podiums du **plus encensé** et du **plus taclé** |
| **J'ai déjà / Jamais** | Une question « As-tu déjà… ? » s'affiche. Chacun répond **en secret** « J'ai déjà » ou « Jamais » et parie sur le nombre de « J'ai déjà » dans la pièce. On révèle le total, puis les visages selon les réglages (§5B). | **Le plus expérimenté**, **l'ange de la soirée**, **le détective** |
| **Quiz culture** | QCM à 4 réponses façon Kahoot, avec catégories (musique française, histoire, cinéma…) et 3 niveaux de difficulté. Points selon la rapidité et la difficulté (§5C). | Podium au score |
| **Soirée mix** | Enchaîne les trois modes par blocs (par exemple 10 + 10 + 10), avec un classement global. | Cérémonie complète |

Les thèmes **Collègues, Amis, Famille, Full** (et **Trash, Hot** derrière le verrou 18+) s'appliquent aux deux modes sociaux. Le quiz utilise ses propres catégories.

---

## 2. Stack technique imposée (sauf justification solide dans `DECISIONS.md`)

- **Front** : React 18 + TypeScript strict + Vite, Tailwind CSS (tokens du §4 dans `tailwind.config`), Framer Motion pour toutes les animations, Zustand pour l'état client, `qrcode` pour générer le QR et `@zxing/browser` (ou `BarcodeDetector` quand il existe) pour le scanner.
- **PWA** : `vite-plugin-pwa` (Workbox), manifest complet, icônes maskable 192/512, splash screens iOS, mode `standalone`, coquille hors-ligne, invite d'installation personnalisée (et instructions dédiées pour iOS Safari, qui n'a pas d'invite native).
- **Hébergement : 100 % Cloudflare**, code sur GitHub avec déploiement automatique à chaque push sur `main`.
  - **Front** : Cloudflare Pages (ou Workers Static Assets), servi en HTTPS, ce qui est indispensable pour la caméra et la PWA.
  - **Temps réel / back** : Cloudflare Workers + **Durable Objects** avec WebSockets natifs. **Un salon = un Durable Object** (identifié par le code du salon), qui fait autorité : machine à états, votes, minuteurs (via `alarm()`), scores. Utilise la bibliothèque `partyserver` côté Worker et `partysocket` côté client (reconnexion automatique incluse). **Pas de Socket.IO** : il ne fonctionne pas sur Workers.
  - Utilise l'**API WebSocket Hibernation** pour ne pas payer le temps d'attente entre deux votes. L'état de la partie (sans les photos) est sauvegardé dans le stockage SQLite du Durable Object à chaque transition, pour survivre à une mise en veille de l'objet.
  - Pas de base de données externe, pas de KV, pas de R2 : rien n'est nécessaire pour jouer.
  - Configuration `wrangler.toml` complète, `wrangler dev` pour le local, et un workflow GitHub Actions (`cloudflare/wrangler-action`) qui lance lint + tests puis déploie.
  - Le tout doit tenir dans l'**offre gratuite** Cloudflare pour un usage entre amis ; documente les limites dans le README.
- **Validation** : Zod partagé entre client et serveur (package `shared/`) pour chaque événement et pour la banque de questions.
- **Monorepo** : `pnpm` workspaces → `apps/web`, `apps/party` (Worker + Durable Object), `packages/shared`, `packages/questions`.
- **Déploiement** : README pas à pas (créer le compte Cloudflare, générer le jeton d'API, l'ajouter dans les secrets GitHub, premier déploiement, nom de domaine personnalisé optionnel).

---

## 3. Rôles

| Rôle | Qui | Pouvoirs |
|---|---|---|
| **Maître du jeu (MJ)** | Celui qui crée le salon | Règle la partie, lance, peut **clore le vote à tout moment**, passe à la question suivante, exclut un joueur, met en pause, termine la partie. Joue aussi par défaut. |
| **Joueur** | Ceux qui rejoignent | Prend son selfie, vote, conteste quand il est désigné. |
| **Écran partagé** *(bonus fortement souhaité)* | Une TV / un ordinateur ouvert sur `/screen/CODE` | Affiche en grand la question, la grille des joueurs, le compte à rebours et les résultats. Ne vote pas. |

Option du MJ : **« Je joue aussi »** (activée par défaut) ou **« J'anime seulement »** (il n'apparaît alors pas dans la grille).

Si le MJ se déconnecte plus de 30 s, le rôle passe automatiquement au joueur présent depuis le plus longtemps, avec une notification à tous.

---

## 4. Direction artistique (design hyper moderne)

### 4.1 La référence est le modèle de composition
La référence fournie (app d'apprentissage des langues, orange vif + crème) est **le modèle à suivre de près pour la composition** ; seules les couleurs et les typos changent. Reprends fidèlement :
- **Fond crème clair** et beaucoup d'air ; l'app est **claire par défaut** (un mode sombre existe en option).
- **En-tête « avatar + prénom + sous-titre »** en haut à gauche, et **pastille compteur** colorée en haut à droite (chez nous : couronnes gagnées).
- **Grande carte héros de couleur franche** avec une rangée de petites tuiles (chez nous : les cases du code pour rejoindre) et un **gros bouton blanc pleine largeur**.
- **Rangée de pastilles rondes** à bordure claire, l'active entourée d'un anneau de couleur (chez nous : les thèmes Collègues, Amis, Famille, Full, 18+).
- **Cartes pastel empilées qui se chevauchent** (rose, pervenche, citron), titre + deux lignes de description + **illustration 3D débordante** à droite, et un petit bouton plein sur la dernière carte (chez nous : les modes de jeu).
- **Écran classement** : fond plein de couleur, flèche retour + titre centré, **sélecteur segmenté en pilule** (l'option active en blanc), **podium 2-1-3** en blocs d'une teinte plus claire avec gros chiffres, avatars posés au-dessus, prénom en blanc et **pilule blanche « 311 pts »**, puis une **feuille blanche aux coins arrondis** qui remonte par-dessus avec la liste « 04, 05, 06… », avatar, prénom en couleur, points, et **flèches vertes / rouges** de tendance.
- **Avatars illustrés** en style cartoon quand il n'y a pas de photo (le selfie reste la règle).
- **Illustrations 3D** : utilise le pack open source **Microsoft Fluent Emoji 3D** (licence MIT, fichiers PNG à auto-héberger) pour les visuels des cartes de modes, des thèmes et des écrans vides.

### 4.2 Ce qu'on change : couleurs et typos
L'orange de la référence est remplacé par un **violet électrique** comme couleur héros, avec des pastels pour les cartes.

**Couleurs (tokens CSS sur `:root`)**

| Token | Clair (défaut) | Sombre (option) | Usage |
|---|---|---|---|
| `--bg` | `#F6F1E9` (crème) | `#100C1C` | Fond de l'app |
| `--surface` | `#FFFFFF` | `#1C1630` | Cartes, feuille du classement |
| `--surface-2` | `#ECE5DA` | `#272040` | Pastilles, champs, cases |
| `--ink` | `#17112A` | `#F7F3EC` | Texte principal |
| `--ink-muted` | `#6B6480` | `#A79FC2` | Texte secondaire |
| `--primary` | `#6A3CF0` (violet électrique) | `#7B4DFF` | Carte héros, écrans pleins, CTA, MJ |
| `--primary-soft` | `#8F6BFF` | `#9A78FF` | Blocs du podium sur fond violet |
| `--card-pink` | `#FFB8E1` | idem | Carte « Qui est le plus ? », thème Amis |
| `--card-peri` | `#BCC8FF` | idem | Carte « J'ai déjà », thème Collègues |
| `--card-lime` | `#A6FF6E` | idem | Carte « Quiz culture » |
| `--positive` | `#2FC25B` (texte) / `#C6FF3D` (fond) | `#C6FF3D` | Positif, flèches vertes |
| `--negative` | `#E5304F` | `#FF4D6A` | Négatif, flèches rouges |
| `--gold` | `#FFC93C` | `#FFD23F` | Podium, 3-2-1, couronnes |

Règles : contraste texte/fond ≥ 4.5:1 (vérifie et documente-le) ; texte foncé sur les pastels, le citron et l'or ; texte blanc sur le violet. Couleurs des modes : **Qui est le plus ? = rose**, **J'ai déjà = pervenche**, **Quiz = citron**, **Soirée mix = or**. Les écrans de tension (3-2-1, plaidoirie, cérémonie) passent en **plein violet** comme l'écran classement de la référence.

**Typographies (Google Fonts, auto-hébergées pour le hors-ligne)**
- **Titres et questions** : *Bricolage Grotesque* 700–800, interlettrage serré (-0.02em). La question s'affiche en très grand.
- **Texte d'interface** : *Manrope* 500–700.
- **Chiffres** (code du salon, compte à rebours, scores, votes) : *Unbounded* 800–900, chiffres tabulaires. Le « 3-2-1 » doit occuper la moitié de l'écran.

**Formes et matières**
- Rayons : cartes 28 px, boutons 20 px, pilules et avatars `999px`.
- Ombres « décalées » franches (ex. `0 6px 0 rgba(0,0,0,.35)`) sur les CTA, qui s'enfoncent au tap (translateY 4px). Sur les cartes, une ombre douce et un léger grain (noise SVG à 4 % d'opacité).
- Photos des joueurs en **cercles avec un anneau coloré** (couleur attribuée à chaque joueur parmi 12 teintes harmonisées), ou en squircle quand la grille devient dense.
- Iconographie : Phosphor Icons (style *bold* ou *fill*) pour les icônes d'interface ; illustrations Fluent Emoji 3D pour les visuels (§4.1).

**Mouvement (Framer Motion, ressorts)**
- Transitions de phase : la carte question arrive en *slide + scale* avec ressort (`stiffness 260, damping 20`).
- Vote : la tuile choisie gonfle (scale 1.06), anneau `--primary` épais, retour haptique `navigator.vibrate(15)`.
- Compte à rebours : chaque chiffre entre en *scale 2 → 1* avec flou, un tick sonore et une vibration.
- Révélation : les autres tuiles s'estompent, le ou les désignés montent au centre, couronne animée, confettis (`canvas-confetti`) colorés selon la polarité (citron pour une question positive, corail pour une négative).
- Respecte `prefers-reduced-motion` : fondus simples à la place.

**Sons** : 6 sons courts (rejoindre, voter, tick, révélation, contestation, fin) avec bouton muet persistant.

---

## 5. Parcours et écrans (tous à concevoir et à coder)

### 5.1 Accueil
Logo animé, deux CTA géants : **Créer une partie** / **Rejoindre**. Créer une partie ouvre d'abord le **choix du mode** : quatre grandes cartes empilées (Qui est le plus ? en violet, J'ai déjà en corail, Quiz culture en bleu ciel, Soirée mix en or), chacune avec une phrase d'explication et un exemple de question. Lien « Comment on joue ? » (3 cartes swipables). Invite à installer la PWA après la première partie, jamais avant.

### 5.2 Rejoindre
- Saisie d'un **code de 6 caractères** (alphabet sans ambiguïté : sans 0/O, 1/I/L) en cases séparées, collage automatique, majuscules forcées.
- **Scanner un QR code** dans l'app.
- **Lien profond** `/{CODE}` : scanner le QR avec l'appareil photo natif ouvre directement l'écran d'identité, code déjà rempli.
- Erreurs claires : salon introuvable, salon plein, partie déjà commencée (et retardataires refusés), pseudo déjà pris.

### 5.3 Identité : prénom + selfie (obligatoire)
- Prénom (2 à 14 caractères, emoji autorisés, doublons refusés dans le salon).
- **Selfie** : caméra frontale via `getUserMedia`, gabarit circulaire, compte à rebours de 3 s optionnel, miroir à l'aperçu mais pas sur la photo finale, bouton « Reprendre ».
- Recadrage carré automatique centré, **compression en WebP 320×320 à moins de 40 Ko**.
- Repli si la caméra est refusée ou absente : import depuis la galerie, sinon **avatar illustré généré** (initiales + forme + couleur du joueur), mais on insiste gentiment sur la photo (« le jeu est 10× plus drôle avec ta tête »).
- Le profil (prénom + photo) est **stocké uniquement sur le téléphone du joueur** (IndexedDB, avec repli `localStorage`) et réutilisé aux parties suivantes, avec boutons « Changer » et « Effacer ma photo ». Voir §8.4.

### 5.4 Création du salon : réglages du MJ
Écran en cartes empilées, chaque réglage en une ligne claire. Le mode choisi est rappelé en haut, et les réglages qui ne le concernent pas sont masqués (le quiz a ses propres réglages, §5C). Réglages du mode **Qui est le plus ?** :

| Réglage | Valeurs | Défaut |
|---|---|---|
| Nombre de questions | 10 / 20 / **30** / 50 | 30 |
| **Votes par joueur et par question** (« X réponses ») | 1 / 2 / 3 (avec 2 ou 3, un joueur répartit ses votes sur des personnes différentes) | 1 |
| Thème | Collègues / Amis / Famille / **Full**, puis, derrière le verrou 18+ : **Trash** / **Hot** / **Trash + Hot** | — |
| **Choix du thème** | « Je choisis » ou **« Les joueurs votent »** | Je choisis |
| Voter pour soi-même | Oui / Non | Non |
| Votes | **Anonymes** / Publics (on révèle qui a voté pour qui) | Anonymes |
| Passer une question | Seuil de joueurs qui doivent le demander : 1/3 / la moitié | 1/3 (minimum 2) |
| Contestation | Activée / Désactivée, et nombre maximal par joueur (1 / 2 / 3 / illimité) | Activée, 2 |
| Intensité | Soft / **Épicé** (filtre les questions d'intensité 3) | Soft |
| Équilibre | Curseur positif ↔ négatif (par défaut 40 % positif, 40 % négatif, 20 % neutre) | 40/40/20 |
| Retardataires | Autorisés entre deux questions / Refusés | Autorisés |

Préréglages en un tap : **Afterwork** (Collègues, Soft, anonyme), **Soirée** (Amis, Épicé), **Repas de famille** (Famille, Soft), **Fin de soirée 🔞** (Trash + Hot, anonyme, contestation illimitée).

### 5.5 Salon d'attente (lobby)
- En haut : **code en très gros** (Unbounded), **QR code** plein écran au tap, bouton partager (Web Share API) et copier le lien.
- Grille des joueurs qui arrivent en temps réel (animation « pop »), pastille de connexion, couronne sur le MJ.
- Le MJ peut exclure un joueur (appui long sur sa tuile → confirmation).
- **Vote du thème** si activé : 4 grandes cartes de thème (6 si le mode 18+ est déverrouillé, voir §7.6), chaque joueur vote, jauges qui se remplissent en direct, égalité tranchée par le MJ. Le MJ peut lancer le vote de thème puis la partie.
- Bouton **Lancer** actif à partir de **3 joueurs** (affiche « encore 1 joueur » sinon). Maximum **20 joueurs**.

### 5.6 Tour de jeu : la question (écran critique)
Disposition : un **bandeau question** (numéro « 12/30 », pastille de type *Le plus / Le moins / Qui pour*, couleur selon la polarité) + la **grille des joueurs** qui occupe tout le reste.

**Contrainte absolue : tous les joueurs (photo + prénom) visibles en même temps, sans scroll, sans zoom, sans menu.** Implémente un algorithme de grille explicite et testé :

```
entrée : N joueurs, zone disponible W × H (viewport moins bandeau, moins safe areas)
pour cols de 1 à N :
    rows = ceil(N / cols)
    tuile = min(W / cols, (H - rows * hauteurPrenom) / rows) - gouttière
garder cols qui maximise tuile
si tuile < 64 px en portrait → exiger le paysage
```

- **Mode paysage forcé** quand la grille ne tient pas en portrait : on tente `screen.orientation.lock('landscape')` en plein écran (Android), sinon (iOS) un écran plein « Tourne ton téléphone » avec animation, qui disparaît dès la rotation. En paysage, le bandeau question passe en colonne à gauche (30 %) et la grille à droite (70 %).
- Le prénom est toujours lisible (≥ 12 px, une ligne, ellipsis), la photo ≥ 64 px.
- **Voter se fait en deux temps** : le tap sur une tuile la **sélectionne** (état très net : anneau violet, légère mise à l'échelle) ; on peut toucher une autre tuile pour **changer d'avis** autant de fois qu'on veut ; puis on appuie sur le gros bouton **« Valider mon vote pour Karim »** en bas. Avant validation, rien n'est envoyé au serveur comme vote. **Après validation, le vote est verrouillé** et l'écran affiche « Vote validé », la liste des joueurs qu'on attend encore, et la grille en lecture seule. Avec 2 ou 3 votes par question, on sélectionne 2 ou 3 tuiles (compteur « 2/3 sélectionnés ») avant de valider.
- **Pas de minuteur de vote** : on attend que tout le monde ait validé. Seul le MJ peut forcer la suite.
- **Proposer de passer la question** : chaque joueur a un petit lien discret **« Passer cette question »** sous la grille. Les demandes s'affichent pour tous dans un bandeau (« Tom propose de passer · 2 / 3 ») avec un bouton « Moi aussi ». Quand le seuil réglé est atteint (par défaut 1/3 des joueurs, minimum 2), la question est remplacée par une autre **sans compter dans l'avancement** (la session garde 30 questions jouées). Le MJ peut passer seul à tout moment. Une demande peut être retirée tant que le seuil n'est pas atteint.
- Si « voter pour soi » est désactivé, sa propre tuile est visible mais grisée.
- Indicateur **« 6/9 ont voté »** sous forme de petits points, **sans révéler qui a voté pour qui**, mais avec une coche discrète sur les tuiles de ceux qui ont déjà voté (pour savoir qui on attend).
- **Côté MJ uniquement** : bouton **« Forcer la suite »** (confirmation par appui long de 600 ms pour éviter les erreurs), qui clôt le vote même si des joueurs n'ont pas validé.

### 5.7 Fin du vote → compte à rebours 3-2-1
Deux déclencheurs seulement : **tous les joueurs connectés ont validé leur vote** OU **le MJ force la suite**. Il n'y a pas de minuteur. Puis le serveur diffuse une heure de fin et **tous les écrans affichent le 3-2-1 de façon synchronisée** (à ±100 ms grâce à la compensation de décalage d'horloge, voir §8). Les non-votants comptent comme abstention.

### 5.8 Résultats du tour
- Le ou les **désignés** (le plus de votes) au centre, grande photo, couronne, nombre de votes, phrase de verdict générée à partir de la question (« Pour 5 voix sur 8, **Léa** est la plus susceptible de rater son train »).
- **Égalité** : tous les ex æquo sont désignés et partagent les points.
- En dessous : mini-classement des autres joueurs ayant reçu des votes (barres horizontales animées).
- En mode votes publics : avatars des votants empilés sous chaque personne.
- Moment spécial : badge **« UNANIME ! »** si tout le monde a voté pour la même personne.
- Le MJ appuie sur **« Question suivante »** (ou enchaînement automatique après 8 s si l'option est activée).

### 5.9 Le bouton « Contester » (mécanique clé)
- Visible **uniquement sur le téléphone du ou des désignés**, pendant 10 s après la révélation.
- **Discret** : petit bouton texte + icône marteau de juge, en bas, contraste modéré, sans animation insistante. Il ne doit pas voler la vedette à la révélation.
- Grisé avec la mention « plus de contestation » quand le quota du joueur est épuisé. Une seule contestation par question.
- Appui → **phase « Plaidoirie »** sur tous les écrans : photo du contestataire en très grand, titre « Léa conteste le verdict ! », la question rappelée, minuteur de **30 s** pendant lequel il se défend **à l'oral** dans la pièce. Le contestataire peut terminer sa plaidoirie plus tôt, et le MJ peut couper.
- Puis **nouveau vote sur la même question** (mêmes règles, votes remis à zéro, le contestataire vote aussi), compte à rebours 3-2-1, et résultat final qui **remplace** le premier :
  - toujours désigné → animation **« Verdict confirmé »** (tampon qui s'abat) ;
  - plus désigné → **« Acquitté·e ! »** (confettis), et le nouveau désigné voit apparaître… sa propre option de contester ? **Non** : une seule contestation par question, pour éviter les boucles.
- Statistiques conservées pour le récap : contestations gagnées et perdues.

### 5.10 Récap final (« La cérémonie »)
Séquence révélée écran par écran, que le MJ fait avancer :

1. **Podium « Le plus encensé·e »** : score positif le plus élevé, podium 2-1-3 inspiré de la référence, avatars posés sur les marches, couleur `--positive`.
2. **Podium « Le plus taclé·e »** : score négatif le plus élevé, couleur `--negative`, ton taquin et bienveillant (« on t'aime quand même »).
3. **Prix bonus** (seulement s'ils sont pertinents) :
   - *L'avocat·e* : le plus de contestations gagnées ;
   - *Le juge suprême* : a voté le plus souvent avec la majorité ;
   - *Le franc-tireur* : a voté le plus souvent contre la majorité ;
   - *L'insaisissable* : n'a jamais été désigné ;
   - *Le moment de la soirée* : la question unanime ou la plus serrée.
4. **Classement complet** façon liste de la référence (rang, photo, prénom, score positif / négatif, flèche).
5. Actions : **Rejouer avec les mêmes joueurs** (nouvelles questions, même salon), **Changer de thème**, **Quitter**, **Partager mon résultat** (carte image 1080×1350 générée en canvas avec **uniquement la photo de l'utilisateur**, jamais celle des autres).

---

### 5.11 Compteur d'avancement (tous les modes)
Les joueurs doivent toujours savoir où ils en sont dans la session :
- **Barre de progression segmentée** en haut de chaque écran de question : un segment par question (30 par défaut). Les segments joués se colorent selon le résultat (citron pour positif, corail pour négatif, bleu ciel pour neutre ; dans le quiz, vert si le joueur a eu juste et gris sinon). Le segment en cours pulse.
- À côté : **« Q12 / 30 »** en Unbounded, et une **estimation du temps restant** (« ≈ 9 min »), calculée à partir de la durée moyenne des tours précédents.
- **Jalons** : à la moitié, un écran **« Mi-temps »** de 5 s avec le classement provisoire (pour le quiz) ou les tendances (« Karim est en tête des taclés ») ; à 5 questions de la fin, le bandeau **« Dernière ligne droite »** ; et pour la dernière, un écran d'annonce **« Dernière question ! »** avec roulement de tambour.
- Dans le salon d'attente et entre deux parties : « Partie 2 de la soirée » et le nombre total de questions jouées depuis l'ouverture du salon.
- Le MJ voit en plus un petit menu de contrôle (pause, passer la question, terminer maintenant), sans perdre l'avancement.

---

## 5B. Mode « J'ai déjà / Jamais »

### 5B.1 Réglages spécifiques
| Réglage | Valeurs | Défaut |
|---|---|---|
| Nombre de questions | 10 / 20 / **30** / 50 | 30 |
| Thème | Collègues / Amis / Famille / Full (+ Trash / Hot derrière le verrou 18+), choix du MJ ou vote des joueurs | — |
| **Révélation** | **Nombre + « J'assume »** (seul le total est montré, chacun peut ensuite révéler son visage) / Visages toujours / Nombre seulement | Nombre + « J'assume » |
| **Pronostics** | Activés / Désactivés | Activés |
| Intensité, Retardataires | comme le mode Qui est le plus ? | — |

### 5B.2 Déroulé d'un tour
1. **Question** : « As-tu déjà… ? » en très grand, avec la barre d'avancement. Pour répondre, deux énormes boutons qui prennent la moitié basse de l'écran : **« J'ai déjà »** (corail) et **« Jamais »** (citron). Comme pour le vote, on **sélectionne** sa réponse (on peut changer) puis on **valide** ; ensuite, c'est verrouillé. La grille des joueurs est affichée en petit au-dessus des boutons, avec une coche sur ceux qui ont répondu (jamais leur réponse).
2. **Pronostic** (si activé), sur le même écran juste après la réponse : « Combien d'entre vous ont déjà ? », avec un sélecteur de 0 à N (gros boutons − / +).
3. **Fin de phase** : comme le mode Qui est le plus ?, quand tout le monde a validé, ou quand le MJ force la suite (pas de minuteur), puis compte à rebours 3-2-1 synchronisé.
4. **Révélation** : un compteur qui défile jusqu'au vrai nombre (« **5** sur 9 ont déjà… », avec la phrase `reveal` de la question). Puis, selon le réglage :
   - *Visages toujours* : les tuiles des « J'ai déjà » se retournent et passent en corail, les autres s'estompent ;
   - *Nombre + « J'assume »* : chaque joueur qui a répondu « J'ai déjà » voit pendant 8 s un bouton **« J'assume »** ; ceux qui appuient voient leur tuile se retourner devant tout le monde ;
   - *Nombre seulement* : seul le total est montré.
   - Les questions marquées `sensitive` ne montrent **jamais** les visages, quel que soit le réglage.
5. **Pronostics** : les joueurs qui ont trouvé le nombre exact gagnent **3 points**, ceux à ±1 gagnent **1 point** ; on les affiche avec un badge « Détective ».
6. **« Raconte ! »** (si des visages sont révélés) : le MJ peut appuyer sur « Raconte ! » ; le jeu tire au sort une des personnes révélées, et son téléphone affiche « C'est à toi de raconter » pendant 45 s.

### 5B.3 Score et cérémonie
- **Le plus expérimenté** : le plus de « J'ai déjà », pondérés par l'intensité. **L'ange de la soirée** : le moins de « J'ai déjà ». Ces deux podiums ne sont affichés **que si la révélation des visages était activée** ; sinon on ne révèle rien sur les réponses individuelles, même à la fin.
- **Le détective** : le plus de points de pronostic (toujours affiché).
- Statistiques de groupe : « Ce soir, le groupe a cumulé 87 aveux », « La question la plus avouée », « La question où personne n'a osé ».
- **Confidentialité** : les réponses individuelles ne quittent jamais le serveur sauf révélation choisie ; en mode *Nombre seulement*, le serveur n'envoie que des totaux.

---

## 5C. Mode « Quiz culture »

### 5C.1 Réglages spécifiques
| Réglage | Valeurs | Défaut |
|---|---|---|
| Nombre de questions | 10 / 20 / **30** / 50 | 20 |
| **Catégories** | Choix multiple parmi les 12 catégories (§7.8), « Toutes », ou vote des joueurs | Toutes |
| **Difficulté** | Facile / Moyen / Difficile / **Progressive** (facile au début, difficile à la fin) | Progressive |
| Minuteur | 10 s / **20 s** / 30 s (le quiz est le seul mode chronométré, car les points dépendent de la rapidité) | 20 s |
| Joker 50/50 | 0 / **1** / 2 par joueur | 1 |

### 5C.2 Déroulé d'un tour
1. **Question** : catégorie et difficulté en pastilles (Facile en citron, Moyen en or, Difficile en corail), question en grand, **4 réponses** en grandes tuiles colorées (une couleur et une forme par position, pour pouvoir y faire référence à l'oral), minuteur circulaire. Bouton Joker 50/50 discret.
2. Le premier clic est définitif. Une coche apparaît sur la tuile des joueurs qui ont répondu.
3. Fin de phase quand tout le monde a répondu, ou à la fin du minuteur, puis **3-2-1**.
4. **Révélation** : la bonne réponse s'illumine ; sous chaque réponse, **les photos des joueurs qui l'ont choisie** (on voit qui s'est grillé). Puis l'anecdote `fact` de la question, et les points gagnés par chacun.
5. **Classement provisoire** toutes les 5 questions (liste façon référence, avec flèches de tendance).

### 5C.3 Score
- Points de base : **500** (facile), **750** (moyen), **1 000** (difficile).
- Multiplicateur de rapidité de 1,0 (réponse immédiate) à 0,5 (dernière seconde), linéaire.
- Série : +10 % par bonne réponse consécutive, plafonné à +50 %.
- Joker 50/50 : la question rapporte la moitié des points.
- Cérémonie : podium 2-1-3 au score, puis prix bonus (*Le plus rapide*, *Le spécialiste* (meilleur taux dans une catégorie), *La remontée* (plus grosse progression au classement), *Grillé* (la question où tout le monde s'est trompé)).

---

## 6. Logique de score et de polarité

- Chaque question a une **polarité** : `positive` (+1), `negative` (-1) ou `neutral` (0).
- **Attention au piège** : la polarité décrit **comment la personne désignée est perçue**, pas le mot « plus » ou « moins ». « Qui est le **moins** patient ? » est **négatif**. « Qui est le **moins** rancunier ? » est **positif**.
- À chaque tour (après une éventuelle contestation), chaque désigné reçoit `poids × (1 / nombre d'ex æquo)` sur son score positif ou négatif. Les questions neutres alimentent seulement les prix bonus.
- `poids` : 1 par défaut, 1,5 pour une question unanime.
- Égalité finale au podium : départage par le nombre de votes bruts reçus, puis ex æquo assumé (deux personnes sur la même marche).
- Toute la logique de score est dans `packages/shared/scoring.ts`, pure et testée.

---

## 7. Banque de questions (le cœur du contenu)

### 7.1 Volume et répartition exigés
- **Au moins 480 questions uniques**, en français naturel, drôles, variées, écrites avec soin. Aucune paraphrase d'une autre question.
- **Au moins 160 questions par thème** (Collègues, Amis, Famille). Une question peut appartenir à plusieurs thèmes.
- Par thème : environ 40 % positives, 40 % négatives, 20 % neutres, et un mélange des trois formats : **≥ 35 % « Qui est le plus… »**, **≥ 20 % « Qui est le moins… »**, **≥ 25 % « Qui pour… / Qui serait le plus susceptible de… »**.
- **Mode Full** = l'union de tous les thèmes **moins** les questions marquées `fullExcluded: true` (questions de famille trop intimes ou trop spécifiques, par exemple sur les parents, les héritages ou les secrets de famille, qui n'ont pas de sens ou mettent mal à l'aise hors du cercle familial).
- **Intensité** 1 (tout public), 2 (taquin), 3 (épicé, jamais humiliant). Dans les thèmes Collègues, Amis, Famille et Full, sont interdits : physique et poids, orientation sexuelle, religion, santé, origines, argent réel des gens, sexualité. On se moque des **comportements et des habitudes**, jamais de l'identité.
- **Les thèmes Trash et Hot ont leurs propres règles (§7.6)** et ne sont **jamais** inclus dans le mode Full.

### 7.2 Format (fichier `packages/questions/questions.fr.json`, validé par Zod)
```json
{
  "id": "q_0042",
  "text": "Qui est le plus susceptible d'arriver en retard à son propre mariage ?",
  "format": "most_likely",
  "polarity": "negative",
  "themes": ["amis", "famille"],
  "intensity": 1,
  "fullExcluded": false,
  "verdict": "{name} arrivera en retard à son propre mariage"
}
```
`format` ∈ `most` (Qui est le plus), `least` (Qui est le moins), `who_for` (Qui pour), `most_likely` (Qui serait le plus susceptible de). `verdict` est la phrase affichée sur l'écran de résultat.

### 7.3 Exemples pour donner le ton (à reprendre et à multiplier)
- *Collègues*, positive : « Qui est le plus susceptible de sauver une réunion qui part en vrille ? »
- *Collègues*, négative : « Qui répond "on en reparle" pour ne jamais en reparler ? »
- *Collègues*, neutre : « Qui pour animer le séminaire de l'année prochaine ? »
- *Amis*, positive : « Qui est le plus fiable pour garder un secret ? »
- *Amis*, négative : « Qui est le moins ponctuel du groupe ? »
- *Amis*, neutre : « Qui pour survivre le plus longtemps sur une île déserte ? »
- *Famille*, positive : « Qui est le plus doué pour réconcilier tout le monde à Noël ? »
- *Famille*, négative : « Qui monopolise la télécommande ? »
- *Famille*, `fullExcluded` : « Qui a été le chouchou de mamie ? »

### 7.4 Tirage d'une session
- Tire N questions (30 par défaut) dans le thème choisi, en respectant le ratio de polarité réglé et en **alternant** les formats (jamais 3 fois le même format d'affilée, jamais 2 négatives intenses d'affilée).
- Commence par une question légère et positive, garde une question forte pour la fin.
- **Pas de répétition** dans une même partie ni lors d'un « Rejouer » ; le serveur garde l'historique des questions vues par salon, et le client garde dans `localStorage` les 300 derniers ids vus pour les éviter d'une partie à l'autre.
- Algorithme déterministe avec une graine (seed) pour pouvoir le tester.

### 7.6 Thèmes adultes 🔞 : **Trash** et **Hot**

Deux thèmes supplémentaires, réservés aux soirées entre adultes consentants, **hors mode Full** et cachés par défaut.

**Déverrouillage (obligatoire)**
- Le MJ active « Mode 18+ » dans les réglages : écran de confirmation explicite (« Tous les joueurs ont 18 ans ou plus et sont d'accord pour des questions trash et coquines »).
- Puis **chaque joueur confirme sur son téléphone** (« Je suis majeur·e et partant·e ») avant que le thème soit jouable. Si un seul joueur refuse ou ne répond pas en 30 s, les thèmes 18+ restent verrouillés pour cette partie (sans dire qui a refusé).
- Les thèmes 18+ sont **incompatibles avec le thème Famille** : si le MJ a choisi Famille ou le préréglage « Repas de famille », l'option 18+ est désactivée avec une explication.
- Un badge 🔞 discret reste affiché pendant toute la partie, et le bouton « Passer cette question » (§5.6) fonctionne comme ailleurs ; en 18+, le seuil est abaissé à **2 joueurs**, quel que soit le réglage.

**Thème Trash** (vert citron, icône poubelle ou mouche) : le sale, le gênant, le dégoûtant, l'hygiène, les mauvaises habitudes, la honte assumée.
- Exemples : « Qui pue le plus des pieds ? », « Qui est le plus susceptible de renifler son linge pour savoir s'il est propre ? », « Qui a déjà fait pipi dans la piscine ? », « Qui est le plus susceptible de manger un truc tombé par terre ? », « Qui pète le plus en douce ? », « Qui garde le même caleçon le plus longtemps ? », « Qui a la pire haleine du matin ? », « Qui est le plus susceptible de vomir en soirée ? », « Qui se cure le nez en voiture ? », « Qui a la chambre la plus crade ? », « Qui est le moins regardant sur la date de péremption ? », « Qui pour lécher le sol pour 50 € ? ».

**Thème Hot** (corail, icône piment ou flamme) : la séduction, le flirt, la vie amoureuse et sexuelle, suggestive et drôle, sans être pornographique.
- Exemples : « Qui est le plus libéré·e ? », « Qui est le plus gourmand·e au lit ? », « Qui est le plus susceptible d'envoyer un nude par erreur ? », « Qui a le plus de body count ? », « Qui est le meilleur coup de la pièce ? », « Qui est le plus susceptible de coucher le premier soir ? », « Qui a le plus de jouets cachés dans sa table de nuit ? », « Qui est le moins à l'aise pour parler de sexe ? », « Qui pour tester un club libertin ? », « Qui a déjà fait l'amour dans un lieu public ? », « Qui est le plus bruyant·e ? », « Qui est le plus susceptible de flirter avec un ex ce soir ? », « Qui ferait le meilleur strip-tease ? », « Qui a le plus de fantasmes inavouables ? ».

**Jauge de référence validée pour le Hot** : « Qui est le plus susceptible d'envoyer un nude par erreur ? », « Qui est le meilleur coup de la pièce ? », « Qui pour tester un club libertin ? ». Toutes les questions Hot doivent être **à ce niveau** : franchement coquines, assumées et drôles, qui font rire et rougir, sans jamais décrire d'acte sexuel. Moins osé, c'est hors sujet ; plus cru, c'est hors limite. Les intensités 1 à 3 restent toutes dans cette zone.

**Volume** : **au moins 120 questions Trash et 120 questions Hot**, en plus des 480 de base (soit **720 au minimum**), avec le même mélange de formats et des intensités 1 (coquin léger), 2 (piquant) et 3 (très épicé).

**Polarité dans ces thèmes** : la majorité des questions Trash sont négatives ; en Hot, beaucoup sont **neutres ou positives** (« le meilleur coup », « le plus libéré ») plutôt que honteuses. Le récap final ajoute deux titres réservés aux parties 18+ : **« Le/la plus crado »** (le plus désigné en Trash) et **« Le/la plus chaud·e »** (le plus désigné en Hot).

**Lignes rouges, même en 18+** (vérifiées par le script de contrôle) : rien sur les mineurs, rien de non consenti (agression, contrainte, alcool comme moyen de pression), pas d'insultes sur l'apparence physique, l'orientation sexuelle, le genre, les origines, la religion ou un handicap, pas de description sexuelle explicite (on suggère, on ne décrit pas), pas de question qui vise un couple présent ou un tiers absent nommément. Le Hot taquine **les comportements et les envies**, il ne doit jamais servir à humilier quelqu'un.

**Format** : champ `adult: true`, `themes: ["trash"]` ou `["hot"]`, `fullExcluded: true` obligatoire. Le serveur refuse de tirer une question `adult` si le salon n'a pas le consentement 18+ validé.

### 7.7 Banque « J'ai déjà / Jamais »
Fichiers `packages/questions/src/jai-deja/{collegues,amis,famille,trash,hot}.json` (déjà rédigés : au moins 100 questions par thème tout public et 100 par thème adulte).
```json
{
  "id": "jda_042",
  "question": "As-tu déjà pris une capture d'écran d'une conversation intime d'une personne de ce salon pour l'envoyer à quelqu'un d'autre ?",
  "reveal": "{count} sur {total} ont déjà pris une capture d'écran d'une conversation intime d'une personne de ce salon pour l'envoyer à quelqu'un d'autre",
  "polarity": "negative",
  "themes": ["amis"],
  "intensity": 3,
  "aboutRoom": true,
  "sensitive": true,
  "adult": false,
  "fullExcluded": false
}
```
`aboutRoom` : la question vise les personnes présentes. `sensitive` : jamais de révélation des visages. Mêmes règles de tirage que §7.4 (alternance de polarité, montée en intensité, pas de répétition) et mêmes règles 18+ que §7.6.

### 7.8 Banque « Quiz culture »
Fichiers `packages/questions/src/quiz/{categorie}.json` (déjà rédigés : **45 questions par catégorie**, 15 faciles, 15 moyennes, 15 difficiles). Catégories : `musique-fr` (Musique française), `histoire`, `geographie`, `cinema-series`, `sport`, `sciences`, `gastronomie`, `langue-fr` (Langue française et expressions), `pop-culture`, `art-litterature`, `jeux-video`, `annees-80-2000` (Nostalgie 80-90-2000).
```json
{
  "id": "qmu_001",
  "category": "musique-fr",
  "difficulty": "easy",
  "question": "Quel chanteur a sorti l'album « Racine carrée » en 2015 ?",
  "choices": ["Stromae", "Maître Gims", "Orelsan", "Angèle"],
  "answer": 0,
  "fact": "L'album contient « Papaoutai » et « Formidable »."
}
```
Les choix sont **mélangés à l'affichage** (le serveur garde la correspondance). Pas de question répétée dans un même salon.

### 7.9 Script de contrôle `pnpm questions:check`
Il échoue si : ids en double, textes en double ou quasi-doublons (similarité normalisée > 0,85), volume par thème insuffisant, ratios hors tolérance (±5 %), question sans `verdict`, `{name}` absent du verdict, mot de la liste interdite trouvé (avec une liste spécifique pour Trash et Hot), question `adult` sans `fullExcluded: true`, question `adult` mélangée avec le thème Famille, moins de 120 questions Trash ou Hot. Il affiche un tableau de statistiques par thème, polarité, format et intensité.

---

## 8. Architecture temps réel

### 8.1 Machine à états d'un salon (côté serveur)
```
LOBBY → (CONSENT_18) → (THEME_VOTE) → QUESTION_INTRO → <phase de réponse du mode> → COUNTDOWN → <révélation du mode>

Qui est le plus ? : VOTING → COUNTDOWN → RESULTS
                    RESULTS → CHALLENGE_DEFENSE → REVOTING → COUNTDOWN → FINAL_RESULTS
J'ai déjà :        ANSWERING (réponse + pronostic) → COUNTDOWN → REVEAL_COUNT → (ASSUME_WINDOW) → (STORYTIME)
Quiz :             ANSWERING → COUNTDOWN → REVEAL_ANSWER → (LEADERBOARD toutes les 5 questions)

Après chaque révélation → (MILESTONE : mi-temps, dernière question) → QUESTION_INTRO | CEREMONY → ENDED
n'importe quel état → PAUSED → retour à l'état précédent
```
Chaque mode est un module (`modes/whoIsMost.ts`, `modes/neverHaveI.ts`, `modes/quiz.ts`) qui implémente la même interface (`answerPhase`, `reveal`, `score`, `ceremony`) ; la Soirée mix les enchaîne. Chaque transition est une fonction pure `(state, event) => state`, testée, avec les transitions interdites rejetées.

### 8.2 Événements (tous typés et validés par Zod)
Client → serveur : `room:create`, `room:join`, `room:rejoin`, `room:kick`, `room:updateSettings`, `theme:vote`, `game:start`, `vote:submit` (vote validé, définitif), `vote:forceClose`, `skip:request`, `skip:withdraw`, `challenge:start`, `challenge:endDefense`, `answer:submit` (J'ai déjà et quiz, définitif), `guess:submit` (pronostic), `joker:use`, `reveal:assume`, `story:request`, `game:next`, `game:pause`, `game:end`.
Serveur → client : `room:state` (instantané complet, filtré selon le destinataire), `room:patch` (deltas), `phase:changed` (avec `endsAt` en temps serveur), `vote:progress` (nombre de votants et ids des votants, **jamais le contenu des votes** avant la révélation), `results:revealed`, `error` (codes normalisés).

### 8.3 Robustesse
- **Horloge** : synchronisation au branchement (style NTP, 5 allers-retours, médiane) ; toutes les échéances sont des horodatages serveur, jamais des durées relatives.
- **Reconnexion** : un jeton de session dans `localStorage` permet de retrouver sa place (prénom, photo, votes, scores) après un verrouillage d'écran, un changement de réseau ou un rechargement. La place est gardée 2 min.
- **Départ en plein vote** : le nombre de votes attendus est recalculé immédiatement ; si tous les présents ont voté, le compte à rebours démarre.
- **Désigné déconnecté** : pas de contestation possible pour lui.
- **Anti-triche** : votes acceptés seulement en phase de vote, pour un joueur valide du salon, dans la limite autorisée ; limitation de débit par connexion WebSocket.
- **Durée de vie** : une `alarm()` du Durable Object efface tout son stockage 2 h après la dernière activité ; les photos, qui ne sont qu'en mémoire, disparaissent avec lui.
- **Écran actif** : Screen Wake Lock API pendant la partie (réacquis au retour au premier plan).

### 8.4 Photos et vie privée (RGPD)
- **La photo appartient au téléphone du joueur.** Elle est prise et compressée sur l'appareil (WebP 320×320, < 40 Ko) puis enregistrée **uniquement localement** (IndexedDB). Aucun serveur ne la stocke durablement.
- **Elle n'est envoyée qu'au moment de rejoindre un salon**, dans le message `room:join` (ou `room:rejoin`), sous forme binaire ou base64.
- Le Durable Object la garde **seulement en mémoire vive**, **jamais dans son stockage SQLite**, et la relaie une fois aux autres joueurs du salon, qui la gardent en mémoire le temps de la partie (jamais sur leur disque).
- Si le Durable Object a été mis en veille et a perdu les photos, il envoie `photo:request` aux clients concernés, qui renvoient automatiquement leur photo depuis leur téléphone. Le joueur ne voit rien.
- Quand le joueur quitte, est exclu ou que le salon se termine, sa photo est retirée de la mémoire du salon et de celle des autres téléphones.
- Aucun service tiers, aucun stockage d'images (pas de R2, pas de CDN d'images).
- Pas de compte, pas de traçage. Page « Confidentialité » courte et claire.

---

## 9. PWA et contraintes mobiles

- Installable sur Android et iOS, icône, nom court, couleur de thème, `display: standalone`.
- Fonctionne en 4G médiocre : bundle initial < 180 Ko gzip, polices en `font-display: swap` puis préchargées, code découpé par écran (lazy loading).
- Coquille hors-ligne avec un écran « Pas de réseau, on t'attend » et reconnexion automatique.
- `safe-area-inset-*` respectés (encoche, Dynamic Island, barre de navigation).
- Aucun zoom accidentel (`touch-action`, tailles de police d'input ≥ 16 px sur iOS).
- Retour arrière Android : demande de confirmation avant de quitter une partie en cours.
- Testé sur iOS Safari 17+, Chrome Android, et desktop (Chrome, Firefox, Safari) pour l'écran partagé.

---

## 10. Accessibilité et inclusion

- Zones tactiles ≥ 44 px, focus visible, navigation clavier complète sur desktop.
- `aria-live` pour la question, le compte à rebours et les résultats ; libellés `aria` sur chaque tuile (« Voter pour Léa »).
- La polarité n'est jamais transmise par la couleur seule : icône + libellé.
- Écriture inclusive légère dans les textes d'interface (« désigné·e »), et accord via `{name}` dans les verdicts quand c'est possible.
- Interface entièrement en français, mais tous les textes sont dans des fichiers i18n (`fr.json`) pour ajouter l'anglais plus tard.

---

## 11. Arborescence attendue (indicative)

```
apps/
  web/        # PWA React : routes, écrans, composants, hooks temps réel
  party/      # Cloudflare Worker + Durable Object « Room » : salons, machine à états, wrangler.toml
packages/
  shared/     # types, schémas Zod, scoring, grille, tirage, machine à états
  questions/  # questions.fr.json + script de contrôle
DECISIONS.md  # tes arbitrages
README.md     # installation, lancement, déploiement, captures
```

---

## 12. Tests et critères d'acceptation

**Tests unitaires (Vitest), obligatoires**
- Décompte des votes : 1 et plusieurs votes par joueur, abstentions, égalités, vote pour soi interdit.
- Passer une question : seuil (1/3, moitié, 2 en 18+), retrait d'une demande, remplacement sans incrémenter l'avancement.
- Scoring : polarité, ex æquo, poids unanime, remplacement après contestation.
- Machine à états : toutes les transitions valides, et rejet des transitions invalides.
- Algorithme de grille : pour N = 3 à 20 et pour 4 tailles d'écran (375×667, 390×844, 844×390, 1920×1080), aucune tuile < 64 px et aucun débordement.
- Tirage de questions : ratios respectés, pas de doublon, alternance des formats, déterminisme avec seed.
- J'ai déjà : points de pronostic (exact, ±1), aucune fuite des réponses individuelles en mode *Nombre seulement*, questions `sensitive` jamais révélées.
- Quiz : calcul des points (difficulté, rapidité, série, joker), difficulté progressive, mélange des choix.
- Compteur d'avancement : estimation du temps restant, déclenchement des jalons (mi-temps, dernière ligne droite, dernière question).

**Tests de bout en bout (Playwright, plusieurs contextes navigateur)**
- 1 MJ + 4 joueurs : création, rejoindre par code, selfie simulé (fausse caméra Chromium), vote du thème, 3 questions jouées, une contestation qui acquitte, clôture forcée par le MJ, cérémonie finale.
- Un joueur se déconnecte en plein vote puis revient : il retrouve sa place et son vote.
- Le MJ quitte : transfert du rôle.
- Une partie J'ai déjà de 5 questions (révélation « J'assume ») et une partie Quiz de 5 questions avec un joker.

**Critères d'acceptation**
- [ ] Une partie complète de 30 questions avec 8 joueurs se déroule sans erreur dans la console.
- [ ] Tous les joueurs sont visibles sans scroll de 3 à 20 joueurs (avec bascule en paysage si nécessaire).
- [ ] Le 3-2-1 est synchronisé visuellement sur tous les écrans.
- [ ] Le bouton « Contester » n'apparaît que chez le ou les désignés.
- [ ] Voter se fait en deux temps (sélection modifiable, puis validation définitive) ; aucun minuteur de vote ; la suite ne démarre que quand tout le monde a validé ou que le MJ force.
- [ ] Un joueur peut proposer de passer la question ; au seuil, la question est remplacée sans compter dans l'avancement.
- [ ] L'interface reprend la composition de la référence (fond crème, carte héros, cartes pastel empilées, écran classement plein violet avec feuille blanche).
- [ ] Le récap affiche les deux podiums (positif, négatif) et les prix bonus.
- [ ] `pnpm questions:check` passe : Qui est le plus ? (480 de base + 120 Trash + 120 Hot), J'ai déjà (≥ 100 par thème), Quiz (12 catégories × 45).
- [ ] Les quatre modes (Qui est le plus ?, J'ai déjà, Quiz, Soirée mix) se jouent de bout en bout, avec la barre d'avancement et les jalons.
- [ ] Aucune question 18+ ne peut être tirée sans le consentement de tous les joueurs, ni en mode Full, ni en thème Famille.
- [ ] Lighthouse mobile : PWA installable, Performance ≥ 90, Accessibilité ≥ 95.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` et `pnpm e2e` passent.

---

## 13. Ordre de livraison

1. Plan + `DECISIONS.md` + squelette du monorepo.
2. `packages/shared` : types, Zod, machine à états, scoring, grille, tirage, avec leurs tests.
3. Worker + Durable Object temps réel complet, testé en local avec `wrangler dev` et `@cloudflare/vitest-pool-workers`.
4. Design system (tokens, typos, composants de base : bouton, carte, pilule, tuile joueur, podium, compte à rebours).
5. Écrans dans l'ordre du parcours (§5), câblés au serveur, mode Qui est le plus ? d'abord, puis J'ai déjà (§5B), Quiz (§5C) et Soirée mix.
6. **Branchement des banques de questions existantes** et passage du script de contrôle.
7. PWA, sons, haptique, wake lock, écran partagé.
8. Tests E2E, audit Lighthouse, README avec captures d'écran (portrait et paysage, clair et sombre).

**Ne t'arrête pas avant que la checklist du §12 soit entièrement cochée.**
