# Usage Tracking Documentation

## Analytics Implementation

GoalSpace uses a combination of client-side and server-side analytics tracking to monitor application usage, performance, and user behavior.

### Client-Side Analytics

The client-side analytics system is implemented in `/app/_lib/analytics.ts` and includes:

1. **Page View Tracking**: Automatically tracks page views as users navigate through the application
2. **Event Tracking**: Captures specific user interactions and actions
3. **Feature Usage Tracking**: Monitors which features are being used and how frequently
4. **Error Tracking**: Records errors that occur during user sessions
5. **User Identification**: Associates events with specific users (when authenticated)

### Server-Side Analytics

Server-side analytics (implemented in `/utils/server-analytics.ts`) is used for tracking events in server components and API routes, including:

1. **Authentication Events**: User registrations, logins, and auth errors
2. **API Usage**: Tracking API endpoint usage and performance
3. **Error Logging**: Capturing server-side errors

## Analytics Configuration

The analytics system uses PostHog as the primary provider and can be configured using the following environment variables:

```
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
POSTHOG_SERVER_KEY=your_posthog_server_side_key
```

## Events Tracked

### Authentication Events
- `login_attempt`: When a user attempts to log in
- `login_success`: When a user successfully logs in
- `login_error`: When a login attempt fails
- `user_registered`: When a new user is created
- `user_logged_in`: When an existing user logs in

### Goal Setting Events
- `goal_form_submitted`: When a user submits the goal form
- `goal_analysis_started`: When goal analysis begins
- `questions_generated`: When clarifying questions are generated
- `goal_analysis_with_answers`: When goal analysis with user answers begins
- `spaces_generated`: When learning spaces are successfully generated

### Feature Usage Events
- `feature_used`: Generic event for feature usage
- Various specific feature events for modules, chat, and content generation

### Error Events
- `error_occurred`: Generic error event
- Various specific error events for different components

## User Properties Tracked

When identifying users, the following properties may be recorded:

- User ID (required)
- Email (if available)
- Authentication method
- Signup date
- Last login date

## Privacy Considerations

- Personal identifiable information (PII) is minimized
- All data is processed according to our Privacy Policy
- Users can opt out of analytics by setting `NEXT_PUBLIC_ENABLE_ANALYTICS=false`
- No sensitive information like passwords is ever tracked

## Development vs. Production

- In development environments, events are logged to the console
- In production, events are sent to PostHog
- Additional debug information is included in development logs

## Adding New Analytics

When adding new features, include appropriate analytics by:

1. Importing the analytics functions:
   ```typescript
   import { trackEvent, trackFeatureUsage, trackError, identifyUser } from '@/app/_lib/analytics';
   ```

2. Adding event tracking at appropriate points:
   ```typescript
   // For general events
   trackEvent('event_name', { additional: 'data' });
   
   // For feature usage
   trackFeatureUsage('feature_name', { additional: 'data' });
   
   // For errors
   trackError('error_type', 'error message', { additional: 'data' });
   
   // For user identification
   identifyUser(userId, { email, other_traits });
   ```

3. For server components, use the server-side analytics:
   ```typescript
   import { trackEvent } from '@/utils/server-analytics';
   ```