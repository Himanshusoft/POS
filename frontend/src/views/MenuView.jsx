import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../services/api';
import { Button, Badge, Modal, Input, SkeletonTable, EmptyState } from '../components/ui';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Search,
  RefreshCw,
  FolderPlus,
  Layers,
  X,
  Utensils,
  Camera,
  UtensilsCrossed
} from 'lucide-react';

function DishThumbnail({ image, name }) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = image && !imgError ? getImageUrl(image) : null;

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="w-10 h-10 rounded-xl object-cover border border-[#E5D8C6] dark:border-[#382F26] shadow-2xs shrink-0"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-center text-[#92400E] dark:text-[#D97706] shrink-0">
      <UtensilsCrossed className="w-4 h-4 opacity-70" />
    </div>
  );
}

export default function MenuView() {
  const { restaurant, addToast, role } = useAuth();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedItemForRecipe, setSelectedItemForRecipe] = useState(null);
  const [recipeData, setRecipeData] = useState(null);

  // Form States
  const [editingItem, setEditingItem] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    dietary: '',
    isAvailable: true,
    preparationTime: 15,
    imageFile: null,
    imagePreview: null,
    removeImage: false,
  });

  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Recipe ingredients editor state
  const [recipeIngredients, setRecipeIngredients] = useState([]);

  const currency = restaurant?.currency || '₹';

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, itmRes, invRes] = await Promise.all([
        posService.menu.getCategories(),
        posService.menu.getItems(),
        posService.inventory.getAll(),
      ]);
      if (catRes.success) setCategories(catRes.data || []);
      if (itmRes.success) setItems(itmRes.data || []);
      if (invRes.success) setInventoryItems(invRes.data || []);
    } catch (err) {
      addToast(err.message || 'Failed to load menu data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAvailability = async (item) => {
    try {
      const nextState = !item.isAvailable;
      await posService.menu.toggleAvailability(item.id, nextState);
      addToast(`${item.name} is now ${nextState ? 'Available' : 'Marked 86 (Out of Stock)'}`, 'info');
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: nextState } : i)));
    } catch (err) {
      addToast(err.message || 'Failed to toggle availability', 'error');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await posService.menu.createCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });
      addToast('Category added successfully', 'success');
      setNewCatName('');
      setNewCatDesc('');
      setShowCatModal(false);
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to create category', 'error');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"? Items inside will lose category link.`)) return;
    try {
      await posService.menu.deleteCategory(id);
      addToast('Category deleted', 'success');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to delete category', 'error');
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      addToast('Please upload a JPG, PNG, or WEBP image under 5 MB.', 'warning');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Please upload a JPG, PNG, or WEBP image under 5 MB.', 'warning');
      e.target.value = '';
      return;
    }

    setItemForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      removeImage: false,
    }));
  };

  const handleRemoveImage = () => {
    setItemForm((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: null,
      removeImage: true,
    }));
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim() || !itemForm.price || !itemForm.categoryId) {
      addToast('Please fill in dish name, price and category', 'warning');
      return;
    }
    if (!itemForm.dietary) {
      addToast('Please select a dietary type.', 'warning');
      return;
    }

    setSavingItem(true);
    try {
      let finalImageUrl = editingItem?.imageUrl || null;

      if (itemForm.imageFile) {
        const uploadRes = await posService.menu.uploadImage(itemForm.imageFile);
        if (uploadRes?.success && uploadRes?.data?.imageUrl) {
          finalImageUrl = uploadRes.data.imageUrl;
        }
      } else if (itemForm.removeImage) {
        finalImageUrl = null;
      }

      const payload = {
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || undefined,
        price: Number(itemForm.price),
        categoryId: itemForm.categoryId,
        dietary: itemForm.dietary,
        isVeg: itemForm.dietary === 'VEG' || itemForm.dietary === 'JAIN',
        isAvailable: Boolean(itemForm.isAvailable),
        preparationTime: Number(itemForm.preparationTime) || 15,
        imageUrl: finalImageUrl,
        removeImage: itemForm.removeImage || undefined,
      };

      if (editingItem) {
        await posService.menu.updateItem(editingItem.id, payload);
        addToast(`${payload.name} updated successfully`, 'success');
      } else {
        await posService.menu.createItem(payload);
        addToast(`${payload.name} added to menu`, 'success');
      }
      setShowItemModal(false);
      setEditingItem(null);
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to save menu item', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`Delete "${name}" from menu?`)) return;
    try {
      await posService.menu.deleteItem(id);
      addToast(`${name} removed`, 'success');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to delete dish', 'error');
    }
  };

  const openRecipeModal = async (item) => {
    setSelectedItemForRecipe(item);
    setShowRecipeModal(true);
    setRecipeData(null);
    try {
      const res = await posService.recipes.getByMenuItem(item.id);
      if (res.success && res.data) {
        setRecipeData(res.data);
        setRecipeIngredients(
          res.data.ingredients?.map((ing) => ({
            inventoryItemId: ing.inventoryItemId,
            quantityRequired: ing.quantityRequired,
            unit: ing.unit,
          })) || []
        );
      } else {
        setRecipeIngredients([]);
      }
    } catch (err) {
      setRecipeIngredients([]);
    }
  };

  const handleAddRecipeRow = () => {
    if (inventoryItems.length === 0) {
      addToast('No inventory ingredients found. Add inventory items first.', 'warning');
      return;
    }
    setRecipeIngredients([
      ...recipeIngredients,
      {
        inventoryItemId: inventoryItems[0].id,
        quantityRequired: 1,
        unit: inventoryItems[0].unit || 'KG',
      },
    ]);
  };

  const handleSaveRecipe = async () => {
    if (!selectedItemForRecipe) return;
    try {
      const payload = {
        menuItemId: selectedItemForRecipe.id,
        ingredients: recipeIngredients.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantityRequired: Number(r.quantityRequired),
          unit: r.unit,
        })),
      };

      if (recipeData?.id) {
        await posService.recipes.update(recipeData.id, payload);
      } else {
        await posService.recipes.create(payload);
      }
      addToast('Recipe Bill of Materials saved!', 'success');
      setShowRecipeModal(false);
    } catch (err) {
      addToast(err.message || 'Failed to save recipe', 'error');
    }
  };

  const filteredItems = items.filter((itm) => {
    const matchCat = selectedCatId === 'ALL' || itm.categoryId === selectedCatId;
    const matchSearch = itm.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] dark:bg-[#141210] min-h-screen text-[#1F2937] dark:text-[#F7F3EC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] p-5 sm:p-6 rounded-2xl shadow-sandstone">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/30 flex items-center justify-center text-[#92400E] dark:text-[#D97706] shrink-0 shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] dark:text-[#F7F3EC] tracking-tight">
                Menu & Recipe Engineering
              </h1>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#92400E]/10 dark:bg-[#92400E]/20 text-[#92400E] dark:text-[#D97706] border border-[#92400E]/20 dark:border-[#92400E]/30 shadow-2xs">
                Catalog Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium">
              Configure dishes, categories, live availability switches, and automated inventory depletion recipes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={loadData}
            disabled={loading}
            icon={RefreshCw}
            loading={loading}
            title="Refresh Menu Items"
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowCatModal(true)}
            icon={FolderPlus}
          >
            Add Category
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingItem(null);
              setItemForm({
                name: '',
                description: '',
                price: '',
                categoryId: categories[0]?.id || '',
                dietary: '',
                isAvailable: true,
                preparationTime: 15,
                imageFile: null,
                imagePreview: null,
                removeImage: false,
              });
              setShowItemModal(true);
            }}
            icon={Plus}
          >
            Add Menu Item
          </Button>
        </div>
      </div>

      {/* Categories & Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-[#1C1815] p-3.5 sm:p-4 rounded-2xl border border-[#E5D8C6] dark:border-[#382F26] shadow-sandstone">
        <div className="flex gap-2 overflow-x-auto max-w-3xl pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCatId('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] ${
              selectedCatId === 'ALL'
                ? 'bg-[#92400E] text-white shadow-sm'
                : 'bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#2E2822] border border-[#E5D8C6] dark:border-[#382F26]'
            }`}
          >
            All Categories ({items.length})
          </button>
          {categories.map((c) => (
            <div key={c.id} className="flex items-center group">
              <button
                type="button"
                onClick={() => setSelectedCatId(c.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] ${
                  selectedCatId === c.id
                    ? 'bg-[#92400E] text-white shadow-sm'
                    : 'bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#2E2822] border border-[#E5D8C6] dark:border-[#382F26]'
                }`}
              >
                {c.name}
              </button>
              {role === 'RESTAURANT_OWNER' && (
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c.id, c.name)}
                  className="opacity-0 group-hover:opacity-100 text-[#5B6470] dark:text-[#A89B8C] hover:text-[#EF4444] p-1.5 transition-opacity ml-0.5 cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  title="Delete category"
                  aria-label={`Delete ${c.name} category`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-[#5B6470] dark:text-[#A89B8C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#5B6470] dark:placeholder-[#A89B8C] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] transition-all"
          />
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl overflow-hidden shadow-sandstone">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26] sticky top-0 z-10 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Dish</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Dietary</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Prep Time</th>
                  <th className="px-5 py-3.5">86 Availability</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <SkeletonTable rows={5} cols={7} />
            </table>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No dishes found"
            description={searchQuery ? 'No dishes match your search query.' : 'Get started by creating your first menu dish.'}
            actionLabel="Add Menu Item"
            onAction={() => {
              setEditingItem(null);
              setItemForm({
                name: '',
                description: '',
                price: '',
                categoryId: categories[0]?.id || '',
                dietary: '',
                isAvailable: true,
                preparationTime: 15,
                imageFile: null,
                imagePreview: null,
                removeImage: false,
              });
              setShowItemModal(true);
            }}
            actionIcon={Plus}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26] sticky top-0 z-10 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Dish</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Dietary</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Prep Time</th>
                  <th className="px-5 py-3.5">86 Availability</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5D8C6]/60 dark:divide-[#382F26]">
                {filteredItems.map((itm) => {
                  const cat = categories.find((c) => c.id === itm.categoryId);
                  const dietaryType = itm.dietary || (itm.isVeg !== undefined ? (itm.isVeg ? 'VEG' : 'NON-VEG') : '');
                  return (
                    <tr key={itm.id} className="hover:bg-[#F1E8DB]/40 dark:hover:bg-[#25201C]/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <DishThumbnail image={itm.imageUrl} name={itm.name} />
                          <div className="min-w-0">
                            <div className="font-bold text-[#1F2937] dark:text-[#F7F3EC] text-sm truncate">{itm.name}</div>
                            {itm.description && (
                              <div className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] line-clamp-1 max-w-xs mt-0.5">
                                {itm.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#1F2937] dark:text-[#F7F3EC]">
                        {cat?.name || 'Unassigned'}
                      </td>
                      <td className="px-5 py-4">
                        {dietaryType ? (
                          <Badge variant={dietaryType} status={dietaryType} size="sm" dot={false} />
                        ) : (
                          <span className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono tabular-nums font-bold text-[#1F2937] dark:text-[#F7F3EC] text-sm">
                        {currency}{Number(itm.price).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-[#5B6470] dark:text-[#A89B8C] font-mono tabular-nums">
                        {itm.preparationTime || 15} mins
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(itm)}
                          aria-label={`Toggle availability for ${itm.name}`}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] ${
                            itm.isAvailable
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-[#16A34A] dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'
                              : 'bg-rose-50 dark:bg-rose-950/30 text-[#EF4444] dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/50'
                          }`}
                        >
                          {itm.isAvailable ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                              <span>In Stock</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-[#EF4444] dark:text-rose-400" />
                              <span>86 Out</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openRecipeModal(itm)}
                          className="inline-flex items-center gap-1 bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2E2822] text-[#D97706] px-2.5 py-1.5 rounded-xl border border-[#E5D8C6] dark:border-[#382F26] text-xs font-bold transition-all shadow-2xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
                          title="Manage Recipe BOM"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Recipe</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(itm);
                            setItemForm({
                              name: itm.name,
                              description: itm.description || '',
                              price: itm.price,
                              categoryId: itm.categoryId,
                              dietary: itm.dietary || (itm.isVeg !== undefined ? (itm.isVeg ? 'VEG' : 'NON-VEG') : ''),
                              isAvailable: itm.isAvailable,
                              preparationTime: itm.preparationTime || 15,
                              imageFile: null,
                              imagePreview: itm.imageUrl ? getImageUrl(itm.imageUrl) : null,
                              removeImage: false,
                            });
                            setShowItemModal(true);
                          }}
                          aria-label={`Edit ${itm.name}`}
                          className="p-2 rounded-xl text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
                          title="Edit Dish"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(itm.id, itm.name)}
                          aria-label={`Delete ${itm.name}`}
                          className="p-2 rounded-xl text-[#5B6470] dark:text-[#A89B8C] hover:text-[#EF4444] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT ITEM MODAL */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? 'Edit Dish' : 'Add New Menu Item'}
        subtitle="Configure dish information, pricing, image, and category"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          {/* FOOD IMAGE UPLOAD SECTION */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#1F2937]">Food Image</label>
            {itemForm.imagePreview ? (
              <div className="relative rounded-2xl border border-[#E5D8C6] bg-[#FAF7F2] p-3 flex items-center gap-4">
                <img
                  src={itemForm.imagePreview}
                  alt="Dish preview"
                  className="w-20 h-20 rounded-xl object-cover border border-[#E5D8C6] shadow-2xs shrink-0"
                />
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#1F2937] truncate">
                    {itemForm.imageFile ? itemForm.imageFile.name : 'Current Food Image'}
                  </div>
                  <div className="text-[11px] text-[#5B6470]">
                    JPG, PNG or WEBP • Max 5 MB
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-[#92400E] border border-[#E5D8C6] hover:bg-[#F1E8DB] transition-colors shadow-2xs">
                      <span>Replace</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#EF4444] hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-[#E5D8C6] hover:border-[#92400E] bg-[#FAF7F2] hover:bg-[#F1E8DB]/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E5D8C6] flex items-center justify-center text-[#92400E] mb-2 shadow-2xs group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#1F2937]">Upload Food Image</span>
                <span className="text-[11px] text-[#5B6470] mt-0.5">
                  JPG, PNG or WEBP • Max 5 MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <Input
            label="Dish Name"
            required
            placeholder="e.g. Truffle Mushroom Risotto"
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#1F2937]">Description</label>
            <textarea
              rows="2"
              placeholder="Fresh arborio rice with wild forest mushrooms and aged parmesan"
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={`Price (${currency})`}
              type="number"
              step="0.01"
              required
              value={itemForm.price}
              onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#1F2937]">Category *</label>
              <select
                required
                value={itemForm.categoryId}
                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] font-semibold"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Prep Time (mins)"
              type="number"
              min="1"
              value={itemForm.preparationTime}
              onChange={(e) => setItemForm({ ...itemForm, preparationTime: e.target.value })}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#1F2937]">Dietary Type *</label>
              <select
                required
                value={itemForm.dietary}
                onChange={(e) => setItemForm({ ...itemForm, dietary: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] font-semibold"
              >
                <option value="">Select Dietary Type</option>
                <option value="VEG">VEG</option>
                <option value="NON-VEG">NON-VEG</option>
                <option value="JAIN">JAIN</option>
                <option value="EGG">EGG</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5D8C6]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowItemModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingItem}
              disabled={savingItem}
            >
              {editingItem ? 'Update Dish' : 'Save Dish'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREATE CATEGORY MODAL */}
      <Modal
        isOpen={showCatModal}
        onClose={() => setShowCatModal(false)}
        title="Add Menu Category"
        subtitle="Group items into logical sections (e.g. Starters, Main, Cocktails)"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <Input
            label="Category Name"
            required
            placeholder="e.g. Woodfired Pizzas"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Hand-stretched artisanal sourdough pizzas"
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E5D8C6]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCatModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Create Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* RECIPE BOM DRAWER / MODAL */}
      <Modal
        isOpen={showRecipeModal && Boolean(selectedItemForRecipe)}
        onClose={() => setShowRecipeModal(false)}
        title="Recipe Bill of Materials (BOM)"
        subtitle={`Linked to ${selectedItemForRecipe?.name}`}
        maxWidth="max-w-xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowRecipeModal(false)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveRecipe}
            >
              Save Recipe
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-[#5B6470] leading-relaxed bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E5D8C6]">
            Whenever the kitchen completes an order containing this dish, these inventory raw materials will be automatically decremented from warehouse stocks.
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1F2937]">Ingredients Breakdown</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddRecipeRow}
              icon={Plus}
            >
              Add Ingredient
            </Button>
          </div>

          {recipeIngredients.length === 0 ? (
            <div className="text-center py-10 text-[#5B6470] text-xs font-medium">
              No recipe ingredients configured yet. Click "Add Ingredient" to link raw materials.
            </div>
          ) : (
            <div className="space-y-3">
              {recipeIngredients.map((ing, idx) => (
                <div
                  key={idx}
                  className="bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl p-3 flex items-center gap-3"
                >
                  <select
                    value={ing.inventoryItemId}
                    onChange={(e) => {
                      const item = inventoryItems.find((inv) => inv.id === e.target.value);
                      setRecipeIngredients((prev) =>
                        prev.map((r, i) =>
                          i === idx
                            ? { ...r, inventoryItemId: e.target.value, unit: item?.unit || r.unit }
                            : r
                        )
                      );
                    }}
                    className="flex-1 bg-white border border-[#E5D8C6] rounded-lg px-2.5 py-2 text-xs text-[#1F2937]"
                  >
                    {inventoryItems.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} (Stock: {inv.currentStock} {inv.unit})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    placeholder="Qty"
                    value={ing.quantityRequired}
                    onChange={(e) =>
                      setRecipeIngredients((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, quantityRequired: e.target.value } : r))
                      )
                    }
                    className="w-24 bg-white border border-[#E5D8C6] rounded-lg px-2.5 py-2 text-xs text-[#1F2937] font-mono tabular-nums"
                  />

                  <span className="text-xs text-[#5B6470] font-mono tabular-nums w-12">{ing.unit || 'unit'}</span>

                  <button
                    type="button"
                    onClick={() =>
                      setRecipeIngredients((prev) => prev.filter((_, i) => i !== idx))
                    }
                    aria-label="Remove ingredient"
                    className="p-1.5 text-[#5B6470] hover:text-[#EF4444] rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
