import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import ReceiptModal from '../components/ReceiptModal';
import { loadRazorpayScript } from '../utils/razorpay';
import { Modal, SkeletonTable, EmptyState, Button } from '../components/ui';
import {
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Globe,
  CheckCircle2,
  RefreshCw,
  Printer,
  Search,
  DollarSign,
  Eye,
  Utensils,
  Tag,
} from 'lucide-react';

import { usePendingBillingOrders, useBills, usePayments, usePosMutations } from '../hooks/usePosQueries';

export default function BillingView({ preSelectedTable, initialTab }) {
  const { restaurant, addToast } = useAuth();
  // Persistent activeTab to prevent unexpected switching or resetting
  const [activeTab, setActiveTab] = useState(() => {
    return initialTab || sessionStorage.getItem('pos_billing_subtab') || 'bills';
  });

  // Synchronize initialTab if provided externally
  useEffect(() => {
    if (initialTab && ['bills', 'payments', 'pending'].includes(initialTab)) {
      setActiveTab(initialTab);
      sessionStorage.setItem('pos_billing_subtab', initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    sessionStorage.setItem('pos_billing_subtab', tabId);
  };

  // Filters
  const [paymentModeFilter, setPaymentModeFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'UNPAID' | 'CASH' | 'UPI' | 'CARD' | 'RAZORPAY'
  const [paymentTxFilter, setPaymentTxFilter] = useState('ALL');
  const [billSearch, setBillSearch] = useState('');

  // Bill Generation Modal State
  const [selectedOrderForBill, setSelectedOrderForBill] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(restaurant?.taxRate || 5);
  const [billNotes, setBillNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  // Bill Discount Modal State (for existing bills)
  const [selectedBillForDiscount, setSelectedBillForDiscount] = useState(null);
  const [editDiscountPercent, setEditDiscountPercent] = useState(0);
  const [editDiscountAmount, setEditDiscountAmount] = useState(0);
  const [updatingDiscount, setUpdatingDiscount] = useState(false);

  // Payment Settlement Modal State
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [settling, setSettling] = useState(false);

  // Receipt Modal State
  const [receiptBill, setReceiptBill] = useState(null);

  // Ordered Items Inspector Modal State
  const [selectedBillForItems, setSelectedBillForItems] = useState(null);

  const currency = restaurant?.currency || '₹';

  const {
    data: pendingOrders = [],
    isLoading: loadingPending,
    isRefetching: refetchingPending,
    refetch: refetchPending,
  } = usePendingBillingOrders(restaurant?.id);

  const {
    data: bills = [],
    isLoading: loadingBills,
    isRefetching: refetchingBills,
    refetch: refetchBills,
  } = useBills(restaurant?.id, { limit: 100 });

  const {
    data: payments = [],
    isLoading: loadingPayments,
    isRefetching: refetchingPayments,
    refetch: refetchPayments,
  } = usePayments(restaurant?.id, { limit: 100 });

  const { invalidateBilling, invalidateTables } = usePosMutations(restaurant?.id);

  const initialLoading = (loadingPending && pendingOrders.length === 0) ||
    (loadingBills && bills.length === 0) ||
    (loadingPayments && payments.length === 0);
  const refreshing = refetchingPending || refetchingBills || refetchingPayments;

  const loadData = async () => {
    await Promise.all([refetchPending(), refetchBills(), refetchPayments()]);
  };

  const generateOrderSubtotal = selectedOrderForBill?.items?.reduce(
    (sum, i) => sum + Number(i.subtotal || 0),
    0
  ) || 0;

  const handleGenerateDiscountPercentChange = (val) => {
    setDiscountPercent(val);
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setDiscountAmount(0);
    } else {
      const clamped = Math.min(100, Math.max(0, num));
      setDiscountAmount(Number(((generateOrderSubtotal * clamped) / 100).toFixed(2)));
    }
  };

  const handleGenerateDiscountAmountChange = (val) => {
    setDiscountAmount(val);
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setDiscountPercent(0);
    } else {
      const clamped = Math.min(generateOrderSubtotal, Math.max(0, num));
      const pct = generateOrderSubtotal > 0 ? Number(((clamped / generateOrderSubtotal) * 100).toFixed(2)) : 0;
      setDiscountPercent(pct);
    }
  };

  const openGenerateModal = (order) => {
    setSelectedOrderForBill(order);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setTaxRate(restaurant?.taxRate || 5);
    setBillNotes('');
  };

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    if (!selectedOrderForBill) return;

    setGenerating(true);
    try {
      const payload = {
        orderId: selectedOrderForBill.id,
        discountPercent: Number(discountPercent) || 0,
        discountAmount: Number(discountAmount) || 0,
        taxRate: Number(taxRate) || 0,
        notes: billNotes.trim() || undefined,
      };

      const res = await posService.billing.generateBill(payload);
      if (res.success) {
        addToast('Invoice / Bill generated successfully!', 'success');
        setSelectedOrderForBill(null);
        await loadData();
        if (res.data) {
          openPaymentModal(res.data);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to generate bill. Order must be COMPLETED first.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const openDiscountModal = (bill) => {
    setSelectedBillForDiscount(bill);
    const sub = Number(bill.subtotal || 0);
    const discAmt = Number(bill.discountAmount || 0);
    setEditDiscountAmount(discAmt);
    const pct = sub > 0 ? Number(((discAmt / sub) * 100).toFixed(2)) : 0;
    setEditDiscountPercent(pct);
  };

  const handleEditDiscountPercentChange = (val) => {
    setEditDiscountPercent(val);
    const sub = Number(selectedBillForDiscount?.subtotal || 0);
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setEditDiscountAmount(0);
    } else {
      const clamped = Math.min(100, Math.max(0, num));
      setEditDiscountAmount(Number(((sub * clamped) / 100).toFixed(2)));
    }
  };

  const handleEditDiscountAmountChange = (val) => {
    setEditDiscountAmount(val);
    const sub = Number(selectedBillForDiscount?.subtotal || 0);
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setEditDiscountPercent(0);
    } else {
      const clamped = Math.min(sub, Math.max(0, num));
      const pct = sub > 0 ? Number(((clamped / sub) * 100).toFixed(2)) : 0;
      setEditDiscountPercent(pct);
    }
  };

  const handleSaveBillDiscount = async (e) => {
    e.preventDefault();
    if (!selectedBillForDiscount) return;
    setUpdatingDiscount(true);
    try {
      const res = await posService.billing.updateBill(selectedBillForDiscount.id, {
        discountAmount: Number(editDiscountAmount) || 0,
        discountPercent: Number(editDiscountPercent) || 0,
      });
      if (res.success && res.data) {
        addToast('Discount applied and bill updated successfully!', 'success');
        const updatedBill = res.data;
        setSelectedBillForDiscount(null);
        await loadData();
        if (selectedBillForPayment && selectedBillForPayment.id === updatedBill.id) {
          setSelectedBillForPayment(updatedBill);
          setAmountPaid(Number(updatedBill.totalAmount || updatedBill.grandTotal || 0));
        }
        if (selectedBillForItems && selectedBillForItems.id === updatedBill.id) {
          setSelectedBillForItems(updatedBill);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to update discount on bill', 'error');
    } finally {
      setUpdatingDiscount(false);
    }
  };

  const openPaymentModal = (bill) => {
    setSelectedBillForPayment(bill);
    setPaymentMethod('CASH');
    setAmountPaid(Number(bill.totalAmount || bill.grandTotal || 0));
    setPaymentNotes('');
  };

  const handleRazorpayPayment = async (bill) => {
    setSettling(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
      }

      const orderRes = await posService.payments.createRazorpayOrder({
        billId: bill.id,
      });

      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.message || 'Failed to initialize payment gateway order');
      }

      const { razorpayOrderId, amount, currency: orderCurrency, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: orderCurrency || 'INR',
        name: restaurant?.name || 'Restaurant POS',
        description: `Settlement for Bill #${bill.billNumber || bill.id.slice(0, 8)}`,
        order_id: razorpayOrderId,
        prefill: {
          name: bill.order?.customerName || 'Valued Guest',
          contact: bill.order?.customerPhone || '',
        },
        theme: {
          color: '#173F36',
        },
        handler: async function (response) {
          try {
            const verifyRes = await posService.payments.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              billId: bill.id,
            });

            if (verifyRes.success) {
              addToast('Razorpay payment verified & settled! Table released.', 'success');
              const paidBill = verifyRes.data?.bill || {
                ...bill,
                status: 'PAID',
                paymentStatus: 'PAID',
                payments: [
                  verifyRes.data?.payment || {
                    method: 'RAZORPAY',
                    amount: Number(amount / 100),
                    status: 'COMPLETED',
                    createdAt: new Date().toISOString(),
                  },
                  ...(bill.payments || []),
                ],
              };
              setReceiptBill(paidBill);
              setSelectedBillForPayment(null);
              await loadData();
            } else {
              addToast(verifyRes.message || 'Payment signature verification failed', 'error');
            }
          } catch (verifyErr) {
            addToast(verifyErr.message || 'Verification endpoint error', 'error');
          } finally {
            setSettling(false);
          }
        },
        modal: {
          ondismiss: function () {
            setSettling(false);
            addToast('Payment checkout was dismissed by cashier.', 'info');
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', function (response) {
        setSettling(false);
        addToast(
          `Payment transaction failed: ${response.error?.description || 'Gateway error'}`,
          'error'
        );
      });

      razorpayInstance.open();
    } catch (err) {
      setSettling(false);
      addToast(err.message || 'Razorpay checkout initialization failed', 'error');
    }
  };

  const handleSettlePayment = async (e) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    if (paymentMethod === 'RAZORPAY') {
      await handleRazorpayPayment(selectedBillForPayment);
      return;
    }

    setSettling(true);
    try {
      const payload = {
        billId: selectedBillForPayment.id,
        method: paymentMethod,
        amount: Number(amountPaid),
        transactionReference: paymentNotes.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      };

      const res = await posService.payments.processPayment(payload);
      if (res.success) {
        addToast('Payment settled! Table released to AVAILABLE.', 'success');
        const paidBill = res.data?.bill || {
          ...selectedBillForPayment,
          status: 'PAID',
          paymentStatus: 'PAID',
          payments: [
            res.data?.payment || {
              method: paymentMethod,
              amount: Number(amountPaid),
              status: 'COMPLETED',
              createdAt: new Date().toISOString(),
            },
            ...(selectedBillForPayment.payments || []),
          ],
        };
        setReceiptBill(paidBill);
        setSelectedBillForPayment(null);
        await loadData();
      }
    } catch (err) {
      addToast(err.message || 'Payment settlement failed', 'error');
    } finally {
      setSettling(false);
    }
  };

  // Safe helper to extract payment information from backend bill object
  const getBillPaymentInfo = (bill) => {
    if (!bill) {
      return {
        isPaid: false,
        isPartiallyPaid: false,
        statusText: 'UNPAID',
        mode: null,
        paidAt: null,
        latestPayment: null,
      };
    }

    const completedPayments = (bill.payments || []).filter(
      (p) => (p.status || 'COMPLETED').toUpperCase() === 'COMPLETED'
    );

    const sortedPayments = [...completedPayments].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    const latestPayment = sortedPayments[0];

    const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalBillAmount = Number(bill.totalAmount || bill.grandTotal || 0);

    const rawStatus = (bill.status || bill.paymentStatus || '').toUpperCase();
    const isPaid = rawStatus === 'PAID' || (totalBillAmount > 0 && totalPaid >= totalBillAmount);
    const isPartiallyPaid = !isPaid && (rawStatus === 'PARTIALLY_PAID' || (totalPaid > 0 && totalPaid < totalBillAmount));

    const statusText = isPaid ? 'PAID' : (isPartiallyPaid ? 'PARTIALLY_PAID' : 'UNPAID');

    let rawMode = null;
    if (isPaid || isPartiallyPaid) {
      rawMode =
        latestPayment?.method ||
        latestPayment?.paymentMethod ||
        bill.payments?.[0]?.method ||
        bill.payments?.[0]?.paymentMethod ||
        null;
    }

    const mode = rawMode ? String(rawMode).toUpperCase() : null;
    const paidAt =
      isPaid || isPartiallyPaid
        ? latestPayment?.createdAt || bill.payments?.[0]?.createdAt || bill.updatedAt || null
        : null;

    return {
      isPaid,
      isPartiallyPaid,
      statusText,
      mode,
      paidAt,
      latestPayment,
    };
  };

  const formatMethodName = (mode) => {
    if (!mode) return 'Unsettled';
    switch (String(mode).toUpperCase()) {
      case 'CASH':
        return 'Cash';
      case 'UPI':
        return 'UPI';
      case 'CARD':
        return 'Card';
      case 'RAZORPAY':
        return 'Razorpay';
      case 'NET_BANKING':
        return 'Net Banking';
      case 'OTHER':
        return 'Other';
      default:
        return mode;
    }
  };

  const formatPaidAt = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '—';
    }
  };

  // Dynamic filter counts derived purely from current dataset
  const billFilterCounts = React.useMemo(() => {
    let all = bills.length;
    let paid = 0;
    let unpaid = 0;
    let cash = 0;
    let upi = 0;
    let card = 0;
    let razorpay = 0;
    let netBanking = 0;
    let other = 0;

    bills.forEach((b) => {
      const info = getBillPaymentInfo(b);
      if (info.isPaid) {
        paid++;
        if (info.mode === 'CASH') cash++;
        else if (info.mode === 'UPI') upi++;
        else if (info.mode === 'CARD') card++;
        else if (info.mode === 'RAZORPAY') razorpay++;
        else if (info.mode === 'NET_BANKING') netBanking++;
        else if (info.mode === 'OTHER') other++;
      } else {
        unpaid++;
      }
    });

    return {
      ALL: all,
      PAID: paid,
      UNPAID: unpaid,
      CASH: cash,
      UPI: upi,
      CARD: card,
      RAZORPAY: razorpay,
      NET_BANKING: netBanking,
      OTHER: other,
    };
  }, [bills]);

  const billFilterOptions = React.useMemo(() => {
    const opts = [
      { id: 'ALL', label: 'All', count: billFilterCounts.ALL },
      { id: 'PAID', label: 'Paid', count: billFilterCounts.PAID },
      { id: 'UNPAID', label: 'Unpaid', count: billFilterCounts.UNPAID },
      { id: 'CASH', label: 'Cash', count: billFilterCounts.CASH },
      { id: 'UPI', label: 'UPI', count: billFilterCounts.UPI },
      { id: 'CARD', label: 'Card', count: billFilterCounts.CARD },
      { id: 'RAZORPAY', label: 'Razorpay', count: billFilterCounts.RAZORPAY },
    ];
    if (billFilterCounts.NET_BANKING > 0) {
      opts.push({ id: 'NET_BANKING', label: 'Net Banking', count: billFilterCounts.NET_BANKING });
    }
    if (billFilterCounts.OTHER > 0) {
      opts.push({ id: 'OTHER', label: 'Other', count: billFilterCounts.OTHER });
    }
    return opts;
  }, [billFilterCounts]);

  // Comprehensive filter logic for Bills
  const filteredBills = React.useMemo(() => {
    return bills.filter((b) => {
      const info = getBillPaymentInfo(b);

      if (paymentModeFilter === 'PAID' && !info.isPaid) return false;
      if (paymentModeFilter === 'UNPAID' && info.isPaid) return false;
      if (['CASH', 'UPI', 'CARD', 'RAZORPAY', 'NET_BANKING', 'OTHER'].includes(paymentModeFilter)) {
        if (!info.isPaid || info.mode !== paymentModeFilter) return false;
      }

      if (billSearch) {
        const query = billSearch.toLowerCase().trim();
        const num = (b.billNumber || '').toLowerCase();
        const staff = (b.receptionist?.name || '').toLowerCase();
        const table = String(b.order?.table?.tableNumber || b.tableNumber || '').toLowerCase();
        const grand = String(b.totalAmount || b.grandTotal || '');
        if (!num.includes(query) && !staff.includes(query) && !table.includes(query) && !grand.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [bills, paymentModeFilter, billSearch]);

  // Payments tab filter logic
  const filteredPayments = React.useMemo(() => {
    return payments.filter((p) => {
      if (paymentTxFilter === 'ALL') return true;
      const method = (p.paymentMethod || p.method || '').toUpperCase();
      return method === paymentTxFilter;
    });
  }, [payments, paymentTxFilter]);

  const getMethodBadge = (mode) => {
    const normalized = (mode || '').toUpperCase();
    switch (normalized) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border border-emerald-200 dark:border-emerald-800">
            <Banknote className="w-3 h-3 text-[#173F36] dark:text-[#9FB29E]" />
            <span>Cash</span>
          </span>
        );
      case 'UPI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Smartphone className="w-3 h-3" />
            <span>UPI</span>
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <CreditCard className="w-3 h-3" />
            <span>Card</span>
          </span>
        );
      case 'RAZORPAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Globe className="w-3 h-3 text-amber-600" />
            <span>Razorpay</span>
          </span>
        );
      case 'NET_BANKING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Globe className="w-3 h-3 text-purple-700" />
            <span>Net Banking</span>
          </span>
        );
      case 'OTHER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] border border-[#E4DCD0] dark:border-[#1E362E]">
            <span>Other</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] border border-[#E4DCD0] dark:border-[#1E362E]">
            <span>{mode || '—'}</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 text-[#17251F] dark:text-[#F7EFE4]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#9FB29E]/10 border border-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] shrink-0 shadow-xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] tracking-tight">
                Billing & Cashier Dispatch
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] font-bold border border-emerald-200 dark:border-emerald-800 font-sans">
                Receptionist Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
              Inspect guest bills, review ordered items, verify payment statuses, and settle Cash/UPI/Card transactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="outline"
            onClick={() => loadData(false)}
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing || initialLoading ? 'animate-spin text-[#173F36] dark:text-[#9FB29E]' : 'text-[#657168] dark:text-[#9FB29E]'}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E4DCD0] dark:border-[#1E362E] pb-3 overflow-x-auto" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'bills'}
          onClick={() => handleTabChange('bills')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
            activeTab === 'bills'
              ? 'bg-[#173F36] text-[#FFFDF9] shadow-editorial font-bold'
              : 'text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E]'
          }`}
        >
          Generated Invoices <span className="tabular-nums">({bills.length})</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'payments'}
          onClick={() => handleTabChange('payments')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
            activeTab === 'payments'
              ? 'bg-[#173F36] text-[#FFFDF9] shadow-editorial font-bold'
              : 'text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E]'
          }`}
        >
          Payment Transactions <span className="tabular-nums">({payments.length})</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'pending'}
          onClick={() => handleTabChange('pending')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
            activeTab === 'pending'
              ? 'bg-[#173F36] text-[#FFFDF9] shadow-editorial font-bold'
              : 'text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E]'
          }`}
        >
          <span>Unbilled Orders <span className="tabular-nums">({pendingOrders.length})</span></span>
          {pendingOrders.some((o) => o.billRequested) && (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" title="Bill requests pending" />
          )}
        </button>
      </div>

      {/* LIVE BILL REQUESTS BANNER (FROM WAITERS) */}
      {pendingOrders.filter((o) => o.billRequested).length > 0 && (
        <div className="bg-gradient-to-br from-amber-50/90 to-[#F7EFE4]/80 dark:from-amber-950/30 dark:to-[#152320] border border-amber-300 dark:border-amber-700 rounded-2xl p-5 shadow-editorial space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-200 flex items-center gap-2 font-sans">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              NEW BILL REQUEST ({pendingOrders.filter((o) => o.billRequested).length} pending from Waiters)
            </span>
            <span className="text-xs text-[#657168] dark:text-[#9FB29E] font-medium">
              Customers finished dining. Generate bill to allow waiter delivery & payment settlement.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingOrders.filter((o) => o.billRequested).map((req) => {
              const reqTotal = req.items?.reduce((sum, i) => sum + Number(i.subtotal || 0), 0) || 0;
              return (
                <div key={req.id} className="bg-[#FFFDF9] dark:bg-[#101A18] border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] text-base font-serif">
                        Table #{req.table?.tableNumber || req.tableNumber || 'N/A'}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse font-sans">
                        BILL REQUESTED
                      </span>
                    </div>
                    <div className="text-xs text-[#657168] dark:text-[#9FB29E] font-medium">
                      #{req.orderNumber} • {req.table?.capacity || 4} Guests • {req.items?.length || 0} Items
                    </div>
                    <div className="text-base font-extrabold text-[#173F36] dark:text-[#9FB29E] font-mono pt-1 tabular-nums">
                      Total: {currency}{reqTotal.toFixed(2)}
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => openGenerateModal(req)}
                    className="mt-4 w-full"
                  >
                    <Receipt className="w-3.5 h-3.5 mr-1.5" />
                    <span>GENERATE BILL</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 1: GENERATED BILLS BY RECEPTIONIST */}
      {activeTab === 'bills' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFFDF9] dark:bg-[#152320] p-3.5 sm:p-4 rounded-2xl border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#657168] dark:text-[#9FB29E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Bill #, Receptionist, Table..."
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-10 pr-4 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E]/60 focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {billFilterOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPaymentModeFilter(opt.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#173F36] ${
                    paymentModeFilter === opt.id
                      ? 'bg-[#173F36] text-[#FFFDF9] border-[#173F36] shadow-editorial'
                      : 'bg-[#F7EFE4]/60 dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] border-[#E4DCD0] dark:border-[#1E362E] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] hover:text-[#17251F] dark:hover:text-[#F7EFE4]'
                  }`}
                >
                  {opt.label} <span className="tabular-nums">({opt.count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
            {initialLoading ? (
              <div className="p-4">
                <SkeletonTable rows={5} columns={9} />
              </div>
            ) : filteredBills.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={billSearch ? 'No matching invoices' : 'No Invoices Found'}
                description={billSearch ? `No invoices matching "${billSearch}".` : 'Generated customer bills and receipts will be listed here.'}
                actionLabel={billSearch ? 'Clear Search' : undefined}
                onAction={billSearch ? () => setBillSearch('') : undefined}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-[#F7EFE4]/60 dark:bg-[#101A18]/60 text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-bold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider font-sans">
                    <tr>
                      <th className="px-5 py-4">Bill Number</th>
                      <th className="px-5 py-4">Generated By</th>
                      <th className="px-5 py-4">Table</th>
                      <th className="px-5 py-4">Subtotal</th>
                      <th className="px-5 py-4">Grand Total</th>
                      <th className="px-5 py-4">Payment Status</th>
                      <th className="px-5 py-4">Payment Mode</th>
                      <th className="px-5 py-4">Paid At</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DCD0] dark:divide-[#1E362E] text-[#17251F] dark:text-[#F7EFE4]">
                    {filteredBills.map((bill) => {
                      const info = getBillPaymentInfo(bill);

                      return (
                        <tr key={bill.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/30 transition-colors">
                          <td className="px-5 py-4 font-mono font-bold text-[#17251F] dark:text-[#F7EFE4]">
                            {bill.billNumber || `INV-${bill.id.slice(0, 8)}`}
                            <span className="block text-[10px] text-[#657168] dark:text-[#9FB29E] font-normal tabular-nums mt-0.5">
                              {new Date(bill.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[#17251F] dark:text-[#F7EFE4]">
                            <span className="font-semibold text-[#17251F] dark:text-[#F7EFE4]">
                              {bill.receptionist?.name || 'Reception Staff'}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-[#17251F] dark:text-[#F7EFE4]">
                            Table #{bill.order?.table?.tableNumber || bill.tableNumber || 'N/A'}
                          </td>
                          <td className="px-5 py-4 text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums">
                            {currency}{Number(bill.subtotal || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-4 font-extrabold text-[#173F36] dark:text-[#9FB29E] font-mono text-sm tabular-nums">
                            {currency}{Number(bill.totalAmount || bill.grandTotal || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-4">
                            {info.isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-[#173F36] dark:text-[#9FB29E]" />
                                <span>PAID</span>
                              </span>
                            ) : info.isPartiallyPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                <span>PARTIALLY PAID</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <span>UNPAID</span>
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {info.isPaid || info.isPartiallyPaid ? (
                              getMethodBadge(info.mode)
                            ) : (
                              <span className="text-[10px] text-[#657168] dark:text-[#9FB29E] font-medium">Unsettled</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {info.isPaid && info.paidAt ? (
                              <span className="text-[#657168] dark:text-[#9FB29E] font-mono text-[11px] whitespace-nowrap tabular-nums">
                                {formatPaidAt(info.paidAt)}
                              </span>
                            ) : (
                              <span className="text-[#657168] dark:text-[#9FB29E] text-[11px] font-mono">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedBillForItems(bill)}
                              className="inline-flex items-center gap-1.5 min-h-[36px] bg-[#F7EFE4]/80 dark:bg-[#101A18] hover:bg-[#F7EFE4] active:scale-95 text-[#17251F] dark:text-[#F7EFE4] px-3 py-1.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] text-[11px] font-bold transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36]"
                              title="Inspect Ordered Items"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
                              <span>View Items</span>
                            </button>

                            <button
                              onClick={() => setReceiptBill(bill)}
                              className="inline-flex items-center gap-1.5 min-h-[36px] bg-[#F7EFE4]/80 dark:bg-[#101A18] hover:bg-[#F7EFE4] active:scale-95 text-[#657168] hover:text-[#17251F] dark:hover:text-[#F7EFE4] px-3 py-1.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] text-[11px] font-bold transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36]"
                              title="Print Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>

                            {!info.isPaid && (
                              <button
                                onClick={() => openDiscountModal(bill)}
                                className="inline-flex items-center gap-1.5 min-h-[36px] bg-[#F7EFE4]/80 dark:bg-[#101A18] hover:bg-[#F7EFE4] active:scale-95 text-[#173F36] dark:text-[#9FB29E] px-3 py-1.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] text-[11px] font-bold transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36]"
                                title="Apply or Edit Bill Discount"
                              >
                                <Tag className="w-3.5 h-3.5" />
                                <span>Discount</span>
                              </button>
                            )}

                            {!info.isPaid && (
                              <button
                                onClick={() => openPaymentModal(bill)}
                                className="inline-flex items-center gap-1.5 min-h-[36px] bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-editorial hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36]"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Settle</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENT TRANSACTIONS (CASH, UPI, CARD) */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {/* Payment Mode Filter */}
          <div className="flex items-center justify-between gap-3 bg-[#FFFDF9] dark:bg-[#152320] p-3.5 sm:p-4 rounded-2xl border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#173F36] dark:text-[#9FB29E]" />
              <span className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] font-sans">Filter by Payment Mode:</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['ALL', 'CASH', 'UPI', 'CARD', 'RAZORPAY'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentTxFilter(mode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#173F36] ${
                    paymentTxFilter === mode
                      ? 'bg-[#173F36] text-[#FFFDF9] border-[#173F36] shadow-editorial'
                      : 'bg-[#F7EFE4]/60 dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] border-[#E4DCD0] dark:border-[#1E362E] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] hover:text-[#17251F] dark:hover:text-[#F7EFE4]'
                  }`}
                >
                  {mode === 'ALL' ? 'All Transactions' : mode}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
            {initialLoading ? (
              <div className="p-4">
                <SkeletonTable rows={5} columns={6} />
              </div>
            ) : filteredPayments.length === 0 ? (
              <EmptyState
                icon={Banknote}
                title="No Payments Recorded Yet"
                description="Payment transactions will appear here as guest invoices are settled via Cash, UPI, Card, or Razorpay."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-[#F7EFE4]/60 dark:bg-[#101A18]/60 text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-bold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider font-sans">
                    <tr>
                      <th className="px-5 py-4">Payment ID</th>
                      <th className="px-5 py-4">Bill / Ref</th>
                      <th className="px-5 py-4">Payment Mode</th>
                      <th className="px-5 py-4">Amount Paid</th>
                      <th className="px-5 py-4">Settled At</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DCD0] dark:divide-[#1E362E] text-[#17251F] dark:text-[#F7EFE4]">
                    {filteredPayments.map((p) => {
                      const mode = p.paymentMethod || p.method || 'CASH';
                      return (
                        <tr key={p.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/30 transition-colors">
                          <td className="px-5 py-4 font-mono text-[#657168] dark:text-[#9FB29E]">
                            #{p.id.slice(0, 8)}
                          </td>
                          <td className="px-5 py-4 font-bold text-[#17251F] dark:text-[#F7EFE4]">
                            {p.bill?.billNumber || `Bill #${p.billId?.slice(0, 6)}`}
                          </td>
                          <td className="px-5 py-4 font-semibold text-[#17251F] dark:text-[#F7EFE4]">
                            {getMethodBadge(mode)}
                          </td>
                          <td className="px-5 py-4 font-extrabold text-[#173F36] dark:text-[#9FB29E] font-mono text-sm tabular-nums">
                            {currency}{Number(p.amountPaid || p.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-4 text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums">
                            {new Date(p.createdAt || Date.now()).toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border border-emerald-200 dark:border-emerald-800">
                              {p.status || 'COMPLETED'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: UNBILLED ORDERS */}
      {activeTab === 'pending' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
          {initialLoading ? (
            <div className="p-4">
              <SkeletonTable rows={5} columns={5} />
            </div>
          ) : pendingOrders.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No Pending Orders to Bill"
              description="Completed orders ready for invoice creation and guest departure will automatically appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#F7EFE4]/60 dark:bg-[#101A18]/60 text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-bold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider font-sans">
                  <tr>
                    <th className="px-5 py-4">Table / Ticket</th>
                    <th className="px-5 py-4">Items Ordered</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Elapsed</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DCD0] dark:divide-[#1E362E] text-[#17251F] dark:text-[#F7EFE4]">
                  {pendingOrders.map((ord) => {
                    const ordTotal = ord.items?.reduce((sum, i) => sum + Number(i.subtotal || 0), 0) || 0;
                    return (
                      <tr
                        key={ord.id}
                        className={`transition-colors ${
                          ord.billRequested
                            ? 'bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 border-l-4 border-l-amber-600'
                            : 'hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/30'
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="font-bold text-[#17251F] dark:text-[#F7EFE4] text-sm flex items-center gap-1.5 font-serif">
                            <span>Table #{ord.table?.tableNumber || ord.tableNumber || 'N/A'}</span>
                            {ord.billRequested && (
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-sans">
                                REQUESTED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] font-mono mt-0.5">
                            #{ord.orderNumber || ord.id.slice(0, 8)}
                          </div>
                          {ord.waiter && (
                            <div className="text-[10px] text-[#173F36] dark:text-[#9FB29E] font-medium mt-0.5">
                              Waiter: {ord.waiter.name}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-0.5 max-h-16 overflow-y-auto pr-1">
                            {ord.items?.map((it, idx) => (
                              <div key={idx} className="text-[#17251F] dark:text-[#F7EFE4] text-xs">
                                <span className="font-semibold tabular-nums">{it.quantity}x</span> {it.menuItem?.name || it.name}
                              </div>
                            ))}
                          </div>
                          <div className="text-xs font-bold text-[#173F36] dark:text-[#9FB29E] font-mono mt-1 tabular-nums">
                            Total: {currency}{ordTotal.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {ord.billRequested ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse font-sans">
                              BILL REQUESTED
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-sans">
                              {ord.status}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums">
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="primary"
                            onClick={() => openGenerateModal(ord)}
                          >
                            <Receipt className="w-3.5 h-3.5 mr-1.5" />
                            <span>Generate Bill</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ORDERED ITEMS INSPECTOR MODAL */}
      <Modal
        isOpen={Boolean(selectedBillForItems)}
        onClose={() => setSelectedBillForItems(null)}
        title={
          selectedBillForItems ? (
            <span className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Invoice #{selectedBillForItems.billNumber || selectedBillForItems.id.slice(0, 8)}</span>
            </span>
          ) : 'Invoice Items'
        }
        subtitle={
          selectedBillForItems ? (
            <span>
              Generated by: <strong className="text-[#17251F] dark:text-[#F7EFE4]">{selectedBillForItems.receptionist?.name || 'Receptionist'}</strong> on {new Date(selectedBillForItems.createdAt).toLocaleString()}
            </span>
          ) : undefined
        }
        maxWidth="max-w-xl"
      >
        {selectedBillForItems && (
          <div className="space-y-4">
            {/* Meta details */}
            {(() => {
              const modalInfo = getBillPaymentInfo(selectedBillForItems);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F7EFE4]/60 dark:bg-[#101A18] p-3 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] text-xs">
                  <div>
                    <span className="text-[#657168] dark:text-[#9FB29E] block text-[10px] font-medium font-sans">Table</span>
                    <span className="font-bold text-[#17251F] dark:text-[#F7EFE4]">
                      Table #{selectedBillForItems.order?.table?.tableNumber || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#657168] dark:text-[#9FB29E] block text-[10px] font-medium font-sans">Payment Status</span>
                    <span className={`font-bold ${modalInfo.isPaid ? 'text-[#173F36] dark:text-[#9FB29E]' : 'text-amber-700 dark:text-amber-400'}`}>
                      {modalInfo.statusText}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#657168] dark:text-[#9FB29E] block text-[10px] font-medium font-sans">Payment Mode</span>
                    <span className="font-bold text-[#17251F] dark:text-[#F7EFE4]">
                      {modalInfo.isPaid || modalInfo.isPartiallyPaid ? formatMethodName(modalInfo.mode) : 'Unsettled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#657168] dark:text-[#9FB29E] block text-[10px] font-medium font-sans">Paid At</span>
                    <span className="font-mono text-[#17251F] dark:text-[#F7EFE4] font-semibold text-[11px] tabular-nums">
                      {modalInfo.isPaid && modalInfo.paidAt ? formatPaidAt(modalInfo.paidAt) : '—'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Ordered Items Table */}
            <div>
              <h4 className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] uppercase tracking-wider mb-2 flex items-center gap-1.5 font-sans">
                <Utensils className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
                <span>Ordered Items in Bill</span>
              </h4>
              <div className="bg-[#F7EFE4]/40 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7EFE4]/80 dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-bold border-b border-[#E4DCD0] dark:border-[#1E362E] font-sans">
                    <tr>
                      <th className="px-3.5 py-2.5">Item Name</th>
                      <th className="px-3.5 py-2.5 text-center">Qty</th>
                      <th className="px-3.5 py-2.5 text-right">Price</th>
                      <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DCD0] dark:divide-[#1E362E] text-[#17251F] dark:text-[#F7EFE4]">
                    {(selectedBillForItems.order?.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-[#F7EFE4]/60 dark:hover:bg-[#1E362E]/30">
                        <td className="px-3.5 py-2.5 font-semibold text-[#17251F] dark:text-[#F7EFE4]">
                          {it.menuItem?.name || it.name || 'Dish Item'}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-bold text-[#17251F] dark:text-[#F7EFE4] tabular-nums">
                          {it.quantity}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-[#657168] dark:text-[#9FB29E] tabular-nums">
                          {currency}{Number(it.unitPrice || it.price || 0).toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#173F36] dark:text-[#9FB29E] tabular-nums">
                          {currency}{Number(it.subtotal || it.quantity * (it.unitPrice || it.price || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bill Totals Summary */}
            <div className="bg-[#F7EFE4]/60 dark:bg-[#101A18] p-3.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#657168] dark:text-[#9FB29E]">
                <span>Subtotal:</span>
                <span className="font-mono text-[#17251F] dark:text-[#F7EFE4] font-semibold tabular-nums">
                  {currency}{Number(selectedBillForItems.subtotal || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#657168] dark:text-[#9FB29E]">
                <span>Tax ({selectedBillForItems.taxRate || 5}%):</span>
                <span className="font-mono text-[#17251F] dark:text-[#F7EFE4] font-semibold tabular-nums">
                  {currency}{Number(selectedBillForItems.taxAmount || 0).toFixed(2)}
                </span>
              </div>
              {Number(selectedBillForItems.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-rose-700 dark:text-rose-400 font-semibold">
                  <span>Discount:</span>
                  <span className="font-mono tabular-nums">
                    -{currency}{Number(selectedBillForItems.discountAmount).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E] flex justify-between text-sm font-bold">
                <span className="text-[#17251F] dark:text-[#F7EFE4] font-serif">Total Bill Amount:</span>
                <span className="text-[#173F36] dark:text-[#9FB29E] font-mono text-base font-extrabold tabular-nums">
                  {currency}{Number(selectedBillForItems.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E]">
              {selectedBillForItems.status !== 'PAID' ? (
                <button
                  type="button"
                  onClick={() => openDiscountModal(selectedBillForItems)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] text-xs font-semibold text-[#173F36] dark:text-[#9FB29E] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] transition-all cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{Number(selectedBillForItems.discountAmount || 0) > 0 ? 'Edit Discount' : 'Apply Discount'}</span>
                </button>
              ) : <div />}
              <Button
                variant="outline"
                onClick={() => setSelectedBillForItems(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* GENERATE BILL MODAL */}
      <Modal
        isOpen={Boolean(selectedOrderForBill)}
        onClose={() => setSelectedOrderForBill(null)}
        title="Generate Tax Invoice"
        subtitle={
          selectedOrderForBill ? (
            <span>
              Order #{selectedOrderForBill.id.slice(0, 8)} (Table #{selectedOrderForBill.table?.tableNumber || 'N/A'})
            </span>
          ) : undefined
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleGenerateBill} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5 font-sans">Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discountPercent}
                onChange={(e) => handleGenerateDiscountPercentChange(e.target.value)}
                className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-sm text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5 font-sans">Fixed Disc ({currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => handleGenerateDiscountAmountChange(e.target.value)}
                className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-sm text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5 font-sans">Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-sm text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5 font-sans">Invoice Notes</label>
            <input
              type="text"
              placeholder="e.g. Corporate discount applied"
              value={billNotes}
              onChange={(e) => setBillNotes(e.target.value)}
              className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-sm text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E]/60 focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36]"
            />
          </div>

          {/* Dynamic Billing Calculation Summary */}
          {selectedOrderForBill && (
            <div className="bg-[#F7EFE4]/60 dark:bg-[#101A18] p-3.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] space-y-1.5 text-xs font-sans">
              <div className="flex justify-between text-[#657168] dark:text-[#9FB29E]">
                <span>Order Subtotal:</span>
                <span className="font-mono font-semibold text-[#17251F] dark:text-[#F7EFE4] tabular-nums">
                  {currency}{generateOrderSubtotal.toFixed(2)}
                </span>
              </div>
              {Number(discountAmount || 0) > 0 && (
                <div className="flex justify-between text-rose-700 dark:text-rose-400 font-semibold">
                  <span>Discount ({Number(discountPercent || 0)}%):</span>
                  <span className="font-mono tabular-nums">
                    -{currency}{Number(discountAmount || 0).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#657168] dark:text-[#9FB29E]">
                <span>Tax ({Number(taxRate || 0)}%):</span>
                <span className="font-mono font-semibold text-[#17251F] dark:text-[#F7EFE4] tabular-nums">
                  +{currency}{(Number(((generateOrderSubtotal * (Number(taxRate) || 0)) / 100).toFixed(2))).toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E] flex justify-between text-sm font-bold">
                <span className="text-[#17251F] dark:text-[#F7EFE4] font-serif">Final Payable Total:</span>
                <span className="text-[#173F36] dark:text-[#9FB29E] font-mono text-base font-extrabold tabular-nums">
                  {currency}
                  {Math.max(
                    0,
                    Number(
                      (
                        generateOrderSubtotal +
                        Number(((generateOrderSubtotal * (Number(taxRate) || 0)) / 100).toFixed(2)) -
                        Number(discountAmount || 0)
                      ).toFixed(2)
                    )
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedOrderForBill(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Confirm & Invoice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* PAYMENT SETTLEMENT MODAL */}
      <Modal
        isOpen={Boolean(selectedBillForPayment)}
        onClose={() => setSelectedBillForPayment(null)}
        title="Settle Bill Payment"
        subtitle={
          selectedBillForPayment ? (
            <span>
              Invoice #{selectedBillForPayment.billNumber || selectedBillForPayment.id.slice(0, 8)}
            </span>
          ) : undefined
        }
        maxWidth="max-w-md"
      >
        {selectedBillForPayment && (
          <>
            <div className="bg-[#F7EFE4]/60 dark:bg-[#101A18] p-4 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] mb-4">
              <div className="space-y-1.5 text-xs text-[#657168] dark:text-[#9FB29E] pb-2 border-b border-[#E4DCD0] dark:border-[#1E362E]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono text-[#17251F] dark:text-[#F7EFE4] font-semibold tabular-nums">
                    {currency}{Number(selectedBillForPayment.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                {Number(selectedBillForPayment.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-rose-700 dark:text-rose-400 font-semibold">
                    <span>Discount Applied:</span>
                    <span className="font-mono tabular-nums">
                      -{currency}{Number(selectedBillForPayment.discountAmount).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax ({selectedBillForPayment.taxRate || 5}%):</span>
                  <span className="font-mono text-[#17251F] dark:text-[#F7EFE4] font-semibold tabular-nums">
                    +{currency}{Number(selectedBillForPayment.taxAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="text-center pt-2">
                <span className="text-xs text-[#657168] dark:text-[#9FB29E] font-semibold font-sans">Total Payable Amount</span>
                <div className="text-3xl font-extrabold text-[#173F36] dark:text-[#9FB29E] font-mono mt-0.5 tabular-nums">
                  {currency}{Number(selectedBillForPayment.totalAmount || selectedBillForPayment.grandTotal || 0).toFixed(2)}
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => openDiscountModal(selectedBillForPayment)}
                  className="inline-flex items-center gap-1.5 text-xs text-[#173F36] dark:text-[#9FB29E] hover:underline font-bold cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{Number(selectedBillForPayment.discountAmount || 0) > 0 ? 'Modify Discount' : 'Apply Discount'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSettlePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-2 font-sans">Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash', icon: Banknote },
                    { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
                    { id: 'CARD', label: 'Card', icon: CreditCard },
                    { id: 'RAZORPAY', label: 'Razorpay', icon: Globe },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = paymentMethod === mode.id;
                    return (
                      <button
                        type="button"
                        key={mode.id}
                        onClick={() => setPaymentMethod(mode.id)}
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
                          isSelected
                            ? 'bg-[#173F36] text-[#FFFDF9] border-[#173F36] shadow-editorial'
                            : 'bg-[#F7EFE4]/50 dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] border-[#E4DCD0] dark:border-[#1E362E] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] hover:text-[#17251F] dark:hover:text-[#F7EFE4]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {paymentMethod === 'RAZORPAY' ? (
                <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <Globe className="w-4 h-4 text-[#173F36] dark:text-[#9FB29E] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-[#173F36] dark:text-[#9FB29E]">Razorpay Test Mode Checkout</span>
                    <span>
                      Clicking below will securely open the official Razorpay Checkout for {currency}
                      <span className="tabular-nums font-mono font-bold">
                        {Number(selectedBillForPayment.totalAmount || selectedBillForPayment.grandTotal || 0).toFixed(2)}
                      </span>.
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5 font-sans">
                    Amount Received ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-sm text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5 font-sans">
                  Transaction Reference / Notes
                </label>
                <input
                  type="text"
                  placeholder={paymentMethod === 'RAZORPAY' ? 'Optional online transaction notes' : 'e.g. UPI Ref #12345 or Auth Code'}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-sm text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E]/60 focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedBillForPayment(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={settling}
                >
                  {settling
                    ? 'Processing...'
                    : paymentMethod === 'RAZORPAY'
                    ? 'Pay with Razorpay'
                    : 'Complete Payment'}
                </Button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {/* EDIT BILL DISCOUNT MODAL */}
      <Modal
        isOpen={Boolean(selectedBillForDiscount)}
        onClose={() => setSelectedBillForDiscount(null)}
        title="Apply / Update Bill Discount"
        subtitle={
          selectedBillForDiscount ? (
            <span>
              Invoice #{selectedBillForDiscount.billNumber || selectedBillForDiscount.id.slice(0, 8)} (Table #{selectedBillForDiscount.order?.table?.tableNumber || selectedBillForDiscount.tableNumber || 'N/A'})
            </span>
          ) : undefined
        }
        maxWidth="max-w-md"
      >
        {selectedBillForDiscount && (
          <form onSubmit={handleSaveBillDiscount} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5 font-sans">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editDiscountPercent}
                  onChange={(e) => handleEditDiscountPercentChange(e.target.value)}
                  className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-sm text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5 font-sans">Fixed Disc ({currency})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editDiscountAmount}
                  onChange={(e) => handleEditDiscountAmountChange(e.target.value)}
                  className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-sm text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36]"
                />
              </div>
            </div>

            {/* Dynamic Summary */}
            <div className="bg-[#F7EFE4]/60 dark:bg-[#101A18] p-3.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] space-y-1.5 text-xs font-sans">
              <div className="flex justify-between text-[#657168] dark:text-[#9FB29E]">
                <span>Bill Subtotal:</span>
                <span className="font-mono font-semibold text-[#17251F] dark:text-[#F7EFE4] tabular-nums">
                  {currency}{Number(selectedBillForDiscount.subtotal || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-rose-700 dark:text-rose-400 font-semibold">
                <span>Discount Applied ({Number(editDiscountPercent || 0)}%):</span>
                <span className="font-mono tabular-nums">
                  -{currency}{Number(editDiscountAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#657168] dark:text-[#9FB29E]">
                <span>Tax ({Number(selectedBillForDiscount.taxRate || 5)}%):</span>
                <span className="font-mono font-semibold text-[#17251F] dark:text-[#F7EFE4] tabular-nums">
                  +{currency}{Number(selectedBillForDiscount.taxAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E] flex justify-between text-sm font-bold">
                <span className="text-[#17251F] dark:text-[#F7EFE4] font-serif">Updated Payable Amount:</span>
                <span className="text-[#173F36] dark:text-[#9FB29E] font-mono text-base font-extrabold tabular-nums">
                  {currency}
                  {Math.max(
                    0,
                    Number(
                      (
                        Number(selectedBillForDiscount.subtotal || 0) +
                        Number(selectedBillForDiscount.taxAmount || 0) -
                        Number(editDiscountAmount || 0)
                      ).toFixed(2)
                    )
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedBillForDiscount(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={updatingDiscount}
              >
                {updatingDiscount ? 'Saving...' : 'Save & Update Bill'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* PRINT RECEIPT MODAL */}
      {receiptBill && (
        <ReceiptModal bill={receiptBill} onClose={() => setReceiptBill(null)} />
      )}
    </div>
  );
}
