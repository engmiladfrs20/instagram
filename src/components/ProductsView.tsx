import React, { useState } from 'react';
import { ShoppingBag, Plus, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Product } from '../types';

interface ProductsViewProps {
  products: Product[];
  onAddProduct: (prod: Partial<Product>) => Promise<void>;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ products, onAddProduct }) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priceMinor, setPriceMinor] = useState<number>(750000);
  const [sku, setSku] = useState<string>('SHM-NEW-01');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddProduct({ name, description, priceMinor, sku });
    setShowAddModal(false);
    setName('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2 space-x-reverse">
            <ShoppingBag className="w-5 h-5 text-purple-400" />
            <span>ویترین محصولات و کاروسل متصل به اتوماسیون</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            مدیریت کاتالوگ کالاهایی که در پاسخ‌های دایرکت به‌صورت کاروسل تصویری همراه قیمت به تومان نمایش داده می‌شوند.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn ui-btn ui-btn-primary products-add-btn"
        >
          <span className="ui-btn-content">
            <Plus className="w-4 h-4" />
            <span>افزودن محصول جدید</span>
          </span>
        </button>
      </div>

      {/* Products Grid & DM Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((prod) => (
          <div key={prod.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
            <div>
              <div className="h-48 bg-slate-950 relative overflow-hidden">
                <img
                  src={prod.imageUrl}
                  alt={prod.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-sm text-purple-300 border border-purple-500/30 text-xs font-bold font-mono">
                  {prod.priceMinor.toLocaleString('fa-IR')} تومان
                </span>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{prod.name}</h3>
                  <span className="text-[10px] text-slate-500 font-mono">SKU: {prod.sku}</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{prod.description}</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-medium">موجود در انبار</span>
              <a
                href={prod.productUrl}
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 hover:text-purple-300 font-medium flex items-center space-x-1 space-x-reverse"
              >
                <span>لینک کالا</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-3">افزودن محصول جدید به کاتالوگ</h3>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium block">نام محصول</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium block">قیمت (تومان)</label>
              <input
                type="number"
                required
                value={priceMinor}
                onChange={(e) => setPriceMinor(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono dir-ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium block">توضیحات کوتاه</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn ui-btn ui-btn-secondary"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="btn ui-btn ui-btn-primary"
              >
                ذخیره
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
