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

export default function KitchenRecipesView() {
  const { addToast } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    try {
      const [itemsRes, invRes, recRes] = await Promise.all([
        posService.menu.getItems(),
        posService.kitchen.getInventory(),
        posService.recipes.getAll(),
      ]);

      if (itemsRes.success) {
        const list = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.items || [];
        setMenuItems(list);
      }
      if (invRes.success) {
        setInventoryItems(invRes.data || []);
      }
      if (recRes.success) {
        const rList = Array.isArray(recRes.data) ? recRes.data : recRes.data.items || [];
        setRecipes(rList);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load recipe data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] min-h-screen text-[#1F2937]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#E5D8C6] p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#92400E]/10 border border-[#92400E]/20 flex items-center justify-center text-[#92400E] shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] tracking-tight">
              Recipe Management (BOM)
            </h1>
            <p className="text-xs sm:text-sm text-[#5B6470] mt-0.5 font-medium">
              Define ingredient Bill of Materials (BOM) for menu items for automated kitchen stock consumption
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={loadData}
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#92400E]' : 'text-[#5B6470]'}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-[#E5D8C6] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470] pointer-events-none" />
          <input
            type="text"
            placeholder="Search dish by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl pl-9 pr-4 py-2 text-xs text-[#1F2937] placeholder-[#5B6470] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] transition-all"
          />
        </div>
        <div className="text-xs text-[#5B6470] font-medium self-end sm:self-auto">
          Showing <span className="font-bold text-[#1F2937] tabular-nums">{filteredMenuItems.length}</span> dishes
        </div>
      </div>

      {/* Menu Dishes & Recipes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border border-[#E5D8C6] rounded-2xl p-5 space-y-4">
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
                className="bg-white border border-[#E5D8C6] rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      <h3 className="text-base font-bold text-[#1F2937]">{item.name}</h3>
                      <div className="text-[11px] text-[#5B6470] mt-0.5">
                        <span>{item.category?.name || 'Main Course'}</span> • <span className="font-mono font-semibold tabular-nums">₹{Number(item.price).toFixed(2)}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border shrink-0 ${
                        hasRecipe
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-[#92400E]'
                      }`}
                    >
                      {hasRecipe ? 'Recipe Active' : 'No Recipe'}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-[#5B6470] line-clamp-2 mt-1 mb-3">
                      {item.description}
                    </p>
                  )}

                  {/* Ingredients Preview */}
                  <div className="border-t border-[#E5D8C6] pt-3 mt-3">
                    <div className="text-[10px] uppercase font-bold text-[#5B6470] mb-2 flex items-center justify-between">
                      <span>Ingredients (Per Portion)</span>
                      {recipe?.prepTime && (
                        <span className="font-mono text-[#5B6470] flex items-center gap-1 font-semibold tabular-nums">
                          <Clock className="w-3 h-3 text-[#92400E]" /> {recipe.prepTime}m
                        </span>
                      )}
                    </div>

                    {hasRecipe ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {recipe.ingredients.map((ing, iIdx) => (
                          <div
                            key={iIdx}
                            className="flex items-center justify-between text-xs bg-[#FAF7F2] px-2.5 py-1.5 rounded-lg border border-[#E5D8C6]"
                          >
                            <span className="text-[#1F2937] font-medium truncate max-w-[150px]">
                              {ing.inventoryItem?.name || 'Item'}
                            </span>
                            <span className="font-mono text-xs text-[#92400E] font-bold tabular-nums">
                              {Number(ing.quantityRequired)} {ing.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center">
                        <p className="text-xs font-semibold text-amber-900">No ingredients defined.</p>
                        <p className="text-[10px] text-[#5B6470] mt-0.5">
                          Configure recipe to enable automated stock deductions upon order readiness.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5D8C6] mt-4">
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
              <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                Prep Time (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={recipeForm.prepTime}
                onChange={(e) => setRecipeForm({ ...recipeForm, prepTime: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] font-mono tabular-nums transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                Kitchen Instructions (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Cook in tandoor until crisp..."
                value={recipeForm.instructions}
                onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] transition-all"
              />
            </div>
          </div>

          {/* Ingredient List Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">
                Ingredients (Per Portion)
              </label>
              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="text-xs font-semibold text-[#92400E] hover:text-[#78350F] flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] rounded-md p-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient</span>
              </button>
            </div>

            {recipeForm.ingredients.length === 0 ? (
              <div className="bg-[#FAF7F2] border border-dashed border-[#E5D8C6] rounded-xl p-6 text-center">
                <p className="text-xs text-[#5B6470]">No ingredients added yet.</p>
                <button
                  type="button"
                  onClick={handleAddIngredientRow}
                  className="mt-2 text-xs font-bold text-[#92400E] hover:underline cursor-pointer"
                >
                  + Add First Ingredient
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {recipeForm.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E5D8C6]"
                  >
                    {/* Ingredient Select */}
                    <div className="flex-1">
                      <select
                        value={ing.inventoryItemId}
                        onChange={(e) => handleIngredientChange(idx, 'inventoryItemId', e.target.value)}
                        className="w-full bg-white border border-[#E5D8C6] rounded-lg px-2.5 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E]"
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
                        className="w-full bg-white border border-[#E5D8C6] rounded-lg px-2.5 py-1.5 text-xs text-[#1F2937] font-mono tabular-nums focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] text-right"
                      />
                    </div>

                    {/* Unit Select */}
                    <div className="w-24">
                      <select
                        value={ing.unit}
                        onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                        className="w-full bg-white border border-[#E5D8C6] rounded-lg px-2.5 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E]"
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
                      className="p-1.5 min-h-[36px] min-w-[36px] text-[#5B6470] hover:text-red-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
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
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5D8C6]">
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
