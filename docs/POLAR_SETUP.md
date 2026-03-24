# Polar Network Setup Guide

This guide explains how to set up a local Lightning Network development environment using Polar for testing the Lightning Payday system.

## Prerequisites

1. **Docker Desktop** - Required by Polar to run LND nodes
2. **Polar** - Download from https://lightningpolar.com/

## Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Polar Local Network                       │
│                                                              │
│   ┌──────────┐     5M sats    ┌──────────┐                  │
│   │ Treasury │───────────────▶│   Hub    │                  │
│   │   Node   │                │   Node   │                  │
│   └──────────┘                └────┬─────┘                  │
│                                    │                         │
│                       500K sats    │    500K sats            │
│                    ┌───────────────┼───────────────┐         │
│                    │               │               │         │
│                    ▼               ▼               ▼         │
│              ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│              │  User1   │   │  User2   │   │ Merchant │     │
│              │  (Alice) │   │  (Bob)   │   │  (Shop)  │     │
│              └──────────┘   └──────────┘   └──────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Create Network in Polar

1. Open Polar and click **"Create Network"**
2. Name it: `lightning-payday-dev`
3. Add nodes:
   - LND node named `treasury` (Alice's default)
   - LND node named `hub`
   - LND node named `user1`
   - LND node named `merchant1`

## Step 2: Start the Network

1. Click **"Start"** on the network
2. Wait for all nodes to sync (status shows "Running")

## Step 3: Fund the Treasury

1. Right-click on `treasury` node
2. Click **"Mine blocks"** → Enter 10 blocks
3. This gives treasury ~6.25 BTC (regtest coins)

## Step 4: Open Channels

### Treasury → Hub (5,000,000 sats)

1. Right-click on `treasury` node
2. Select **"Open Channel"**
3. Choose `hub` as destination
4. Capacity: `5000000` sats
5. Click Open

### Hub → User1 (500,000 sats)

1. Right-click on `hub` node
2. Select **"Open Channel"**
3. Choose `user1` as destination
4. Capacity: `500000` sats
5. Push amount: `0` (all on Hub side)
6. Click Open

### Hub → Merchant1 (500,000 sats)

1. Right-click on `hub` node
2. Select **"Open Channel"**
3. Choose `merchant1` as destination
4. Capacity: `500000` sats
5. Push amount: `0`
6. Click Open

## Step 5: Mine Blocks to Confirm

1. Right-click any node
2. Click **"Mine blocks"** → Enter 6 blocks
3. Channels should now show as "Active"

## Step 6: Get Hub Node Credentials

For the backend to connect to the Hub node, you need:

### gRPC Host

Click on `hub` node → **"Connect"** tab → Note the gRPC port (e.g., `127.0.0.1:10009`)

### TLS Certificate

```bash
# Default Polar path (macOS)
~/.polar/networks/1/volumes/lnd/hub/tls.cert

# Default Polar path (Linux)
~/.polar/networks/1/volumes/lnd/hub/tls.cert

# Default Polar path (Windows)
%USERPROFILE%\.polar\networks\1\volumes\lnd\hub\tls.cert
```

### Admin Macaroon

```bash
# Default Polar path (macOS)
~/.polar/networks/1/volumes/lnd/hub/data/chain/bitcoin/regtest/admin.macaroon

# Or use the "readonly" macaroon for queries only
~/.polar/networks/1/volumes/lnd/hub/data/chain/bitcoin/regtest/readonly.macaroon
```

## Step 7: Configure Backend

Create or update your `.env` file:

```bash
# LND Connection (Hub Node)
LND_GRPC_HOST=127.0.0.1:10009
LND_CERT_PATH=/Users/<your-username>/.polar/networks/1/volumes/lnd/hub/tls.cert
LND_MACAROON_PATH=/Users/<your-username>/.polar/networks/1/volumes/lnd/hub/data/chain/bitcoin/regtest/admin.macaroon
LND_NETWORK=regtest
```

## Testing the Connection

### Via Command Line

```bash
# Install lncli if needed
brew install lightning

# Use Polar's lncli (from the Connect tab)
lncli --network=regtest --rpcserver=127.0.0.1:10009 \
  --tlscertpath=~/.polar/networks/1/volumes/lnd/hub/tls.cert \
  --macaroonpath=~/.polar/networks/1/volumes/lnd/hub/data/chain/bitcoin/regtest/admin.macaroon \
  getinfo
```

### Via API

```bash
# Start backend with LND enabled
npm run dev

# Check LND status
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:3001/api/lnd/status
```

## Testing the Payment Flow

### 1. Create Invoice on User1 Node

In Polar:
1. Click on `user1` node
2. Go to **"Actions"** tab
3. Click **"Create Invoice"**
4. Amount: `2000` sats
5. Memo: `Test payment`
6. Copy the BOLT11 invoice string

### 2. Submit Invoice via API

```bash
# Create a job (claim a task)
curl -X POST http://localhost:3001/api/jobs \
  -H "Authorization: Bearer <earner-token>" \
  -H "Content-Type: application/json" \
  -d '{"taskId": "<task-id>"}'

# Submit the invoice
curl -X POST http://localhost:3001/api/jobs/<job-id>/submit \
  -H "Authorization: Bearer <earner-token>" \
  -H "Content-Type: application/json" \
  -d '{"bolt11": "lnbcrt20u1..."}'
```

### 3. Approve Job (Operator)

```bash
curl -X POST http://localhost:3001/api/jobs/<job-id>/approve \
  -H "Authorization: Bearer <operator-token>"
```

### 4. Verify Payment

- Check Polar: `user1` balance should increase
- Check API response: Should include preimage
- Check `hub` node: Outbound liquidity decreased

## Channel Management

### Check Channel Balances

```bash
lncli --network=regtest listchannels
```

### Rebalance Channels

If Hub runs low on outbound liquidity:

1. Close a depleted channel
2. Open a new channel from Treasury
3. Or use circular rebalancing (advanced)

## Troubleshooting

### "No route found" Error

- Check channels are active in Polar
- Verify Hub has outbound liquidity to User
- Try mining more blocks

### "Invoice expired" Error

- Default expiry is 1 hour
- Create fresh invoice and resubmit

### Connection Refused

- Verify Polar network is running
- Check port numbers in Polar UI
- Ensure Docker is running

### Certificate Error

- Check TLS cert path is correct
- Verify network ID in path (networks/1/)
- Restart Polar if certs regenerated

## Production Considerations

⚠️ This setup is for **development only**. For production:

1. Use mainnet LND node with proper security
2. Store macaroons securely (not in git)
3. Use read-only macaroon for queries
4. Implement proper channel management
5. Set up monitoring and alerts
6. Consider using a Lightning Service Provider (LSP)

## Quick Reference

| Node | Role | Initial Balance |
|------|------|-----------------|
| Treasury | Funds source | ~6.25 BTC |
| Hub | Backend-controlled | 5M sats inbound |
| User1 | Earner wallet | 0 (receives payments) |
| Merchant | Future spend | 0 (receives payments) |

| Channel | Capacity | Direction |
|---------|----------|-----------|
| Treasury → Hub | 5M sats | Hub receives |
| Hub → User1 | 500K sats | User receives |
| Hub → Merchant | 500K sats | Merchant receives |

