export type GameTermLocale = 'en' | 'pt' | 'es' | 'ja' | 'fr' | 'ko' | 'it' | 'ru' | 'de' | 'pl' | 'zh-hant' | 'ar' | 'zh-hans'

type LocaleTextMap = Readonly<Record<GameTermLocale, string>>

const TOWER_TERM_TEXT_MAP = Object.freeze<Record<string, LocaleTextMap>>({
  'Black Hole': {
    en: 'Black Hole', pt: 'Buraco Negro', es: 'Agujero negro', ja: 'ブラックホール', fr: 'Trou noir', ko: '블랙홀', it: 'Buco nero', ru: 'Черная дыра', de: 'Schwarzes Loch', pl: 'Czarna Dziura', 'zh-hant': '黑洞', ar: 'الثقب الأسود', 'zh-hans': '黑洞',
  },
  'Chain Lightning': {
    en: 'Chain Lightning', pt: 'Relâmpago em Cadeia', es: 'Relámpago en cadena', ja: 'チェーンライトニング', fr: 'Chaîne d\'éclairs', ko: '연쇄 번개', it: 'Fulmine a catena', ru: 'цепная молния', de: 'Kettenblitz', pl: 'Łańcuchowa Błyskawica', 'zh-hant': '連鎖閃電', ar: 'سلسلة البرق', 'zh-hans': '连环闪电',
  },
  'Chrono Field': {
    en: 'Chrono Field', pt: 'Campo Crono', es: 'Cronocampo', ja: 'クロノフィールド', fr: 'Champ temporel', ko: '크로노 필드', it: 'Campo temporale', ru: 'хронографическое поле', de: 'Chronofeld', pl: 'Pole Chrono', 'zh-hant': '計時區', ar: 'كرونو فيلد', 'zh-hans': '时间场',
  },
  'Damage / Meter': {
    en: 'Damage / Meter', pt: 'Dano / Metro', es: 'Daño/metro', ja: 'ダメージ/メートル', fr: 'Dégâts par mètre', ko: '대미지/미터', it: 'Danni al metro', ru: 'Урон / Шкала', de: 'Schaden/Meter', pl: 'Damage / Meter', 'zh-hant': '傷害／公尺', ar: 'الضرر / العداد', 'zh-hans': '伤害/米',
  },
  'Critical Chance': {
    en: 'Critical Chance', pt: 'Chance de Crítico', es: 'Probabilidad de crítico', ja: 'クリティカル率', fr: 'Chances de coup critique', ko: '치명타 확률', it: 'Probabilità critico', ru: 'Критический шанс', de: 'Kritische Chance', pl: 'Critical Chance', 'zh-hant': '爆擊率', ar: 'فرصة حاسمة', 'zh-hans': '暴击率',
  },
  'Critical Factor': {
    en: 'Critical Factor', pt: 'Fator Crítico', es: 'Factor crítico', ja: 'クリティカルファクター', fr: 'Multiplicateur de coup critique', ko: '치명타 계수', it: 'Moltiplicatore danno critico', ru: 'коэффициент критического удара', de: 'Kritischer Faktor', pl: 'Critical Factor', 'zh-hant': '爆擊倍率', ar: 'عامل حاسم', 'zh-hans': '暴击倍率',
  },
  'Death Wave': {
    en: 'Death Wave', pt: 'Onda da Morte', es: 'Onda mortal', ja: 'デスウェーブ', fr: 'Onde mortelle', ko: '죽음의 파동', it: 'Onda mortale', ru: 'волна смерти', de: 'Todeswelle', pl: 'Fala śmierci', 'zh-hant': '死亡波動', ar: 'موجة الموت', 'zh-hans': '死亡波',
  },
  'Final Wave': {
    en: 'Final Wave', pt: 'Onda final', es: 'Ola final', ja: '最終ウェーブ', fr: 'Vague finale', ko: '최종 파동', it: 'Ondata finale', ru: 'Финальная волна', de: 'Letzte Welle', pl: 'Fala końcowa', 'zh-hant': '最終波次', ar: 'الموجة الأخيرة', 'zh-hans': '最终波次',
  },
  'Golden Bot': {
    en: 'Golden Bot', pt: 'Bot Dourado', es: 'Bot dorado', ja: 'ゴールデンボット', fr: 'Bot doré', ko: '황금 봇', it: 'Bot dorato', ru: 'Золотой бот', de: 'Goldener Bot', pl: 'Złoty Bot', 'zh-hant': '黃金機器人', ar: 'البوت الذهبي', 'zh-hans': '黄金机器人',
  },
  'Golden Tower': {
    en: 'Golden Tower', pt: 'Torre Dourada', es: 'Torre dorada', ja: 'ゴールデンタワー', fr: 'Tour dorée', ko: '황금 타워', it: 'Torre dorata', ru: 'золотая башня', de: 'Goldener Turm', pl: 'Złota Wieża', 'zh-hant': '黃金塔樓', ar: 'البرج الذهبي', 'zh-hans': '黄金炮塔',
  },
  'Inner Land Mines': {
    en: 'Inner Land Mines', pt: 'Minas Terrestres Internas', es: 'Minas terrestres internas', ja: '内部地雷', fr: 'Mines internes', ko: '내부 지뢰', it: 'Mine interne', ru: 'внутренние мины', de: 'Innere Landminen', pl: 'Miny wewnętrzne', 'zh-hant': '內部地雷', ar: 'ألغام أرضية داخلية', 'zh-hans': '内侧地雷',
  },
  Linger: {
    en: 'Linger', pt: 'Perduração', es: 'Persistencia', ja: '余波', fr: 'Persistance', ko: '잔류', it: 'Dilazione', ru: 'Задерживаться', de: 'Verweilen', pl: 'Linger', 'zh-hant': '遲滯', ar: 'لينجر', 'zh-hans': '残留',
  },
  'Multishot Chance': {
    en: 'Multishot Chance', pt: 'Chance de Multidisparos', es: 'Probabilidad de multidisparo', ja: 'マルチショットの確率', fr: 'Chances de tir multiple', ko: '멀티샷 확률', it: 'Prob. multicolpo', ru: 'шанс залпа', de: 'Mehrfachschuss-Chance', pl: 'Multishot Chance', 'zh-hant': '多重射擊機率', ar: 'فرصة إصابة متعددة', 'zh-hans': '连射几率',
  },
  'Poison Swamp': {
    en: 'Poison Swamp', pt: 'Pântano Venenoso', es: 'Ciénaga ponzoñosa', ja: '毒の沼', fr: 'Marais empoisonné', ko: '유독성 늪', it: 'Palude velenosa', ru: 'ядовитое болото', de: 'Giftsumpf', pl: 'Trujące Bagno', 'zh-hant': '毒液沼澤', ar: 'مستنقع السم', 'zh-hans': '毒沼',
  },
  'Range': {
    en: 'Range', pt: 'Alcance', es: 'Alcance', ja: '範囲', fr: 'Portée', ko: '범위', it: 'Raggio', ru: 'дальность', de: 'Reichweite', pl: 'Range', 'zh-hant': '範圍', ar: 'النطاق', 'zh-hans': '射程',
  },
  'Rapid Fire Chance': {
    en: 'Rapid Fire Chance', pt: 'Chance de Rajada', es: 'Probabilidad de fuego rápido', ja: '速射の確率', fr: 'Chances de tir rapide', ko: '고속 발사 확률', it: 'Probabilità fuoco rapido', ru: 'шанс беглого огня', de: 'Schnellfeuer-Chance', pl: 'Rapid Fire Chance', 'zh-hant': '快速射擊機率', ar: 'فرصة إطلاق نار سريع', 'zh-hans': '速射几率',
  },
  'Smart Missiles': {
    en: 'Smart Missiles', pt: 'Mísseis Inteligentes', es: 'Misiles inteligentes', ja: 'スマートミサイル', fr: 'Missiles à tête chercheuse', ko: '스마트 미사일', it: 'Missili intelligenti', ru: 'умные ракеты', de: 'Intelligente Raketen', pl: 'Inteligentne rakiety', 'zh-hant': '智慧導彈', ar: 'الصواريخ الذكية', 'zh-hans': '智能飞弹',
  },
  'Ultimate Weapon': {
    en: 'Ultimate Weapon', pt: 'Arma Definitiva', es: 'Arma definitiva', ja: '究極の武器', fr: 'Arme ultime', ko: '궁극 무기', it: 'Arma finale', ru: 'ультимативное оружие', de: 'Ultimative Waffe', pl: 'Broń Ostateczna', 'zh-hant': '終極武器', ar: 'سلاح مطلق', 'zh-hans': '终极武器',
  },
  'Ultimate Weapons': {
    en: 'Ultimate Weapons', pt: 'Armas Definitivas', es: 'Armas definitivas', ja: '究極の武器', fr: 'Armes ultimes', ko: '궁극 무기', it: 'Armi finali', ru: 'ультимативное оружие', de: 'Ultimative Waffen', pl: 'Bronie Ostateczne', 'zh-hant': '終極武器', ar: 'أسلحة مطلقة', 'zh-hans': '终极武器',
  },
  'Attack Speed': {
    en: 'Attack Speed', pt: 'Velocidade de Ataque', es: 'Velocidad de ataque', ja: '攻撃速度', fr: 'Vitesse d\'attaque', ko: '공격 속도', it: 'Velocità di attacco', ru: 'Скорость атаки', de: 'Angriffsgeschwindigkeit', pl: 'Attack Speed', 'zh-hant': '攻擊速度', ar: 'سرعة الهجوم', 'zh-hans': '攻击速度',
  },
})

const TOWER_ACRONYM_MAP = Object.freeze<Record<string, string>>({
  BH: 'Black Hole',
  CF: 'Chrono Field',
  CL: 'Chain Lightning',
  DW: 'Death Wave',
  GB: 'Golden Bot',
  GT: 'Golden Tower',
  Lng: 'Linger',
  LNG: 'Linger',
  UW: 'Ultimate Weapon',
  UWs: 'Ultimate Weapons',
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

export function normalizeLocalizedGameTerms(language: GameTermLocale, value: string): string {
  if (language === 'en') return String(value)

  let output = String(value)
  const sortedTerms = Object.keys(TOWER_TERM_TEXT_MAP).sort((left, right) => right.length - left.length)

  for (const englishTerm of sortedTerms) {
    const localizedValue = TOWER_TERM_TEXT_MAP[englishTerm]?.[language]
    if (!localizedValue || localizedValue === englishTerm) continue
    output = output.replace(new RegExp(escapeRegExp(englishTerm), 'gu'), localizedValue)
  }

  for (const [acronym, englishTerm] of Object.entries(TOWER_ACRONYM_MAP)) {
    const localizedValue = TOWER_TERM_TEXT_MAP[englishTerm]?.[language]
    if (!localizedValue || localizedValue === englishTerm) continue
    output = output.replace(new RegExp(`\\b${escapeRegExp(acronym)}\\b`, 'gu'), localizedValue)
  }

  if (output === 'Lng' || output === 'LNG') {
    return TOWER_TERM_TEXT_MAP.Linger[language]
  }

  return output
}
