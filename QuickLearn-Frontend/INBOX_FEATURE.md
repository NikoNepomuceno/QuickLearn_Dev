# Inbox Feature - Friend Requests

## Frontend Implementation Summary

### Components Created

#### 1. InboxPanel.vue
Location: `src/features/leaderboard/components/InboxPanel.vue`

**Features:**
- Displays list of pending friend requests
- Shows user avatar (with fallback to initials)
- Displays username, display name, and time ago
- Accept/Decline buttons for each request
- Loading state
- Empty state when no requests
- Emits events for badge management

**Events:**
- `requestsViewed` - Emitted when component mounts to clear badge
- `requestUpdated` - Emitted when a request is accepted/declined

### Updated Components

#### 2. Leaderboards.vue
Location: `src/features/leaderboard/pages/Leaderboards.vue`

**Changes:**
- Added "Inbox" tab with badge
- Badge shows count of pending friend requests
- Badge animates with pulse effect
- Badge clears when inbox is viewed
- Polls for new requests every 30 seconds
- Imports and renders InboxPanel component

**Badge Features:**
- Positioned at top-right of Inbox button
- Red gradient background
- Displays number of pending requests
- Pulse animation to draw attention
- Auto-clears when inbox is opened

### API Services

#### 3. leaderboard.api.js
Location: `src/features/leaderboard/services/leaderboard.api.js`

**New Functions:**
- `getFriendRequests()` - Fetches all pending friend requests
- `acceptFriendRequest(requestId)` - Accepts a friend request
- `declineFriendRequest(requestId)` - Declines a friend request
- `getPendingRequestsCount()` - Gets count of pending requests for badge

**API Endpoints Expected:**
```
GET  /api/friends/requests         - Get all pending requests
POST /api/friends/requests/:id/accept  - Accept a request
POST /api/friends/requests/:id/decline - Decline a request
GET  /api/friends/requests/count   - Get count of pending requests
```

## UI/UX Features

1. **Visual Design:**
   - Consistent with existing design system
   - Gradient buttons for accept action
   - Professional avatars with fallback
   - Clean, modern card layout

2. **User Experience:**
   - Real-time badge updates (30s polling)
   - Instant feedback on actions
   - Disabled state during processing
   - Time-ago format for request timestamps
   - Empty state messaging

3. **Animations:**
   - Badge pulse animation
   - Button hover effects
   - Smooth transitions

## Data Structure Expected

### Friend Request Object
```javascript
{
  requestId: string,
  fromUser: {
    userId: string,
    username: string,
    displayName: string,
    profilePicture: string | null
  },
  createdAt: string (ISO timestamp),
  processing: boolean (local state)
}
```

### API Response Formats
```javascript
// GET /api/friends/requests
{
  requests: Array<FriendRequest>
}

// GET /api/friends/requests/count
{
  count: number
}
```

## Next Steps: Backend Implementation

The backend needs to implement the following endpoints:

1. **GET /api/friends/requests**
   - Return all pending friend requests for the authenticated user
   - Include sender's user information

2. **POST /api/friends/requests/:id/accept**
   - Accept the friend request
   - Create friendship relationship
   - Delete the friend request

3. **POST /api/friends/requests/:id/decline**
   - Decline the friend request
   - Delete the friend request

4. **GET /api/friends/requests/count**
   - Return count of pending requests for badge

5. **Database Schema:**
   - Friend requests table with status
   - Friendships table for accepted requests
   - Proper indexes for performance

## Testing Checklist

- [ ] Badge shows correct count on page load
- [ ] Badge updates every 30 seconds
- [ ] Badge clears when inbox is opened
- [ ] Accept button creates friendship
- [ ] Decline button removes request
- [ ] Loading states work correctly
- [ ] Empty state displays properly
- [ ] Time formatting works correctly
- [ ] Avatar fallback works for users without pictures
- [ ] Multiple requests can be handled simultaneously

