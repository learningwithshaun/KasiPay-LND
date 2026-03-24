"""BOLT11 Invoice Decoder - decode and validate Lightning invoices"""
from datetime import datetime, timezone
from typing import Any

try:
    from bolt11 import decode as bolt11_decode
    BOLT11_AVAILABLE = True
except ImportError:
    BOLT11_AVAILABLE = False


def decode_invoice(bolt11: str) -> dict[str, Any]:
    """Decode a BOLT11 invoice"""
    if not BOLT11_AVAILABLE:
        raise ImportError("bolt11 library not available")
    
    try:
        decoded = bolt11_decode(bolt11)
        
        # Extract fields
        timestamp = decoded.date
        expiry_seconds = decoded.expiry or 3600  # Default 1 hour
        expiry_date = datetime.fromtimestamp(timestamp + expiry_seconds, tz=timezone.utc)
        
        # Get amount
        amount_sats = 0
        if decoded.amount_msat:
            amount_sats = decoded.amount_msat // 1000
        
        return {
            "payment_hash": decoded.payment_hash,
            "destination": decoded.payee,
            "amount_sats": amount_sats,
            "timestamp": timestamp,
            "expiry": expiry_seconds,
            "expiry_date": expiry_date,
            "description": decoded.description or "",
            "description_hash": decoded.description_hash,
        }
    except Exception as e:
        raise ValueError(f"Invalid BOLT11 invoice: {e}")


def validate_invoice(
    decoded: dict[str, Any],
    expected_amount_sats: int,
    min_expiry_minutes: int = 10,
) -> dict[str, Any]:
    """Validate an invoice meets requirements"""
    
    # Check amount matches exactly
    if decoded["amount_sats"] != expected_amount_sats:
        return {
            "valid": False,
            "error": f"Invoice amount {decoded['amount_sats']} sats does not match expected {expected_amount_sats} sats",
        }
    
    # Check not already expired
    now = datetime.now(timezone.utc)
    if decoded["expiry_date"] <= now:
        return {
            "valid": False,
            "error": "Invoice has already expired",
        }
    
    # Check minimum expiry time remaining
    from datetime import timedelta
    min_expiry = timedelta(minutes=min_expiry_minutes)
    time_until_expiry = decoded["expiry_date"] - now
    
    if time_until_expiry < min_expiry:
        return {
            "valid": False,
            "error": f"Invoice expires in less than {min_expiry_minutes} minutes",
        }
    
    # Check expiry is not too far in future (24 hours max)
    max_expiry = timedelta(hours=24)
    if time_until_expiry > max_expiry:
        return {
            "valid": False,
            "error": "Invoice expiry exceeds 24 hours",
        }
    
    # Check has payment hash
    if not decoded.get("payment_hash"):
        return {
            "valid": False,
            "error": "Invoice missing payment hash",
        }
    
    # Check has destination
    if not decoded.get("destination"):
        return {
            "valid": False,
            "error": "Invoice missing destination pubkey",
        }
    
    return {"valid": True}


def is_invoice_expired(decoded: dict[str, Any]) -> bool:
    """Check if an invoice is expired"""
    return decoded["expiry_date"] <= datetime.now(timezone.utc)


def get_time_until_expiry(decoded: dict[str, Any]) -> int:
    """Get time until invoice expiry in seconds"""
    now = datetime.now(timezone.utc)
    expiry = decoded["expiry_date"]
    diff = expiry - now
    return max(0, int(diff.total_seconds()))


def get_invoice_network(bolt11: str) -> str:
    """Extract network from BOLT11 prefix"""
    prefix = bolt11.lower()
    
    if prefix.startswith("lnbc"):
        return "mainnet"
    elif prefix.startswith("lntb"):
        return "testnet"
    elif prefix.startswith("lnbcrt"):
        return "regtest"
    
    return "unknown"

