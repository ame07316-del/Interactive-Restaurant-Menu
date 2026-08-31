"use client";
import React, { useState } from "react";
import { ShoppingBag, Plus, Minus, Trash2, CheckCircle2, PhoneCall, Utensils } from "lucide-react";
import confetti from "canvas-confetti";

// داتا الأصناف الوهمية (شكلها احترافي جداً)
const MENU_ITEMS = [
  {
    id: 1,
    name: "برجر السعادة دبل تشيز",
    category: "برجر",
    price: 180,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80",
    description: "قطعتين لحم بلدي 200 جرام مع صوص الشيدر السايح والبصل المكرمل"
  },
  {
    id: 2,
    name: "بيتزا رانش باربيكيو",
    category: "بيتزا",
    price: 220,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80",
    description: "عجينة إيطالية خفيفة مع قطع الدجاج وصوص الرانش الغني"
  },
  {
    id: 3,
    name: "سماش برجر كلاسيك",
    category: "برجر",
    price: 150,
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&q=80",
    description: "شريحة لحم مقرمشة الأطراف مع صوص خاص وخيار مخلل"
  },
  {
    id: 4,
    name: "بطاطس كريسبي بالجبنة",
    category: "مقبلات",
    price: 65,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80",
    description: "أصابع بطاطس ذهبية مغطاة بجبنة شيدر وهالبينو"
  },
  {
    id: 5,
    name: "موهيتو فراولة وبلو بيري",
    category: "مشروبات",
    price: 55,
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80",
    description: "مشروب منعش بالليمون والنعناع والفواكه الطازجة"
  }
];

const CATEGORIES = ["الكل", "برجر", "بيتزا", "مقبلات", "مشروبات"];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [cart, setCart] = useState<{ item: typeof MENU_ITEMS[0]; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const filteredItems = selectedCategory === "الكل" 
    ? MENU_ITEMS 
    : MENU_ITEMS.filter(item => item.category === selectedCategory);

  const addToCart = (item: typeof MENU_ITEMS[0]) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === id) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : null;
      }
      return i;
    }).filter(Boolean) as typeof cart);
  };

  const totalAmount = cart.reduce((sum, i) => sum + (i.item.price * i.quantity), 0);

  const sendOrderViaWhatsApp = () => {
    if (!customerName || !customerAddress) {
      alert("برجاء إدخال الاسم والعنوان أولاً");
      return;
    }

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    let message = `*طلب جديد من المطعم:* 🍔\n\n`;
    message += `👤 *العميل:* ${customerName}\n`;
    message += `📍 *العنوان:* ${customerAddress}\n\n`;
    message += `*تفاصيل الطلب:*\n`;
    cart.forEach(i => {
      message += `- ${i.quantity}x ${i.item.name} (${i.item.price * i.quantity} ج.م)\n`;
    });
    message += `\n💰 *الإجمالي الكلي:* ${totalAmount} ج.م`;

    // رقم التيست للمطعم
    const whatsappUrl = `https://wa.me/201000000000?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans pb-24" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-4 py-4 flex justify-between items-center max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500 p-2 rounded-xl text-neutral-950 font-bold">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">مطعم البرجر الملكي</h1>
            <p className="text-xs text-neutral-400">أسرع ديليفري وأعلى جودة</p>
          </div>
        </div>

        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative bg-neutral-800 border border-neutral-700 p-2.5 rounded-full hover:bg-neutral-700 transition"
        >
          <ShoppingBag className="w-6 h-6 text-amber-400" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-neutral-950 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {cart.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          )}
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                selectedCategory === cat 
                  ? "bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20" 
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-neutral-800/50 border border-neutral-800 rounded-2xl p-3 flex gap-4 hover:border-neutral-700 transition">
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-28 h-28 object-cover rounded-xl shrink-0"
              />
              <div className="flex flex-col justify-between flex-grow">
                <div>
                  <h3 className="font-bold text-neutral-100 text-base">{item.name}</h3>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{item.description}</p>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="font-bold text-amber-400 text-lg">{item.price} <span className="text-xs font-normal">ج.م</span></span>
                  <button
                    onClick={() => addToCart(item)}
                    className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-neutral-950 border border-amber-500/30 font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="w-4 h-4" /> إضافة
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-neutral-900 w-full max-w-md h-full flex flex-col p-6 border-r border-neutral-800 animate-in slide-in-from-left duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ShoppingBag className="text-amber-500" /> سلة الطلبات ({cart.length})
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white">إغلاق ✕</button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                <ShoppingBag className="w-16 h-16 mb-2 opacity-30" />
                <p>السلة فارغة حالياً</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {cart.map(({ item, quantity }) => (
                  <div key={item.id} className="flex justify-between items-center bg-neutral-800/40 p-3 rounded-xl border border-neutral-800">
                    <div>
                      <h4 className="font-bold text-sm">{item.name}</h4>
                      <span className="text-xs text-amber-400">{item.price * quantity} ج.م</span>
                    </div>
                    <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 px-2 py-1 rounded-lg">
                      <button onClick={() => updateQuantity(item.id, -1)} className="text-neutral-400 hover:text-red-400"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="text-xs font-bold px-1">{quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="text-neutral-400 hover:text-green-400"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-neutral-800 space-y-3">
                  <input
                    type="text"
                    placeholder="الاسم بالكامل..."
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="العنوان بالتفصيل ورقم الشقة..."
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <div className="pt-4 border-t border-neutral-800">
                <div className="flex justify-between text-base font-bold mb-4">
                  <span>الإجمالي:</span>
                  <span className="text-amber-400">{totalAmount} ج.م</span>
                </div>
                <button
                  onClick={sendOrderViaWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition"
                >
                  <PhoneCall className="w-5 h-5" /> إرسال الطلب عبر واتساب
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}