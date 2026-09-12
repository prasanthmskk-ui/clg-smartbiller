import React, { useCallback, useEffect, useState } from 'react'
import { apiFetch, getLocalStorageReceipts } from '../utils/api'

function SavedReceipts() {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [serverUnavailable, setServerUnavailable] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const loadReceipts = useCallback(async () => {
    setLoading(true)
    setServerUnavailable(false)

    try {
      const response = await apiFetch('/api/receipts')
      const data = await response.json()

      // Always use the actual API response when the server responds.
      setReceipts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Server unavailable; loading receipts from LocalStorage:', error)

      // Use LocalStorage only when the API request actually fails.
      setReceipts(getLocalStorageReceipts())
      setServerUnavailable(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReceipts()
  }, [loadReceipts])

  const filteredReceipts = receipts.filter((receipt) => {
    const search = searchTerm.toLowerCase().trim()

    if (!search) return true

    const customerName = String(receipt.customer_name || '').toLowerCase()
    const phoneNumber = String(receipt.phone_number || '').toLowerCase()
    const receiptId = String(receipt.id || '').toLowerCase()

    return (
      customerName.includes(search) ||
      phoneNumber.includes(search) ||
      receiptId.includes(search)
    )
  })

  const handleRetry = () => {
    loadReceipts()
  }

  const handleReprint = (receipt) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900')

    if (!printWindow) {
      alert('Please allow pop-ups to reprint the receipt.')
      return
    }

    const items = Array.isArray(receipt.items) ? receipt.items : []

    const itemsHtml = items
      .map(
        (item) => `
          <tr>
            <td>${item.product_name || item.name || '-'}</td>
            <td>${item.quantity || 0}</td>
            <td>₹${Number(item.unit_price || item.price || 0).toFixed(2)}</td>
            <td>₹${Number(item.total_price || item.total || 0).toFixed(2)}</td>
          </tr>
        `
      )
      .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${receipt.id || ''}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #222;
            }

            .receipt {
              max-width: 700px;
              margin: auto;
            }

            h1 {
              text-align: center;
              margin-bottom: 5px;
            }

            .info {
              margin: 20px 0;
              line-height: 1.6;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th,
            td {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: left;
            }

            th {
              background: #f3f3f3;
            }

            .total {
              text-align: right;
              font-size: 20px;
              font-weight: bold;
              margin-top: 20px;
            }

            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
            }

            @media print {
              body {
                padding: 10px;
              }
            }
          </style>
        </head>

        <body>
          <div class="receipt">
            <h1>Smart Biller</h1>

            <div class="info">
              <strong>Receipt #:</strong> ${receipt.id || '-'}<br />
              <strong>Customer:</strong> ${receipt.customer_name || '-'}<br />
              <strong>Phone:</strong> ${receipt.phone_number || '-'}<br />
              <strong>Date:</strong> ${
                receipt.created_at
                  ? new Date(receipt.created_at).toLocaleString()
                  : '-'
              }
            </div>

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="total">
              Total: ₹${Number(receipt.total_amount || 0).toFixed(2)}
            </div>

            <div class="footer">
              Thank you for your purchase!
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `)

    printWindow.document.close()
  }

  return (
    <div className="saved-receipts-page">
      <div className="saved-receipts-header">
        <div>
          <h1>Saved Receipts</h1>
          <p>View and reprint your saved billing receipts.</p>
        </div>

        <button onClick={handleRetry}>
          Refresh
        </button>
      </div>

      {serverUnavailable && (
        <div className="server-warning">
          <strong>Billing server unavailable</strong>
          <p>
            Showing locally saved receipts. Check your internet connection
            and retry.
          </p>

          <button onClick={handleRetry}>
            Retry connection
          </button>
        </div>
      )}

      <div className="saved-receipts-search">
        <input
          type="text"
          placeholder="Search by customer, phone or receipt ID..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">
          Loading receipts...
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="no-receipts">
          <h3>No receipts found</h3>
          <p>
            {searchTerm
              ? 'Try a different search.'
              : 'No saved receipts are available.'}
          </p>
        </div>
      ) : (
        <div className="receipts-list">
          {filteredReceipts.map((receipt) => (
            <div
              className="receipt-card"
              key={receipt.id || `${receipt.customer_name}-${receipt.created_at}`}
            >
              <div className="receipt-card-header">
                <div>
                  <h3>
                    Receipt #{receipt.id || '-'}
                  </h3>

                  <p>
                    {receipt.created_at
                      ? new Date(receipt.created_at).toLocaleString()
                      : '-'}
                  </p>
                </div>

                <button onClick={() => handleReprint(receipt)}>
                  Reprint
                </button>
              </div>

              <div className="receipt-customer">
                <p>
                  <strong>Customer:</strong>{' '}
                  {receipt.customer_name || '-'}
                </p>

                <p>
                  <strong>Phone:</strong>{' '}
                  {receipt.phone_number || '-'}
                </p>
              </div>

              {Array.isArray(receipt.items) &&
                receipt.items.length > 0 && (
                  <div className="receipt-items">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>

                      <tbody>
                        {receipt.items.map((item, index) => (
                          <tr
                            key={
                              item.id ||
                              `${item.product_name || item.name}-${index}`
                            }
                          >
                            <td>
                              {item.product_name ||
                                item.name ||
                                '-'}
                            </td>

                            <td>
                              {item.quantity || 0}
                            </td>

                            <td>
                              ₹
                              {Number(
                                item.unit_price ||
                                  item.price ||
                                  0
                              ).toFixed(2)}
                            </td>

                            <td>
                              ₹
                              {Number(
                                item.total_price ||
                                  item.total ||
                                  0
                              ).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              <div className="receipt-total">
                <strong>
                  Total: ₹
                  {Number(
                    receipt.total_amount || 0
                  ).toFixed(2)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SavedReceipts