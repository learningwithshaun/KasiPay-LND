"""LND gRPC Client - communicates with Lightning Network node"""
import asyncio
from pathlib import Path
from typing import Any

from app.core.config import settings

# Global client instance
_lnd_client: "LndClient | None" = None


class LndClient:
    """LND gRPC client for Lightning Network operations"""
    
    def __init__(
        self,
        grpc_host: str,
        cert_path: str,
        macaroon_path: str,
        network: str = "regtest",
    ):
        self.grpc_host = grpc_host
        self.cert_path = cert_path
        self.macaroon_path = macaroon_path
        self.network = network
        self._connected = False
        self._stub = None
        self._router_stub = None
    
    async def connect(self) -> None:
        """Initialize gRPC connection to LND"""
        try:
            import grpc
            
            # Read credentials
            cert = Path(self.cert_path).read_bytes()
            macaroon = Path(self.macaroon_path).read_bytes().hex()
            
            # Create credentials
            ssl_creds = grpc.ssl_channel_credentials(cert)
            
            # Add macaroon to metadata
            auth_creds = grpc.metadata_call_credentials(
                lambda context, callback: callback([("macaroon", macaroon)], None)
            )
            
            combined_creds = grpc.composite_channel_credentials(ssl_creds, auth_creds)
            
            # Create channel
            self._channel = grpc.aio.secure_channel(self.grpc_host, combined_creds)
            
            # For now, we'll use a simplified approach
            # In production, load proper proto files
            self._connected = True
            print(f"✓ Connected to LND at {self.grpc_host}")
            
        except Exception as e:
            self._connected = False
            raise ConnectionError(f"Failed to connect to LND: {e}")
    
    @property
    def is_connected(self) -> bool:
        """Check if connected to LND"""
        return self._connected
    
    async def get_info(self) -> dict[str, Any]:
        """Get node information"""
        if not self._connected:
            raise RuntimeError("LND not connected")
        
        # This would use the actual gRPC call
        # For now, return placeholder
        return {
            "identity_pubkey": "placeholder",
            "alias": "Hub",
            "num_active_channels": 0,
            "synced_to_chain": True,
        }
    
    async def decode_pay_req(self, bolt11: str) -> dict[str, Any]:
        """Decode a BOLT11 payment request using LND"""
        from app.lnd.invoice_decoder import decode_invoice
        return decode_invoice(bolt11)
    
    async def list_channels(self) -> list[dict[str, Any]]:
        """List all channels"""
        if not self._connected:
            raise RuntimeError("LND not connected")
        
        return []
    
    async def check_liquidity(self, destination: str, amount_sats: int) -> dict[str, Any]:
        """Check outbound liquidity to a destination"""
        channels = await self.list_channels()
        
        # Find channel to destination
        for channel in channels:
            if channel.get("remote_pubkey") == destination and channel.get("active"):
                has_liquidity = channel.get("local_balance", 0) >= amount_sats * 1.01
                return {
                    "has_liquidity": has_liquidity,
                    "available_outbound": channel.get("local_balance", 0),
                    "required_amount": amount_sats,
                    "channel_id": channel.get("chan_id"),
                }
        
        return {
            "has_liquidity": False,
            "available_outbound": 0,
            "required_amount": amount_sats,
        }
    
    async def send_payment(self, bolt11: str, timeout_secs: int = 60) -> dict[str, Any]:
        """Send a payment (pay an invoice)"""
        if not self._connected:
            raise RuntimeError("LND not connected")
        
        # This would use the actual gRPC call
        # lnrpc.SendPaymentSync or routerrpc.SendPaymentV2
        
        # For now, return mock result
        import secrets
        return {
            "success": True,
            "preimage": secrets.token_hex(32),
            "payment_hash": "",
            "fee_sats": 0,
            "status": "SUCCEEDED",
        }
    
    async def lookup_payment(self, payment_hash: str) -> dict[str, Any]:
        """Look up payment status by hash"""
        if not self._connected:
            raise RuntimeError("LND not connected")
        
        return {
            "payment_hash": payment_hash,
            "status": "UNKNOWN",
        }
    
    async def get_balance(self) -> dict[str, int]:
        """Get wallet balance"""
        if not self._connected:
            raise RuntimeError("LND not connected")
        
        return {
            "confirmed_balance": 0,
            "unconfirmed_balance": 0,
        }
    
    async def get_channel_balance(self) -> dict[str, int]:
        """Get channel balance (total liquidity)"""
        if not self._connected:
            raise RuntimeError("LND not connected")
        
        return {
            "local_balance": 0,
            "remote_balance": 0,
        }
    
    def disconnect(self) -> None:
        """Disconnect from LND"""
        self._connected = False
        if hasattr(self, "_channel"):
            asyncio.create_task(self._channel.close())
        print("LND connection closed")


def get_lnd_client() -> LndClient | None:
    """Get the LND client instance"""
    return _lnd_client


async def init_lnd_client() -> LndClient | None:
    """Initialize LND client if configured"""
    global _lnd_client
    
    if not settings.is_lnd_configured:
        print("ℹ LND not configured - Lightning features disabled")
        return None
    
    try:
        _lnd_client = LndClient(
            grpc_host=settings.lnd_grpc_host,
            cert_path=settings.lnd_cert_path,
            macaroon_path=settings.lnd_macaroon_path,
            network=settings.lnd_network,
        )
        await _lnd_client.connect()
        return _lnd_client
    except Exception as e:
        print(f"⚠ LND connection failed: {e}")
        return None

