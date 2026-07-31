# PlayToCash Admin Dashboard Setup

## Environment Variables Required

Add the following environment variables to your `.env.local` file:

```env
# Admin Dashboard Password
ADMIN_PASSWORD=your_secure_admin_password_here

# MonCash Merchant Balance (optional - for finance dashboard)
MONCASH_MERCHANT_BALANCE=780000
```

## Security Notes

1. **ADMIN_PASSWORD**: This is the password required to access the admin dashboard at `/admin/login`. 
   - Store this in `.env.local` (never commit to git)
   - Use a strong, unique password
   - Change this password regularly

2. **MONCASH_MERCHANT_BALANCE**: This is used to display the MonCash merchant balance in the finance dashboard.
   - This can be updated manually or connected to the MonCash API in the future
   - Used to calculate platform balance: `Platform Balance = Total User Capital - MonCash Balance`

## Accessing the Admin Dashboard

1. Navigate to `https://playtocash.vercel.app/admin/login`
2. Enter your admin password
3. You will be redirected to the main dashboard

## Admin Dashboard Features

### Main Dashboard (`/admin`)
- **Finance Section**: 
  - Total user capital
  - MonCash merchant balance
  - Platform balance
- **Game Statistics**:
  - Total players
  - Online users
  - Total games
  - Games in progress
- **Quick Actions**: Links to users, games, and transactions management

### Users Management (`/admin/users`)
- View all users
- Search by email, username, or ID
- View user balance, wins, losses, games played
- Ban/unban users

### Games Management (`/admin/games`)
- View all games
- Filter by status (waiting, playing, finished)
- View game details

### Transactions (`/admin/transactions`)
- View all transactions
- Filter by type (deposit, withdraw, reward, commission)
- Filter by period (today, week, month)
- View transaction details

## Admin Logging

All admin actions are logged to Firebase Realtime Database under `/adminLogs`:

- USER_BAN
- USER_UNBAN
- USER_BALANCE_MODIFY
- GAME_CLOSE
- GAME_RESOLVE
- TRANSACTION_APPROVE
- TRANSACTION_REJECT
- SYSTEM_CONFIGEach log includes:
- Action type
- Admin ID
- Target user/game (if applicable)
- Amount (if applicable)
- Reason
- Timestamp

## Firebase Structure

```
/adminLogs
  /{logId}
    action: string
    adminId: string
    targetUser?: string
    targetGame?: string
    amount?: number
    reason?: string
    metadata?: object
    createdAt: number
```

## Security Features

1. **Middleware Protection**: All `/admin/*` routes are protected by middleware
2. **Session Management**: Admin sessions are stored in httpOnly cookies
3. **Server-side Validation**: All financial calculations are done server-side
4. **Audit Logging**: All admin actions are logged for security
5. **Rate Limiting**: API routes have rate limiting enabled

## Development

To test the admin dashboard locally:

1. Add `ADMIN_PASSWORD=test123` to your `.env.local`
2. Run `npm run dev`
3. Navigate to `http://localhost:3000/admin/login`
4. Enter `test123` as the password
