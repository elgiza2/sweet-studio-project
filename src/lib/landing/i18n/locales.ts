export type LocaleCode =
  | "en"
  | "ar"
  | "ar-eg"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "it"
  | "tr"
  | "ru"
  | "zh"
  | "ja"
  | "ko"
  | "hi"
  | "id"
  | "nl"
  | "sv"
  | "cs"
  | "ro"
  | "el"
  | "uk"
  | "he"
  | "fa"
  | "vi"
  | "th"
  | "pl";


export interface LocaleMeta {
  code: LocaleCode;
  path: string; // url prefix, "" for default english
  nativeName: string;
  englishName: string;
  dir: "ltr" | "rtl";
  hreflang: string; // e.g. en, ar, es-419
  ogLocale: string; // en_US, ar_EG ...
}

export const LOCALES: LocaleMeta[] = [
  {
    code: "en",
    path: "",
    nativeName: "English",
    englishName: "English",
    dir: "ltr",
    hreflang: "en",
    ogLocale: "en_US",
  },
  {
    code: "ar",
    path: "/ar",
    nativeName: "العربية",
    englishName: "Arabic",
    dir: "rtl",
    hreflang: "ar",
    ogLocale: "ar_EG",
  },
  {
    code: "ar-eg",
    path: "/ar-eg",
    nativeName: "مصري",
    englishName: "Egyptian Arabic",
    dir: "rtl",
    hreflang: "ar-EG",
    ogLocale: "ar_EG",
  },

  {
    code: "es",
    path: "/es",
    nativeName: "Español",
    englishName: "Spanish",
    dir: "ltr",
    hreflang: "es",
    ogLocale: "es_ES",
  },
  {
    code: "fr",
    path: "/fr",
    nativeName: "Français",
    englishName: "French",
    dir: "ltr",
    hreflang: "fr",
    ogLocale: "fr_FR",
  },
  {
    code: "de",
    path: "/de",
    nativeName: "Deutsch",
    englishName: "German",
    dir: "ltr",
    hreflang: "de",
    ogLocale: "de_DE",
  },
  {
    code: "pt",
    path: "/pt",
    nativeName: "Português",
    englishName: "Portuguese",
    dir: "ltr",
    hreflang: "pt",
    ogLocale: "pt_BR",
  },
  {
    code: "it",
    path: "/it",
    nativeName: "Italiano",
    englishName: "Italian",
    dir: "ltr",
    hreflang: "it",
    ogLocale: "it_IT",
  },
  {
    code: "tr",
    path: "/tr",
    nativeName: "Türkçe",
    englishName: "Turkish",
    dir: "ltr",
    hreflang: "tr",
    ogLocale: "tr_TR",
  },
  {
    code: "ru",
    path: "/ru",
    nativeName: "Русский",
    englishName: "Russian",
    dir: "ltr",
    hreflang: "ru",
    ogLocale: "ru_RU",
  },
  {
    code: "zh",
    path: "/zh",
    nativeName: "中文",
    englishName: "Chinese",
    dir: "ltr",
    hreflang: "zh-CN",
    ogLocale: "zh_CN",
  },
  {
    code: "ja",
    path: "/ja",
    nativeName: "日本語",
    englishName: "Japanese",
    dir: "ltr",
    hreflang: "ja",
    ogLocale: "ja_JP",
  },
  {
    code: "ko",
    path: "/ko",
    nativeName: "한국어",
    englishName: "Korean",
    dir: "ltr",
    hreflang: "ko",
    ogLocale: "ko_KR",
  },
  {
    code: "hi",
    path: "/hi",
    nativeName: "हिन्दी",
    englishName: "Hindi",
    dir: "ltr",
    hreflang: "hi",
    ogLocale: "hi_IN",
  },
  {
    code: "id",
    path: "/id",
    nativeName: "Bahasa Indonesia",
    englishName: "Indonesian",
    dir: "ltr",
    hreflang: "id",
    ogLocale: "id_ID",
  },
  {
    code: "nl",
    path: "/nl",
    nativeName: "Nederlands",
    englishName: "Dutch",
    dir: "ltr",
    hreflang: "nl",
    ogLocale: "nl_NL",
  },
  {
    code: "sv",
    path: "/sv",
    nativeName: "Svenska",
    englishName: "Swedish",
    dir: "ltr",
    hreflang: "sv",
    ogLocale: "sv_SE",
  },
  {
    code: "cs",
    path: "/cs",
    nativeName: "Čeština",
    englishName: "Czech",
    dir: "ltr",
    hreflang: "cs",
    ogLocale: "cs_CZ",
  },
  {
    code: "ro",
    path: "/ro",
    nativeName: "Română",
    englishName: "Romanian",
    dir: "ltr",
    hreflang: "ro",
    ogLocale: "ro_RO",
  },
  {
    code: "el",
    path: "/el",
    nativeName: "Ελληνικά",
    englishName: "Greek",
    dir: "ltr",
    hreflang: "el",
    ogLocale: "el_GR",
  },
  {
    code: "uk",
    path: "/uk",
    nativeName: "Українська",
    englishName: "Ukrainian",
    dir: "ltr",
    hreflang: "uk",
    ogLocale: "uk_UA",
  },
  {
    code: "he",
    path: "/he",
    nativeName: "עברית",
    englishName: "Hebrew",
    dir: "rtl",
    hreflang: "he",
    ogLocale: "he_IL",
  },
  {
    code: "fa",
    path: "/fa",
    nativeName: "فارسی",
    englishName: "Persian",
    dir: "rtl",
    hreflang: "fa",
    ogLocale: "fa_IR",
  },
  {
    code: "vi",
    path: "/vi",
    nativeName: "Tiếng Việt",
    englishName: "Vietnamese",
    dir: "ltr",
    hreflang: "vi",
    ogLocale: "vi_VN",
  },
  {
    code: "th",
    path: "/th",
    nativeName: "ไทย",
    englishName: "Thai",
    dir: "ltr",
    hreflang: "th",
    ogLocale: "th_TH",
  },
  {
    code: "pl",
    path: "/pl",
    nativeName: "Polski",
    englishName: "Polish",
    dir: "ltr",
    hreflang: "pl",
    ogLocale: "pl_PL",
  },
];

export const getLocale = (code: LocaleCode): LocaleMeta =>
  LOCALES.find((l) => l.code === code) ?? LOCALES[0];
