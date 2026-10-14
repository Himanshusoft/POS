import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { Modal, EmptyState, Button, Skeleton } from '../components/ui';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Search,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { INVENTORY_UNITS } from '../constants/inventory.constants';

import { useMenuItems, useRecipes, useInventory, usePosMutations } from '../hooks/usePosQueries';

export default function KitchenRecipesView() {
  const { restaurant, addToast } = useAuth();
  const { data: menuItemsData = [], isLoading: loadingMenu, refetch: refetchMenu } = useMenuItems(restaurant?.id);
  const { data: inventoryData = [], isLoading: loadingInventory, refetch: refetchInventory } = useInventory(restaurant?.id);
  const { data: recipesData = [], isLoading: loadingRecipes, refetch: refetchRecipes } = useRecipes(restaurant?.id);
  const { invalidateMenu, invalidateInventory } = usePosMutations(restaurant?.id);

  const menuItems = Array.isArray(menuItemsData) ? menuItemsData : (menuItemsData.items || []);
  const inventoryItems = Array.isArray(inventoryData) ? inventoryData : (inventoryData.items || []);
  const recipes = Array.isArray(recipesData) ? recipesData : (recipesData.items || []);

  const loading = (loadingMenu && menuItems.length === 0) || (loadingInventory && inventoryItems.length === 0) || (loadingRecipes && recipes.length === 0);
  const [searchQuery, setSearchQuery] = useState('');

  // Recipe Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [recipeForm, setRecipeForm] = useState({
    instructions: '',
    prepTime: 10,
    ingredients: [],
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      await Promise.all([refetchMenu(), refetchInventory(), refetchRecipes()]);
    } catch (err) {
      addToast(err.message || 'Failed to refresh recipe data', 'error');
    }
  };

  const openRecipeEditor = async (menuItem) => {
    setSelectedMenuItem(menuItem);
    setShowModal(true);

    try {
      const res = await posService.recipes.getByMenuItem(menuItem.id);
      if (res.success && res.data) {
        const r = res.data;
        setRecipeForm({
          instructions: r.instructions || '',
          prepTime: r.prepTime || 10,
          ingredients: r.ingredients?.map((ing) => ({
            inventoryItemId: ing.inventoryItemId,
            quantityRequired: Number(ing.quantityRequired),
            unit: ing.unit,
          })) || [],
        });
      } else {
        setRecipeForm({ instructions: '', prepTime: 10, ingredients: [] });
      }
    } catch (e) {
      setRecipeForm({ instructions: '', prepTime: 10, ingredients: [] });
    }
  };

  const handleAddIngredientRow = () => {
    if (inventoryItems.length === 0) {
      addToast('No inventory ingredients available. Please ensure ingredients exist.', 'warning');
      return;
    }
    const defaultItem = inventoryItems[0];
    setRecipeForm({
      ...recipeForm,
      ingredients: [
        ...recipeForm.ingredients,
        {
          inventoryItemId: defaultItem.id,
          quantityRequired: 0.1,
          unit: defaultItem.unit,
        },
      ],
    });
  };

  const handleIngredientChange = (index, field, value) => {
    const updated = [...recipeForm.ingredients];
    if (field === 'inventoryItemId') {
      const matched = inventoryItems.find((inv) => inv.id === value);
      updated[index] = {
        ...updated[index],
        inventoryItemId: value,
        unit: matched ? matched.unit : updated[index].unit,
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setRecipeForm({ ...recipeForm, ingredients: updated });
  };

  const handleRemoveIngredientRow = (index) => {
    const updated = recipeForm.ingredients.filter((_, idx) => idx !== index);
    setRecipeForm({ ...recipeForm, ingredients: updated });
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!selectedMenuItem) return;

    if (recipeForm.ingredients.length === 0) {
      addToast('Please add at least one ingredient to the recipe', 'warning');
      return;
    }

    // Check for duplicates
    const invIds = recipeForm.ingredients.map((i) => i.inventoryItemId);
    if (new Set(invIds).size !== invIds.length) {
      addToast('Duplicate ingredients found. Please combine quantities into one row.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        menuItemId: selectedMenuItem.id,
        instructions: recipeForm.instructions.trim() || undefined,
        prepTime: Number(recipeForm.prepTime) || 10,
        ingredients: recipeForm.ingredients.map((ing) => ({
          inventoryItemId: ing.inventoryItemId,
          quantityRequired: Number(ing.quantityRequired),
          unit: ing.unit,
        })),
      };

      await posService.recipes.create(payload);
      addToast(`Recipe for '${selectedMenuItem.name}' saved successfully!`, 'success');
      setShowModal(false);
      invalidateMenu();
      invalidateInventory();
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to save recipe', 'error');
    } finally {
      setSaving(false);
    }
  };

  const recipeMap = new Map(recipes.map((r) => [r.menuItemId, r]));

  const filteredMenuItems = menuItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category?.name && item.category.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#F7EFE4] dark:bg-[#101A18] min-h-screen text-[#17251F] dark:text-[#F7EFE4]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#173F36]/20 border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center justify-center text-[#173F36] dark:text-[#4EBA87] shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-tight">
              Recipe Management (BOM)
            </h1>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
              Define ingredient Bill of Materials (BOM) for menu items for automated kitchen stock consumption
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={loadData}
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#173F36] dark:text-[#4EBA87]' : 'text-[#657168] dark:text-[#9FB29E]'}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-4 shadow-editorial flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#657168] dark:text-[#9FB29E] pointer-events-none" />
          <input
            type="text"
            placeholder="Search dish by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F7EFE4]/60 dark:bg-[#1A2622] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-9 pr-4 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#8D9890] dark:placeholder-[#657168] focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36] transition-all"
          />
        </div>
        <div className="text-xs text-[#657168] dark:text-[#9FB29E] font-medium self-end sm:self-auto">
          Showing <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] tabular-nums">{filteredMenuItems.length}</span> dishes
        </div>
      </div>

      {/* Menu Dishes & Recipes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 space-y-4 shadow-editorial">
              <div className="flex justify-between items-center">
                <Skeleton className="w-32 h-6 rounded-md" />
                <Skeleton className="w-20 h-6 rounded-full" />
              </div>
              <Skeleton className="w-full h-12 rounded-xl" />
              <Skeleton className="w-full h-24 rounded-xl" />
              <Skeleton className="w-full h-11 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={searchQuery ? 'No matching dishes' : 'No Menu Items Found'}
          description={searchQuery ? `No menu items matching "${searchQuery}". Clear search to view all dishes.` : 'Add dishes via the menu catalogue first to configure kitchen recipes and BOM.'}
          actionLabel={searchQuery ? 'Clear Search' : undefined}
          onAction={searchQuery ? () => setSearchQuery('') : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMenuItems.map((item) => {
            const recipe = recipeMap.get(item.id);
            const hasRecipe = recipe && recipe.ingredients && recipe.ingredients.length > 0;

            return (
              <div
                key={item.id}
                className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 flex flex-col justify-between shadow-editorial hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#173F36] dark:text-[#F7EFE4]">{item.name}</h3>
                      <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-0.5">
                        <span>{item.category?.name || 'Main Course'}</span> • <span className="font-mono font-semibold tabular-nums text-[#17251F] dark:text-[#F7EFE4]">₹{Number(item.price).toFixed(2)}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border shrink-0 ${
                        hasRecipe
                          ? 'bg-[#E8F3ED] border-[#C5DED0] text-[#1E4D38] dark:bg-[#1A2E26] dark:text-[#88D4A8]'
                          : 'bg-amber-50 border-amber-200 text-[#B45309] dark:bg-amber-950/40 dark:text-amber-400'
                      }`}
                    >
                      {hasRecipe ? 'Recipe Active' : 'No Recipe'}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-[#657168] dark:text-[#9FB29E] line-clamp-2 mt-1 mb-3">
                      {item.description}
                    </p>
                  )}

                  {/* Ingredients Preview */}
                  <div className="border-t border-[#E4DCD0] dark:border-[#1E362E] pt-3 mt-3">
                    <div className="text-[10px] uppercase font-bold text-[#657168] dark:text-[#9FB29E] mb-2 flex items-center justify-between">
                      <span>Ingredients (Per Portion)</span>
                      {recipe?.prepTime && (
                        <span className="font-mono text-[#657168] dark:text-[#9FB29E] flex items-center gap-1 font-semibold tabular-nums">
                          <Clock className="w-3 h-3 text-[#173F36] dark:text-[#4EBA87]" /> {recipe.prepTime}m
                        </span>
                      )}
                    </div>

                    {hasRecipe ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {recipe.ingredients.map((ing, iIdx) => (
                          <div
                            key={iIdx}
                            className="flex items-center justify-between text-xs bg-[#F7EFE4]/60 dark:bg-[#1A2622]/60 px-2.5 py-1.5 rounded-lg border border-[#E4DCD0] dark:border-[#1E362E]"
                          >
                            <span className="text-[#17251F] dark:text-[#F7EFE4] font-medium truncate max-w-[150px]">
                              {ing.inventoryItem?.name || 'Item'}
                            </span>
                            <span className="font-mono text-xs text-[#173F36] dark:text-[#4EBA87] font-bold tabular-nums">
                              {Number(ing.quantityRequired)} {ing.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 text-center">
                        <p className="text-xs font-semibold text-amber-950 dark:text-amber-300">No ingredients defined.</p>
                        <p className="text-[10px] text-[#657168] dark:text-[#9FB29E] mt-0.5">
                          Configure recipe to enable automated stock deductions upon order readiness.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E] mt-4">
                  <Button
                    variant="primary"
                    onClick={() => openRecipeEditor(item)}
                    className="w-full min-h-[44px] text-xs font-bold"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-2" />
                    <span>{hasRecipe ? 'Edit Recipe (BOM)' : 'Configure Recipe'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Editor Modal */}
      <Modal
        isOpen={showModal && Boolean(selectedMenuItem)}
        onClose={() => setShowModal(false)}
        title={selectedMenuItem ? `Recipe for ${selectedMenuItem.name}` : 'Recipe Editor'}
        subtitle="Specify ingredient quantities required per 1 unit of this dish"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveRecipe} className="space-y-4">
          {/* Preparation Time & Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5 font-sans">
                Prep Time (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={recipeForm.prepTime}
                onChange={(e) => setRecipeForm({ ...recipeForm, prepTime: e.target.value })}
                className="w-full bg-[#F7EFE4]/60 dark:bg-[#152320]/60 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] font-mono tabular-nums transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5 font-sans">
                Kitchen Instructions (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Cook in tandoor until crisp..."
                value={recipeForm.instructions}
                onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })}
                className="w-full bg-[#F7EFE4]/60 dark:bg-[#152320]/60 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
              />
            </div>
          </div>

          {/* Ingredient List Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] uppercase tracking-wider font-sans">
                Ingredients (Per Portion)
              </label>
              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="text-xs font-semibold text-[#173F36] dark:text-[#9FB29E] hover:text-[#12332C] flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] rounded-md p-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient</span>
              </button>
            </div>

            {recipeForm.ingredients.length === 0 ? (
              <div className="bg-[#F7EFE4]/50 dark:bg-[#152320]/50 border border-dashed border-[#E4DCD0] dark:border-[#1E362E] rounded-xl p-6 text-center">
                <p className="text-xs text-[#657168] dark:text-[#9FB29E]">No ingredients added yet.</p>
                <button
                  type="button"
                  onClick={handleAddIngredientRow}
                  className="mt-2 text-xs font-bold text-[#173F36] dark:text-[#9FB29E] hover:underline cursor-pointer"
                >
                  + Add First Ingredient
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {recipeForm.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-[#F7EFE4]/40 dark:bg-[#152320]/40 p-2.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E]"
                  >
                    {/* Ingredient Select */}
                    <div className="flex-1">
                      <select
                        value={ing.inventoryItemId}
                        onChange={(e) => handleIngredientChange(idx, 'inventoryItemId', e.target.value)}
                        className="w-full bg-white dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-lg px-2.5 py-1.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
                      >
                        {inventoryItems.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} (Stock: {Number(inv.currentStock).toFixed(1)} {inv.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-24">
                      <input
                        type="number"
                        step="any"
                        min="0.0001"
                        required
                        placeholder="Qty"
                        value={ing.quantityRequired}
                        onChange={(e) => handleIngredientChange(idx, 'quantityRequired', e.target.value)}
                        className="w-full bg-white dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-lg px-2.5 py-1.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] text-right"
                      />
                    </div>

                    {/* Unit Select */}
                    <div className="w-24">
                      <select
                        value={ing.unit}
                        onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                        className="w-full bg-white dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-lg px-2.5 py-1.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
                      >
                        {INVENTORY_UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredientRow(idx)}
                      className="p-1.5 min-h-[36px] min-w-[36px] text-[#657168] dark:text-[#9FB29E] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                      title="Remove ingredient"
                      aria-label="Remove ingredient"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
            >
              {saving && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              <span>{saving ? 'Saving Recipe...' : 'Save Recipe'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
