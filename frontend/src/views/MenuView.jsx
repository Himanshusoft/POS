import React, { useState } from 'react';
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
  Camera,
  UtensilsCrossed
} from 'lucide-react';

import { useMenuCategories, useMenuItems, useInventory, usePosMutations } from '../hooks/usePosQueries';
import { ROLES } from '../config/navigation';

function DishThumbnail({ image, name }) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = image && !imgError ? getImageUrl(image) : null;

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="w-10 h-10 rounded-xl object-cover border border-[#E4DCD0] dark:border-[#1E362E] shadow-2xs shrink-0"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-[#F7EFE4] dark:bg-[#1E362E] border border-[#E4DCD0] dark:border-[#254238] flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] shrink-0">
      <UtensilsCrossed className="w-4 h-4 opacity-70" />
    </div>
  );
}

export default function MenuView() {
  const { restaurant, addToast, role, user } = useAuth();
  const isRestaurantAdmin =
    role === ROLES.RESTAURANT_OWNER ||
    user?.role === 'RESTAURANT_OWNER' ||
    user?.role === 'RESTAURANT_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'OWNER';
  const { invalidateMenu } = usePosMutations(restaurant?.id);

  const {
    data: categories = [],
    isLoading: loadingCategories,
    refetch: refetchCategories,
  } = useMenuCategories(restaurant?.id);

  const {
    data: items = [],
    isLoading: loadingItems,
    refetch: refetchItems,
  } = useMenuItems(restaurant?.id);

  const {
    data: inventoryItems = [],
    isLoading: loadingInventory,
    refetch: refetchInventory,
  } = useInventory(restaurant?.id);

  const [selectedCatId, setSelectedCatId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loading = (loadingCategories && categories.length === 0) ||
    (loadingItems && items.length === 0) ||
    (loadingInventory && inventoryItems.length === 0);

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
    invalidateMenu();
    await Promise.all([refetchCategories(), refetchItems(), refetchInventory()]);
  };

  const handleToggleAvailability = async (item) => {
    try {
      const nextState = !item.isAvailable;
      await posService.menu.toggleAvailability(item.id, nextState);
      addToast(`${item.name} is now ${nextState ? 'In Stock' : 'Out of Stock'}`, 'info');
      refetchItems();
      invalidateMenu();
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
        preparationTime: itemForm.preparationTime !== '' && itemForm.preparationTime !== null && !isNaN(Number(itemForm.preparationTime)) ? Number(itemForm.preparationTime) : 15,
        prepTime: itemForm.preparationTime !== '' && itemForm.preparationTime !== null && !isNaN(Number(itemForm.preparationTime)) ? Number(itemForm.preparationTime) : 15,
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
            inventoryItem: ing.inventoryItem,
          })) || []
        );
      } else {
        setRecipeIngredients([]);
      }
    } catch {
      setRecipeIngredients([]);
    }
  };

  const handleAddRecipeRow = () => {
    if (isRestaurantAdmin) return;
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
    if (isRestaurantAdmin) {
      addToast('Restaurant Admin has view-only access to recipes.', 'warning');
      return;
    }
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#173F36]/30 border border-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] shrink-0 shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] tracking-tight">
                Menu & Recipe Engineering
              </h1>
              <span className="text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-[#173F36]/10 dark:bg-[#173F36]/30 text-[#173F36] dark:text-[#9FB29E] border border-[#173F36]/20 tracking-wider shrink-0">
                Catalog Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-sans truncate sm:line-clamp-1">
              Configure dishes, categories, live availability switches, and automated inventory depletion recipes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap self-end sm:self-auto">
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] p-3.5 sm:p-4 rounded-2xl border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial">
        <div className="flex gap-2 overflow-x-auto max-w-3xl pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCatId('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${selectedCatId === 'ALL'
                ? 'bg-[#173F36] text-white shadow-editorial font-bold'
                : 'bg-[#F7EFE4] dark:bg-[#1E362E] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E4DCD0] dark:hover:bg-[#254238] border border-[#E4DCD0] dark:border-[#254238]'
              }`}
          >
            All Categories ({items.length})
          </button>
          {categories.map((c) => (
            <div key={c.id} className="flex items-center group">
              <button
                type="button"
                onClick={() => setSelectedCatId(c.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${selectedCatId === c.id
                    ? 'bg-[#173F36] text-white shadow-editorial font-bold'
                    : 'bg-[#F7EFE4] dark:bg-[#1E362E] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E4DCD0] dark:hover:bg-[#254238] border border-[#E4DCD0] dark:border-[#254238]'
                  }`}
              >
                {c.name}
              </button>
              {role === 'RESTAURANT_OWNER' && (
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c.id, c.name)}
                  className="opacity-0 group-hover:opacity-100 text-[#657168] dark:text-[#9FB29E] hover:text-rose-600 p-1.5 transition-opacity ml-0.5 cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
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
          <Search className="w-4 h-4 text-[#657168] dark:text-[#9FB29E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
          />
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-semibold border-b border-[#E4DCD0] dark:border-[#1E362E] sticky top-0 z-10 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Dish</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Dietary</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Prep Time</th>
                  <th className="px-5 py-3.5">Availability</th>
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
              <thead className="bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-semibold border-b border-[#E4DCD0] dark:border-[#1E362E] sticky top-0 z-10 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Dish</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Dietary</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Prep Time</th>
                  <th className="px-5 py-3.5">Availability</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DCD0]/60 dark:divide-[#1E362E]">
                {filteredItems.map((itm) => {
                  const cat = categories.find((c) => c.id === itm.categoryId);
                  const dietaryType = itm.dietary || (itm.isVeg !== undefined ? (itm.isVeg ? 'VEG' : 'NON-VEG') : '');
                  return (
                    <tr key={itm.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/40 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <DishThumbnail image={itm.imageUrl} name={itm.name} />
                          <div className="min-w-0">
                            <div className="font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] text-sm truncate group-hover:text-[#173F36] dark:group-hover:text-[#9FB29E] transition-colors">{itm.name}</div>
                            {itm.description && (
                              <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] line-clamp-1 max-w-xs mt-0.5">
                                {itm.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#17251F] dark:text-[#F7EFE4]">
                        {cat?.name || 'Unassigned'}
                      </td>
                      <td className="px-5 py-4">
                        {dietaryType ? (
                          <Badge variant={dietaryType} status={dietaryType} size="sm" dot={false} />
                        ) : (
                          <span className="text-[11px] text-[#657168] dark:text-[#9FB29E] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono tabular-nums font-bold text-[#17251F] dark:text-[#F7EFE4] text-sm">
                        {currency}{Number(itm.price).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums">
                        {itm.preparationTime ?? itm.recipe?.prepTime ?? 15} mins
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(itm)}
                          aria-label={`Toggle availability for ${itm.name}`}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${itm.isAvailable
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/40 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                            }`}
                        >
                          {itm.isAvailable ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>In Stock</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              <span>Out of Stock</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openRecipeModal(itm)}
                          className="inline-flex items-center gap-1.5 bg-[#F7EFE4] dark:bg-[#1E362E] hover:bg-[#E4DCD0] dark:hover:bg-[#254238] text-[#173F36] dark:text-[#9FB29E] px-2.5 py-1.5 rounded-xl border border-[#E4DCD0] dark:border-[#254238] text-xs font-semibold transition-all shadow-editorial cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36]"
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
                              preparationTime: itm.preparationTime ?? itm.recipe?.prepTime ?? 15,
                              imageFile: null,
                              imagePreview: itm.imageUrl ? getImageUrl(itm.imageUrl) : null,
                              removeImage: false,
                            });
                            setShowItemModal(true);
                          }}
                          aria-label={`Edit ${itm.name}`}
                          className="p-2 rounded-xl text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36]"
                          title="Edit Dish"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(itm.id, itm.name)}
                          aria-label={`Delete ${itm.name}`}
                          className="p-2 rounded-xl text-[#657168] dark:text-[#9FB29E] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
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
            <label className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Food Image</label>
            {itemForm.imagePreview ? (
              <div className="relative rounded-2xl border border-[#E4DCD0] dark:border-[#1E362E] bg-[#F7EFE4] dark:bg-[#101A18] p-3 flex items-center gap-4">
                <img
                  src={itemForm.imagePreview}
                  alt="Dish preview"
                  className="w-20 h-20 rounded-xl object-cover border border-[#E4DCD0] dark:border-[#1E362E] shadow-2xs shrink-0"
                />
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] truncate">
                    {itemForm.imageFile ? itemForm.imageFile.name : 'Current Food Image'}
                  </div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">
                    JPG, PNG or WEBP • Max 5 MB
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FFFDF9] dark:bg-[#152320] text-[#173F36] dark:text-[#9FB29E] border border-[#E4DCD0] dark:border-[#1E362E] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] transition-colors shadow-editorial">
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-[#E4DCD0] dark:border-[#1E362E] hover:border-[#173F36] dark:hover:border-[#9FB29E] bg-[#F7EFE4]/60 dark:bg-[#101A18]/60 hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E]/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] mb-2 shadow-2xs group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Upload Food Image</span>
                <span className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-0.5">
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
            <label className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Description</label>
            <textarea
              rows="2"
              placeholder="Fresh arborio rice with wild forest mushrooms and aged parmesan"
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] focus:bg-[#FFFDF9] dark:focus:bg-[#152320] transition-all"
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
              <label className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Category *</label>
              <select
                required
                value={itemForm.categoryId}
                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] font-semibold"
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
              <label className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Dietary Type *</label>
              <select
                required
                value={itemForm.dietary}
                onChange={(e) => setItemForm({ ...itemForm, dietary: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] font-semibold"
              >
                <option value="">Select Dietary Type</option>
                <option value="VEG">VEG</option>
                <option value="NON-VEG">NON-VEG</option>
                <option value="JAIN">JAIN</option>
                <option value="EGG">EGG</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E]">
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

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E]">
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
            {!isRestaurantAdmin && (
              <Button
                variant="primary"
                onClick={handleSaveRecipe}
              >
                Save Recipe
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-[#657168] dark:text-[#9FB29E] leading-relaxed bg-[#F7EFE4] dark:bg-[#101A18] p-3.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E]">
            Whenever the kitchen completes an order containing this dish, these inventory raw materials will be automatically decremented from warehouse stocks.
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Ingredients Breakdown</span>
              {isRestaurantAdmin && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#E8EFEA] dark:bg-[#1E362E] text-[#173F36] dark:text-[#9FB29E] border border-[#D5E2D9] dark:border-[#254238]">
                  View Only
                </span>
              )}
            </div>
            {!isRestaurantAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddRecipeRow}
                icon={Plus}
              >
                Add Ingredient
              </Button>
            )}
          </div>

          {recipeIngredients.length === 0 ? (
            <div className="text-center py-10 text-[#657168] dark:text-[#9FB29E] text-xs font-medium">
              {isRestaurantAdmin
                ? 'No recipe ingredients configured for this dish.'
                : 'No recipe ingredients configured yet. Click "Add Ingredient" to link raw materials.'}
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {recipeIngredients.map((ing, idx) => {
                const inv = inventoryItems.find((item) => item.id === ing.inventoryItemId) || ing.inventoryItem;
                const stockText = inv ? `${inv.currentStock ?? 0} ${inv.unit || ing.unit || 'unit'}` : null;

                return (
                  <div
                    key={idx}
                    className="bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl p-3 flex items-center gap-3"
                  >
                    {isRestaurantAdmin ? (
                      <>
                        <div className="flex-1 min-w-0 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-lg px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] flex items-center justify-between shadow-2xs">
                          <span className="font-medium truncate">{inv?.name || 'Unknown Ingredient'}</span>
                          {stockText && (
                            <span className="text-[11px] text-[#657168] dark:text-[#9FB29E] font-medium ml-2 shrink-0">
                              (Stock: {stockText})
                            </span>
                          )}
                        </div>

                        <div className="w-24 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-lg px-2.5 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums text-center font-semibold shadow-2xs shrink-0">
                          {ing.quantityRequired}
                        </div>

                        <span className="text-xs text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums w-12 font-medium shrink-0">
                          {ing.unit || inv?.unit || 'unit'}
                        </span>
                      </>
                    ) : (
                      <>
                        <select
                          value={ing.inventoryItemId}
                          onChange={(e) => {
                            const item = inventoryItems.find((invItem) => invItem.id === e.target.value);
                            setRecipeIngredients((prev) =>
                              prev.map((r, i) =>
                                i === idx
                                  ? { ...r, inventoryItemId: e.target.value, unit: item?.unit || r.unit }
                                  : r
                              )
                            );
                          }}
                          className="flex-1 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-lg px-2.5 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4]"
                        >
                          {inventoryItems.map((invItem) => (
                            <option key={invItem.id} value={invItem.id}>
                              {invItem.name} (Stock: {invItem.currentStock} {invItem.unit})
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
                          className="w-24 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-lg px-2.5 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums"
                        />

                        <span className="text-xs text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums w-12">{ing.unit || 'unit'}</span>

                        <button
                          type="button"
                          onClick={() =>
                            setRecipeIngredients((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Remove ingredient"
                          className="p-1.5 text-[#657168] dark:text-[#9FB29E] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
