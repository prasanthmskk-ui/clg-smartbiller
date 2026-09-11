from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import os
from pathlib import Path
from decimal import Decimal, InvalidOperation


def load_env():
    env_path = Path(__file__).resolve().parents[2] / ".env"

    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)


load_env()


app = Flask(__name__)


# =========================================================
# CORS
# =========================================================

configured_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "https://localhost:5173,"
    "https://127.0.0.1:5173",
)

cors_origins = [
    origin.strip()
    for origin in configured_origins.split(",")
    if origin.strip()
]

CORS(
    app,
    resources={r"/api/*": {"origins": cors_origins}},
    supports_credentials=False,
)


# =========================================================
# DATABASE CONFIGURATION
# =========================================================

db_config = {
    "host": os.environ.get("DB_HOST", "127.0.0.1"),
    "port": int(os.environ.get("DB_PORT", "3306")),
    "database": os.environ.get("DB_NAME", "billing_db"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "connection_timeout": int(
        os.environ.get("DB_CONNECTION_TIMEOUT", "5")
    ),
}


# =========================================================
# AIVEN MYSQL SSL
# =========================================================

ca_file = Path(__file__).resolve().parents[2] / "ca.pem"

if ca_file.exists():
    db_config["ssl_ca"] = str(ca_file)

    # Aiven CA certificate verification
    db_config["ssl_verify_cert"] = True

    # Disable hostname verification for local testing
    db_config["ssl_verify_identity"] = False


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)

        if not conn.is_connected():
            conn.close()
            return None

        return conn

    except Error as e:

        safe_config = {
            key: value
            for key, value in db_config.items()
            if key != "password"
        }

        print(
            f"MySQL connection failed for {safe_config}: {e}"
        )

        return None


# =========================================================
# FALLBACK
# =========================================================

def local_receipts_response():
    response = jsonify([])
    response.headers["X-Database-Fallback"] = "local"
    return response


# =========================================================
# SAVE RECEIPT
# =========================================================

@app.route("/api/save-receipt", methods=["POST"])
def save_receipt():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "error": "Request body must be valid JSON"
        }), 400

    customer_name = str(
        data.get("customer_name", "")
    ).strip()

    phone_number = str(
        data.get("phone_number", "")
    ).strip()

    items = data.get("items")

    if not customer_name or not phone_number:
        return jsonify({
            "success": False,
            "error": "Customer name and phone number are required"
        }), 400

    if len(customer_name) > 255 or len(phone_number) > 64:
        return jsonify({
            "success": False,
            "error": "Customer name or phone number is too long"
        }), 400

    if not isinstance(items, list) or not items:
        return jsonify({
            "success": False,
            "error": "Receipt must contain at least one item"
        }), 400

    # -----------------------------------------------------
    # TOTAL
    # -----------------------------------------------------

    try:
        total_amount = Decimal(
            str(data.get("total_amount", 0))
        )

        if (
            not total_amount.is_finite()
            or total_amount < 0
        ):
            raise InvalidOperation

    except (
        InvalidOperation,
        ValueError,
        TypeError
    ):
        return jsonify({
            "success": False,
            "error": (
                "total_amount must be a valid "
                "non-negative number"
            )
        }), 400

    # -----------------------------------------------------
    # ITEMS
    # -----------------------------------------------------

    normalized_items = []

    for index, item in enumerate(items, start=1):

        if not isinstance(item, dict):
            return jsonify({
                "success": False,
                "error": f"Item {index} must be an object"
            }), 400

        product_name = str(
            item.get("product_name", "")
        ).strip()

        if not product_name:
            return jsonify({
                "success": False,
                "error": (
                    f"Item {index}: "
                    "product_name is required"
                )
            }), 400

        if len(product_name) > 255:
            return jsonify({
                "success": False,
                "error": (
                    f"Item {index}: "
                    "product_name is too long"
                )
            }), 400

        try:
            quantity = int(
                item.get("quantity", 1)
            )

            price = Decimal(
                str(item.get("price", 0))
            )

            if (
                quantity <= 0
                or not price.is_finite()
                or price < 0
            ):
                raise ValueError

        except (
            ValueError,
            TypeError,
            InvalidOperation
        ):
            return jsonify({
                "success": False,
                "error": (
                    f"Item {index}: "
                    "quantity/price is invalid"
                )
            }), 400

        normalized_items.append(
            (
                product_name,
                quantity,
                price
            )
        )

    # -----------------------------------------------------
    # CONNECT
    # -----------------------------------------------------

    conn = get_db_connection()

    if not conn:
        return jsonify({
            "success": False,
            "error": (
                "Database unavailable. Check "
                "Aiven DB settings, password and SSL."
            )
        }), 503

    cursor = conn.cursor()

    try:

        # -------------------------------------------------
        # FIND CUSTOMER
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT id
            FROM customers
            WHERE phone_number = %s
            """,
            (phone_number,)
        )

        customer = cursor.fetchone()

        # -------------------------------------------------
        # EXISTING CUSTOMER
        # -------------------------------------------------

        if customer:

            customer_id = customer[0]

            cursor.execute(
                """
                UPDATE customers
                SET customer_name = %s
                WHERE id = %s
                """,
                (
                    customer_name,
                    customer_id
                )
            )

        # -------------------------------------------------
        # NEW CUSTOMER
        # -------------------------------------------------

        else:

            cursor.execute(
                """
                INSERT INTO customers
                (
                    customer_name,
                    phone_number
                )
                VALUES (%s, %s)
                """,
                (
                    customer_name,
                    phone_number
                )
            )

            customer_id = cursor.lastrowid

        # -------------------------------------------------
        # RECEIPT
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO receipts
            (
                customer_id,
                total_amount
            )
            VALUES (%s, %s)
            """,
            (
                customer_id,
                total_amount
            )
        )

        receipt_id = cursor.lastrowid

        # -------------------------------------------------
        # RECEIPT ITEMS
        # -------------------------------------------------

        for (
            product_name,
            quantity,
            price
        ) in normalized_items:

            cursor.execute(
                """
                INSERT INTO receipt_items
                (
                    receipt_id,
                    product_name,
                    quantity,
                    price
                )
                VALUES (%s, %s, %s, %s)
                """,
                (
                    receipt_id,
                    product_name,
                    quantity,
                    price
                )
            )

        conn.commit()

        return jsonify({
            "success": True,
            "receipt_id": receipt_id
        }), 201

    except Error as e:

        conn.rollback()

        print(
            f"Database operation failed: {e}"
        )

        return jsonify({
            "success": False,
            "error": "Database operation failed"
        }), 500

    except Exception as e:

        conn.rollback()

        print(
            f"Unexpected server error: {e}"
        )

        return jsonify({
            "success": False,
            "error": "Unexpected server error"
        }), 500

    finally:

        cursor.close()
        conn.close()


# =========================================================
# GET RECEIPTS
# =========================================================

@app.route("/api/receipts", methods=["GET"])
def get_receipts():

    conn = get_db_connection()

    if not conn:
        return local_receipts_response()

    cursor = conn.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                r.id,
                r.total_amount,
                r.created_at,
                c.customer_name,
                c.phone_number
            FROM receipts r
            JOIN customers c
                ON r.customer_id = c.id
            ORDER BY r.created_at DESC
            """
        )

        receipts = cursor.fetchall()

        for receipt in receipts:

            cursor.execute(
                """
                SELECT
                    product_name,
                    quantity,
                    price
                FROM receipt_items
                WHERE receipt_id = %s
                """,
                (receipt["id"],)
            )

            receipt["items"] = cursor.fetchall()

            receipt["total_amount"] = float(
                receipt["total_amount"]
            )

            for item in receipt["items"]:
                item["price"] = float(
                    item["price"]
                )

        return jsonify(receipts)

    except Error as e:

        print(
            f"Get receipts failed: {e}"
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()


# =========================================================
# HEALTH
# =========================================================

@app.route("/api/health", methods=["GET"])
def health():

    return jsonify({
        "status": "ok"
    })


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":

    app.run(
        host=os.environ.get(
            "BACKEND_HOST",
            "0.0.0.0"
        ),
        port=int(
            os.environ.get(
                "PORT",
                os.environ.get(
                    "BACKEND_PORT",
                    "5000"
                )
            )
        ),
        debug=(
            os.environ
            .get("FLASK_DEBUG", "")
            .lower() == "true"
        ),
    )