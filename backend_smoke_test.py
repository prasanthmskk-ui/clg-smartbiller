import requests

BASE_URL = "http://127.0.0.1:5000"


def test_health():
    print("\n[1] Testing health endpoint...")

    response = requests.get(
        f"{BASE_URL}/api/health",
        timeout=10
    )

    print("Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 200
    assert response.json().get("status") == "ok"

    print("✅ Health test passed")


def test_save_receipt():
    print("\n[2] Testing save receipt...")

    payload = {
        "customer_name": "Aiven Test Customer",
        "phone_number": "9999999999",
        "total_amount": 300,
        "items": [
            {
                "product_name": "Aiven Test Product",
                "quantity": 2,
                "price": 150
            }
        ]
    }

    response = requests.post(
        f"{BASE_URL}/api/save-receipt",
        json=payload,
        timeout=10
    )

    print("Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 201
    assert response.json().get("success") is True

    receipt_id = response.json().get("receipt_id")

    print("✅ Receipt saved")
    print("Receipt ID:", receipt_id)


def test_get_receipts():
    print("\n[3] Testing get receipts...")

    response = requests.get(
        f"{BASE_URL}/api/receipts",
        timeout=10
    )

    print("Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 200
    assert isinstance(response.json(), list)

    print("✅ Get receipts test passed")


if __name__ == "__main__":

    print("=" * 50)
    print("SMART BILLER BACKEND SMOKE TEST")
    print("=" * 50)

    try:
        test_health()
        test_save_receipt()
        test_get_receipts()

        print("\n" + "=" * 50)
        print("🎉 ALL BACKEND TESTS PASSED")
        print("=" * 50)

    except requests.exceptions.ConnectionError:
        print("\n❌ Backend is not running.")
        print("Start Flask backend first.")

    except Exception as e:
        print("\n❌ TEST FAILED")
        print("Error:", e)