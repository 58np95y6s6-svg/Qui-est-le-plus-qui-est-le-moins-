# PROMPT — « QUI ?! » · PWA de quiz social multijoueur temps réel

> Copie-colle tout ce qui suit dans ton agent de code (Claude Code, Cursor, v0, Bolt…).
> Le nom « QUI ?! » est un nom de travail : remplace-le librement.

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

## 1. Le concept en une phrase

Des joueurs réunis dans la même pièce rejoignent un salon depuis leur téléphone (code ou QR code). À chaque tour, une question du type **« Qui est le plus… ? »**, **« Qui est le moins… ? »** ou **« Qui pour… ? »** s'affiche avec **la photo et le prénom de tous les participants visibles d'un coup d'œil**. Chacun vote pour un membre du salon, on révèle le verdict, la personne désignée peut **contester** et plaider sa cause. À la fin, on sacre **le plus encensé** et **le plus taclé** de la soirée.

---

## 2. Stack technique imposée (sauf justification solide dans `DECISIONS.md`)

- **Front** : React 18 + TypeScript strict + Vite, Tailwind CSS (tokens du §4 dans `tailwind.config`), Framer Motion pour toutes les animations, Zustand pour l'état client, `qrcode` pour générer le QR et `@zxing/browser` (ou `BarcodeDetector` quand il existe) pour le scanner.
- **PWA** : `vite-plugin-pwa` (Workbox), manifest complet, icônes maskable 192/512, splash screens iOS, mode `standalone`, coquille hors-ligne, invite d'installation personnalisée (et instructions dédiées pour iOS Safari, qui n'a pas d'invite native).
- **Temps réel / back** : Node 20 + Fastify + Socket.IO. **Une salle = un état en mémoire géré par une machine à états** (aucune base de données obligatoire pour jouer). Adaptateur Redis optionnel pour passer à plusieurs instances.
- **Validation** : Zod partagé entre client et serveur (package `shared/`) pour chaque événement et pour la banque de questions.
- **Monorepo** : `pnpm` workspaces → `apps/web`, `apps/server`, `packages/shared`, `packages/questions`.
- **Déploiement** : Dockerfile multi-stage + `docker-compose.yml`, et la doc pour déployer le front sur Vercel/Netlify et le serveur sur Fly.io/Render.

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

### 4.1 Ce qu'on garde de l'inspiration fournie
La référence (app d'apprentissage des langues, orange vif + crème) donne l'esprit : **cartes très arrondies et empilées en couleurs franches**, **podium 2-1-3 avec avatars posés dessus**, **sélecteur segmenté en pilule** (Hebdo / Tout), **liste de classement aérée** avec flèches de tendance, **badge compteur en haut à droite**, en-tête « avatar + nom + niveau », **gros CTA blanc pleine largeur** sur fond coloré, beaucoup d'air et une grande lisibilité.

### 4.2 Ce qu'on change : nouvelle identité « soirée électrique »
On abandonne le mono-orange au profit d'une palette plus festive et plus contrastée, pensée pour le **mode sombre en priorité** (on joue souvent le soir, lumière tamisée), avec un mode clair aussi soigné.

**Couleurs (tokens CSS sur `:root`)**

| Token | Sombre (défaut) | Clair | Usage |
|---|---|---|---|
| `--bg` | `#100C1C` | `#F7F3EC` | Fond de l'app |
| `--surface` | `#1C1630` | `#FFFFFF` | Cartes |
| `--surface-2` | `#272040` | `#EFE9DF` | Cartes secondaires, champs |
| `--ink` | `#F7F3EC` | `#14101F` | Texte principal |
| `--ink-muted` | `#A79FC2` | `#6B6480` | Texte secondaire |
| `--primary` | `#7B4DFF` (violet électrique) | `#6A3CF0` | CTA, sélection, MJ |
| `--positive` | `#C6FF3D` (citron acide) | `#5FB800` | Questions et palmarès positifs |
| `--negative` | `#FF4D6A` (corail sanguin) | `#E5304F` | Questions et palmarès négatifs |
| `--neutral` | `#5CD6FF` (bleu ciel) | `#0E9BD1` | Questions « Qui pour… » neutres et fun |
| `--gold` | `#FFD23F` | `#F2B700` | Podium, compte à rebours, couronnes |
| `--pink` | `#FF9BD8` | `#F06BB8` | Accents, confettis |

Règles : contraste texte/fond ≥ 4.5:1 (vérifie et documente-le), texte foncé `#14101F` sur `--positive` et `--gold`, jamais de blanc dessus. Les couleurs de thème : **Collègues = bleu ciel**, **Amis = rose**, **Famille = or**, **Full = violet**, réutilisées en cartes empilées façon référence.

**Typographies (Google Fonts, auto-hébergées pour le hors-ligne)**
- **Titres et questions** : *Bricolage Grotesque* 700–800, interlettrage serré (-0.02em). La question s'affiche en très grand.
- **Texte d'interface** : *Manrope* 500–700.
- **Chiffres** (code du salon, compte à rebours, scores, votes) : *Unbounded* 800–900, chiffres tabulaires. Le « 3-2-1 » doit occuper la moitié de l'écran.

**Formes et matières**
- Rayons : cartes 28 px, boutons 20 px, pilules et avatars `999px`.
- Ombres « décalées » franches (ex. `0 6px 0 rgba(0,0,0,.35)`) sur les CTA, qui s'enfoncent au tap (translateY 4px). Sur les cartes, une ombre douce et un léger grain (noise SVG à 4 % d'opacité).
- Photos des joueurs en **cercles avec un anneau coloré** (couleur attribuée à chaque joueur parmi 12 teintes harmonisées), ou en squircle quand la grille devient dense.
- Iconographie : Phosphor Icons (style *bold* ou *fill*), aucune icône emoji dans l'interface (les emoji sont réservés au contenu des réactions).

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
Logo animé, deux CTA géants : **Créer une partie** / **Rejoindre**. Lien « Comment on joue ? » (3 cartes swipables). Invite à installer la PWA après la première partie, jamais avant.

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
- Le profil (prénom + photo) est mémorisé localement pour les parties suivantes, avec bouton « Changer ».

### 5.4 Création du salon : réglages du MJ
Écran en cartes empilées, chaque réglage en une ligne claire :

| Réglage | Valeurs | Défaut |
|---|---|---|
| Nombre de questions | 10 / 20 / **30** / 50 | 30 |
| **Votes par joueur et par question** (« X réponses ») | 1 / 2 / 3 (avec 2 ou 3, un joueur répartit ses votes sur des personnes différentes) | 1 |
| Thème | Collègues / Amis / Famille / **Full** | — |
| **Choix du thème** | « Je choisis » ou **« Les joueurs votent »** | Je choisis |
| Voter pour soi-même | Oui / Non | Non |
| Votes | **Anonymes** / Publics (on révèle qui a voté pour qui) | Anonymes |
| Minuteur par question | Aucun / 20 s / 30 s / 45 s / 60 s | 30 s |
| Contestation | Activée / Désactivée, et nombre maximal par joueur (1 / 2 / 3 / illimité) | Activée, 2 |
| Intensité | Soft / **Épicé** (filtre les questions d'intensité 3) | Soft |
| Équilibre | Curseur positif ↔ négatif (par défaut 40 % positif, 40 % négatif, 20 % neutre) | 40/40/20 |
| Retardataires | Autorisés entre deux questions / Refusés | Autorisés |

Préréglages en un tap : **Afterwork** (Collègues, Soft, anonyme), **Soirée** (Amis, Épicé), **Repas de famille** (Famille, Soft).

### 5.5 Salon d'attente (lobby)
- En haut : **code en très gros** (Unbounded), **QR code** plein écran au tap, bouton partager (Web Share API) et copier le lien.
- Grille des joueurs qui arrivent en temps réel (animation « pop »), pastille de connexion, couronne sur le MJ.
- Le MJ peut exclure un joueur (appui long sur sa tuile → confirmation).
- **Vote du thème** si activé : 4 grandes cartes de thème, chaque joueur vote, jauges qui se remplissent en direct, égalité tranchée par le MJ. Le MJ peut lancer le vote de thème puis la partie.
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
- Tap sur une tuile = vote, avec un état « sélectionné » très net. On peut **changer d'avis tant que le vote est ouvert**. Avec 2 ou 3 votes par question, compteur « 2/3 votes utilisés ».
- Si « voter pour soi » est désactivé, sa propre tuile est visible mais grisée.
- Indicateur **« 6/9 ont voté »** sous forme de petits points, **sans révéler qui a voté pour qui**, mais avec une coche discrète sur les tuiles de ceux qui ont déjà voté (pour savoir qui on attend).
- Minuteur circulaire autour du numéro de question s'il est activé.
- **Côté MJ uniquement** : bouton **« Clore le vote »** (confirmation par appui long de 600 ms pour éviter les erreurs).

### 5.7 Fin du vote → compte à rebours 3-2-1
Déclencheurs, dans cet ordre : **tous les joueurs connectés ont voté** OU **le MJ clôt le vote** OU **le minuteur expire**. Puis le serveur diffuse une heure de fin et **tous les écrans affichent le 3-2-1 de façon synchronisée** (à ±100 ms grâce à la compensation de décalage d'horloge, voir §8). Les non-votants comptent comme abstention.

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
- **Intensité** 1 (tout public), 2 (taquin), 3 (épicé, jamais humiliant). Interdits : physique et poids, orientation sexuelle, religion, santé, origines, argent réel des gens, sexualité explicite. On se moque des **comportements et des habitudes**, jamais de l'identité.

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

### 7.5 Script de contrôle `pnpm questions:check`
Il échoue si : ids en double, textes en double ou quasi-doublons (similarité normalisée > 0,85), volume par thème insuffisant, ratios hors tolérance (±5 %), question sans `verdict`, `{name}` absent du verdict, mot de la liste interdite trouvé. Il affiche un tableau de statistiques par thème, polarité, format et intensité.

---

## 8. Architecture temps réel

### 8.1 Machine à états d'un salon (côté serveur)
```
LOBBY → (THEME_VOTE) → QUESTION_INTRO → VOTING → COUNTDOWN → RESULTS
RESULTS → CHALLENGE_DEFENSE → REVOTING → COUNTDOWN → FINAL_RESULTS
RESULTS | FINAL_RESULTS → QUESTION_INTRO (question suivante) | CEREMONY → ENDED
n'importe quel état → PAUSED → retour à l'état précédent
```
Chaque transition est une fonction pure `(state, event) => state`, testée, avec les transitions interdites rejetées.

### 8.2 Événements (tous typés et validés par Zod)
Client → serveur : `room:create`, `room:join`, `room:rejoin`, `room:kick`, `room:updateSettings`, `theme:vote`, `game:start`, `vote:cast`, `vote:clear`, `vote:forceClose`, `challenge:start`, `challenge:endDefense`, `game:next`, `game:pause`, `game:end`.
Serveur → client : `room:state` (instantané complet, filtré selon le destinataire), `room:patch` (deltas), `phase:changed` (avec `endsAt` en temps serveur), `vote:progress` (nombre de votants et ids des votants, **jamais le contenu des votes** avant la révélation), `results:revealed`, `error` (codes normalisés).

### 8.3 Robustesse
- **Horloge** : synchronisation au branchement (style NTP, 5 allers-retours, médiane) ; toutes les échéances sont des horodatages serveur, jamais des durées relatives.
- **Reconnexion** : un jeton de session dans `localStorage` permet de retrouver sa place (prénom, photo, votes, scores) après un verrouillage d'écran, un changement de réseau ou un rechargement. La place est gardée 2 min.
- **Départ en plein vote** : le nombre de votes attendus est recalculé immédiatement ; si tous les présents ont voté, le compte à rebours démarre.
- **Désigné déconnecté** : pas de contestation possible pour lui.
- **Anti-triche** : votes acceptés seulement en phase de vote, pour un joueur valide du salon, dans la limite autorisée ; limitation de débit par socket.
- **Durée de vie** : salon détruit 2 h après la dernière activité ; photos effacées de la mémoire avec lui.
- **Écran actif** : Screen Wake Lock API pendant la partie (réacquis au retour au premier plan).

### 8.4 Photos et vie privée (RGPD)
- Les photos ne sont **jamais stockées sur disque** ni envoyées à un service tiers : elles vivent dans la mémoire du salon et disparaissent avec lui.
- Envoyées une seule fois à l'arrivée, puis mises en cache côté client par id de joueur (aucun renvoi à chaque état).
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
  server/     # Fastify + Socket.IO, gestion des salons, machine à états
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
- Scoring : polarité, ex æquo, poids unanime, remplacement après contestation.
- Machine à états : toutes les transitions valides, et rejet des transitions invalides.
- Algorithme de grille : pour N = 3 à 20 et pour 4 tailles d'écran (375×667, 390×844, 844×390, 1920×1080), aucune tuile < 64 px et aucun débordement.
- Tirage de questions : ratios respectés, pas de doublon, alternance des formats, déterminisme avec seed.

**Tests de bout en bout (Playwright, plusieurs contextes navigateur)**
- 1 MJ + 4 joueurs : création, rejoindre par code, selfie simulé (fausse caméra Chromium), vote du thème, 3 questions jouées, une contestation qui acquitte, clôture forcée par le MJ, cérémonie finale.
- Un joueur se déconnecte en plein vote puis revient : il retrouve sa place et son vote.
- Le MJ quitte : transfert du rôle.

**Critères d'acceptation**
- [ ] Une partie complète de 30 questions avec 8 joueurs se déroule sans erreur dans la console.
- [ ] Tous les joueurs sont visibles sans scroll de 3 à 20 joueurs (avec bascule en paysage si nécessaire).
- [ ] Le 3-2-1 est synchronisé visuellement sur tous les écrans.
- [ ] Le bouton « Contester » n'apparaît que chez le ou les désignés.
- [ ] Le récap affiche les deux podiums (positif, négatif) et les prix bonus.
- [ ] `pnpm questions:check` passe avec au moins 480 questions.
- [ ] Lighthouse mobile : PWA installable, Performance ≥ 90, Accessibilité ≥ 95.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` et `pnpm e2e` passent.

---

## 13. Ordre de livraison

1. Plan + `DECISIONS.md` + squelette du monorepo.
2. `packages/shared` : types, Zod, machine à états, scoring, grille, tirage, avec leurs tests.
3. Serveur temps réel complet.
4. Design system (tokens, typos, composants de base : bouton, carte, pilule, tuile joueur, podium, compte à rebours).
5. Écrans dans l'ordre du parcours (§5), câblés au serveur.
6. **Banque de questions complète** (rédigée par lots de 60, chaque lot vérifié par le script).
7. PWA, sons, haptique, wake lock, écran partagé.
8. Tests E2E, audit Lighthouse, README avec captures d'écran (portrait et paysage, clair et sombre).

**Ne t'arrête pas avant que la checklist du §12 soit entièrement cochée.**
