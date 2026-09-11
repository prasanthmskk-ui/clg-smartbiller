import React from 'react'
import { createPortal } from 'react-dom'

function PrintableInvoice({ selectedReceipt }) {
  if (!selectedReceipt || !selectedReceipt.items || selectedReceipt.items.length === 0) return null

  return createPortal(
    <div className="printable-invoice" id="printable-invoice">
      <h1 className="inv-main-title">INVOICE</h1>

      <div className="inv-meta-grid">
        <div className="inv-customer-details">
          <p><strong>Customer:</strong> {selectedReceipt?.customerName}</p>
          <p><strong>Mobile:</strong> {selectedReceipt?.phoneNumber}</p>
        </div>
        <div className="inv-date-details">
          <p><strong>Date:</strong> {selectedReceipt?.date}</p>
        </div>
      </div>

      <table className="inv-grid-table">
        <thead>
          <tr>
            <th className="col-name">Item Name</th>
            <th className="col-qty">Quantity</th>
            <th className="col-price">Price</th>
            <th className="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {selectedReceipt?.items?.map((item, idx) => (
            <tr key={idx}>
              <td className="col-name">{item.name}</td>
              <td className="col-qty">{item.quantity}</td>
              <td className="col-price">₹{item.price}</td>
              <td className="col-total">₹{item.price * item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inv-summary">
        <hr className="inv-hr" />
        <div className="inv-grand-total">
          GRAND TOTAL: ₹{selectedReceipt?.totalAmount}
        </div>
      </div>

      <div className="inv-note">
        <p><em>Thank you for your business!</em></p>
      </div>
    </div>,
    document.getElementById('print-portal')
  )
}

export default React.memo(PrintableInvoice)
