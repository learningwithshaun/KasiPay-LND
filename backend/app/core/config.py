"""Application configuration using Pydantic Settings"""
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Server
    app_name: str = "Lightning Payday"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 3001
    
    # Environment
    environment: Literal["development", "staging", "production"] = "development"
    mock_mode: bool = False
    
    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "lightning-payday"
    
    # Redis (optional)
    redis_url: str = "redis://localhost:6379"
    
    # JWT Authentication
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 60 * 24 * 7  # 7 days
    jwt_refresh_expire_minutes: int = 60 * 24 * 30  # 30 days
    
    # LND Configuration
    lnd_grpc_host: str = "localhost:10009"
    lnd_cert_path: str = ""
    lnd_macaroon_path: str = ""
    lnd_network: Literal["mainnet", "testnet", "regtest"] = "regtest"
    
    # Exchange Rate
    exchange_rate_api_url: str = "https://api.coingecko.com/api/v3"
    exchange_rate_cache_minutes: int = 15
    
    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60
    
    @property
    def is_lnd_configured(self) -> bool:
        """Check if LND credentials are configured"""
        return bool(self.lnd_cert_path and self.lnd_macaroon_path)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()

