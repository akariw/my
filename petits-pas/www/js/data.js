// Contenu de l'application : émotions, histoires sociales, pictogrammes.
// Les phrases sont courtes, au présent et à la première personne,
// comme dans les « histoires sociales » utilisées avec les jeunes enfants autistes.

const EMOTIONS = [
  { id: "content", emoji: "😊", label: "[Content|Contente]", color: "#ffe9a8",
    say: "Je suis [content|contente].", example: "Je suis [content|contente] quand je joue avec mes jouets." },
  { id: "triste", emoji: "😢", label: "Triste", color: "#c9ddf5",
    say: "Je suis triste.", example: "Je suis triste quand mon jouet est cassé. Je peux demander un câlin." },
  { id: "colere", emoji: "😠", label: "En colère", color: "#f6c6bd",
    say: "Je suis en colère.", example: "Je suis en colère quand je dois arrêter de jouer. Je peux respirer doucement." },
  { id: "peur", emoji: "😨", label: "Peur", color: "#dccff0",
    say: "J'ai peur.", example: "J'ai peur quand il y a un grand bruit. Je peux aller voir maman ou papa." },
  { id: "surpris", emoji: "😮", label: "[Surpris|Surprise]", color: "#cdeedd",
    say: "Je suis [surpris|surprise].", example: "Je suis [surpris|surprise] quand je reçois un cadeau." },
  { id: "fatigue", emoji: "😴", label: "[Fatigué|Fatiguée]", color: "#e2e4ea",
    say: "Je suis [fatigué|fatiguée].", example: "Je suis [fatigué|fatiguée] le soir. C'est l'heure de dormir." },
  { id: "calme", emoji: "😌", label: "Calme", color: "#d4ecf0",
    say: "Je suis calme.", example: "Je suis calme quand je regarde un livre." },
];

const STORIES = [
  {
    id: "bonjour", emoji: "👋", title: "Dire bonjour", color: "#ffe9a8",
    steps: [
      { emoji: "🧒 🧑", text: "Quand je vois quelqu'un, je peux dire bonjour." },
      { emoji: "👋", text: "Je peux faire coucou avec ma main." },
      { emoji: "🗣️", text: "Je peux aussi dire « bonjour » avec ma voix." },
      { emoji: "😊", text: "La personne est contente. Elle me dit bonjour aussi." },
      { emoji: "⭐", text: "Bravo ! J'ai dit bonjour." },
    ],
  },
  {
    id: "partager", emoji: "🧸", title: "Prêter un jouet", color: "#f6d5c3",
    steps: [
      { emoji: "🧸", text: "Je joue avec mon jouet." },
      { emoji: "🧒", text: "Un ami veut jouer avec moi." },
      { emoji: "🤲", text: "Je peux lui prêter le jouet un petit moment." },
      { emoji: "🔁", text: "Après, l'ami me rend le jouet." },
      { emoji: "😊", text: "On est contents. C'est gentil de prêter." },
    ],
  },
  {
    id: "tour", emoji: "⏳", title: "Attendre mon tour", color: "#d4ecf0",
    steps: [
      { emoji: "🌳", text: "Au parc, il y a d'autres enfants." },
      { emoji: "🧒 🧒 🧒", text: "Parfois, il faut attendre son tour." },
      { emoji: "⏳", text: "J'attends. Je peux compter jusqu'à cinq : un, deux, trois, quatre, cinq." },
      { emoji: "🙌", text: "C'est mon tour ! Je peux jouer." },
      { emoji: "⭐", text: "Bravo ! J'ai bien attendu." },
    ],
  },
  {
    id: "ami", emoji: "🤝", title: "Jouer avec un ami", color: "#cdeedd",
    steps: [
      { emoji: "🧒", text: "Je vois un enfant qui joue." },
      { emoji: "🙋", text: "Je peux m'approcher doucement." },
      { emoji: "🗣️", text: "Je peux dire « on joue ? » ou montrer le jeu." },
      { emoji: "🧩", text: "On joue ensemble. Chacun son tour." },
      { emoji: "😊", text: "Jouer avec un ami, c'est chouette." },
    ],
  },
  {
    id: "creche", emoji: "🏫", title: "Aller à la crèche ou à l'école", color: "#dccff0",
    steps: [
      { emoji: "🎒", text: "Le matin, je mets mon manteau et mon sac." },
      { emoji: "🚗", text: "Je vais à la crèche ou à l'école avec un adulte." },
      { emoji: "👋", text: "Je dis au revoir. Maman ou papa va revenir." },
      { emoji: "🎨", text: "Je joue, je dessine, je chante avec les autres enfants." },
      { emoji: "🤗", text: "Après, maman ou papa revient me chercher." },
    ],
  },
  {
    id: "docteur", emoji: "🩺", title: "Aller chez le docteur", color: "#c9ddf5",
    steps: [
      { emoji: "🏥", text: "Aujourd'hui, je vais chez le docteur." },
      { emoji: "🪑", text: "J'attends dans la salle d'attente. Je peux regarder un livre." },
      { emoji: "🩺", text: "Le docteur écoute mon cœur. Ça ne fait pas mal." },
      { emoji: "🙋", text: "Si j'ai peur, je peux tenir la main de maman ou papa." },
      { emoji: "⭐", text: "C'est fini ! J'ai été [courageux|courageuse]." },
    ],
  },
  {
    id: "bruit", emoji: "🎧", title: "Quand il y a trop de bruit", color: "#e2e4ea",
    steps: [
      { emoji: "🔊", text: "Parfois, il y a beaucoup de bruit." },
      { emoji: "😣", text: "Le bruit peut me gêner. C'est normal." },
      { emoji: "🎧", text: "Je peux mettre mon casque ou boucher mes oreilles." },
      { emoji: "✋", text: "Je peux demander une pause à un adulte." },
      { emoji: "😌", text: "Je respire doucement. Ça va mieux." },
    ],
  },
  {
    id: "mains", emoji: "🧼", title: "Me laver les mains", color: "#cdeedd",
    steps: [
      { emoji: "🚰", text: "J'ouvre l'eau et je mouille mes mains." },
      { emoji: "🧼", text: "Je prends du savon." },
      { emoji: "👐", text: "Je frotte mes mains, devant et derrière." },
      { emoji: "💧", text: "Je rince mes mains avec l'eau." },
      { emoji: "🧻", text: "Je sèche mes mains. Elles sont toutes propres !" },
    ],
  },
];

// Pictogrammes pour l'emploi du temps visuel.
const ACTIVITIES = [
  { id: "reveil", emoji: "⏰", label: "Réveil" },
  { id: "toilettes", emoji: "🚽", label: "Toilettes" },
  { id: "petitdej", emoji: "🥣", label: "Petit-déjeuner" },
  { id: "habiller", emoji: "👕", label: "S'habiller" },
  { id: "dents", emoji: "🦷", label: "Brosser les dents" },
  { id: "mains", emoji: "🧼", label: "Laver les mains" },
  { id: "creche", emoji: "🏫", label: "Crèche / école" },
  { id: "voiture", emoji: "🚗", label: "Voiture" },
  { id: "jouer", emoji: "🧸", label: "Jouer" },
  { id: "dessin", emoji: "🎨", label: "Dessiner" },
  { id: "dejeuner", emoji: "🍽️", label: "Déjeuner" },
  { id: "sieste", emoji: "😴", label: "Sieste" },
  { id: "gouter", emoji: "🍎", label: "Goûter" },
  { id: "parc", emoji: "🌳", label: "Parc" },
  { id: "courses", emoji: "🛒", label: "Courses" },
  { id: "docteur", emoji: "🩺", label: "Docteur" },
  { id: "famille", emoji: "👵", label: "Voir la famille" },
  { id: "bain", emoji: "🛁", label: "Bain" },
  { id: "diner", emoji: "🍝", label: "Dîner" },
  { id: "histoire", emoji: "📖", label: "Histoire" },
  { id: "dodo", emoji: "🌙", label: "Dodo" },
];

const DEFAULT_SCHEDULE = ["reveil", "petitdej", "habiller", "dents", "creche", "dejeuner", "jouer", "bain", "diner", "histoire", "dodo"];

// Tableau de communication : un appui = une phrase prononcée.
const TALK = [
  { emoji: "👍", label: "Oui", say: "Oui.", color: "#cdeedd" },
  { emoji: "👎", label: "Non", say: "Non.", color: "#f6c6bd" },
  { emoji: "🍽️", label: "J'ai faim", say: "J'ai faim.", color: "#ffe9a8" },
  { emoji: "🥤", label: "J'ai soif", say: "J'ai soif.", color: "#c9ddf5" },
  { emoji: "🚽", label: "Toilettes", say: "Je veux aller aux toilettes.", color: "#e2e4ea" },
  { emoji: "🙋", label: "Aide-moi", say: "Aide-moi, s'il te plaît.", color: "#dccff0" },
  { emoji: "🤗", label: "Câlin", say: "Je veux un câlin.", color: "#f6d5c3" },
  { emoji: "✋", label: "Pause", say: "Je veux une pause.", color: "#d4ecf0" },
  { emoji: "🔁", label: "Encore", say: "Encore, s'il te plaît.", color: "#cdeedd" },
  { emoji: "🏁", label: "Fini", say: "C'est fini.", color: "#e2e4ea" },
  { emoji: "🤕", label: "J'ai mal", say: "J'ai mal.", color: "#f6c6bd" },
  { emoji: "😴", label: "[Fatigué|Fatiguée]", say: "Je suis [fatigué|fatiguée].", color: "#e2e4ea" },
  { emoji: "🎧", label: "Trop de bruit", say: "Il y a trop de bruit.", color: "#dccff0" },
  { emoji: "🧸", label: "Jouer", say: "Je veux jouer.", color: "#ffe9a8" },
  { emoji: "🌳", label: "Dehors", say: "Je veux aller dehors.", color: "#cdeedd" },
  { emoji: "📖", label: "Livre", say: "Je veux un livre.", color: "#c9ddf5" },
];

const MODULES = [
  { id: "emotions", emoji: "😊", label: "Mes émotions", color: "#ffe9a8" },
  { id: "stories", emoji: "📖", label: "Histoires", color: "#c9ddf5" },
  { id: "schedule", emoji: "🗓️", label: "Ma journée", color: "#cdeedd" },
  { id: "talk", emoji: "💬", label: "Je dis", color: "#f6d5c3" },
  { id: "turns", emoji: "🧱", label: "Chacun son tour", color: "#dccff0" },
  { id: "calm", emoji: "🍃", label: "Coin calme", color: "#d4ecf0" },
];
