/**
 * نماذج بيانات المطعم المشتركة بين الواجهة والباك إند.
 */

export type SiteLanguage = "ar" | "en";
export type ThemeMode = "dark" | "light";
export type OrderType = "delivery" | "takeaway" | "dinein";

export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  emoji?: string;
  visible: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  /** السعر قبل الخصم — لو موجود يظهر مشطوب مع نسبة توفير */
  oldPrice?: number | null;
  /** رابط صورة أو dataURL مرفوعة من الجهاز */
  image?: string;
  available: boolean;
  bestseller: boolean;
  isNew: boolean;
  /** 0 = بدون حارة، 1..3 = عدد الشطات */
  spicy: 0 | 1 | 2 | 3;
  /** ترتيب يدوي داخل القسم (الأصغر يظهر أولاً) */
  order: number;
  /** تفعيل متابعة المخزون لهذا الصنف */
  trackStock?: boolean;
  /** الكمية المتاحة حالياً */
  stock?: number;
  /** إنشاء تنبيه عند الوصول لهذا العدد (الافتراضي 2) */
  lowStockThreshold?: number;
}

export interface BrandSettings {
  restaurantName: string;
  restaurantNameEn: string;
  tagline: string;
  taglineEn: string;
  logo: string;
  accent: string;
  theme: ThemeMode;
  /** انحناء الحواف بالبيكسل */
  radius: number;
  /** مفتاح الخط من FONT_OPTIONS */
  font: string;
  language: SiteLanguage;
  showHero: boolean;
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  announcementEnabled: boolean;
  announcementText: string;
}

export interface ContactSettings {
  whatsapp: string;
  phone: string;
  address: string;
  mapUrl: string;
  instagram: string;
  facebook: string;
  openingHours: string;
  /** فتح/قفل المطعم يدوياً من الأدمين */
  isOpen: boolean;
  closedMessage: string;
  footerNote: string;
}

export interface CommerceSettings {
  currency: string;
  currencyEn: string;
  deliveryFee: number;
  /** صفر = ملغيش (التوصيل المجاني معطّل) */
  freeDeliveryOver: number;
  /** صفر = من غير حد أدنى للطلب */
  minimumOrder: number;
  serviceChargePercent: number;
  orderTypes: OrderType[];
  requireName: boolean;
  requirePhone: boolean;
  requireAddress: boolean;
  enableNotes: boolean;
  enableSearch: boolean;
  enableFeatured: boolean;
  featuredLabel: string;
  enableConfetti: boolean;
  showPrices: boolean;
  /** يقفل السلة خالص (معرض فقط بدون طلب) */
  enableCart: boolean;
  /** قالب رسالة واتساب */
  orderTemplate: string;
}

export interface AdminSettings {
  /** رقم سري احتياطي للتطوير عندما لا تكون Supabase Auth مُعدّة */
  pin: string;
  lockAdmin: boolean;
}

export interface MenuData {
  version: number;
  updatedAt: string;
  brand: BrandSettings;
  contact: ContactSettings;
  commerce: CommerceSettings;
  admin: AdminSettings;
  categories: Category[];
  items: MenuItem[];
}

/** السلة بتخزّن المعرّف والكمية فقط، وكل حاجة تانية بتتاشتق من البيانات الحالية */
export interface CartLine {
  itemId: string;
  quantity: number;
}

export interface Totals {
  subtotal: number;
  delivery: number;
  service: number;
  total: number;
  itemCount: number;
}
