"""LND routes - Lightning Network status and operations"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.models.user import UserRole
from app.api.deps import require_role
from app.lnd import get_lnd_client, decode_invoice

router = APIRouter()


class DecodeRequest(BaseModel):
    bolt11: str


@router.get("/status")
async def get_lnd_status(
    current_user: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """Get LND connection status (admin only)"""
    client = get_lnd_client()
    
    if not client or not client.is_connected:
        return {
            "success": True,
            "connected": False,
            "message": "LND client not connected",
        }
    
    try:
        info = await client.get_info()
        return {
            "success": True,
            "connected": True,
            "node": info,
        }
    except Exception as e:
        return {
            "success": True,
            "connected": False,
            "error": str(e),
        }


@router.get("/balance")
async def get_balance(
    current_user: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """Get wallet and channel balances (admin only)"""
    client = get_lnd_client()
    
    if not client or not client.is_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LND not connected",
        )
    
    wallet = await client.get_balance()
    channels = await client.get_channel_balance()
    
    return {
        "success": True,
        "wallet": wallet,
        "channels": channels,
    }


@router.get("/channels")
async def list_channels(
    current_user: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """List all channels (admin only)"""
    client = get_lnd_client()
    
    if not client or not client.is_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LND not connected",
        )
    
    channels = await client.list_channels()
    
    return {
        "success": True,
        "channels": channels,
    }


@router.post("/decode")
async def decode_invoice_route(
    data: DecodeRequest,
    current_user: Annotated[dict, Depends(require_role(UserRole.EARNER, UserRole.OPERATOR, UserRole.ADMIN))],
):
    """Decode a BOLT11 invoice"""
    try:
        decoded = decode_invoice(data.bolt11)
        return {
            "success": True,
            "invoice": {
                "payment_hash": decoded["payment_hash"],
                "destination": decoded["destination"],
                "amount_sats": decoded["amount_sats"],
                "expiry": decoded["expiry_date"].isoformat(),
                "description": decoded.get("description", ""),
            },
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/liquidity/{destination}")
async def check_liquidity(
    destination: str,
    amount: int = 0,
    current_user: Annotated[dict, Depends(require_role(UserRole.OPERATOR, UserRole.ADMIN))],
):
    """Check liquidity to a destination (operator only)"""
    client = get_lnd_client()
    
    if not client or not client.is_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LND not connected",
        )
    
    result = await client.check_liquidity(destination, amount)
    
    return {
        "success": True,
        "liquidity": result,
    }

