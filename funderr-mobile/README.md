# Funderr Mobile App

A React Native / Expo mobile application for the Funderr crowdfunding platform.

## Structure

```
src/app/mobile/
├── App.js                    # Main entry point
├── app.json                  # Expo configuration
├── babel.config.js           # Babel configuration
├── package.json              # Dependencies
└── src/
    ├── navigation/
    │   └── AppNavigator.js   # Navigation setup
    ├── screens/
    │   ├── HomeScreen.js     # Landing page
    │   ├── SignInScreen.js   # Login screen
    │   ├── SignUpScreen.js   # Registration screen
    │   ├── ForgotPasswordScreen.js  # Password reset
    │   ├── RoleSelectionScreen.js   # Role selection after signup
    │   ├── ExploreCampaignsScreen.js # Campaign listing
    │   ├── CampaignDetailsScreen.js  # Single campaign view
    │   ├── ProfileScreen.js  # User profile
    │   ├── DashboardScreen.js # Main dashboard
    │   └── index.js          # Screen exports
    └── services/
        ├── ApiService.js     # API client (uses shared logic)
        ├── AuthService.js    # Auth service (uses shared logic)
        └── index.js          # Service exports

## Shared Code

This mobile app uses shared code from `src/app/shared/`:
- **Config**: API URLs, blockchain settings, validation rules
- **Utils**: Validation, helpers, formatters
- **API**: API client factories
- **Blockchain**: Contract interaction helpers
- **Hooks**: Reusable hooks factories

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Navigate to the mobile app directory:
   ```bash
   cd src/app/mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

4. Run on device/simulator:
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app for physical device

### Configuration

Update the API URL in `src/app/shared/config/index.js`:
- For physical device testing, use your computer's local IP
- For emulator/simulator, localhost should work

## Features

### Authentication
- Email/password sign in
- Registration with email verification
- Password reset flow
- Role selection (Donor / Campaign Creator)

### Campaigns
- Browse featured campaigns
- Search and filter by category
- View campaign details
- Make donations (ETH via blockchain)

### User Profile
- View and edit profile info
- Connect wallet
- View donation/campaign statistics
- Logout

## Tech Stack

- **React Native** (Expo SDK 54)
- **React Navigation** (Native Stack)
- **AsyncStorage** (for local storage)
- **Expo Linear Gradient** (UI gradients)
- **Axios** (HTTP client)
- **ethers.js** (Blockchain interaction)

## API Integration

The mobile app connects to the same backend as the web app:
- Default: `http://192.168.1.10:3001/api` (update IP as needed)
- All API calls go through the shared API client

## Blockchain Integration

Uses the same smart contract as the web app:
- Network: Sepolia Testnet
- Contract Address: `0x13f57b9AD14Ec25bBc162F5Ff6ed688EEDB515b1`

## Development Notes

1. **Hot Reload**: Changes will automatically reload in the app
2. **Console Logs**: View in the terminal where Expo is running
3. **Debugging**: Press `j` in Expo CLI to open Chrome DevTools

## Screens Overview

| Screen | Route | Description |
|--------|-------|-------------|
| Home | `Home` | Landing page with hero and action buttons |
| Sign In | `SignIn` | Email/password login form |
| Sign Up | `SignUp` | Registration with email verification |
| Forgot Password | `ForgotPassword` | 3-step password reset flow |
| Role Selection | `RoleSelection` | Choose Donor or Campaign Creator role |
| Explore | `Explore` | Campaign listing with search/filter |
| Campaign Details | `CampaignDetails` | Single campaign view with donate option |
| Profile | `Profile` | User profile view and edit |
| Dashboard | `Dashboard` | Main dashboard for authenticated users |

## Troubleshooting

### Metro Bundler Issues
```bash
npx expo start -c  # Clear cache and restart
```

### Module Not Found
Ensure all shared imports resolve correctly:
```javascript
// From mobile screens
import { formatCurrency } from '../../shared/utils/helpers';
```

### Network Errors
- Check API URL configuration
- Ensure backend server is running
- For physical device, use actual IP (not localhost)
