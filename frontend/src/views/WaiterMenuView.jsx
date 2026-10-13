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

/**
 * MenuItemImage helper:
 * Displays real image URL if provided in API/database.
 * If missing or fails to load, gracefully displays a neutral Sandstone dish placeholder.
 */
function MenuItemImage({ image, name, categoryName }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [image]);

  const resolvedUrl = image && !imgError ? getImageUrl(image) : null;

  if (resolvedUrl) {
    return (
      <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 border border-[#E5D8C6] bg-[#FAF7F2] group">
        <img
          src={resolvedUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-32 rounded-xl mb-3 border border-[#E5D8C6] bg-gradient-to-br from-[#F7F3EC] to-[#FAF7F2] flex flex-col items-center justify-center text-[#5B6470] overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#92400E_1px,transparent_1px)] [background-size:10px_10px]" />
      <div className="w-10 h-10 rounded-xl bg-white border border-[#E5D8C6] shadow-xs flex items-center justify-center text-[#92400E]">
        <UtensilsCrossed className="w-5 h-5" />
      </div>
      <span className="text-[10px] font-semibold text-[#5B6470] mt-2 flex items-center gap-1">
        {categoryName || 'Menu Item'}
      </span>
    </div>
  );
}

export default function WaiterMenuView() {
  const { restaurant, addToast } = useAuth();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadMenu = async () => {
    try {
      const [catsRes, itemsRes] = await Promise.all([
        posService.menu.getCategories(),
        posService.menu.getItems(),
      ]);
      if (catsRes.success && catsRes.data) setCategories(catsRes.data);
      if (itemsRes.success && itemsRes.data) setMenuItems(itemsRes.data);
    } catch (err) {
      addToast(err.message || 'Failed to load restaurant menu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const currency = restaurant?.currency || '₹';

  const filteredItems = menuItems.filter((item) => {
    const matchCat = selectedCategory === 'ALL' || item.categoryId === selectedCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] text-[#1F2937]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5D8C6] shadow-sandstone">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl text-[#92400E] shrink-0">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1F2937] flex items-center gap-2">
                Restaurant Menu Catalog
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FAF7F2] text-[#5B6470] border border-[#E5D8C6] font-medium">
                  Read Only
                </span>
              </h1>
              <p className="text-xs text-[#5B6470] mt-0.5">
                Browse official dish prices, categories, and kitchen availability
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#5B6470] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F2937] placeholder-[#5B6470] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] w-64 min-h-[38px] transition-all"
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
              ? 'bg-[#92400E] text-white shadow-sandstone font-bold'
              : 'bg-white text-[#5B6470] hover:text-[#1F2937] hover:bg-[#F1E8DB] border border-[#E5D8C6] shadow-sandstone'
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
                  ? 'bg-[#92400E] text-white shadow-sandstone font-bold'
                  : 'bg-white text-[#5B6470] hover:text-[#1F2937] hover:bg-[#F1E8DB] border border-[#E5D8C6] shadow-sandstone'
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
            <div key={i} className="bg-white border border-[#E5D8C6] rounded-2xl p-5 space-y-3 shadow-sandstone">
              <Skeleton className="h-36 w-full rounded-xl" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
              <div className="pt-3 border-t border-[#E5D8C6] flex justify-between">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-4 w-14 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E5D8C6] text-[#9CA3AF] text-sm shadow-sandstone">
          <UtensilsCrossed className="w-10 h-10 mx-auto text-[#9CA3AF] mb-2 stroke-1" />
          <div className="font-bold text-[#1F2937]">No menu items found.</div>
          <p className="text-xs text-[#5B6470] mt-1">Try selecting another category or clearing search query.</p>
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
                className={`bg-white border rounded-2xl p-5 shadow-sandstone transition flex flex-col justify-between group ${
                  !isOrderable
                    ? 'opacity-80 border-[#E5D8C6] hover:border-amber-400/60'
                    : 'border-[#E5D8C6] hover:border-[#92400E] hover:shadow-sandstone-md hover:-translate-y-0.5'
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
                    <span className="text-[11px] font-semibold text-[#92400E] px-2.5 py-0.5 bg-[#FAF7F2] border border-[#E5D8C6] rounded-lg">
                      {categoryName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                        !item.isAvailable
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : isOrderable
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
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
                          {availability.reasonCode === 'NO_RECIPE' ? 'No Recipe' : 'Insufficient Stock'}
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="font-bold text-[#1F2937] text-sm group-hover:text-[#92400E] transition line-clamp-1">
                    {item.name}
                  </h3>

                  {/* Prominent explanation when item is not orderable */}
                  {!isOrderable && (
                    <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-1.5 mt-2 text-[11px] text-amber-900 leading-snug flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 font-medium">
                        {availability.reasonMessage}
                      </span>
                    </div>
                  )}

                  {item.description && (
                    <p className="text-xs text-[#5B6470] mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E5D8C6] mt-4 flex items-center justify-between">
                  <span className="text-base font-extrabold text-[#92400E] font-mono tabular-nums">
                    {currency}
                    {Number(item.price).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-[#5B6470] font-medium">Official Price</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
