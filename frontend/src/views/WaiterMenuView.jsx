import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../services/api';
import { Skeleton } from '../components/ui/Skeleton';
import {
  UtensilsCrossed,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { getItemAvailability } from '../utils/inventoryValidation';
import { useMenuCategories, useMenuItems } from '../hooks/usePosQueries';

/**
 * MenuItemImage helper:
 * Displays real image URL if provided in API/database.
 * If missing or fails to load, gracefully displays an editorial dish placeholder.
 */
function MenuItemImage({ image, name, categoryName }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [image]);

  const resolvedUrl = image && !imgError ? getImageUrl(image) : null;

  if (resolvedUrl) {
    return (
      <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 border border-[#E4DCD0] dark:border-[#1E362E] bg-[#F7EFE4]/40 dark:bg-[#101A18] group">
        <img
          src={resolvedUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-32 rounded-xl mb-3 border border-[#E4DCD0] dark:border-[#1E362E] bg-gradient-to-br from-[#F7EFE4] to-[#FFFDF9] dark:from-[#152320] dark:to-[#101A18] flex flex-col items-center justify-center text-[#657168] dark:text-[#9FB29E] overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#173F36_1px,transparent_1px)] [background-size:10px_10px]" />
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] shadow-xs flex items-center justify-center text-[#173F36] dark:text-[#9FB29E]">
        <UtensilsCrossed className="w-5 h-5" />
      </div>
      <span className="text-[10px] font-semibold text-[#657168] dark:text-[#9FB29E] mt-2 flex items-center gap-1 font-sans">
        {categoryName || 'Menu Item'}
      </span>
    </div>
  );
}

export default function WaiterMenuView() {
  const { restaurant, addToast } = useAuth();

  const { data: categories = [], isLoading: loadingCategories } = useMenuCategories(restaurant?.id);
  const { data: menuItems = [], isLoading: loadingMenuItems } = useMenuItems(restaurant?.id);

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loading = (loadingCategories && categories.length === 0) || (loadingMenuItems && menuItems.length === 0);
  const currency = restaurant?.currency || '₹';

  const filteredItems = (menuItems || []).filter((item) => {
    if (!item) return false;
    const matchCat = selectedCategory === 'ALL' || item.categoryId === selectedCategory;
    const q = (searchQuery || '').toLowerCase();
    const name = String(item.name || '').toLowerCase();
    const desc = String(item.description || '').toLowerCase();
    const matchSearch = name.includes(q) || desc.includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 text-[#17251F] dark:text-[#F7EFE4]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] p-5 rounded-2xl border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#173F36]/10 dark:bg-[#9FB29E]/10 border border-[#173F36]/20 rounded-xl text-[#173F36] dark:text-[#9FB29E] shrink-0">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
                Restaurant Menu Catalog
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] border border-[#E4DCD0] dark:border-[#1E362E] font-medium font-sans">
                  Read Only
                </span>
              </h1>
              <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5">
                Browse official dish prices, categories, and kitchen availability
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#657168] dark:text-[#9FB29E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-9 pr-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E]/60 focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] w-64 min-h-[38px] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[36px] ${
            selectedCategory === 'ALL'
              ? 'bg-[#173F36] text-[#FFFDF9] shadow-editorial font-bold'
              : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial'
          }`}
        >
          All Items ({menuItems.length})
        </button>
        {categories.map((cat) => {
          const count = menuItems.filter((i) => i.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[36px] ${
                selectedCategory === cat.id
                  ? 'bg-[#173F36] text-[#FFFDF9] shadow-editorial font-bold'
                  : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Menu Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 space-y-3 shadow-editorial">
              <Skeleton className="h-36 w-full rounded-xl" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
              <div className="pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E] flex justify-between">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-4 w-14 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-[#FFFDF9] dark:bg-[#152320] rounded-2xl border border-[#E4DCD0] dark:border-[#1E362E] text-[#657168] dark:text-[#9FB29E] text-sm shadow-editorial">
          <UtensilsCrossed className="w-10 h-10 mx-auto text-[#657168] dark:text-[#9FB29E] mb-2 stroke-1" />
          <div className="font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">No menu items found.</div>
          <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">Try selecting another category or clearing search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const availability = getItemAvailability(item, 1);
            const isOrderable = availability.isOrderable;
            const categoryName = categories.find((c) => c.id === item.categoryId)?.name || 'General';

            return (
              <div
                key={item.id}
                className={`bg-[#FFFDF9] dark:bg-[#152320] border rounded-2xl p-5 shadow-editorial transition flex flex-col justify-between group ${
                  !isOrderable
                    ? 'opacity-85 border-[#E4DCD0] dark:border-[#1E362E] hover:border-amber-400/60'
                    : 'border-[#E4DCD0] dark:border-[#1E362E] hover:border-[#173F36] dark:hover:border-[#9FB29E] hover:shadow-md hover:-translate-y-0.5'
                }`}
                title={!isOrderable ? availability.reasonMessage : undefined}
              >
                <div>
                  {/* Food Image with fallback */}
                  <MenuItemImage
                    image={item.imageUrl || item.image}
                    name={item.name}
                    categoryName={categoryName}
                  />

                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-[#173F36] dark:text-[#9FB29E] px-2.5 py-0.5 bg-[#F7EFE4]/70 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-lg">
                      {categoryName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                        !item.isAvailable
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : isOrderable
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {!item.isAvailable ? (
                        <>
                          <XCircle className="w-3 h-3 text-rose-600" />
                          86 Out
                        </>
                      ) : isOrderable ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Available
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {availability.reasonCode === 'NO_RECIPE' ? 'No Recipe' : 'Low Stock'}
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] text-sm group-hover:text-[#173F36] dark:group-hover:text-[#9FB29E] transition line-clamp-1">
                    {item.name}
                  </h3>

                  {/* Prominent explanation when item is not orderable */}
                  {!isOrderable && (
                    <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-1.5 mt-2 text-[11px] text-amber-900 dark:text-amber-300 leading-snug flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 font-medium">
                        {availability.reasonMessage}
                      </span>
                    </div>
                  )}

                  {item.description && (
                    <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E] mt-4 flex items-center justify-between">
                  <span className="text-base font-extrabold text-[#173F36] dark:text-[#9FB29E] font-mono tabular-nums">
                    {currency}
                    {Number(item.price).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-[#657168] dark:text-[#9FB29E] font-medium font-sans">Official Price</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
