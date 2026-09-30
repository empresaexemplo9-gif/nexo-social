// Emojis do chat, por categoria (sem biblioteca: são só caracteres).
// Separa por grafema (emoji com modificador ou ZWJ conta como um só).
const g = (s: string): string[] => {
  const limpo = s.replace(/\s+/g, '');
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: 'grapheme' }) => { segment: (t: string) => Iterable<{ segment: string }> } }).Segmenter;
  return Seg ? Array.from(new Seg('pt', { granularity: 'grapheme' }).segment(limpo), (x) => x.segment) : Array.from(limpo);
};

export const CATEGORIAS_DE_EMOJI: { id: string; rotulo: string; icone: string; emojis: () => string[] }[] = [
  { id: 'rostos', rotulo: 'Rostos', icone: '😀', emojis: () => g('😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😗😚😙🥲😋😛😜🤪😝🤑🤗🤭🫢🫣🤫🤔🫡🤐🤨😐😑😶🫥😏😒🙄😬😮‍💨🤥😌😔😪🤤😴😷🤒🤕🤢🤮🤧🥵🥶🥴😵🤯🤠🥳🥸😎🤓🧐😕🫤😟🙁😮😯😲😳🥺🥹😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀☠️💩🤡👻👽🤖😺😸😹😻😼😽🙀😿😾') },
  { id: 'gestos', rotulo: 'Gestos', icone: '👍', emojis: () => g('👋🤚🖐️✋🖖🫱🫲👌🤌🤏✌️🤞🫰🤟🤘🤙👈👉👆🖕👇☝️🫵👍👎✊👊🤛🤜👏🙌🫶👐🤲🤝🙏✍️💅🤳💪🦾🦵🦶👂🦻👃🧠🫀👀👁️👅👄🫦') },
  { id: 'coracoes', rotulo: 'Corações', icone: '❤️', emojis: () => g('❤️🧡💛💚💙🩵💜🤎🖤🩶🤍💔❤️‍🔥❤️‍🩹❣️💕💞💓💗💖💘💝💟💌💋💯💢💥💫💦💨🕳️💬🗨️💭💤✨🌟⭐🔥🎉🎊') },
  { id: 'natureza', rotulo: 'Natureza', icone: '🐶', emojis: () => g('🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🙈🙉🙊🐔🐧🐦🐤🦆🦅🦉🦇🐺🐗🐴🦄🐝🦋🐌🐞🐢🐍🦖🐙🦑🦀🐬🐳🦈🐊🦓🦒🐘🦘🐈‍⬛🐕🌵🎄🌲🌳🌴🌱🌿☘️🍀🍁🍂🍃🌷🌹🥀🌺🌸🌼🌻🌞🌝🌚🌙🌎🪐⭐🌈☀️⛅🌧️⛈️❄️☃️🌊') },
  { id: 'comida', rotulo: 'Comida', icone: '🍕', emojis: () => g('🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍒🍑🥭🍍🥥🥝🍅🥑🥦🌽🥕🧄🧅🥔🍞🥐🧀🥚🍳🥓🥩🍗🍔🍟🍕🌭🥪🌮🌯🥗🍝🍜🍣🍱🍤🍙🍚🍦🍩🍪🎂🍰🧁🍫🍬🍭🍿☕🍵🧃🥤🧋🍺🍻🥂🍷🥃🍸🍹') },
  { id: 'atividades', rotulo: 'Atividades', icone: '⚽', emojis: () => g('⚽🏀🏈⚾🎾🏐🏉🥏🎱🏓🏸🏒🥊🥋⛳🛹🛼⛸️🎿🏂🏋️🤸⛹️🤺🏄🏊🚴🧘🎮🕹️🎲🧩♟️🎯🎳🎤🎧🎼🎹🥁🎷🎺🎸🪕🎻🎬🎨🎭🎪🎟️🏆🥇🥈🥉🏅') },
  { id: 'viagem', rotulo: 'Viagem', icone: '✈️', emojis: () => g('🚗🚕🚌🏎️🚓🚑🚒🛵🏍️🚲🛴🚂🚆✈️🛫🛬🚀🛸🚁⛵🚤🛳️⚓🗺️🗽🗼🏰🏯🏟️🎡🎢🏖️🏝️🏜️🌋⛰️🏔️🏕️🏠🏡🏢🏥🏦🏨🏫⛪🕌🌃🌆🌇🌉🎆🎇') },
  { id: 'objetos', rotulo: 'Objetos', icone: '💡', emojis: () => g('⌚📱💻⌨️🖥️🖨️🖱️💾📷📸📹🎥📞☎️📺📻🎙️⏰⌛📡🔋🔌💡🔦🕯️💸💵💳💎⚖️🔧🔨🛠️⚙️🔫💣🔪🛡️🔮🧿💈🧪🩺💊🩹🧬🔭🔬🛋️🛏️🚪🧸🎁🎈🎀📦📫📝✏️📚📖🔖📎✂️📌📍🔒🔑') },
  { id: 'simbolos', rotulo: 'Símbolos', icone: '✅', emojis: () => g('✅☑️✔️❌❎➕➖➗✖️♾️‼️⁉️❓❔❕❗〰️©️®️™️#️⃣🔟💲⚠️🚸⛔🚫🔞📵🔇🔈🔉🔊🔔🔕📣📢♻️⚜️🔱📛🔰⭕🆗🆕🆓🆒🆙🔴🟠🟡🟢🔵🟣🟤⚫⚪🟥🟧🟨🟩🟦🟪⬛⬜▶️⏸️⏹️⏺️⏭️⏮️🔀🔁🔂') },
  { id: 'bandeiras', rotulo: 'Bandeiras', icone: '🏳️‍🌈', emojis: () => g('🏳️🏴🏁🚩🏳️‍🌈🏳️‍⚧️🇧🇷🇵🇹🇦🇴🇲🇿🇨🇻🇺🇸🇬🇧🇪🇸🇫🇷🇮🇹🇩🇪🇦🇷🇺🇾🇨🇱🇨🇴🇲🇽🇯🇵🇰🇷🇨🇳🇮🇳🇨🇦🇳🇬🇿🇦') },
];

/** Figurinhas de reação: emojis grandes, com um pulinho ao chegar. */
export const FIGURINHAS_DE_REACAO = g('😂🥹😍🤩😎🥳😭😡🤯🙏👏🔥💯❤️💀🫶👀🤝✨🎉😴🤔😅🙌🤡😱🥺😘🫠🤌');
