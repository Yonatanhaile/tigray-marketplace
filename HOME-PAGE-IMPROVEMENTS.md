# Home Page Listing Improvements

## Problem
The home page was displaying listings purely based on creation date (newest first), which meant:
- Brand new listings from unverified sellers appeared immediately
- Popular, high-quality listings got buried quickly
- No consideration for seller reputation or listing quality

## Solution Implemented
Created a **smart scoring algorithm** that combines multiple factors to show the best listings on the home page.

## Changes Made

### 1. Backend - New Smart Listing Endpoint
**File:** `server/src/controllers/listingController.js`

Added `getHomePageListings()` function that calculates a composite score for each active listing based on:

#### Scoring Formula:
```javascript
finalScore = 
  (recencyScore * 0.25) +      // 25% - Recent listings still get visibility
  (popularityScore * 0.30) +   // 30% - Most viewed items
  (reputationScore * 0.30) +   // 30% - Trusted/verified sellers
  (qualityScore * 0.15);       // 15% - Good photos & descriptions
```

#### Score Components:

**1. Recency Score (25%)**
- Uses time-decay algorithm: `1 / (ageInDays + 1)^0.3`
- New listings get high score but it decays gradually
- Prevents 3-month-old listings from dominating

**2. Popularity Score (30%)**
- Based on view count: `min(views / 100, 1)`
- Normalized to 0-1 scale
- Rewards listings that users find interesting

**3. Reputation Score (30%)**
- Base score: 0.5
- +0.25 if seller has badges
- +0.25 if seller has verified KYC
- Total range: 0.5 to 1.0

**4. Quality Score (15%)**
- +0.5 if listing has images
- +0.5 if description > 100 characters
- Total range: 0.0 to 1.0

### 2. API Route
**File:** `server/src/routes/listings.js`

Added new route: `GET /api/listings/home`
- Public endpoint (uses optionalAuth)
- Returns top-scored listings
- Positioned before `/:id` route to avoid conflicts

### 3. Frontend API Service
**File:** `client/src/services/api.js`

Added `getHomePageListings()` method to `listingsAPI` object.

### 4. Home Page Component
**File:** `client/src/pages/Home.jsx`

**Changes:**
- Query key: `['listings', 'recent']` → `['listings', 'home']`
- API call: `getAll()` → `getHomePageListings()`
- Updated real-time socket invalidation to use correct query key
- Changed heading from "Recent Listings" to "Featured Listings"
- Fallback to "Recent Listings" if translation missing (backwards compatible)

## Benefits

### For Users:
✅ **Better Discovery** - See popular, high-quality items first
✅ **Trust Signals** - Verified sellers prioritized
✅ **Quality Content** - Listings with good photos/descriptions ranked higher
✅ **Fresh Content** - Recent listings still get visibility

### For Sellers:
✅ **Fair Exposure** - Quality matters, not just timing
✅ **Reputation Rewards** - Verified sellers get more visibility
✅ **Incentive for Quality** - Good photos/descriptions improve ranking

### For Marketplace:
✅ **Better Conversions** - Users see relevant, quality listings
✅ **Reduced Spam** - Poor quality listings naturally rank lower
✅ **Trust Building** - Verified sellers featured prominently

## How It Works

1. **Fetch all active listings** from database
2. **Calculate score** for each listing using the formula
3. **Sort by score** (highest to lowest)
4. **Return top N** listings (default: 6)

## Example Scoring

### Listing A: New from Verified Seller with 50 views
- Recency: 0.95 (1 day old)
- Popularity: 0.50 (50 views)
- Reputation: 1.0 (verified + badges)
- Quality: 1.0 (has images + good description)
- **Final Score: 0.84**

### Listing B: Old Unverified but Popular (500 views)
- Recency: 0.45 (30 days old)
- Popularity: 1.0 (500+ views)
- Reputation: 0.5 (no badges, no KYC)
- Quality: 1.0 (has images + good description)
- **Final Score: 0.72**

### Listing C: Brand New, No Views, Unverified
- Recency: 1.0 (just created)
- Popularity: 0.0 (no views yet)
- Reputation: 0.5 (no badges, no KYC)
- Quality: 0.5 (has images but short description)
- **Final Score: 0.48**

**Result:** Listing A appears first, followed by B, then C

## Testing

The changes are:
- ✅ Backwards compatible
- ✅ No breaking changes to existing API
- ✅ Translation-ready (uses existing i18n keys)
- ✅ Linting passed with no errors

## Admin Approval Still Required

This change does **NOT** affect the approval workflow:
- New listings still start with `status: 'pending'`
- Only `status: 'active'` listings appear on home page
- Admin must approve before any listing shows publicly

## Future Enhancements

Potential improvements to consider:
1. **Location-based scoring** - Prioritize listings from user's region
2. **Category diversity** - Show mix of categories instead of all electronics
3. **Time-of-day optimization** - Different scoring for peak/off-peak hours
4. **User preferences** - Personalized based on browsing history
5. **A/B testing** - Test different weight distributions in scoring formula

