import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import ReceiptModal from '../components/ReceiptModal';
import { loadRazorpayScript } from '../utils/razorpay';
import { Modal, SkeletonTable, EmptyState, Badge, Button } from '../components/ui';
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
  AlertTriangle,
  Eye,
  Utensils,
  Clock,
} from 'lucide-react';

export default function BillingView({ preSelectedTable, initialTab }) {
  const { restaurant, addToast } = useAuth();
  // Persistent activeTab to prevent unexpected switching or resetting
  const [activeTab, setActiveTab] = useState(() => {
    return initialTab || sessionStorage.getItem('pos_billing_subtab') || 'bills';
  });
  const [pendingOrders, setPendingOrders] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const loadData = async (isBackground = false) => {
    if (!isBackground) {
      if (bills.length === 0 && payments.length === 0 && pendingOrders.length === 0) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
    }
    try {
      const [ordRes, billRes, payRes] = await Promise.all([
        posService.billing.getPendingOrders(),
        posService.billing.getBills({ limit: 100 }),
        posService.payments.getAll({ limit: 100 }),
      ]);
      if (ordRes.success) setPendingOrders(ordRes.data?.items || (Array.isArray(ordRes.data) ? ordRes.data : []));
      if (billRes.success) setBills(billRes.data?.items || (Array.isArray(billRes.data) ? billRes.data : []));
      if (payRes.success) setPayments(payRes.data?.items || (Array.isArray(payRes.data) ? payRes.data : []));
    } catch (err) {
      if (!isBackground) {
        addToast(err.message || 'Failed to load billing records', 'error');
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
    // Background polling every 6 seconds without resetting loading state or active tab
    const interval = setInterval(() => loadData(true), 6000);
    return () => clearInterval(interval);
  }, []);

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
        loadData();
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

  const openPaymentModal = (bill) => {
    setSelectedBillForPayment(bill);
    setPaymentMethod('CASH');
    setAmountPaid(Number(bill.totalAmount || bill.grandTotal || 0));
    setPaymentNotes('');
  };

  const handleRazorpayPayment = async (bill) => {
    setSettling(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Razorpay Checkout SDK failed to load. Please check your internet connection.');
      }

      const orderRes = await posService.payments.createRazorpayOrder({ billId: bill.id });
      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.message || 'Failed to create Razorpay payment order');
      }

      const orderData = orderRes.data;

      const customerName = bill.customerName || bill.order?.customerName || orderData.customerName || '';
      const customerEmail = bill.customerEmail || bill.order?.customerEmail || orderData.restaurantEmail || restaurant?.email || '';
      const customerPhone = bill.customerPhone || bill.order?.customerPhone || orderData.restaurantPhone || restaurant?.phone || '';

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: orderData.restaurantName || restaurant?.name || 'ApexPOS Restaurant',
        description: `Bill #${bill.billNumber || bill.id.slice(0, 8)} Payment`,
        order_id: orderData.orderId,
        notes: {
          billId: bill.id,
          billNumber: bill.billNumber || '',
          orderNumber: bill.order?.orderNumber || '',
        },
        handler: async (response) => {
          try {
            setSettling(true);
            const verifyPayload = {
              billId: bill.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            };

            const verifyRes = await posService.payments.verifyRazorpayPayment(verifyPayload);
            if (verifyRes.success) {
              addToast('Razorpay payment verified & settled! Table released to AVAILABLE.', 'success');
              const verifiedBill = verifyRes.data?.bill || {
                ...bill,
                status: 'PAID',
                paymentStatus: 'PAID',
                payments: [
                  {
                    method: 'RAZORPAY',
                    paymentMethod: 'RAZORPAY',
                    amount: bill.totalAmount,
                    transactionReference: response.razorpay_payment_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    status: 'COMPLETED',
                    createdAt: new Date().toISOString(),
                  },
                  ...(bill.payments || []),
                ],
              };
              setReceiptBill(verifiedBill);
              setSelectedBillForPayment(null);
              await loadData();
            } else {
              throw new Error(verifyRes.message || 'Razorpay payment verification failed');
            }
          } catch (verifyErr) {
            addToast(verifyErr.message || 'Payment verification failed on server', 'error');
          } finally {
            setSettling(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSettling(false);
            addToast('Razorpay payment cancelled. Bill remains unpaid.', 'info');
          },
          confirm_close: true,
          escape: true,
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#92400E',
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on('payment.failed', function (response) {
        setSettling(false);
        const errMsg = response.error?.description || 'Payment failed with Razorpay';
        addToast(errMsg, 'error');
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

  // Filter bills dynamically
  const filteredBills = bills.filter((b) => {
    const matchSearch =
      !billSearch.trim() ||
      (b.billNumber && b.billNumber.toLowerCase().includes(billSearch.toLowerCase())) ||
      (b.receptionist?.name && b.receptionist.name.toLowerCase().includes(billSearch.toLowerCase())) ||
      (b.order?.table?.tableNumber && b.order.table.tableNumber.toLowerCase().includes(billSearch.toLowerCase()));

    const info = getBillPaymentInfo(b);

    let matchMode = true;
    if (paymentModeFilter === 'ALL') {
      matchMode = true;
    } else if (paymentModeFilter === 'PAID') {
      matchMode = info.isPaid;
    } else if (paymentModeFilter === 'UNPAID') {
      matchMode = !info.isPaid;
    } else if (paymentModeFilter === 'CASH') {
      matchMode = info.isPaid && info.mode === 'CASH';
    } else if (paymentModeFilter === 'UPI') {
      matchMode = info.isPaid && info.mode === 'UPI';
    } else if (paymentModeFilter === 'CARD') {
      matchMode = info.isPaid && info.mode === 'CARD';
    } else if (paymentModeFilter === 'RAZORPAY') {
      matchMode = info.isPaid && info.mode === 'RAZORPAY';
    } else if (paymentModeFilter === 'NET_BANKING') {
      matchMode = info.isPaid && info.mode === 'NET_BANKING';
    } else if (paymentModeFilter === 'OTHER') {
      matchMode = info.isPaid && info.mode === 'OTHER';
    }

    return matchSearch && matchMode;
  });

  // Filter payments (Tab 2)
  const filteredPayments = payments.filter((p) => {
    if (paymentTxFilter === 'ALL') return true;
    const mode = (p.paymentMethod || p.method || '').toUpperCase();
    return mode === paymentTxFilter;
  });

  const getMethodBadge = (mode) => {
    const normalized = (mode || '').toUpperCase();
    switch (normalized) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Banknote className="w-3 h-3" />
            <span>Cash</span>
          </span>
        );
      case 'UPI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#D97706]/15 text-[#92400E] border border-[#D97706]/30">
            <Smartphone className="w-3 h-3" />
            <span>UPI</span>
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200">
            <CreditCard className="w-3 h-3" />
            <span>Card</span>
          </span>
        );
      case 'RAZORPAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-900 border border-amber-200">
            <Globe className="w-3 h-3 text-[#92400E]" />
            <span>Razorpay</span>
          </span>
        );
      case 'NET_BANKING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-900 border border-purple-200">
            <Globe className="w-3 h-3 text-purple-700" />
            <span>Net Banking</span>
          </span>
        );
      case 'OTHER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-50 text-slate-700 border border-slate-200">
            <span>Other</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-50 text-slate-700 border border-slate-200">
            <span>{mode || '—'}</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] dark:bg-[#141210] min-h-screen text-[#1F2937] dark:text-[#F7F3EC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] p-5 sm:p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/30 flex items-center justify-center text-[#92400E] dark:text-[#D97706] shrink-0 shadow-xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] dark:text-[#F7F3EC] tracking-tight">
                Billing & Cashier Dispatch
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-[#92400E] dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800">
                Receptionist Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium">
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
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing || initialLoading ? 'animate-spin text-[#92400E] dark:text-[#D97706]' : 'text-[#5B6470] dark:text-[#A89B8C]'}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5D8C6] dark:border-[#382F26] pb-3 overflow-x-auto" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'bills'}
          onClick={() => handleTabChange('bills')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] ${
            activeTab === 'bills'
              ? 'bg-[#92400E] text-white shadow-sm font-bold'
              : 'text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C]'
          }`}
        >
          Generated Invoices <span className="tabular-nums">({bills.length})</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'payments'}
          onClick={() => handleTabChange('payments')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] ${
            activeTab === 'payments'
              ? 'bg-[#92400E] text-white shadow-sm font-bold'
              : 'text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C]'
          }`}
        >
          Payment Transactions <span className="tabular-nums">({payments.length})</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'pending'}
          onClick={() => handleTabChange('pending')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] ${
            activeTab === 'pending'
              ? 'bg-[#92400E] text-white shadow-sm font-bold'
              : 'text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C]'
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
        <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-300 dark:border-amber-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-950 dark:text-amber-300 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              NEW BILL REQUEST ({pendingOrders.filter((o) => o.billRequested).length} pending from Waiters)
            </span>
            <span className="text-xs text-amber-900 dark:text-amber-200 font-medium">
              Customers finished dining. Generate bill to allow waiter delivery & payment settlement.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingOrders.filter((o) => o.billRequested).map((req) => {
              const reqTotal = req.items?.reduce((sum, i) => sum + Number(i.subtotal || 0), 0) || 0;
              return (
                <div key={req.id} className="bg-white dark:bg-[#1C1815] border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-[#1F2937] dark:text-[#F7F3EC] text-base">
                        Table #{req.table?.tableNumber || req.tableNumber || 'N/A'}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                        BILL REQUESTED
                      </span>
                    </div>
                    <div className="text-xs text-[#5B6470] dark:text-[#A89B8C] font-medium">
                      #{req.orderNumber} • {req.table?.capacity || 4} Guests • {req.items?.length || 0} Items
                    </div>
                    <div className="text-base font-extrabold text-[#92400E] dark:text-[#D97706] font-mono pt-1 tabular-nums">
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#1C1815] p-3.5 sm:p-4 rounded-2xl border border-[#E5D8C6] dark:border-[#382F26] shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#5B6470] dark:text-[#A89B8C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Bill #, Receptionist, Table..."
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl pl-10 pr-4 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#5B6470] dark:placeholder-[#8C7E72] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {billFilterOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPaymentModeFilter(opt.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#92400E] ${
                    paymentModeFilter === opt.id
                      ? 'bg-[#92400E] text-white border-[#92400E] shadow-xs'
                      : 'bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] border-[#E5D8C6] dark:border-[#382F26] hover:bg-[#F1E8DB] dark:hover:bg-[#2F2722] hover:text-[#1F2937] dark:hover:text-[#F7F3EC]'
                  }`}
                >
                  {opt.label} <span className="tabular-nums">({opt.count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl overflow-hidden shadow-sm">
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
                  <thead className="sticky top-0 z-10 bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26] tracking-wider">
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
                  <tbody className="divide-y divide-[#E5D8C6] dark:divide-[#382F26] text-[#1F2937] dark:text-[#F7F3EC]">
                    {filteredBills.map((bill) => {
                      const info = getBillPaymentInfo(bill);

                      return (
                        <tr key={bill.id} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#25201C]/60 transition-colors">
                          <td className="px-5 py-4 font-mono font-bold text-[#1F2937] dark:text-[#F7F3EC]">
                            {bill.billNumber || `INV-${bill.id.slice(0, 8)}`}
                            <span className="block text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-normal tabular-nums mt-0.5">
                              {new Date(bill.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[#1F2937] dark:text-[#F7F3EC]">
                            <span className="font-semibold text-[#1F2937] dark:text-[#F7F3EC]">
                              {bill.receptionist?.name || 'Reception Staff'}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-[#1F2937] dark:text-[#F7F3EC]">
                            Table #{bill.order?.table?.tableNumber || bill.tableNumber || 'N/A'}
                          </td>
                          <td className="px-5 py-4 text-[#5B6470] dark:text-[#A89B8C] font-mono tabular-nums">
                            {currency}{Number(bill.subtotal || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-4 font-extrabold text-[#92400E] dark:text-[#D97706] font-mono text-sm tabular-nums">
                            {currency}{Number(bill.totalAmount || bill.grandTotal || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-4">
                            {info.isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
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
                              <span className="text-[10px] text-[#9CA3AF] dark:text-[#6B7280] font-medium">Unsettled</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {info.isPaid && info.paidAt ? (
                              <span className="text-[#5B6470] dark:text-[#A89B8C] font-mono text-[11px] whitespace-nowrap tabular-nums">
                                {formatPaidAt(info.paidAt)}
                              </span>
                            ) : (
                              <span className="text-[#9CA3AF] dark:text-[#6B7280] text-[11px] font-mono">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedBillForItems(bill)}
                              className="inline-flex items-center gap-1.5 min-h-[36px] bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2F2722] active:scale-95 text-[#1F2937] dark:text-[#F7F3EC] px-3 py-1.5 rounded-xl border border-[#E5D8C6] dark:border-[#382F26] text-[11px] font-bold transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
                              title="Inspect Ordered Items"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#92400E] dark:text-[#D97706]" />
                              <span>View Items</span>
                            </button>

                            <button
                              onClick={() => setReceiptBill(bill)}
                              className="inline-flex items-center gap-1.5 min-h-[36px] bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2F2722] active:scale-95 text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] px-3 py-1.5 rounded-xl border border-[#E5D8C6] dark:border-[#382F26] text-[11px] font-bold transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
                              title="Print Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>

                            {!info.isPaid && (
                              <button
                                onClick={() => openPaymentModal(bill)}
                                className="inline-flex items-center gap-1.5 min-h-[36px] bg-[#92400E] hover:bg-[#78350F] active:scale-95 text-white px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
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
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#1C1815] p-3.5 sm:p-4 rounded-2xl border border-[#E5D8C6] dark:border-[#382F26] shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#92400E] dark:text-[#D97706]" />
              <span className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC]">Filter by Payment Mode:</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['ALL', 'CASH', 'UPI', 'CARD', 'RAZORPAY'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentTxFilter(mode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#92400E] ${
                    paymentTxFilter === mode
                      ? 'bg-[#92400E] text-white border-[#92400E] shadow-xs'
                      : 'bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] border-[#E5D8C6] dark:border-[#382F26] hover:bg-[#F1E8DB] dark:hover:bg-[#2F2722] hover:text-[#1F2937] dark:hover:text-[#F7F3EC]'
                  }`}
                >
                  {mode === 'ALL' ? 'All Transactions' : mode}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl overflow-hidden shadow-sm">
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
                  <thead className="sticky top-0 z-10 bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26] tracking-wider">
                    <tr>
                      <th className="px-5 py-4">Payment ID</th>
                      <th className="px-5 py-4">Bill / Ref</th>
                      <th className="px-5 py-4">Payment Mode</th>
                      <th className="px-5 py-4">Amount Paid</th>
                      <th className="px-5 py-4">Settled At</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5D8C6] dark:divide-[#382F26] text-[#1F2937] dark:text-[#F7F3EC]">
                    {filteredPayments.map((p) => {
                      const mode = p.paymentMethod || p.method || 'CASH';
                      return (
                        <tr key={p.id} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#25201C]/60 transition-colors">
                          <td className="px-5 py-4 font-mono text-[#5B6470] dark:text-[#A89B8C]">
                            #{p.id.slice(0, 8)}
                          </td>
                          <td className="px-5 py-4 font-bold text-[#1F2937] dark:text-[#F7F3EC]">
                            {p.bill?.billNumber || `Bill #${p.billId?.slice(0, 6)}`}
                          </td>
                          <td className="px-5 py-4 font-semibold text-[#1F2937] dark:text-[#F7F3EC]">
                            {getMethodBadge(mode)}
                          </td>
                          <td className="px-5 py-4 font-extrabold text-[#92400E] dark:text-[#D97706] font-mono text-sm tabular-nums">
                            {currency}{Number(p.amountPaid || p.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-4 text-[#5B6470] dark:text-[#A89B8C] font-mono tabular-nums">
                            {new Date(p.createdAt || Date.now()).toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
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
        <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl overflow-hidden shadow-sm">
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
                <thead className="sticky top-0 z-10 bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26] tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Table / Ticket</th>
                    <th className="px-5 py-4">Items Ordered</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Elapsed</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D8C6] dark:divide-[#382F26] text-[#1F2937] dark:text-[#F7F3EC]">
                  {pendingOrders.map((ord) => {
                    const ordTotal = ord.items?.reduce((sum, i) => sum + Number(i.subtotal || 0), 0) || 0;
                    return (
                      <tr
                        key={ord.id}
                        className={`transition-colors ${
                          ord.billRequested
                            ? 'bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 border-l-4 border-l-[#D97706]'
                            : 'hover:bg-[#FAF7F2]/60 dark:hover:bg-[#25201C]/60'
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="font-extrabold text-[#1F2937] dark:text-[#F7F3EC] text-sm flex items-center gap-1.5">
                            <span>Table #{ord.table?.tableNumber || ord.tableNumber || 'N/A'}</span>
                            {ord.billRequested && (
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                REQUESTED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] font-mono mt-0.5">
                            #{ord.orderNumber || ord.id.slice(0, 8)}
                          </div>
                          {ord.waiter && (
                            <div className="text-[10px] text-[#92400E] dark:text-[#D97706] font-medium mt-0.5">
                              Waiter: {ord.waiter.name}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-0.5 max-h-16 overflow-y-auto pr-1">
                            {ord.items?.map((it, idx) => (
                              <div key={idx} className="text-[#1F2937] dark:text-[#F7F3EC] text-xs">
                                <span className="font-semibold tabular-nums">{it.quantity}x</span> {it.menuItem?.name || it.name}
                              </div>
                            ))}
                          </div>
                          <div className="text-xs font-bold text-[#92400E] dark:text-[#D97706] font-mono mt-1 tabular-nums">
                            Total: {currency}{ordTotal.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {ord.billRequested ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                              BILL REQUESTED
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {ord.status}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-[#5B6470] dark:text-[#A89B8C] font-mono tabular-nums">
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
              <Receipt className="w-5 h-5 text-[#92400E] dark:text-[#D97706]" />
              <span>Invoice #{selectedBillForItems.billNumber || selectedBillForItems.id.slice(0, 8)}</span>
            </span>
          ) : 'Invoice Items'
        }
        subtitle={
          selectedBillForItems ? (
            <span>
              Generated by: <strong className="text-[#1F2937] dark:text-[#F7F3EC]">{selectedBillForItems.receptionist?.name || 'Receptionist'}</strong> on {new Date(selectedBillForItems.createdAt).toLocaleString()}
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#FAF7F2] dark:bg-[#25201C] p-3 rounded-xl border border-[#E5D8C6] dark:border-[#382F26] text-xs">
                  <div>
                    <span className="text-[#5B6470] dark:text-[#A89B8C] block text-[10px] font-medium">Table</span>
                    <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC]">
                      Table #{selectedBillForItems.order?.table?.tableNumber || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5B6470] dark:text-[#A89B8C] block text-[10px] font-medium">Payment Status</span>
                    <span className={`font-bold ${modalInfo.isPaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#92400E] dark:text-[#D97706]'}`}>
                      {modalInfo.statusText}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5B6470] dark:text-[#A89B8C] block text-[10px] font-medium">Payment Mode</span>
                    <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC]">
                      {modalInfo.isPaid || modalInfo.isPartiallyPaid ? formatMethodName(modalInfo.mode) : 'Unsettled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5B6470] dark:text-[#A89B8C] block text-[10px] font-medium">Paid At</span>
                    <span className="font-mono text-[#1F2937] dark:text-[#F7F3EC] font-semibold text-[11px] tabular-nums">
                      {modalInfo.isPaid && modalInfo.paidAt ? formatPaidAt(modalInfo.paidAt) : '—'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Ordered Items Table */}
            <div>
              <h4 className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-[#92400E] dark:text-[#D97706]" />
                <span>Ordered Items in Bill</span>
              </h4>
              <div className="bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26]">
                    <tr>
                      <th className="px-3.5 py-2.5">Item Name</th>
                      <th className="px-3.5 py-2.5 text-center">Qty</th>
                      <th className="px-3.5 py-2.5 text-right">Price</th>
                      <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5D8C6] dark:divide-[#382F26] text-[#1F2937] dark:text-[#F7F3EC]">
                    {(selectedBillForItems.order?.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#2F2722]/60">
                        <td className="px-3.5 py-2.5 font-semibold text-[#1F2937] dark:text-[#F7F3EC]">
                          {it.menuItem?.name || it.name || 'Dish Item'}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-bold text-[#1F2937] dark:text-[#F7F3EC] tabular-nums">
                          {it.quantity}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-[#5B6470] dark:text-[#A89B8C] tabular-nums">
                          {currency}{Number(it.unitPrice || it.price || 0).toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#92400E] dark:text-[#D97706] tabular-nums">
                          {currency}{Number(it.subtotal || it.quantity * (it.unitPrice || it.price || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bill Totals Summary */}
            <div className="bg-[#FAF7F2] dark:bg-[#25201C] p-3.5 rounded-xl border border-[#E5D8C6] dark:border-[#382F26] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#5B6470] dark:text-[#A89B8C]">
                <span>Subtotal:</span>
                <span className="font-mono text-[#1F2937] dark:text-[#F7F3EC] font-semibold tabular-nums">
                  {currency}{Number(selectedBillForItems.subtotal || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#5B6470] dark:text-[#A89B8C]">
                <span>Tax ({selectedBillForItems.taxRate || 5}%):</span>
                <span className="font-mono text-[#1F2937] dark:text-[#F7F3EC] font-semibold tabular-nums">
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
              <div className="pt-2 border-t border-[#E5D8C6] dark:border-[#382F26] flex justify-between text-sm font-bold">
                <span className="text-[#1F2937] dark:text-[#F7F3EC]">Total Bill Amount:</span>
                <span className="text-[#92400E] dark:text-[#D97706] font-mono text-base font-extrabold tabular-nums">
                  {currency}{Number(selectedBillForItems.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E5D8C6] dark:border-[#382F26]">
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
              <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1.5">Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-sm text-[#1F2937] dark:text-[#F7F3EC] font-mono tabular-nums focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1.5">Fixed Disc ({currency})</label>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-sm text-[#1F2937] dark:text-[#F7F3EC] font-mono tabular-nums focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1.5">Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-sm text-[#1F2937] dark:text-[#F7F3EC] font-mono tabular-nums focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1.5">Invoice Notes</label>
            <input
              type="text"
              placeholder="e.g. Corporate discount applied"
              value={billNotes}
              onChange={(e) => setBillNotes(e.target.value)}
              className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-sm text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5D8C6] dark:border-[#382F26]">
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
            <div className="bg-[#FAF7F2] dark:bg-[#25201C] p-4 rounded-xl border border-[#E5D8C6] dark:border-[#382F26] mb-4 text-center">
              <span className="text-xs text-[#5B6470] dark:text-[#A89B8C] font-semibold">Total Payable Amount</span>
              <div className="text-3xl font-extrabold text-[#92400E] dark:text-[#D97706] font-mono mt-1 tabular-nums">
                {currency}{Number(selectedBillForPayment.totalAmount || selectedBillForPayment.grandTotal || 0).toFixed(2)}
              </div>
            </div>

            <form onSubmit={handleSettlePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-2">Payment Method</label>
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
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] ${
                          isSelected
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-[#92400E] dark:text-amber-300 border-[#92400E] dark:border-amber-600 shadow-xs'
                            : 'bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] border-[#E5D8C6] dark:border-[#382F26] hover:bg-[#F1E8DB] dark:hover:bg-[#2F2722] hover:text-[#1F2937] dark:hover:text-[#F7F3EC]'
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
                  <Globe className="w-4 h-4 text-[#92400E] dark:text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-[#92400E] dark:text-[#D97706]">Razorpay Test Mode Checkout</span>
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
                  <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1.5">
                    Amount Received ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-sm text-[#1F2937] dark:text-[#F7F3EC] font-mono tabular-nums focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1.5">
                  Transaction Reference / Notes
                </label>
                <input
                  type="text"
                  placeholder={paymentMethod === 'RAZORPAY' ? 'Optional online transaction notes' : 'e.g. UPI Ref #12345 or Auth Code'}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-sm text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5D8C6] dark:border-[#382F26]">
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

      {/* PRINT RECEIPT MODAL */}
      {receiptBill && (
        <ReceiptModal bill={receiptBill} onClose={() => setReceiptBill(null)} />
      )}
    </div>
  );
}
