/**
 * Localized strings for auth + shared UI chrome.
 * - Persists the user's language in localStorage ("app_lang") and, when
 *   signed in, in user_chat_settings.preferred_language.
 * - Detects the visitor's language once on first load (nav.language + timezone)
 *   and stores that choice so it stays stable across visits.
 * - Falls back cleanly: ar-eg → ar → en for any missing key.
 *
 * Usage:
 *   import { t, useUserLang, setUserLang, initUserLang } from "@/lib/authI18n";
 *   const lang = useUserLang();
 *   <button>{t("signIn")}</button>
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeErrorMessage } from "@/lib/sanitizeError";
import { cachedJson } from "@/lib/persistentCache";

export type AuthLang =
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

const SUPPORTED: AuthLang[] = [
  "en",
  "ar",
  "ar-eg",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "tr",
  "ru",
  "zh",
  "ja",
  "ko",
  "hi",
  "id",
  "nl",
  "sv",
  "cs",
  "ro",
  "el",
  "uk",
  "he",
  "fa",
  "vi",
  "th",
  "pl",
];
const RTL_LANGS: AuthLang[] = ["ar", "ar-eg", "he", "fa"];

type Entry = Partial<Record<AuthLang, string>> & { en: string };

const DICT: Record<string, Entry> = {
  // ── Toast / error messages (existing) ────────────────────────────────
  invalidEmail: {
    en: "Please enter a valid email address",
    ar: "من فضلك أدخل بريدًا إلكترونيًا صحيحًا",
    "ar-eg": "من فضلك اكتب إيميل صحيح",
    es: "Introduce un correo electrónico válido",
    fr: "Veuillez saisir une adresse e-mail valide",
    de: "Bitte gib eine gültige E-Mail-Adresse ein",
    pt: "Insira um endereço de e-mail válido",
    it: "Inserisci un indirizzo email valido",
    tr: "Lütfen geçerli bir e-posta adresi girin",
    ru: "Введите корректный адрес электронной почты",
    zh: "请输入有效的电子邮件地址",
    ja: "有効なメールアドレスを入力してください",
  },
  couldNotCheckEmail: {
    en: "Could not check email",
    ar: "تعذر التحقق من Email",
    "ar-eg": "معرفناش نتأكد من الإيميل",
    es: "No se pudo verificar el correo",
    fr: "Impossible de vérifier l'e-mail",
    de: "E-Mail konnte nicht geprüft werden",
    pt: "Não foi possível verificar o e-mail",
    it: "Impossibile verificare l'email",
    tr: "E-posta kontrol edilemedi",
    ru: "Не удалось проверить email",
    zh: "无法验证电子邮件",
    ja: "メールを確認できませんでした",
  },
  otpSent: {
    en: "Verification code sent to your email",
    ar: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
    "ar-eg": "بعتنالك كود التحقق على الإيميل",
    es: "Código de verificación enviado a tu correo",
    fr: "Code de vérification envoyé à votre e-mail",
    de: "Bestätigungscode an deine E-Mail gesendet",
    pt: "Código de verificação enviado para seu e-mail",
    it: "Codice di verifica inviato alla tua email",
    tr: "Doğrulama kodu e-postanıza gönderildi",
    ru: "Код подтверждения отправлен на email",
    zh: "验证码已发送至您的邮箱",
    ja: "確認コードをメールに送信しました",
  },
  couldNotSendCode: {
    en: "Could not send code",
    ar: "تعذر إرسال الرمز",
    "ar-eg": "معرفناش نبعت الكود",
    es: "No se pudo enviar el código",
    fr: "Impossible d'envoyer le code",
    de: "Code konnte nicht gesendet werden",
    pt: "Não foi possível enviar o código",
    it: "Impossibile inviare il codice",
    tr: "Kod gönderilemedi",
    ru: "Не удалось отправить код",
    zh: "无法发送验证码",
    ja: "コードを送信できませんでした",
  },
  welcomeBack: {
    en: "Welcome back!",
    ar: "أهلًا بعودتك!",
    "ar-eg": "نورت تاني!",
    es: "¡Bienvenido de nuevo!",
    fr: "Heureux de vous revoir !",
    de: "Willkommen zurück!",
    pt: "Bem-vindo de volta!",
    it: "Bentornato!",
    tr: "Tekrar hoş geldiniz!",
    ru: "С возвращением!",
    zh: "欢迎回来！",
    ja: "おかえりなさい！",
  },
  wrongPassword: {
    en: "Wrong password. Please try again or reset it.",
    ar: "Password غير صحيحة. حاول مرة أخرى أو أعد ضبطها.",
    "ar-eg": "كلمة السر غلط. جرب تاني أو غيّرها.",
    es: "Contraseña incorrecta. Inténtalo de nuevo o restablécela.",
    fr: "Mot de passe incorrect. Réessayez ou réinitialisez-le.",
    de: "Falsches Passwort. Versuch es erneut oder setze es zurück.",
    pt: "Senha incorreta. Tente novamente ou redefina-a.",
    it: "Password errata. Riprova o reimpostala.",
    tr: "Yanlış şifre. Tekrar deneyin veya sıfırlayın.",
    ru: "Неверный пароль. Попробуйте снова или сбросьте его.",
    zh: "密码错误。请重试或重置密码。",
    ja: "パスワードが違います。再試行するかリセットしてください。",
  },
  noAccountFound: {
    en: "No account found — let's create one",
    ar: "لا يوجد حساب — لننشئ واحدًا",
    "ar-eg": "مفيش حساب — يلا نعمل واحد",
    es: "No se encontró cuenta — vamos a crearla",
    fr: "Aucun compte trouvé — créons-en un",
    de: "Kein Konto gefunden — lass uns eines erstellen",
    pt: "Conta não encontrada — vamos criar uma",
    it: "Nessun account trovato — creiamone uno",
    tr: "Hesap bulunamadı — hadi bir tane oluşturalım",
    ru: "Аккаунт не найден — давайте создадим",
    zh: "未找到账户——让我们创建一个",
    ja: "アカウントが見つかりません — 作成しましょう",
  },
  loginFailed: {
    en: "Login failed",
    ar: "فشل Sign in",
    "ar-eg": "الدخول فشل",
    es: "Error al iniciar sesión",
    fr: "Échec de la connexion",
    de: "Anmeldung fehlgeschlagen",
    pt: "Falha no login",
    it: "Accesso non riuscito",
    tr: "Giriş başarısız",
    ru: "Не удалось войти",
    zh: "登录失败",
    ja: "ログインに失敗しました",
  },
  verificationFailed: {
    en: "Verification failed",
    ar: "فشل التحقق",
    "ar-eg": "التحقق فشل",
    es: "Verificación fallida",
    fr: "Échec de la vérification",
    de: "Überprüfung fehlgeschlagen",
    pt: "Falha na verificação",
    it: "Verifica non riuscita",
    tr: "Doğrulama başarısız",
    ru: "Проверка не удалась",
    zh: "验证失败",
    ja: "確認に失敗しました",
  },
  passwordMinLength: {
    en: "Password must be at least 8 characters",
    ar: "يجب أن تكون Password 8 أحرف على الأقل",
    "ar-eg": "كلمة السر لازم تكون 8 حروف على الأقل",
    es: "La contraseña debe tener al menos 8 caracteres",
    fr: "Le mot de passe doit comporter au moins 8 caractères",
    de: "Passwort muss mindestens 8 Zeichen lang sein",
    pt: "A senha deve ter pelo menos 8 caracteres",
    it: "La password deve avere almeno 8 caratteri",
    tr: "Şifre en az 8 karakter olmalıdır",
    ru: "Пароль должен содержать не менее 8 символов",
    zh: "密码至少需要 8 个字符",
    ja: "パスワードは8文字以上必要です",
  },
  emailExists: {
    en: "This email already has an account",
    ar: "هذا Email لديه حساب بالفعل",
    "ar-eg": "الإيميل ده ليه حساب فعلاً",
    es: "Este correo ya tiene una cuenta",
    fr: "Cet e-mail a déjà un compte",
    de: "Diese E-Mail hat bereits ein Konto",
    pt: "Este e-mail já tem uma conta",
    it: "Questa email ha già un account",
    tr: "Bu e-posta zaten bir hesaba sahip",
    ru: "Этот email уже зарегистрирован",
    zh: "此邮箱已注册账户",
    ja: "このメールアドレスは既に登録されています",
  },
  emailExistsDesc: {
    en: "Please sign in with your existing password.",
    ar: "من فضلك سجّل الدخول بPassword الحالية.",
    "ar-eg": "سجّل دخول بكلمة السر بتاعتك.",
    es: "Inicia sesión con tu contraseña existente.",
    fr: "Connectez-vous avec votre mot de passe existant.",
    de: "Bitte melde dich mit deinem bestehenden Passwort an.",
    pt: "Faça login com sua senha atual.",
    it: "Accedi con la tua password esistente.",
    tr: "Mevcut şifrenizle giriş yapın.",
    ru: "Войдите с вашим текущим паролем.",
    zh: "请使用现有密码登录。",
    ja: "既存のパスワードでログインしてください。",
  },
  accountCreated: {
    en: "Account created!",
    ar: "تم إنشاء الحساب!",
    "ar-eg": "الحساب اتعمل!",
    es: "¡Cuenta creada!",
    fr: "Compte créé !",
    de: "Konto erstellt!",
    pt: "Conta criada!",
    it: "Account creato!",
    tr: "Hesap oluşturuldu!",
    ru: "Аккаунт создан!",
    zh: "账户已创建！",
    ja: "アカウントが作成されました！",
  },
  couldNotCreate: {
    en: "Could not create account",
    ar: "تعذر إنشاء الحساب",
    "ar-eg": "معرفناش نعمل الحساب",
    es: "No se pudo crear la cuenta",
    fr: "Impossible de créer le compte",
    de: "Konto konnte nicht erstellt werden",
    pt: "Não foi possível criar a conta",
    it: "Impossibile creare l'account",
    tr: "Hesap oluşturulamadı",
    ru: "Не удалось создать аккаунт",
    zh: "无法创建账户",
    ja: "アカウントを作成できませんでした",
  },
  passwordUpdated: {
    en: "Password updated!",
    ar: "تم تحديث Password!",
    "ar-eg": "كلمة السر اتحدثت!",
    es: "¡Contraseña actualizada!",
    fr: "Mot de passe mis à jour !",
    de: "Passwort aktualisiert!",
    pt: "Senha atualizada!",
    it: "Password aggiornata!",
    tr: "Şifre güncellendi!",
    ru: "Пароль обновлён!",
    zh: "密码已更新！",
    ja: "パスワードが更新されました！",
  },
  passwordUpdateFailed: {
    en: "Failed to update password",
    ar: "فشل تحديث Password",
    "ar-eg": "معرفناش نحدّث كلمة السر",
    es: "Error al actualizar la contraseña",
    fr: "Échec de la mise à jour du mot de passe",
    de: "Passwort konnte nicht aktualisiert werden",
    pt: "Falha ao atualizar a senha",
    it: "Aggiornamento password non riuscito",
    tr: "Şifre güncellenemedi",
    ru: "Не удалось обновить пароль",
    zh: "密码更新失败",
    ja: "パスワードの更新に失敗しました",
  },
  continueWithPassword: {
    en: "Continue with your password",
    ar: "تابع باستخدام Password",
    "ar-eg": "كمّل بكلمة السر",
    es: "Continúa con tu contraseña",
    fr: "Continuez avec votre mot de passe",
    de: "Mit Passwort fortfahren",
    pt: "Continue com sua senha",
    it: "Continua con la tua password",
    tr: "Şifrenizle devam edin",
    ru: "Продолжите с паролем",
    zh: "使用密码继续",
    ja: "パスワードで続行",
  },
  previewProxyBlocked: {
    en: "Preview proxy blocked the login request. Please try on the published site.",
    ar: "تم حظر طلب Sign in في المعاينة. جرّب على الموقع المنشور.",
    "ar-eg": "المعاينة حجبت طلب الدخول. جرّب على الموقع المنشور.",
    es: "El proxy de vista previa bloqueó el inicio de sesión. Prueba en el sitio publicado.",
    fr: "Le proxy d'aperçu a bloqué la connexion. Essayez sur le site publié.",
    de: "Der Vorschau-Proxy hat die Anmeldung blockiert. Bitte auf der veröffentlichten Seite versuchen.",
    pt: "O proxy de visualização bloqueou o login. Tente no site publicado.",
    it: "Il proxy di anteprima ha bloccato l'accesso. Prova sul sito pubblicato.",
    tr: "Önizleme proxy'si girişi engelledi. Yayınlanan sitede deneyin.",
    ru: "Прокси предпросмотра заблокировал вход. Попробуйте на опубликованном сайте.",
    zh: "预览代理阻止了登录。请在已发布的网站上尝试。",
    ja: "プレビューのプロキシがログインをブロックしました。公開済みサイトで試してください。",
  },
  typeDelete: {
    en: "Please type DELETE to confirm",
    ar: 'من فضلك اكتب "DELETE" للتأكيد',
    "ar-eg": 'اكتب "DELETE" عشان تأكد',
    es: "Escribe DELETE para confirmar",
    fr: "Tapez DELETE pour confirmer",
    de: "Bitte DELETE eingeben zur Bestätigung",
    pt: "Digite DELETE para confirmar",
    it: "Digita DELETE per confermare",
    tr: "Onaylamak için DELETE yazın",
    ru: "Введите DELETE для подтверждения",
    zh: "请输入 DELETE 以确认",
    ja: "確認のため DELETE と入力してください",
  },
  enterPasswordConfirm: {
    en: "Please enter your password to confirm",
    ar: "من فضلك أدخل Password للتأكيد",
    "ar-eg": "ادخل كلمة السر عشان تأكد",
    es: "Introduce tu contraseña para confirmar",
    fr: "Saisissez votre mot de passe pour confirmer",
    de: "Bitte Passwort zur Bestätigung eingeben",
    pt: "Digite sua senha para confirmar",
    it: "Inserisci la password per confermare",
    tr: "Onaylamak için şifrenizi girin",
    ru: "Введите пароль для подтверждения",
    zh: "请输入密码以确认",
    ja: "確認のためパスワードを入力してください",
  },
  incorrectPassword: {
    en: "Incorrect password",
    ar: "Password غير صحيحة",
    "ar-eg": "كلمة السر غلط",
    es: "Contraseña incorrecta",
    fr: "Mot de passe incorrect",
    de: "Falsches Passwort",
    pt: "Senha incorreta",
    it: "Password errata",
    tr: "Yanlış şifre",
    ru: "Неверный пароль",
    zh: "密码错误",
    ja: "パスワードが違います",
  },
  accountDeletionRequested: {
    en: "Account deletion requested. You will be signed out.",
    ar: "تم طلب حذف الحساب. سيتم تسجيل خروجك.",
    "ar-eg": "طلبنا حذف الحساب. هيتم تسجيل خروجك.",
    es: "Eliminación de cuenta solicitada. Se cerrará tu sesión.",
    fr: "Suppression du compte demandée. Vous allez être déconnecté.",
    de: "Kontolöschung angefordert. Du wirst abgemeldet.",
    pt: "Exclusão de conta solicitada. Você será desconectado.",
    it: "Eliminazione account richiesta. Sarai disconnesso.",
    tr: "Hesap silme istendi. Çıkış yapacaksınız.",
    ru: "Запрошено удаление аккаунта. Вы будете выведены.",
    zh: "已请求删除账户。您将被注销。",
    ja: "アカウント削除をリクエストしました。サインアウトします。",
  },
  deleteAccountFailed: {
    en: "Failed to delete account",
    ar: "فشل حذف الحساب",
    "ar-eg": "معرفناش نحذف الحساب",
    es: "Error al eliminar la cuenta",
    fr: "Échec de la suppression du compte",
    de: "Konto konnte nicht gelöscht werden",
    pt: "Falha ao excluir a conta",
    it: "Impossibile eliminare l'account",
    tr: "Hesap silinemedi",
    ru: "Не удалось удалить аккаунт",
    zh: "删除账户失败",
    ja: "アカウントの削除に失敗しました",
  },
  freeCreditsAdded: {
    en: "+15 free credits added — welcome to Megsy!",
    ar: "+15 رصيد مجاني — أهلًا بك في Megsy!",
    "ar-eg": "+15 كريدت مجاني — أهلاً بيك في Megsy!",
    es: "+15 créditos gratis añadidos — ¡bienvenido a Megsy!",
    fr: "+15 crédits gratuits ajoutés — bienvenue sur Megsy !",
    de: "+15 kostenlose Credits — willkommen bei Megsy!",
    pt: "+15 créditos grátis adicionados — bem-vindo ao Megsy!",
    it: "+15 crediti gratuiti aggiunti — benvenuto su Megsy!",
    tr: "+15 ücretsiz kredi eklendi — Megsy'ye hoş geldiniz!",
    ru: "+15 бесплатных кредитов — добро пожаловать в Megsy!",
    zh: "已添加 +15 个免费积分 — 欢迎加入 Megsy！",
    ja: "+15 の無料クレジットを追加 — Megsy へようこそ！",
  },

  // ── AuthPage UI (new) ────────────────────────────────────────────────
  seoTitle: {
    en: "Sign in to Megsy AI",
    ar: "Sign in إلى Megsy AI",
    "ar-eg": "سجّل دخولك في Megsy AI",
    es: "Iniciar sesión en Megsy AI",
    fr: "Se connecter à Megsy AI",
  },
  seoDesc: {
    en: "Sign in or create your Megsy AI account.",
    ar: "سجّل الدخول أو أنشئ حساب Megsy AI.",
    "ar-eg": "سجّل دخول أو اعمل حساب في Megsy AI.",
    es: "Inicia sesión o crea tu cuenta de Megsy AI.",
    fr: "Connectez-vous ou créez votre compte Megsy AI.",
  },
  back: {
    en: "Back", ar: "Back", "ar-eg": "Back", es: "Atrás", fr: "Retour",
  },
  getStarted: {
    en: "Get started", ar: "Get started", "ar-eg": "يلا نبدأ", es: "Comenzar", fr: "Commencer",
  },
  emailTitle: {
    en: "Welcome to Megsy",
    ar: "مرحبًا بك في Megsy",
    "ar-eg": "أهلاً بيك في Megsy",
    es: "Bienvenido a Megsy",
    fr: "Bienvenue sur Megsy",
  },
  emailSub: {
    en: "Enter your email to sign in or create an account.",
    ar: "أدخل بريدك الإلكتروني لSign in أو إنشاء حساب.",
    "ar-eg": "اكتب إيميلك عشان تدخل أو تعمل حساب.",
    es: "Introduce tu correo para iniciar sesión o crear una cuenta.",
    fr: "Saisissez votre e-mail pour vous connecter ou créer un compte.",
  },
  passwordTitle: {
    en: "Enter your password",
    ar: "أدخل Password",
    "ar-eg": "اكتب كلمة السر",
    es: "Introduce tu contraseña",
    fr: "Entrez votre mot de passe",
  },
  verifyEmailTitle: {
    en: "Verify your email",
    ar: "تحقق من بريدك الإلكتروني",
    "ar-eg": "أكّد الإيميل بتاعك",
    es: "Verifica tu correo electrónico",
    fr: "Vérifiez votre e-mail",
  },
  otpSubTemplate: {
    en: "We sent a 6-digit code to {email}",
    ar: "أرسلنا رمزًا من 6 أرقام إلى {email}",
    "ar-eg": "بعتنا كود من 6 أرقام على {email}",
    es: "Enviamos un código de 6 dígitos a {email}",
    fr: "Nous avons envoyé un code à 6 chiffres à {email}",
  },
  otp2faSubTemplate: {
    en: "Enter the code sent to {email}",
    ar: "أدخل الرمز المرسل إلى {email}",
    "ar-eg": "اكتب الكود اللي وصلك على {email}",
    es: "Introduce el código enviado a {email}",
    fr: "Entrez le code envoyé à {email}",
  },
  setPasswordTitle: {
    en: "Set a password",
    ar: "اختر كلمة مرور",
    "ar-eg": "اختار كلمة سر",
    es: "Elige una contraseña",
    fr: "Définissez un mot de passe",
  },
  atLeast8: {
    en: "At least 8 characters.",
    ar: "8 أحرف على الأقل.",
    "ar-eg": "8 حروف على الأقل.",
    es: "Mínimo 8 caracteres.",
    fr: "Au moins 8 caractères.",
  },
  regionQuestion: {
    en: "Where are you billed from?",
    ar: "هل أنت من العالم العربي؟",
    "ar-eg": "إنت من العالم العربي؟",
    es: "¿Desde dónde pagas?",
    fr: "D'où êtes-vous facturé ?",
  },
  regionArab: {
    en: "Arab world",
    ar: "العالم العربي",
    "ar-eg": "العالم العربي",
    es: "Mundo árabe",
    fr: "Monde arabe",
  },
  regionGlobal: {
    en: "International",
    ar: "دولي",
    "ar-eg": "دولي",
    es: "Internacional",
    fr: "International",
  },

  twoFATitle: {
    en: "Two-factor verification",
    ar: "التحقق بخطوتين",
    "ar-eg": "تحقق بخطوتين",
    es: "Verificación en dos pasos",
    fr: "Vérification à deux facteurs",
  },
  forgotTitle: {
    en: "Reset your password",
    ar: "إعادة تعيين Password",
    "ar-eg": "إعادة ضبط كلمة السر",
    es: "Restablecer tu contraseña",
    fr: "Réinitialiser votre mot de passe",
  },
  forgotSubTemplate: {
    en: "We'll send a verification code to {email}",
    ar: "سنرسل رمز تحقق إلى {email}",
    "ar-eg": "هنبعت كود تحقق على {email}",
    es: "Enviaremos un código de verificación a {email}",
    fr: "Nous enverrons un code de vérification à {email}",
  },
  chooseNewPasswordTitle: {
    en: "Choose a new password",
    ar: "اختر كلمة مرور Newة",
    "ar-eg": "اختار كلمة سر Newة",
    es: "Elige una nueva contraseña",
    fr: "Choisissez un nouveau mot de passe",
  },
  signIn: {
    en: "Sign in", ar: "Sign in", "ar-eg": "دخول", es: "Iniciar sesión", fr: "Se connecter",
  },
  createAccount: {
    en: "Create account", ar: "إنشاء حساب", "ar-eg": "اعمل حساب", es: "Crear cuenta", fr: "Créer un compte",
  },
  resetPassword: {
    en: "Reset password", ar: "إعادة تعيين Password", "ar-eg": "غيّر كلمة السر", es: "Restablecer contraseña", fr: "Réinitialiser le mot de passe",
  },
  continue: {
    en: "Continue", ar: "متابعة", "ar-eg": "كمّل", es: "Continuar", fr: "Continuer",
  },
  checking: {
    en: "Checking…", ar: "جارٍ التحقق…", "ar-eg": "بنتأكد…", es: "Comprobando…", fr: "Vérification…",
  },
  signingIn: {
    en: "Signing in…", ar: "جارٍ Sign in…", "ar-eg": "بنسجل دخولك…", es: "Iniciando sesión…", fr: "Connexion…",
  },
  creating: {
    en: "Creating…", ar: "جارٍ Create…", "ar-eg": "بنعمل الحساب…", es: "Creando…", fr: "Création…",
  },
  updating: {
    en: "Updating…", ar: "جارٍ التحديث…", "ar-eg": "بنحدّث…", es: "Actualizando…", fr: "Mise à jour…",
  },
  sending: {
    en: "Sending…", ar: "جارٍ الإرسال…", "ar-eg": "بنبعت…", es: "Enviando…", fr: "Envoi…",
  },
  verifying: {
    en: "Verifying…", ar: "جارٍ التحقق…", "ar-eg": "بنتحقق…", es: "Verificando…", fr: "Vérification…",
  },
  passwordPlaceholder: {
    en: "Password", ar: "Password", "ar-eg": "كلمة السر", es: "Contraseña", fr: "Mot de passe",
  },
  passwordMinPlaceholder: {
    en: "Password (min 8 characters)",
    ar: "Password (8 أحرف على الأقل)",
    "ar-eg": "كلمة السر (8 حروف على الأقل)",
    es: "Contraseña (mín. 8 caracteres)",
    fr: "Mot de passe (min 8 caractères)",
  },
  newPasswordMinPlaceholder: {
    en: "New password (min 8 characters)",
    ar: "كلمة مرور Newة (8 أحرف على الأقل)",
    "ar-eg": "كلمة سر Newة (8 حروف على الأقل)",
    es: "Nueva contraseña (mín. 8 caracteres)",
    fr: "Nouveau mot de passe (min 8 caractères)",
  },
  forgotPasswordLink: {
    en: "Forgot password?", ar: "Forgot password?", "ar-eg": "نسيت كلمة السر؟",
    es: "¿Olvidaste la contraseña?", fr: "Mot de passe oublié ?",
  },
  or: {
    en: "or", ar: "أو", "ar-eg": "أو", es: "o", fr: "ou",
  },
  continueWithGoogle: {
    en: "Continue with Google", ar: "Continue باستخدام جوجل", "ar-eg": "كمّل بجوجل",
    es: "Continuar con Google", fr: "Continuer avec Google",
  },
  continueWithGitHub: {
    en: "Continue with GitHub", ar: "متابعة باستخدام GitHub", "ar-eg": "كمّل بـ GitHub",
    es: "Continuar con GitHub", fr: "Continuer avec GitHub",
  },
  continueWithTelegram: {
    en: "Continue with Telegram", ar: "Continue باستخدام Telegram", "ar-eg": "كمّل بـ Telegram",
    es: "Continuar con Telegram", fr: "Continuer avec Telegram",
  },
  inviteCode: {
    en: "Invite code", ar: "رمز الدعوة", "ar-eg": "كود الدعوة",
    es: "Código de invitación", fr: "Code d'invitation",
  },
  remove: {
    en: "Remove", ar: "إزالة", "ar-eg": "شيله", es: "Quitar", fr: "Retirer",
  },
  haveInviteCode: {
    en: "Have an invite code?", ar: "لديك رمز دعوة؟", "ar-eg": "معاك كود دعوة؟",
    es: "¿Tienes un código de invitación?", fr: "Vous avez un code d'invitation ?",
  },
  invitedByPrefix: {
    en: "You'll be credited to ", ar: "سيتم إحالتك إلى ", "ar-eg": "هتتحسبلك دعوة من ",
    es: "Se te acreditará a ", fr: "Vous serez crédité pour ",
  },
  invitedBySuffix: {
    en: " after signup.", ar: " بعد التسجيل.", "ar-eg": " بعد ما تسجّل.",
    es: " después de registrarte.", fr: " après l'inscription.",
  },
  sendResetCode: {
    en: "Send reset code", ar: "إرسال رمز إعادة التعيين", "ar-eg": "ابعت كود إعادة الضبط",
    es: "Enviar código", fr: "Envoyer le code",
  },
  updatePassword: {
    en: "Update password", ar: "تحديث Password", "ar-eg": "حدّث كلمة السر",
    es: "Actualizar contraseña", fr: "Mettre à jour le mot de passe",
  },
  resendCode: {
    en: "Resend code", ar: "إعادة إرسال الرمز", "ar-eg": "ابعت الكود تاني",
    es: "Reenviar código", fr: "Renvoyer le code",
  },
  resendInSecondsTemplate: {
    en: "Resend in {n}s", ar: "إعادة الإرسال خلال {n} ث", "ar-eg": "ابعت تاني بعد {n} ث",
    es: "Reenviar en {n}s", fr: "Renvoyer dans {n}s",
  },
  copy: {
    en: "Copy", ar: "نسخ", "ar-eg": "نسخ", es: "Copiar", fr: "Copier",
  },
  paste: {
    en: "Paste", ar: "لصق", "ar-eg": "لصق", es: "Pegar", fr: "Coller",
  },
  termsAgreePrefix: {
    en: "By continuing, you agree to our ",
    ar: "بContinue، فإنك توافق على ",
    "ar-eg": "بالاستمرار، إنت موافق على ",
    es: "Al continuar, aceptas nuestros ",
    fr: "En continuant, vous acceptez nos ",
  },
  termsLink: {
    en: "Terms", ar: "الشروط", "ar-eg": "الشروط", es: "Términos", fr: "Conditions",
  },
  and: {
    en: " and ", ar: " و ", "ar-eg": " و ", es: " y ", fr: " et ",
  },
  privacyLink: {
    en: "Privacy Policy", ar: "Privacy policy", "ar-eg": "Privacy policy",
    es: "Política de privacidad", fr: "Politique de confidentialité",
  },
  emailPlaceholder: {
    en: "you@example.com", ar: "you@example.com", "ar-eg": "you@example.com",
    es: "tu@ejemplo.com", fr: "vous@exemple.com",
  },

  // ── Settings screen labels ───────────────────────────────────────────
  settingsTitle: {
    en: "Settings", ar: "الإعدادات", "ar-eg": "الإعدادات", es: "Ajustes", fr: "Paramètres",
  },
  settingsAccount: {
    en: "Account Settings", ar: "إعدادات الحساب", "ar-eg": "إعدادات الحساب",
    es: "Ajustes de cuenta", fr: "Paramètres du compte",
  },
  settingsPreferences: {
    en: "Preferences", ar: "التفضيلات", "ar-eg": "التفضيلات", es: "Preferencias", fr: "Préférences",
  },
  settingsMore: {
    en: "Settings", ar: "الإعدادات", "ar-eg": "الإعدادات", es: "Ajustes", fr: "Paramètres",
  },
  rowAccount: {
    en: "Account", ar: "الحساب", "ar-eg": "الحساب", es: "Cuenta", fr: "Compte",
  },
  rowBilling: {
    en: "Billing", ar: "الفوترة", "ar-eg": "الفواتير", es: "Facturación", fr: "Facturation",
  },
  rowAppearance: {
    en: "Appearance", ar: "المظهر", "ar-eg": "الشكل", es: "Apariencia", fr: "Apparence",
  },
  rowIntegrations: {
    en: "Integrations", ar: "Integrations", "ar-eg": "الربط بالApps", es: "Integraciones", fr: "Intégrations",
  },
  rowHelp: {
    en: "Help & Support", ar: "المساعدة والدعم", "ar-eg": "المساعدة والدعم",
    es: "Ayuda y soporte", fr: "Aide et support",
  },
  rowPrivacy: {
    en: "Privacy & Data", ar: "الخصوصية والبيانات", "ar-eg": "الخصوصية والبيانات",
    es: "Privacidad y datos", fr: "Confidentialité et données",
  },
  rowStatus: {
    en: "System Status", ar: "حالة النظام", "ar-eg": "حالة النظام",
    es: "Estado del sistema", fr: "État du système",
  },
  rowLanguage: {
    en: "Language", ar: "اللغة", "ar-eg": "اللغة", es: "Idioma", fr: "Langue",
  },
  rowLogout: {
    en: "Logout", ar: "تسجيل الخروج", "ar-eg": "تسجيل الخروج", es: "Cerrar sesión", fr: "Déconnexion",
  },
  upgradePremium: {
    en: "Upgrade to Premium", ar: "الترقية إلى Premium", "ar-eg": "اترقّى لـ Premium",
    es: "Actualizar a Premium", fr: "Passer à Premium",
  },
  languageSheetTitle: {
    en: "Choose language", ar: "اختر اللغة", "ar-eg": "اختار اللغة",
    es: "Elige idioma", fr: "Choisir la langue",
  },
  languageSaved: {
    en: "Language updated", ar: "تم تحديث اللغة", "ar-eg": "اللغة اتحدثت",
    es: "Idioma actualizado", fr: "Langue mise à jour",
  },

  // ── MobileAuthFlow (intro screen) ────────────────────────────────────
  mobileIntroLine1: {
    en: "One subscription.",
    ar: "اشتراك واحد.",
    "ar-eg": "اشتراك واحد بس.",
    es: "Una sola suscripción.",
    fr: "Un seul abonnement.",
  },
  mobileIntroLine2: {
    en: "Every frontier model.",
    ar: "كل الموديلات الرائدة.",
    "ar-eg": "كل الموديلات المتقدمة.",
    es: "Todos los modelos de vanguardia.",
    fr: "Tous les modèles de pointe.",
  },
  mobileIntroSub: {
    en: "Chat, images, video, slides, code and deep research — in one place.",
    ar: "دردشة وصور وفيديو وشرائح وكود وSearch معمق — في مكان واحد.",
    "ar-eg": "شات، صور، فيديو، شرايح، كود وDeep research — كله في مكان واحد.",
    es: "Chat, imágenes, vídeo, diapositivas, código e investigación profunda — en un solo lugar.",
    fr: "Chat, images, vidéo, slides, code et recherche approfondie — en un seul endroit.",
  },
  signInWithEmail: {
    en: "Sign in with Email", ar: "Sign in بEmail", "ar-eg": "دخول بالإيميل",
    es: "Inicia sesión con e-mail", fr: "Se connecter par e-mail",
  },
  continueWithEmail: {
    en: "Continue with email", ar: "Continue بEmail", "ar-eg": "كمّل بالإيميل",
    es: "Continuar con e-mail", fr: "Continuer par e-mail",
  },
  mobileAuthSub: {
    en: "Sign in to access your AI-powered creations.",
    ar: "سجّل الدخول للوصول إلى إبداعاتك المدعومة بالذكاء الاصطناعي.",
    "ar-eg": "سجّل دخول عشان توصل لإبداعاتك اللي عاملها بالذكاء الاصطناعي.",
    es: "Inicia sesión para acceder a tus creaciones con IA.",
    fr: "Connectez-vous pour accéder à vos créations IA.",
  },
  emailLabel: {
    en: "Email", ar: "Email", "ar-eg": "الإيميل",
    es: "Correo electrónico", fr: "E-mail",
  },
  passwordLabel: {
    en: "Password", ar: "Password", "ar-eg": "كلمة السر",
    es: "Contraseña", fr: "Mot de passe",
  },
  forgotPasswordQ: {
    en: "Forgot Password?", ar: "Forgot password?", "ar-eg": "نسيت كلمة السر؟",
    es: "¿Olvidaste tu contraseña?", fr: "Mot de passe oublié ?",
  },
};

const UI_DICT: Record<string, Entry> = {
  sidebarHome: {
    en: "Home", ar: "الرئيسية", "ar-eg": "الرئيسية", es: "Inicio", fr: "Accueil", de: "Start", pt: "Início", it: "Home", tr: "Ana sayfa", ru: "Главная", zh: "首页", ja: "ホーム", ko: "홈", hi: "होम", id: "Beranda", nl: "Home", sv: "Hem", cs: "Domů", ro: "Acasă", el: "Αρχική", uk: "Головна", he: "בית", fa: "خانه", vi: "Trang chủ", th: "หน้าแรก", pl: "Strona główna",
  },
  sidebarLibrary: {
    en: "Library", ar: "المكتبة", "ar-eg": "المكتبة", es: "Biblioteca", fr: "Bibliothèque", de: "Bibliothek", pt: "Biblioteca", it: "Libreria", tr: "Kütüphane", ru: "Библиотека", zh: "资料库", ja: "ライブラリ", ko: "라이브러리", hi: "लाइब्रेरी", id: "Pustaka", nl: "Bibliotheek", sv: "Bibliotek", cs: "Knihovna", ro: "Bibliotecă", el: "Βιβλιοθήκη", uk: "Бібліотека", he: "ספרייה", fa: "کتابخانه", vi: "Thư viện", th: "คลัง", pl: "Biblioteka",
  },
  sidebarEarn: {
    en: "Earn", ar: "اربح", "ar-eg": "اكسب", es: "Ganar", fr: "Gagner", de: "Verdienen", pt: "Ganhar", it: "Guadagna", tr: "Kazan", ru: "Заработать", zh: "赚取", ja: "獲得", ko: "적립", hi: "कमाएँ", id: "Dapatkan", nl: "Verdienen", sv: "Tjäna", cs: "Vydělat", ro: "Câștigă", el: "Κέρδισε", uk: "Заробити", he: "להרוויח", fa: "کسب درآمد", vi: "Kiếm", th: "รับ", pl: "Zarabiaj",
  },
  sidebarCloud: {
    en: "Cloud", ar: "السحابة", "ar-eg": "السحابة", es: "Nube", fr: "Cloud", de: "Cloud", pt: "Nuvem", it: "Cloud", tr: "Bulut", ru: "Облако", zh: "云端", ja: "クラウド", ko: "클라우드", hi: "क्लाउड", id: "Cloud", nl: "Cloud", sv: "Moln", cs: "Cloud", ro: "Cloud", el: "Cloud", uk: "Хмара", he: "ענן", fa: "ابر", vi: "Đám mây", th: "คลาวด์", pl: "Chmura",
  },
  newChat: {
    en: "New chat", ar: "محادثة Newة", "ar-eg": "شات New", es: "Nuevo chat", fr: "Nouvelle discussion", de: "Neuer Chat", pt: "Novo chat", it: "Nuova chat", tr: "Yeni sohbet", ru: "Новый чат", zh: "新聊天", ja: "新しいチャット", ko: "새 채팅", hi: "नई चैट", id: "Chat baru", nl: "Nieuwe chat", sv: "Ny chatt", cs: "Nový chat", ro: "Chat nou", el: "Νέα συνομιλία", uk: "Новий чат", he: "צ'אט חדש", fa: "گفتگوی جدید", vi: "Chat mới", th: "แชตใหม่", pl: "Nowy czat",
  },
  newProject: {
    en: "New project", ar: "مشروع New", "ar-eg": "مشروع New", es: "Nuevo proyecto", fr: "Nouveau projet", de: "Neues Projekt", pt: "Novo projeto", it: "Nuovo progetto", tr: "Yeni proje", ru: "Новый проект", zh: "新项目", ja: "新規プロジェクト", ko: "새 프로젝트", hi: "नया प्रोजेक्ट", id: "Proyek baru", nl: "Nieuw project", sv: "Nytt projekt", cs: "Nový projekt", ro: "Proiect nou", el: "Νέο έργο", uk: "Новий проєкт", he: "פרויקט חדש", fa: "پروژه جدید", vi: "Dự án mới", th: "โปรเจกต์ใหม่", pl: "Nowy projekt",
  },
  noConversations: {
    en: "No conversations yet", ar: "لا توجد محادثات بعد", "ar-eg": "لسه مفيش شاتات", es: "Aún no hay conversaciones", fr: "Aucune conversation pour l’instant", de: "Noch keine Unterhaltungen", pt: "Ainda sem conversas", it: "Ancora nessuna conversazione", tr: "Henüz sohbet yok", ru: "Пока нет бесед", zh: "还没有对话", ja: "まだ会話がありません", ko: "아직 대화가 없습니다", hi: "अभी कोई बातचीत नहीं", id: "Belum ada percakapan", nl: "Nog geen gesprekken", sv: "Inga konversationer än", cs: "Zatím žádné konverzace", ro: "Încă nu există conversații", el: "Δεν υπάρχουν συνομιλίες ακόμα", uk: "Ще немає розмов", he: "אין שיחות עדיין", fa: "هنوز گفتگویی نیست", vi: "Chưa có cuộc trò chuyện", th: "ยังไม่มีบทสนทนา", pl: "Brak rozmów",
  },
  untitled: {
    en: "Untitled", ar: "بدون عنوان", "ar-eg": "من غير عنوان", es: "Sin título", fr: "Sans titre", de: "Ohne Titel", pt: "Sem título", it: "Senza titolo", tr: "Başlıksız", ru: "Без названия", zh: "未命名", ja: "無題", ko: "제목 없음", hi: "शीर्षकहीन", id: "Tanpa judul", nl: "Naamloos", sv: "Namnlös", cs: "Bez názvu", ro: "Fără titlu", el: "Χωρίς τίτλο", uk: "Без назви", he: "ללא כותרת", fa: "بدون عنوان", vi: "Chưa có tiêu đề", th: "ไม่มีชื่อ", pl: "Bez tytułu",
  },
  logIn: {
    en: "Log in", ar: "Sign in", "ar-eg": "دخول", es: "Entrar", fr: "Connexion", de: "Einloggen", pt: "Entrar", it: "Accedi", tr: "Giriş yap", ru: "Войти", zh: "登录", ja: "ログイン", ko: "로그인", hi: "लॉग इन", id: "Masuk", nl: "Inloggen", sv: "Logga in", cs: "Přihlásit", ro: "Autentificare", el: "Σύνδεση", uk: "Увійти", he: "כניסה", fa: "ورود", vi: "Đăng nhập", th: "เข้าสู่ระบบ", pl: "Zaloguj",
  },
  upgrade: {
    en: "Upgrade", ar: "ترقية", "ar-eg": "ترقية", es: "Mejorar", fr: "Passer à l’offre supérieure", de: "Upgrade", pt: "Atualizar", it: "Upgrade", tr: "Yükselt", ru: "Улучшить", zh: "升级", ja: "アップグレード", ko: "업그레이드", hi: "अपग्रेड", id: "Tingkatkan", nl: "Upgraden", sv: "Uppgradera", cs: "Upgradovat", ro: "Upgrade", el: "Αναβάθμιση", uk: "Оновити", he: "שדרוג", fa: "ارتقا", vi: "Nâng cấp", th: "อัปเกรด", pl: "Ulepsz",
  },
  getPlus: {
    en: "Get Plus", ar: "احصل على بلس", "ar-eg": "هات بلس", es: "Obtener Plus", fr: "Obtenir Plus", de: "Plus holen", pt: "Obter Plus", it: "Ottieni Plus", tr: "Plus al", ru: "Получить Plus", zh: "获取 Plus", ja: "Plus を入手", ko: "Plus 받기", hi: "Plus लें", id: "Dapatkan Plus", nl: "Neem Plus", sv: "Skaffa Plus", cs: "Získat Plus", ro: "Obține Plus", el: "Απόκτησε Plus", uk: "Отримати Plus", he: "קבלת Plus", fa: "دریافت Plus", vi: "Nhận Plus", th: "รับ Plus", pl: "Pobierz Plus",
  },
  placeholderAsk: {
    en: "Ask Megsy anything…", ar: "اسأل ميغسي أي شيء…", "ar-eg": "اسأل ميغسي أي حاجة…", es: "Pregúntale a Megsy lo que quieras…", fr: "Demandez n’importe quoi à Megsy…", de: "Frag Megsy alles…", pt: "Pergunte qualquer coisa ao Megsy…", it: "Chiedi qualsiasi cosa a Megsy…", tr: "Megsy’ye her şeyi sor…", ru: "Спросите Megsy о чём угодно…", zh: "向 Megsy 提问…", ja: "Megsy に何でも聞いて…", ko: "Megsy에게 무엇이든 물어보세요…", hi: "Megsy से कुछ भी पूछें…", id: "Tanyakan apa saja ke Megsy…", nl: "Vraag Megsy alles…", sv: "Fråga Megsy vad som helst…", cs: "Zeptejte se Megsy na cokoli…", ro: "Întreabă Megsy orice…", el: "Ρώτησε τη Megsy οτιδήποτε…", uk: "Запитайте Megsy будь-що…", he: "שאלו את Megsy כל דבר…", fa: "از Megsy هر چیزی بپرسید…", vi: "Hỏi Megsy bất cứ điều gì…", th: "ถาม Megsy ได้ทุกอย่าง…", pl: "Zapytaj Megsy o cokolwiek…",
  },
  placeholderProject: {
    en: "Start your next project with one idea…", ar: "ابدأ مشروعك القادم بفكرة واحدة…", "ar-eg": "ابدأ مشروعك الجاي بفكرة واحدة…", es: "Empieza tu próximo proyecto con una idea…", fr: "Commencez votre prochain projet avec une idée…", de: "Starte dein nächstes Projekt mit einer Idee…", pt: "Comece seu próximo projeto com uma ideia…", it: "Inizia il tuo prossimo progetto con un’idea…", tr: "Sıradaki projenize tek fikirle başlayın…", ru: "Начните следующий проект с одной идеи…", zh: "用一个想法开始下个项目…", ja: "ひとつのアイデアで次のプロジェクトを開始…", ko: "아이디어 하나로 다음 프로젝트 시작…", hi: "एक विचार से अगला प्रोजेक्ट शुरू करें…", id: "Mulai proyek berikutnya dengan satu ide…", nl: "Start je volgende project met één idee…", sv: "Starta nästa projekt med en idé…", cs: "Začněte další projekt jedním nápadem…", ro: "Începe următorul proiect cu o idee…", el: "Ξεκίνα το επόμενο έργο με μία ιδέα…", uk: "Почніть наступний проєкт з однієї ідеї…", he: "התחילו את הפרויקט הבא מרעיון אחד…", fa: "پروژه بعدی را با یک ایده شروع کنید…", vi: "Bắt đầu dự án tiếp theo bằng một ý tưởng…", th: "เริ่มโปรเจกต์ถัดไปด้วยไอเดียเดียว…", pl: "Zacznij kolejny projekt od jednego pomysłu…",
  },
  greeting1: {
    en: "Let's cook something up.", ar: "هيا نصنع شيئًا رائعًا.", "ar-eg": "يلا نعمل حاجة حلوة.", es: "Vamos a crear algo.", fr: "Créons quelque chose.", de: "Lass uns etwas bauen.", pt: "Vamos criar algo.", it: "Creiamo qualcosa.", tr: "Hadi bir şeyler yaratalım.", ru: "Давайте что-нибудь создадим.", zh: "一起做点东西吧。", ja: "何か作りましょう。", ko: "무언가 만들어 볼까요.", hi: "चलिए कुछ बनाते हैं।", id: "Ayo buat sesuatu.", nl: "Laten we iets maken.", uk: "Створімо щось разом.", he: "בואו ניצור משהו.", fa: "بیایید چیزی بسازیم.", vi: "Cùng tạo ra thứ gì đó.", th: "มาสร้างอะไรกันเถอะ", pl: "Stwórzmy coś razem.",
  },
  greeting2: {
    en: "What should we build today?", ar: "ماذا نبني اليوم؟", "ar-eg": "نبني إيه النهارده؟", es: "¿Qué construimos hoy?", fr: "Que construisons-nous aujourd'hui ?", de: "Was bauen wir heute?", pt: "O que vamos construir hoje?", it: "Cosa costruiamo oggi?", tr: "Bugün ne inşa edelim?", ru: "Что построим сегодня?", zh: "今天我们做点什么？", ja: "今日は何を作りますか？", ko: "오늘은 무엇을 만들까요?", hi: "आज हम क्या बनाएँ?", id: "Mau bangun apa hari ini?", nl: "Wat bouwen we vandaag?", uk: "Що будуємо сьогодні?", he: "מה נבנה היום?", fa: "امروز چه بسازیم؟", vi: "Hôm nay ta xây gì?", th: "วันนี้เราจะสร้างอะไรดี", pl: "Co dziś zbudujemy?",
  },
  greeting3: {
    en: "Drop an idea and I'll run with it.", ar: "اطرح فكرة وسأتولى الباقي.", "ar-eg": "قول فكرة وأنا أكمّل.", es: "Dame una idea y yo sigo.", fr: "Donnez une idée, je m'en occupe.", de: "Gib mir eine Idee, ich mache weiter.", pt: "Dê uma ideia e eu sigo.", it: "Dammi un'idea e ci penso io.", tr: "Bir fikir ver, gerisini ben hallederim.", ru: "Подкиньте идею — я подхвачу.", zh: "给我一个想法，我来实现。", ja: "アイデアをください、続きは任せて。", ko: "아이디어만 주세요, 제가 이어갈게요.", hi: "एक आइडिया दीजिए, बाकी मैं संभालूँगा।", id: "Beri satu ide, sisanya saya.", nl: "Geef een idee, ik doe de rest.", uk: "Дайте ідею — я підхоплю.", he: "תנו רעיון ואמשיך מכאן.", fa: "یک ایده بدهید، ادامه‌اش با من.", vi: "Cho tôi một ý tưởng, tôi lo phần còn lại.", th: "บอกไอเดียมา เดี๋ยวผมสานต่อ", pl: "Rzuć pomysł, resztę zrobię ja.",
  },
  greeting4: {
    en: "Start with a thought. I'll shape it.", ar: "ابدأ بفكرة وسأصوغها.", "ar-eg": "ابدأ بفكرة وأنا أظبطها.", es: "Empieza con una idea. Yo le doy forma.", fr: "Commencez par une pensée, je lui donne forme.", de: "Beginne mit einem Gedanken. Ich forme ihn.", pt: "Comece com uma ideia. Eu dou forma.", it: "Parti da un pensiero. Gli do forma.", tr: "Bir düşünceyle başla, şekli bana bırak.", ru: "Начните с мысли — я придам ей форму.", zh: "先有个念头，我来成形。", ja: "思いつきから始めて。形にします。", ko: "생각 하나면 됩니다. 제가 다듬을게요.", hi: "एक विचार से शुरू करें, आकार मैं दूँगा।", id: "Mulai dari satu pikiran. Saya bentuk.", nl: "Begin met een gedachte. Ik geef het vorm.", uk: "Почніть з думки — я надам їй форми.", he: "התחילו במחשבה, אני אעצב אותה.", fa: "با یک فکر شروع کنید؛ من شکلش می‌دهم.", vi: "Bắt đầu bằng một suy nghĩ. Tôi sẽ định hình.", th: "เริ่มจากความคิดเดียว เดี๋ยวผมปั้นต่อ", pl: "Zacznij od myśli. Ja nadam jej kształt.",
  },
  greeting5: {
    en: "Tell me what you want to create.", ar: "أخبرني بما تريد إنشاءه.", "ar-eg": "قوللي عايز تعمل إيه.", es: "Dime qué quieres crear.", fr: "Dites-moi ce que vous voulez créer.", de: "Sag mir, was du erschaffen willst.", pt: "Diga o que você quer criar.", it: "Dimmi cosa vuoi creare.", tr: "Ne yaratmak istediğini söyle.", ru: "Скажите, что хотите создать.", zh: "告诉我你想创造什么。", ja: "作りたいものを教えてください。", ko: "무엇을 만들고 싶은지 알려주세요.", hi: "बताइए आप क्या बनाना चाहते हैं।", id: "Ceritakan apa yang ingin kamu buat.", nl: "Vertel me wat je wilt maken.", uk: "Скажіть, що хочете створити.", he: "ספרו לי מה תרצו ליצור.", fa: "بگویید چه می‌خواهید بسازید.", vi: "Hãy cho tôi biết bạn muốn tạo gì.", th: "บอกผมว่าคุณอยากสร้างอะไร", pl: "Powiedz, co chcesz stworzyć.",
  },

  placeholderAllInOne: {
    en: "Design, write, research — all in one place", ar: "صمّم واكتب واSearch — كل شيء في مكان واحد", "ar-eg": "صمّم واكتب واSearch — كله في مكان واحد", es: "Diseña, escribe e investiga — todo en un lugar", fr: "Concevoir, écrire, rechercher — tout au même endroit", de: "Designen, schreiben, recherchieren — alles an einem Ort", pt: "Crie, escreva e pesquise — tudo em um só lugar", it: "Progetta, scrivi, ricerca — tutto in un posto", tr: "Tasarla, yaz, araştır — hepsi tek yerde", ru: "Дизайн, тексты, исследования — всё в одном месте", zh: "设计、写作、研究——尽在一处", ja: "デザイン、執筆、調査 — すべて一か所で", ko: "디자인, 글쓰기, 리서치 — 한곳에서", hi: "डिज़ाइन, लेखन, शोध — सब एक जगह", id: "Desain, tulis, riset — semua di satu tempat", nl: "Ontwerp, schrijf, onderzoek — alles op één plek", sv: "Designa, skriv, forska — allt på ett ställe", cs: "Navrhujte, pište, zkoumejte — vše na jednom místě", ro: "Design, scriere, cercetare — toate într-un loc", el: "Σχεδίαση, γραφή, έρευνα — όλα σε ένα μέρος", uk: "Дизайн, письмо, дослідження — усе в одному місці", he: "עיצוב, כתיבה ומחקר — הכול במקום אחד", fa: "طراحی، نوشتن، پژوهش — همه در یک جا", vi: "Thiết kế, viết, nghiên cứu — tất cả một nơi", th: "ออกแบบ เขียน ค้นคว้า — ครบในที่เดียว", pl: "Projektuj, pisz, badaj — wszystko w jednym miejscu",
  },
  placeholderType: {
    en: "Type a question and let's get started", ar: "اكتب سؤالًا ولنبدأ", "ar-eg": "اكتب سؤال ويلا نبدأ", es: "Escribe una pregunta y empecemos", fr: "Écrivez une question et commençons", de: "Stell eine Frage und los geht’s", pt: "Digite uma pergunta e vamos começar", it: "Scrivi una domanda e iniziamo", tr: "Bir soru yazın, başlayalım", ru: "Введите вопрос — начнём", zh: "输入问题，开始吧", ja: "質問を入力して始めましょう", ko: "질문을 입력하고 시작하세요", hi: "सवाल लिखें और शुरू करें", id: "Ketik pertanyaan dan mulai", nl: "Typ een vraag en begin", sv: "Skriv en fråga och börja", cs: "Napište otázku a začněme", ro: "Scrie o întrebare și să începem", el: "Γράψε μια ερώτηση και ξεκινάμε", uk: "Введіть запитання і почнімо", he: "כתבו שאלה ונתחיל", fa: "یک سؤال بنویسید و شروع کنیم", vi: "Nhập câu hỏi và bắt đầu", th: "พิมพ์คำถามแล้วเริ่มกัน", pl: "Wpisz pytanie i zaczynajmy",
  },
  megsyAsking: {
    en: "Megsy is asking", ar: "ميغسي يسأل", "ar-eg": "ميغسي بيسأل", es: "Megsy pregunta", fr: "Megsy demande", de: "Megsy fragt", pt: "Megsy pergunta", it: "Megsy chiede", tr: "Megsy soruyor", ru: "Megsy спрашивает", zh: "Megsy 正在提问", ja: "Megsy が質問中", ko: "Megsy가 묻는 중", hi: "Megsy पूछ रहा है", id: "Megsy bertanya", nl: "Megsy vraagt", sv: "Megsy frågar", cs: "Megsy se ptá", ro: "Megsy întreabă", el: "Η Megsy ρωτά", uk: "Megsy запитує", he: "Megsy שואלת", fa: "Megsy می‌پرسد", vi: "Megsy đang hỏi", th: "Megsy กำลังถาม", pl: "Megsy pyta",
  },
  skipQuestion: {
    en: "Skip question", ar: "تخطي السؤال", "ar-eg": "عدّي السؤال", es: "Saltar pregunta", fr: "Ignorer la question", de: "Frage überspringen", pt: "Pular pergunta", it: "Salta domanda", tr: "Soruyu atla", ru: "Пропустить вопрос", zh: "跳过问题", ja: "質問をスキップ", ko: "질문 건너뛰기", hi: "सवाल छोड़ें", id: "Lewati pertanyaan", nl: "Vraag overslaan", sv: "Hoppa över frågan", cs: "Přeskočit otázku", ro: "Sari peste întrebare", el: "Παράλειψη ερώτησης", uk: "Пропустити питання", he: "דלג על שאלה", fa: "رد کردن سؤال", vi: "Bỏ qua câu hỏi", th: "ข้ามคำถาม", pl: "Pomiń pytanie",
  },
  typeOwnAnswer: {
    en: "Type your own answer…", ar: "اكتب إجابتك…", "ar-eg": "اكتب إجابتك…", es: "Escribe tu propia respuesta…", fr: "Saisissez votre réponse…", de: "Eigene Antwort eingeben…", pt: "Digite sua resposta…", it: "Scrivi la tua risposta…", tr: "Kendi cevabınızı yazın…", ru: "Введите свой ответ…", zh: "输入你自己的答案…", ja: "自分の回答を入力…", ko: "직접 답변 입력…", hi: "अपना जवाब लिखें…", id: "Ketik jawaban Anda…", nl: "Typ je eigen antwoord…", sv: "Skriv ditt eget svar…", cs: "Napište vlastní odpověď…", ro: "Scrie propriul răspuns…", el: "Πληκτρολογήστε τη δική σας απάντηση…", uk: "Введіть власну відповідь…", he: "כתבו תשובה משלכם…", fa: "پاسخ خود را بنویسید…", vi: "Nhập câu trả lời của bạn…", th: "พิมพ์คำตอบของคุณ…", pl: "Wpisz własną odpowiedź…",
  },
  sendAnswer: {
    en: "Send answer", ar: "إرسال الإجابة", "ar-eg": "ابعت الإجابة", es: "Enviar respuesta", fr: "Envoyer la réponse", de: "Antwort senden", pt: "Enviar resposta", it: "Invia risposta", tr: "Cevabı gönder", ru: "Отправить ответ", zh: "发送答案", ja: "回答を送信", ko: "답변 보내기", hi: "जवाब भेजें", id: "Kirim jawaban", nl: "Antwoord verzenden", sv: "Skicka svar", cs: "Odeslat odpověď", ro: "Trimite răspunsul", el: "Αποστολή απάντησης", uk: "Надіслати відповідь", he: "שליחת תשובה", fa: "ارسال پاسخ", vi: "Gửi câu trả lời", th: "ส่งคำตอบ", pl: "Wyślij odpowiedź",
  },
  editing: {
    en: "Editing", ar: "جارٍ التعديل", "ar-eg": "بتعدّل", es: "Editando", fr: "Modification", de: "Bearbeiten", pt: "Editando", it: "Modifica", tr: "Düzenleniyor", ru: "Редактирование", zh: "正在编辑", ja: "編集中", ko: "편집 중", hi: "संपादन", id: "Mengedit", nl: "Bewerken", sv: "Redigerar", cs: "Úprava", ro: "Editare", el: "Επεξεργασία", uk: "Редагування", he: "עריכה", fa: "در حال ویرایش", vi: "Đang chỉnh sửa", th: "กำลังแก้ไข", pl: "Edycja",
  },
  cancelEdit: {
    en: "Cancel edit", ar: "إلغاء التعديل", "ar-eg": "إلغاء التعديل", es: "Cancelar edición", fr: "Annuler la modification", de: "Bearbeitung abbrechen", pt: "Cancelar edição", it: "Annulla modifica", tr: "Düzenlemeyi iptal et", ru: "Отменить правку", zh: "取消编辑", ja: "編集をキャンセル", ko: "편집 취소", hi: "संपादन रद्द करें", id: "Batalkan edit", nl: "Bewerking annuleren", sv: "Avbryt redigering", cs: "Zrušit úpravu", ro: "Anulează editarea", el: "Ακύρωση επεξεργασίας", uk: "Скасувати редагування", he: "ביטול עריכה", fa: "لغو ویرایش", vi: "Hủy chỉnh sửa", th: "ยกเลิกการแก้ไข", pl: "Anuluj edycję",
  },
  openTools: {
    en: "Open attachments and tools", ar: "فتح المرفقات وTools", "ar-eg": "افتح المرفقات وTools", es: "Abrir adjuntos y herramientas", fr: "Ouvrir pièces jointes et outils", de: "Anhänge und Tools öffnen", pt: "Abrir anexos e ferramentas", it: "Apri allegati e strumenti", tr: "Ekleri ve araçları aç", ru: "Открыть вложения и инструменты", zh: "打开附件和工具", ja: "添付とツールを開く", ko: "첨부 및 도구 열기", hi: "अटैचमेंट और टूल खोलें", id: "Buka lampiran dan alat", nl: "Bijlagen en tools openen", sv: "Öppna bilagor och verktyg", cs: "Otevřít přílohy a nástroje", ro: "Deschide atașamente și unelte", el: "Άνοιγμα συνημμένων και εργαλείων", uk: "Відкрити вкладення й інструменти", he: "פתיחת קבצים וכלים", fa: "باز کردن پیوست‌ها و ابزارها", vi: "Mở tệp đính kèm và công cụ", th: "เปิดไฟล์แนบและเครื่องมือ", pl: "Otwórz załączniki i narzędzia",
  },
  stopGeneration: {
    en: "Stop generation", ar: "إيقاف التوليد", "ar-eg": "وقف التوليد", es: "Detener generación", fr: "Arrêter la génération", de: "Generierung stoppen", pt: "Parar geração", it: "Ferma generazione", tr: "Üretimi durdur", ru: "Остановить генерацию", zh: "停止生成", ja: "生成を停止", ko: "생성 중지", hi: "जनरेशन रोकें", id: "Hentikan generasi", nl: "Generatie stoppen", sv: "Stoppa generering", cs: "Zastavit generování", ro: "Oprește generarea", el: "Διακοπή δημιουργίας", uk: "Зупинити генерацію", he: "עצירת יצירה", fa: "توقف تولید", vi: "Dừng tạo", th: "หยุดสร้าง", pl: "Zatrzymaj generowanie",
  },
  sendMessage: {
    en: "Send message", ar: "إرسال الرسالة", "ar-eg": "ابعت الرسالة", es: "Enviar mensaje", fr: "Envoyer le message", de: "Nachricht senden", pt: "Enviar mensagem", it: "Invia messaggio", tr: "Mesaj gönder", ru: "Отправить сообщение", zh: "发送消息", ja: "メッセージを送信", ko: "메시지 보내기", hi: "संदेश भेजें", id: "Kirim pesan", nl: "Bericht verzenden", sv: "Skicka meddelande", cs: "Odeslat zprávu", ro: "Trimite mesaj", el: "Αποστολή μηνύματος", uk: "Надіслати повідомлення", he: "שליחת הודעה", fa: "ارسال پیام", vi: "Gửi tin nhắn", th: "ส่งข้อความ", pl: "Wyślij wiadomość",
  },
  googleProvider: {
    en: "Google", ar: "جوجل", "ar-eg": "جوجل", es: "Google", fr: "Google", de: "Google", pt: "Google", it: "Google", tr: "Google", ru: "Google", zh: "谷歌", ja: "Google", ko: "Google", hi: "Google", id: "Google", nl: "Google", sv: "Google", cs: "Google", ro: "Google", el: "Google", uk: "Google", he: "Google", fa: "گوگل", vi: "Google", th: "Google", pl: "Google",
  },
  muteVideo: {
    en: "Mute video", ar: "كتم صوت الفيديو", "ar-eg": "اكتم صوت الفيديو", es: "Silenciar vídeo", fr: "Couper le son de la vidéo", de: "Video stummschalten", pt: "Silenciar vídeo", it: "Disattiva audio video", tr: "Videoyu sessize al", ru: "Выключить звук видео", zh: "视频静音", ja: "動画をミュート", ko: "동영상 음소거", hi: "वीडियो म्यूट करें", id: "Bisukan video", nl: "Video dempen", sv: "Stäng av videoljud", cs: "Ztlumit video", ro: "Dezactivează sunetul video", el: "Σίγαση βίντεο", uk: "Вимкнути звук відео", he: "השתק וידאו", fa: "بی‌صدا کردن ویدئو", vi: "Tắt tiếng video", th: "ปิดเสียงวิดีโอ", pl: "Wycisz wideo",
  },
  unmuteVideo: {
    en: "Unmute video", ar: "تشغيل صوت الفيديو", "ar-eg": "شغّل صوت الفيديو", es: "Activar sonido", fr: "Activer le son", de: "Video-Ton einschalten", pt: "Ativar som", it: "Attiva audio", tr: "Videonun sesini aç", ru: "Включить звук видео", zh: "取消视频静音", ja: "動画のミュート解除", ko: "동영상 음소거 해제", hi: "वीडियो अनम्यूट करें", id: "Bunyikan video", nl: "Video geluid aan", sv: "Slå på videoljud", cs: "Zapnout zvuk videa", ro: "Activează sunetul video", el: "Ενεργοποίηση ήχου", uk: "Увімкнути звук відео", he: "בטל השתקת וידאו", fa: "باصدا کردن ویدئو", vi: "Bật tiếng video", th: "เปิดเสียงวิดีโอ", pl: "Włącz dźwięk wideo",
  },
  showcaseTitle: {
    en: "Built for makers", ar: "مصمم للمبدعين", "ar-eg": "معمول للمبدعين", es: "Hecho para creadores", fr: "Conçu pour les créateurs", de: "Für Macher gebaut", pt: "Criado para makers", it: "Creato per i creator", tr: "Üretenler için", ru: "Создано для авторов", zh: "为创作者打造", ja: "クリエイターのために", ko: "크리에이터를 위해", hi: "निर्माताओं के लिए", id: "Dibuat untuk kreator", nl: "Gebouwd voor makers", sv: "Byggt för skapare", cs: "Vytvořeno pro tvůrce", ro: "Creat pentru creatori", el: "Φτιαγμένο για δημιουργούς", uk: "Створено для творців", he: "נבנה ליוצרים", fa: "ساخته‌شده برای خالقان", vi: "Dành cho nhà sáng tạo", th: "สร้างเพื่อครีเอเตอร์", pl: "Stworzone dla twórców",
  },
  imageModels: {
    en: "Image models", ar: "نماذج Images", "ar-eg": "موديلات Images", es: "Modelos de imagen", fr: "Modèles d’image", de: "Bildmodelle", pt: "Modelos de imagem", it: "Modelli immagine", tr: "Görsel modelleri", ru: "Модели изображений", zh: "图像模型", ja: "画像モデル", ko: "이미지 모델", hi: "इमेज मॉडल", id: "Model gambar", nl: "Beeldmodellen", sv: "Bildmodeller", cs: "Obrazové modely", ro: "Modele de imagine", el: "Μοντέλα εικόνας", uk: "Моделі зображень", he: "מודלי תמונה", fa: "مدل‌های تصویر", vi: "Mô hình hình ảnh", th: "โมเดลภาพ", pl: "Modele obrazu",
  },
  videoModels: {
    en: "Video models", ar: "نماذج الفيديو", "ar-eg": "موديلات الفيديو", es: "Modelos de vídeo", fr: "Modèles vidéo", de: "Videomodelle", pt: "Modelos de vídeo", it: "Modelli video", tr: "Video modelleri", ru: "Видеомодели", zh: "视频模型", ja: "動画モデル", ko: "비디오 모델", hi: "वीडियो मॉडल", id: "Model video", nl: "Videomodellen", sv: "Videomodeller", cs: "Video modely", ro: "Modele video", el: "Μοντέλα βίντεο", uk: "Відеомоделі", he: "מודלי וידאו", fa: "مدل‌های ویدئو", vi: "Mô hình video", th: "โมเดลวิดีโอ", pl: "Modele wideo",
  },
  imageModelsDesc: {
    en: "Generate stunning visuals with the world's most powerful image AI models.", ar: "أنشئ صورًا مبهرة بأقوى نماذج Images بالذكاء الاصطناعي في العالم.", "ar-eg": "اعمل صور مبهرة بأقوى موديلات صور AI في العالم.", es: "Genera imágenes impactantes con los modelos de imagen con IA más potentes del mundo.", fr: "Générez des visuels remarquables avec les modèles d’image IA les plus puissants.", de: "Erstelle starke Visuals mit den leistungsfähigsten KI-Bildmodellen.", pt: "Gere visuais incríveis com os modelos de imagem por IA mais poderosos.", it: "Genera visual straordinari con i modelli immagine IA più potenti.", tr: "Dünyanın en güçlü görsel yapay zekâ modelleriyle etkileyici görseller üret.", ru: "Создавайте впечатляющие изображения с самыми мощными ИИ-моделями.", zh: "使用全球强大的 AI 图像模型生成惊艳视觉。", ja: "世界最高水準の画像AIモデルで美しいビジュアルを生成。", ko: "강력한 이미지 AI 모델로 뛰어난 비주얼을 생성하세요.", hi: "दुनिया के शक्तिशाली AI इमेज मॉडल से शानदार विज़ुअल बनाएं।", id: "Buat visual memukau dengan model gambar AI terkuat.", nl: "Maak sterke visuals met krachtige AI-beeldmodellen.", sv: "Skapa starka visuella resultat med kraftfulla AI-bildmodeller.", cs: "Tvořte působivé vizuály s výkonnými AI obrazovými modely.", ro: "Generează vizualuri puternice cu cele mai bune modele AI de imagine.", el: "Δημιουργήστε εντυπωσιακά οπτικά με ισχυρά μοντέλα εικόνας AI.", uk: "Створюйте вражаючі зображення з потужними AI-моделями.", he: "צרו ויזואלים מרשימים עם מודלי תמונה חזקים של AI.", fa: "با مدل‌های قدرتمند تصویر هوش مصنوعی، تصاویر چشمگیر بسازید.", vi: "Tạo hình ảnh ấn tượng bằng các mô hình ảnh AI mạnh mẽ.", th: "สร้างภาพสวยด้วยโมเดลภาพ AI ชั้นนำ", pl: "Twórz świetne grafiki z mocnymi modelami obrazu AI.",
  },
  videoModelsDesc: {
    en: "Create cinematic videos from text or images with cutting-edge video AI.", ar: "أنشئ فيديوهات سينمائية من نص أو صور باستخدام أحدث نماذج الفيديو بالذكاء الاصطناعي.", "ar-eg": "اعمل فيديوهات سينمائية من نص أو صور بأحدث موديلات فيديو AI.", es: "Crea vídeos cinematográficos desde texto o imágenes con IA de vídeo avanzada.", fr: "Créez des vidéos cinématiques à partir de texte ou d’images avec l’IA vidéo avancée.", de: "Erstelle filmische Videos aus Text oder Bildern mit moderner Video-KI.", pt: "Crie vídeos cinematográficos a partir de texto ou imagens com IA de vídeo avançada.", it: "Crea video cinematografici da testo o immagini con IA video avanzata.", tr: "Metin veya görsellerden gelişmiş video yapay zekâsıyla sinematik videolar üret.", ru: "Создавайте кинематографичные видео из текста или изображений с помощью видео-AI.", zh: "用前沿视频 AI 从文本或图片创建电影感视频。", ja: "最先端の動画AIでテキストや画像からシネマ風動画を作成。", ko: "첨단 비디오 AI로 텍스트나 이미지에서 시네마틱 영상을 만드세요.", hi: "टेक्स्ट या इमेज से सिनेमैटिक वीडियो बनाएं।", id: "Buat video sinematik dari teks atau gambar dengan AI video mutakhir.", nl: "Maak filmische video’s van tekst of beelden met video-AI.", sv: "Skapa filmiska videor från text eller bilder med video-AI.", cs: "Vytvářejte filmová videa z textu či obrázků pomocí video AI.", ro: "Creează videoclipuri cinematice din text sau imagini cu AI video.", el: "Δημιουργήστε κινηματογραφικά βίντεο από κείμενο ή εικόνες με AI.", uk: "Створюйте кінематографічні відео з тексту або зображень за допомогою AI.", he: "צרו וידאו קולנועי מטקסט או תמונות עם AI מתקדם.", fa: "از متن یا تصویر، ویدئوهای سینمایی با هوش مصنوعی بسازید.", vi: "Tạo video điện ảnh từ văn bản hoặc hình ảnh bằng AI video.", th: "สร้างวิดีโอแบบภาพยนตร์จากข้อความหรือภาพด้วย AI", pl: "Twórz filmowe wideo z tekstu lub obrazów dzięki AI.",
  },
  finalCtaTitle: {
    en: "Every AI model. One subscription.", ar: "كل نماذج الذكاء الاصطناعي. اشتراك واحد.", "ar-eg": "كل موديلات AI. اشتراك واحد.", es: "Cada modelo de IA. Una sola suscripción.", fr: "Tous les modèles IA. Un seul abonnement.", de: "Alle KI-Modelle. Ein Abo.", pt: "Todos os modelos de IA. Uma assinatura.", it: "Ogni modello IA. Un solo abbonamento.", tr: "Tüm AI modelleri. Tek abonelik.", ru: "Все AI-модели. Одна подписка.", zh: "所有 AI 模型。一个订阅。", ja: "全てのAIモデルを、ひとつの契約で。", ko: "모든 AI 모델. 하나의 구독.", hi: "हर AI मॉडल। एक सब्सक्रिप्शन।", id: "Semua model AI. Satu langganan.", nl: "Elk AI-model. Één abonnement.", sv: "Alla AI-modeller. En prenumeration.", cs: "Každý AI model. Jedno předplatné.", ro: "Toate modelele AI. Un singur abonament.", el: "Κάθε μοντέλο AI. Μία συνδρομή.", uk: "Усі AI-моделі. Одна підписка.", he: "כל מודלי ה-AI. מנוי אחד.", fa: "همه مدل‌های هوش مصنوعی. یک اشتراک.", vi: "Mọi mô hình AI. Một gói đăng ký.", th: "ทุกโมเดล AI. หนึ่งค่าสมาชิก", pl: "Każdy model AI. Jedna subskrypcja.",
  },
  finalCtaSubtitle: {
    en: "Replace ChatGPT, Midjourney, Sora, Gamma and Bolt with one plan. Cancel anytime.", ar: "استبدل ChatGPT وMidjourney وSora وGamma وBolt بخطة واحدة. إلغِ في أي وقت.", "ar-eg": "استبدل ChatGPT وMidjourney وSora وGamma وBolt بخطة واحدة. لغي في أي وقت.", es: "Reemplaza ChatGPT, Midjourney, Sora, Gamma y Bolt con un solo plan. Cancela cuando quieras.", fr: "Remplacez ChatGPT, Midjourney, Sora, Gamma et Bolt par un seul abonnement. Annulez à tout moment.", de: "Ersetze ChatGPT, Midjourney, Sora, Gamma und Bolt mit einem Plan. Jederzeit kündbar.", pt: "Substitua ChatGPT, Midjourney, Sora, Gamma e Bolt por um único plano. Cancele quando quiser.", it: "Sostituisci ChatGPT, Midjourney, Sora, Gamma e Bolt con un solo piano. Disdici quando vuoi.", tr: "ChatGPT, Midjourney, Sora, Gamma ve Bolt’u tek planla değiştir. İstediğin zaman iptal et.", ru: "Замените ChatGPT, Midjourney, Sora, Gamma и Bolt одной подпиской. Отмена в любой момент.", zh: "用一个订阅替代 ChatGPT、Midjourney、Sora、Gamma 和 Bolt。随时取消。", ja: "ChatGPT・Midjourney・Sora・Gamma・Boltをひとつのプランに。いつでも解約可能。", ko: "ChatGPT, Midjourney, Sora, Gamma, Bolt를 하나의 요금제로. 언제든 해지.", hi: "ChatGPT, Midjourney, Sora, Gamma और Bolt को एक प्लान से बदलें। कभी भी रद्द करें।", id: "Ganti ChatGPT, Midjourney, Sora, Gamma & Bolt dengan satu paket. Batalkan kapan saja.", nl: "Vervang ChatGPT, Midjourney, Sora, Gamma en Bolt door één abonnement. Altijd opzegbaar.", sv: "Ersätt ChatGPT, Midjourney, Sora, Gamma och Bolt med ett abonnemang. Avsluta när du vill.", cs: "Nahraďte ChatGPT, Midjourney, Sora, Gamma a Bolt jedním předplatným. Kdykoli zrušit.", ro: "Înlocuiește ChatGPT, Midjourney, Sora, Gamma și Bolt cu un singur abonament. Anulează oricând.", el: "Αντικατάσταση των ChatGPT, Midjourney, Sora, Gamma, Bolt με ένα πλάνο. Ακύρωση όποτε θες.", uk: "Замініть ChatGPT, Midjourney, Sora, Gamma і Bolt однією підпискою. Скасувати будь-коли.", he: "החליפו את ChatGPT, Midjourney, Sora, Gamma ו-Bolt במנוי אחד. בטלו מתי שתרצו.", fa: "ChatGPT، Midjourney، Sora، Gamma و Bolt را با یک اشتراک جایگزین کنید. لغو در هر زمان.", vi: "Thay thế ChatGPT, Midjourney, Sora, Gamma và Bolt bằng một gói. Hủy bất cứ lúc nào.", th: "แทนที่ ChatGPT, Midjourney, Sora, Gamma และ Bolt ด้วยแพ็คเดียว ยกเลิกได้ทุกเมื่อ", pl: "Zastąp ChatGPT, Midjourney, Sora, Gamma i Bolt jednym planem. Anuluj w każdej chwili.",
  },
  startCreating: {
    en: "Start creating", ar: "ابدأ Create", "ar-eg": "ابدأ دلوقتي", es: "Empieza a crear", fr: "Commencer à créer", de: "Jetzt erstellen", pt: "Começar a criar", it: "Inizia a creare", tr: "Oluşturmaya başla", ru: "Начать создавать", zh: "开始创作", ja: "作成を開始", ko: "만들기 시작", hi: "बनाना शुरू करें", id: "Mulai membuat", nl: "Begin met maken", sv: "Börja skapa", cs: "Začít tvořit", ro: "Începe să creezi", el: "Ξεκίνα να δημιουργείς", uk: "Почати створювати", he: "התחילו ליצור", fa: "شروع به ساخت", vi: "Bắt đầu tạo", th: "เริ่มสร้าง", pl: "Zacznij tworzyć",
  },
  allModelsIncluded: {
    en: "All flagship models included", ar: "كل النماذج الرائدة متاحة", "ar-eg": "كل الموديلات القوية متاحة", es: "Todos los modelos líderes incluidos", fr: "Tous les modèles phares inclus", de: "Alle Top-Modelle inklusive", pt: "Todos os modelos principais incluídos", it: "Tutti i modelli principali inclusi", tr: "Tüm amiral gemisi modeller dahil", ru: "Все флагманские модели включены", zh: "包含所有旗舰模型", ja: "主要モデルをすべて含む", ko: "주요 플래그십 모델 포함", hi: "सभी प्रमुख मॉडल शामिल", id: "Semua model unggulan termasuk", nl: "Alle topmodellen inbegrepen", sv: "Alla toppmodeller ingår", cs: "Všechny špičkové modely zahrnuty", ro: "Toate modelele principale incluse", el: "Όλα τα κορυφαία μοντέλα περιλαμβάνονται", uk: "Усі флагманські моделі включено", he: "כל המודלים המובילים כלולים", fa: "همه مدل‌های شاخص شامل است", vi: "Bao gồm mọi mô hình hàng đầu", th: "รวมโมเดลหลักทั้งหมด", pl: "Wszystkie flagowe modele w pakiecie",
  },
  creditBasedVideos: {
    en: "Credit-based videos", ar: "فيديوهات بنظام الكريديت", "ar-eg": "فيديوهات بالكريدت", es: "Vídeos con créditos", fr: "Vidéos avec crédits", de: "Videos über Credits", pt: "Vídeos por créditos", it: "Video a crediti", tr: "Kredi bazlı videolar", ru: "Видео по кредитам", zh: "视频按积分计费", ja: "クレジット制動画", ko: "크레딧 기반 비디오", hi: "क्रेडिट-आधारित वीडियो", id: "Video berbasis kredit", nl: "Video’s op credits", sv: "Kreditbaserade videor", cs: "Videa na kredity", ro: "Videoclipuri pe credite", el: "Βίντεο με credits", uk: "Відео за кредитами", he: "וידאו לפי קרדיטים", fa: "ویدئو بر پایه اعتبار", vi: "Video theo tín dụng", th: "วิดีโอตามเครดิต", pl: "Wideo na kredyty",
  },
  thinking: {
    en: "Thinking…", ar: "يفكر…", "ar-eg": "بيفكّر…", es: "Pensando…", fr: "Réflexion…", de: "Denkt nach…", pt: "Pensando…", it: "Sto pensando…", tr: "Düşünüyor…", ru: "Думаю…", zh: "正在思考…", ja: "考え中…", ko: "생각 중…", hi: "सोच रहा है…", id: "Berpikir…", nl: "Aan het denken…", sv: "Tänker…", cs: "Přemýšlím…", ro: "Se gândește…", el: "Σκέφτεται…", uk: "Думаю…", he: "חושב…", fa: "در حال فکر کردن…", vi: "Đang suy nghĩ…", th: "กำลังคิด…", pl: "Myślę…",
  },
  thinkingDeep: {
    en: "Thinking deeply…", ar: "يفكر بعمق…", "ar-eg": "بيفكّر بعمق…", es: "Pensando a fondo…", fr: "Réflexion approfondie…", de: "Denkt gründlich nach…", pt: "Pensando profundamente…", it: "Sto ragionando a fondo…", tr: "Derinlemesine düşünüyor…", ru: "Глубоко обдумываю…", zh: "正在深入思考…", ja: "深く考え中…", ko: "깊이 생각 중…", hi: "गहराई से सोच रहा है…", id: "Berpikir mendalam…", nl: "Diep aan het nadenken…", sv: "Tänker djupt…", cs: "Přemýšlím do hloubky…", ro: "Gândește în profunzime…", el: "Σκέφτεται βαθιά…", uk: "Глибоко думаю…", he: "חושב לעומק…", fa: "در حال تفکر عمیق…", vi: "Đang suy nghĩ sâu…", th: "กำลังคิดอย่างลึกซึ้ง…", pl: "Myślę głęboko…",
  },
  working: {
    en: "Working…", ar: "جارٍ العمل…", "ar-eg": "شغال…", es: "Trabajando…", fr: "Travail en cours…", de: "Arbeite…", pt: "Trabalhando…", it: "Al lavoro…", tr: "Çalışıyor…", ru: "Работаю…", zh: "正在处理…", ja: "作業中…", ko: "작업 중…", hi: "काम चल रहा है…", id: "Bekerja…", nl: "Bezig…", sv: "Arbetar…", cs: "Pracuji…", ro: "Lucrează…", el: "Εργάζεται…", uk: "Працюю…", he: "עובד…", fa: "در حال کار…", vi: "Đang xử lý…", th: "กำลังทำงาน…", pl: "Pracuję…",
  },
  done: {
    en: "Done", ar: "تم", "ar-eg": "تمام", es: "Listo", fr: "Terminé", de: "Fertig", pt: "Concluído", it: "Fatto", tr: "Tamamlandı", ru: "Готово", zh: "完成", ja: "完了", ko: "완료", hi: "हो गया", id: "Selesai", nl: "Klaar", sv: "Klart", cs: "Hotovo", ro: "Gata", el: "Έτοιμο", uk: "Готово", he: "בוצע", fa: "انجام شد", vi: "Xong", th: "เสร็จแล้ว", pl: "Gotowe",
  },
  failed: {
    en: "Failed", ar: "فشل", "ar-eg": "فشل", es: "Falló", fr: "Échec", de: "Fehlgeschlagen", pt: "Falhou", it: "Non riuscito", tr: "Başarısız", ru: "Ошибка", zh: "失败", ja: "失敗", ko: "실패", hi: "विफल", id: "Gagal", nl: "Mislukt", sv: "Misslyckades", cs: "Selhalo", ro: "Eșuat", el: "Απέτυχε", uk: "Не вдалося", he: "נכשל", fa: "ناموفق", vi: "Thất bại", th: "ล้มเหลว", pl: "Niepowodzenie",
  },
  somethingWentWrong: {
    en: "Something went wrong", ar: "حدث خطأ ما", "ar-eg": "فيه حاجة غلط حصلت", es: "Algo salió mal", fr: "Un problème est survenu", de: "Etwas ist schiefgelaufen", pt: "Algo deu errado", it: "Qualcosa è andato storto", tr: "Bir şeyler ters gitti", ru: "Что-то пошло не так", zh: "出了点问题", ja: "問題が発生しました", ko: "문제가 발생했습니다", hi: "कुछ गलत हुआ", id: "Terjadi kesalahan", nl: "Er ging iets mis", sv: "Något gick fel", cs: "Něco se pokazilo", ro: "Ceva nu a mers bine", el: "Κάτι πήγε στραβά", uk: "Щось пішло не так", he: "משהו השתבש", fa: "مشکلی پیش آمد", vi: "Đã xảy ra lỗi", th: "มีบางอย่างผิดพลาด", pl: "Coś poszło nie tak",
  },
  goodMorning: {
    en: "Good morning", ar: "صباح الخير", "ar-eg": "صباح الخير", es: "Buenos días", fr: "Bonjour", de: "Guten Morgen", pt: "Bom dia", it: "Buongiorno", tr: "Günaydın", ru: "Доброе утро", zh: "早上好", ja: "おはようございます", ko: "좋은 아침이에요", hi: "सुप्रभात", id: "Selamat pagi", nl: "Goedemorgen", sv: "God morgon", cs: "Dobré ráno", ro: "Bună dimineața", el: "Καλημέρα", uk: "Доброго ранку", he: "בוקר טוב", fa: "صبح بخیر", vi: "Chào buổi sáng", th: "สวัสดีตอนเช้า", pl: "Dzień dobry",
  },
  goodAfternoon: {
    en: "Good afternoon", ar: "مساء الخير", "ar-eg": "مساء الخير", es: "Buenas tardes", fr: "Bon après-midi", de: "Guten Tag", pt: "Boa tarde", it: "Buon pomeriggio", tr: "İyi öğleden sonra", ru: "Добрый день", zh: "下午好", ja: "こんにちは", ko: "좋은 오후예요", hi: "नमस्कार", id: "Selamat siang", nl: "Goedemiddag", sv: "God eftermiddag", cs: "Dobré odpoledne", ro: "Bună ziua", el: "Καλό απόγευμα", uk: "Добрий день", he: "צהריים טובים", fa: "عصر بخیر", vi: "Chào buổi chiều", th: "สวัสดีตอนบ่าย", pl: "Dzień dobry",
  },
  goodEvening: {
    en: "Good evening", ar: "مساء الخير", "ar-eg": "مساء الخير", es: "Buenas noches", fr: "Bonsoir", de: "Guten Abend", pt: "Boa noite", it: "Buonasera", tr: "İyi akşamlar", ru: "Добрый вечер", zh: "晚上好", ja: "こんばんは", ko: "좋은 저녁이에요", hi: "शुभ संध्या", id: "Selamat malam", nl: "Goedenavond", sv: "God kväll", cs: "Dobrý večer", ro: "Bună seara", el: "Καλησπέρα", uk: "Добрий вечір", he: "ערב טוב", fa: "شب بخیر", vi: "Chào buổi tối", th: "สวัสดีตอนเย็น", pl: "Dobry wieczór",
  },
  stillUp: {
    en: "Still up", ar: "ما زلت مستيقظًا", "ar-eg": "لسه صاحي", es: "Aún despierto", fr: "Encore éveillé", de: "Noch wach", pt: "Ainda acordado", it: "Ancora sveglio", tr: "Hâlâ uyanık", ru: "Ещё не спите", zh: "还没睡", ja: "まだ起きていますね", ko: "아직 깨어 있군요", hi: "अभी भी जाग रहे हैं", id: "Masih terjaga", nl: "Nog wakker", sv: "Fortfarande vaken", cs: "Ještě vzhůru", ro: "Încă treaz", el: "Ακόμα ξύπνιος", uk: "Ще не спите", he: "עדיין ערים", fa: "هنوز بیداری", vi: "Vẫn còn thức", th: "ยังตื่นอยู่", pl: "Nadal nie śpisz",
  },
  lateOne: {
    en: "Late one", ar: "وقت متأخر", "ar-eg": "وقت متأخر", es: "Noche larga", fr: "Tard dans la nuit", de: "Späte Stunde", pt: "Noite longa", it: "È tardi", tr: "Geç saat", ru: "Поздний час", zh: "夜深了", ja: "遅い時間ですね", ko: "늦은 시간이네요", hi: "देर रात है", id: "Sudah larut", nl: "Laat op", sv: "Sen kväll", cs: "Pozdní hodina", ro: "E târziu", el: "Προχωρημένη ώρα", uk: "Пізня година", he: "שעה מאוחרת", fa: "دیروقت است", vi: "Đã khuya", th: "ดึกแล้ว", pl: "Późna pora",
  },
  there: {
    en: "there", ar: "صديقي", "ar-eg": "يا صاحبي", es: "ahí", fr: "à vous", de: "du", pt: "você", it: "a te", tr: "orada", ru: "вам", zh: "你好", ja: "あなた", ko: "당신", hi: "आप", id: "Anda", nl: "daar", sv: "du", cs: "vám", ro: "tu", el: "εσύ", uk: "вам", he: "לכם", fa: "تو", vi: "bạn", th: "คุณ", pl: "tobie",
  },
  whatsOnYourMind: {
    en: "What's on your mind", ar: "بمَ تفكر", "ar-eg": "بتفكر في إيه", es: "Qué tienes en mente", fr: "À quoi pensez-vous", de: "Woran denkst du", pt: "No que você está pensando", it: "A cosa stai pensando", tr: "Aklında ne var", ru: "О чём думаете", zh: "你在想什么", ja: "何を考えていますか", ko: "무슨 생각인가요", hi: "क्या सोच रहे हैं", id: "Apa yang Anda pikirkan", nl: "Waar denk je aan", sv: "Vad tänker du på", cs: "Na co myslíš", ro: "La ce te gândești", el: "Τι σκέφτεσαι", uk: "Про що думаєте", he: "על מה אתם חושבים", fa: "به چه فکر می‌کنی", vi: "Bạn đang nghĩ gì", th: "คุณกำลังคิดอะไรอยู่", pl: "O czym myślisz",
  },
  whereToToday: {
    en: "Where to today", ar: "إلى أين اليوم", "ar-eg": "رايح فين النهارده", es: "A dónde hoy", fr: "Où allons-nous aujourd'hui", de: "Wohin heute", pt: "Para onde hoje", it: "Dove andiamo oggi", tr: "Bugün nereye", ru: "Куда сегодня", zh: "今天去哪儿", ja: "今日はどこへ", ko: "오늘은 어디로", hi: "आज कहाँ", id: "Ke mana hari ini", nl: "Waarheen vandaag", sv: "Vart idag", cs: "Kam dnes", ro: "Încotro azi", el: "Πού σήμερα", uk: "Куди сьогодні", he: "לאן היום", fa: "امروز کجا", vi: "Hôm nay đi đâu", th: "วันนี้ไปไหน", pl: "Dokąd dziś",
  },
  readyWhenYouAre: {
    en: "Ready when you are", ar: "جاهز عندما تكون جاهزًا", "ar-eg": "Ready when you are", es: "Listo cuando tú quieras", fr: "Prêt quand vous l'êtes", de: "Bereit, wenn du es bist", pt: "Pronto quando você estiver", it: "Pronto quando vuoi", tr: "Hazır olduğunda hazırım", ru: "Готово, когда вы готовы", zh: "随时准备好", ja: "準備できたらどうぞ", ko: "준비되면 시작하세요", hi: "जब आप तैयार हों", id: "Siap kapan pun Anda siap", nl: "Klaar wanneer jij bent", sv: "Redo när du är det", cs: "Připraveno, až budeš", ro: "Gata când ești tu", el: "Έτοιμο όποτε είσαι", uk: "Готово, коли ви будете", he: "מוכן כשתהיו מוכנים", fa: "هر وقت آماده باشی", vi: "Sẵn sàng khi bạn muốn", th: "พร้อมเมื่อคุณพร้อม", pl: "Gotowe, gdy jesteś",
  },
  loadingMegsy: {
    en: "Loading Megsy", ar: "جارٍ تحميل ميغسي", "ar-eg": "ميغسي بيحمّل", es: "Cargando Megsy", fr: "Chargement de Megsy", de: "Megsy wird geladen", pt: "Carregando Megsy", it: "Caricamento di Megsy", tr: "Megsy yükleniyor", ru: "Загрузка Megsy", zh: "正在加载 Megsy", ja: "Megsy を読み込み中", ko: "Megsy 로딩 중", hi: "Megsy लोड हो रहा है", id: "Memuat Megsy", nl: "Megsy laden", sv: "Läser in Megsy", cs: "Načítání Megsy", ro: "Se încarcă Megsy", el: "Φόρτωση Megsy", uk: "Завантаження Megsy", he: "Megsy נטען", fa: "در حال بارگذاری Megsy", vi: "Đang tải Megsy", th: "กำลังโหลด Megsy", pl: "Ładowanie Megsy",
  },
};

const STORAGE_KEY = "app_lang";
const DETECTED_FLAG_KEY = "app_lang:detected";

// ── Public helpers ─────────────────────────────────────────────────────

export function isSupportedLang(code: string): code is AuthLang {
  return (SUPPORTED as string[]).includes(code);
}

/** Read the stored language, if any. */
export function readStoredLang(): AuthLang | null {
  try {
    const raw = typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY) || localStorage.getItem("language")
      : null;
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (isSupportedLang(lower)) return lower;
    const base = lower.split("-")[0];
    if (isSupportedLang(base)) return base as AuthLang;
  } catch {
    // ignore
  }
  return null;
}

/** Default language is English — auto-detection disabled. */
export function detectLang(): AuthLang {
  return "en";
}


/** Current effective language: stored → detected → 'en'. */
export function getUserLang(): AuthLang {
  // Product decision: the whole app is English-only.
  return "en";
}

function applyHtmlLang(_lang: AuthLang) {
  if (typeof document === "undefined") return;
  // English-only app: always LTR.
  document.documentElement.setAttribute("lang", "en");
  document.documentElement.setAttribute("dir", "ltr");
}


function persistLangLocally(lang: AuthLang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    localStorage.setItem("language", lang);
    localStorage.setItem(DETECTED_FLAG_KEY, "1");
    localStorage.setItem("language-autodetected", "1");
  } catch {
    // ignore
  }
}

const listeners = new Set<(lang: AuthLang) => void>();
function emitChange(lang: AuthLang) {
  for (const cb of listeners) {
    try {
      cb(lang);
    } catch {
      // ignore listener errors
    }
  }
}

/** Persist the user's language choice everywhere (localStorage + profile). */
export async function setUserLang(
  lang: AuthLang,
  opts: { syncRemote?: boolean } = {},
): Promise<void> {
  if (!isSupportedLang(lang)) return;
  persistLangLocally(lang);
  applyHtmlLang(lang);
  emitChange(lang);
  try {
    window.dispatchEvent(new Event("languagechange-custom"));
  } catch {
    // ignore
  }

  if (opts.syncRemote !== false) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase
          .from("user_chat_settings")
          .upsert(
            { user_id: user.id, preferred_language: lang, updated_at: new Date().toISOString() },
            { onConflict: "user_id" },
          );
      }
    } catch {
      // Silent — local preference still applies.
    }
  }
}

/**
 * Run once on app boot: apply the stored language, or detect + persist on
 * first visit so the choice sticks. Also pulls the remote language for
 * signed-in users so a preference set on another device propagates.
 */
export async function initUserLang(): Promise<AuthLang> {
  // If a previous session auto-detected a language, discard it so English is the default.
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("language-autodetected") === "1") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("language");
      localStorage.removeItem(DETECTED_FLAG_KEY);
      localStorage.removeItem("language-autodetected");
    }
  } catch {
    // ignore
  }

  let lang = readStoredLang();

  // No explicit preference — default to English (auto-detection disabled).
  if (!lang) {
    lang = "en";
    persistLangLocally(lang);
  }
  applyHtmlLang(lang);
  emitChange(lang);

  // English-only product: no remote language override.
  return lang;
}

/** React hook: returns current language and re-renders on change. */
export function useUserLang(): AuthLang {
  const [lang, setLang] = useState<AuthLang>(() => getUserLang());
  useEffect(() => {
    const cb = (l: AuthLang) => setLang(l);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return lang;
}

/** Translate one key. */
export function t(key: string, lang?: AuthLang): string {
  const L = lang || getUserLang();
  const entry = (DICT as Record<string, Entry>)[key] || UI_DICT[key];
  if (!entry) return String(key);
  // ar-eg → fall back to ar, then en.
  if (L === "ar-eg") return entry["ar-eg"] || entry.ar || entry.en;
  if (entry[L]) return entry[L]!;
  ensureExactDict(L);
  const exact = EXACT_TEXT_TRANSLATIONS?.[entry.en];
  if (exact?.[L]) return exact[L]!;
  return entry.en;
}

/** Translate + interpolate `{name}` placeholders. */
export function tf(
  key: string,
  vars: Record<string, string | number>,
  lang?: AuthLang,
): string {
  const raw = t(key, lang);
  return raw.replace(/\{(\w+)\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : `{${k}}`,
  );
}

/**
 * Translate a thrown Supabase/network error into the user's language.
 * Falls back to a localized version of the provided fallback key.
 */
export function translateAuthError(
  err: unknown,
  fallbackKey: string = "loginFailed",
): string {
  const raw = sanitizeErrorMessage(err, "");
  const msg = (raw || "").toLowerCase();

  if (/invalid login|invalid credentials|wrong password|incorrect.*password/.test(msg)) {
    return t("wrongPassword");
  }
  if (/user not found|no.*account/.test(msg)) {
    return t("noAccountFound");
  }
  if (/email.*invalid|invalid.*email/.test(msg)) {
    return t("invalidEmail");
  }
  if (/already (registered|exists)|user.*exists/.test(msg)) {
    return t("emailExists");
  }
  if (/password.*(at least|short|min)/.test(msg)) {
    return t("passwordMinLength");
  }
  if (raw) return raw;
  return t(fallbackKey);
}

export const AVAILABLE_LANGS: { code: AuthLang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "ar-eg", label: "Egyptian Arabic", native: "المصري" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "nl", label: "Dutch", native: "Nederlands" },
  { code: "sv", label: "Swedish", native: "Svenska" },
  { code: "cs", label: "Czech", native: "Čeština" },
  { code: "ro", label: "Romanian", native: "Română" },
  { code: "el", label: "Greek", native: "Ελληνικά" },
  { code: "uk", label: "Ukrainian", native: "Українська" },
  { code: "fa", label: "Persian", native: "فارسی" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "pl", label: "Polish", native: "Polski" },
];

// ─── Lazy-fetched exact-text dictionary ────────────────────────────────────
// The full dictionary is ~1 MB. It lives as a static asset
// (public/i18n/exact-text.json) and is fetched the first time a non-English
// user needs it, so it never enters the JS bundle or the build's memory.
// English users never trigger the fetch. Until it resolves, translation
// functions return the original English text — no user-visible regression.
type ExactDict = Record<string, Partial<Record<AuthLang, string>> & { en: string }>;
let EXACT_TEXT_TRANSLATIONS: ExactDict | null = null;
let GREETING_PREFIXES: readonly string[] = [];
let exactDictLoading: Promise<void> | null = null;

function ensureExactDict(lang: AuthLang): void {
  if (EXACT_TEXT_TRANSLATIONS || exactDictLoading) return;
  if (lang === "en") return; // English callers never need the dict
  if (typeof fetch !== "function") return;
  // First use downloads it once; later sessions read it from the local
  // runtime cache (Cache Storage, since it exceeds the localStorage budget).
  exactDictLoading = cachedJson<{ greetingPrefixes?: string[]; translations?: ExactDict }>(
    "/i18n/exact-text.json",
    { key: "i18n:exact-text" },
  )
    .then((data) => {
      EXACT_TEXT_TRANSLATIONS = data.translations ?? {};
      GREETING_PREFIXES = data.greetingPrefixes ?? [];
      // Wake any React subscribers so text re-renders in the target language.
      const current = getUserLang();
      listeners.forEach((l) => l(current));
    })
    .catch(() => {
      // Leave EXACT_TEXT_TRANSLATIONS null; callers fall through to English.
      exactDictLoading = null;
    });
}



export function translateExactText(text: string, lang?: AuthLang): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return text;
  const exact = Object.entries(UI_DICT).find(([, entry]) => entry.en === normalized);
  if (exact) return t(exact[0], lang);
  const L = lang || getUserLang();
  ensureExactDict(L);
  const dict = EXACT_TEXT_TRANSLATIONS;
  if (!dict) return text; // chunk not loaded yet — fall back to input (English)
  const lookup = (key: string): string | null => {
    const e = dict[key];
    if (!e) return null;
    if (L === "ar-eg") return e["ar-eg"] || e.ar || e.en;
    return e[L] || e.en;
  };
  // Try exact, then uppercase, then title case (for CSS text-transform sources).
  let hit = lookup(normalized);
  if (!hit) hit = lookup(normalized.toUpperCase());
  if (!hit) {
    const title = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
    hit = lookup(title);
  }
  if (hit) return hit;
  // Dynamic greeting: "<prefix>, <name>"
  const gm = normalized.match(/^([^,]+),\s+(.+)$/);
  if (gm && GREETING_PREFIXES.includes(gm[1])) {
    const head = dict[gm[1]];
    if (head) {
      const prefix = (L === "ar-eg" ? head["ar-eg"] || head.ar : head[L]) || gm[1];
      const sep = /^(ar|he|fa|ur)/.test(L) ? "، " : ", ";
      return `${prefix}${sep}${gm[2]}`;
    }
  }
  return text;
}
