import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReceiptModal({ bill, onClose }) {
  const { restaurant } = useAuth();
  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = restaurant?.currency || '₹';
  const order = bill.order || {};
  const items = order.items || bill.items || [];

  const completedPayments = (bill.payments || []).filter(
    (p) => (p.status || 'COMPLETED').toUpperCase() === 'COMPLETED'
  );
  const sortedPayments = [...completedPayments].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  const latestPayment = sortedPayments[0] || bill.payments?.[0];

  const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalBillAmount = Number(bill.totalAmount || bill.grandTotal || 0);
  const rawStatus = (bill.status || bill.paymentStatus || '').toUpperCase();
  const isPaid = rawStatus === 'PAID' || (totalBillAmount > 0 && totalPaid >= totalBillAmount);
  const isPartiallyPaid = !isPaid && (rawStatus === 'PARTIALLY_PAID' || (totalPaid > 0 && totalPaid < totalBillAmount));
  const statusLabel = isPaid ? 'PAID' : (isPartiallyPaid ? 'PARTIALLY PAID' : 'UNPAID');

  const rawMethod = latestPayment ? (latestPayment.method || latestPayment.paymentMethod) : null;
  const formatMethod = (m) => {
    if (!m) return 'Unsettled';
    switch (String(m).toUpperCase()) {
      case 'CASH': return 'Cash';
      case 'UPI': return 'UPI';
      case 'CARD': return 'Card';
      case 'RAZORPAY': return 'Razorpay';
      case 'NET_BANKING': return 'Net Banking';
      case 'OTHER': return 'Other';
      default: return m;
    }
  };
  const paymentMethodLabel = (isPaid || isPartiallyPaid) ? formatMethod(rawMethod) : 'Unsettled';
  const txnRef = latestPayment?.transactionReference || latestPayment?.razorpayPaymentId;
  const paidAt = (isPaid || isPartiallyPaid) ? (latestPayment?.createdAt || bill.updatedAt) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Actions */}
        <div className="p-4 border-b border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#92400E] dark:text-[#D97706] font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>Tax Invoice / Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#92400E] hover:bg-[#78350F] text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] p-1.5 rounded-lg hover:bg-[#F1E8DB] dark:hover:bg-[#25201A] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs bg-[#FAF7F2] dark:bg-[#141210]">
          <div id="printable-receipt" className="bg-white text-black p-6 rounded-lg shadow-sm border border-slate-200">
            {/* Store Header */}
            <div className="text-center pb-4 border-b border-dashed border-gray-400">
              <h2 className="text-lg font-bold uppercase tracking-wider">{restaurant?.name || 'POS RESTAURANT'}</h2>
              <p className="text-[11px] text-gray-600 mt-1">{restaurant?.address || 'City Center Mall, Food Court'}</p>
              <p className="text-[11px] text-gray-600">Tel: {restaurant?.phone || '+91 98765 43210'}</p>
              {restaurant?.gstNumber && (
                <p className="text-[11px] font-semibold text-gray-700 mt-0.5">GSTIN: {restaurant.gstNumber}</p>
              )}
            </div>

            {/* Bill Meta */}
            <div className="py-3 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Bill No:</span>
                <span className="font-bold">{bill.billNumber || `INV-${bill.id?.slice(0, 8)}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Table:</span>
                <span className="font-bold">Table #{order.table?.tableNumber || bill.tableNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span>{new Date(bill.createdAt || Date.now()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-bold uppercase ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>{statusLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Method:</span>
                <span className="font-bold uppercase">{paymentMethodLabel}</span>
              </div>
              {txnRef && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Txn Ref:</span>
                  <span className="font-mono text-[10px] truncate max-w-[180px]">{txnRef}</span>
                </div>
              )}
              {paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid At:</span>
                  <span className="font-mono text-[10px]">{new Date(paidAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Itemized Table */}
            <div className="py-3 border-b border-dashed border-gray-400">
              <div className="flex justify-between font-bold pb-2 text-[11px]">
                <span className="w-1/2">Item</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/6 text-right">Price</span>
                <span className="w-1/6 text-right">Total</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {items.map((it, idx) => {
                  const name = it.menuItem?.name || it.name || 'Dish';
                  const qty = it.quantity || 1;
                  const price = it.unitPrice || it.price || 0;
                  return (
                    <div key={idx} className="flex justify-between">
                      <span className="w-1/2 truncate">{name}</span>
                      <span className="w-1/6 text-center">{qty}</span>
                      <span className="w-1/6 text-right">{currency}{Number(price).toFixed(2)}</span>
                      <span className="w-1/6 text-right font-medium">{currency}{(qty * price).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculations */}
            <div className="pt-3 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>{currency}{Number(bill.subtotal || 0).toFixed(2)}</span>
              </div>
              {bill.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>-{currency}{Number(bill.discountAmount).toFixed(2)}</span>
                </div>
              )}
              {bill.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax / GST ({bill.taxRate || 5}%):</span>
                  <span>{currency}{Number(bill.taxAmount).toFixed(2)}</span>
                </div>
              )}
              {bill.serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Charge:</span>
                  <span>{currency}{Number(bill.serviceCharge).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-dashed border-gray-400 mt-2">
                <span>Grand Total:</span>
                <span>{currency}{Number(bill.totalAmount || bill.grandTotal || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-gray-500 mt-6 border-t border-dashed border-gray-400 pt-3">
              <p className="font-semibold">Thank you for dining with us!</p>
              <p>Have a wonderful day!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
