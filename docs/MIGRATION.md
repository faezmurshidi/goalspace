# Migration Plan: Monorepo Architecture
**Version:** 1.0  
**Last Updated:** [Current Date]

## Phase 1: Setup and Initial Structure

### 1.1 Repository Setup
```bash
goalspace/
├── apps/
│   ├── web/               # goalspace.xyz
│   └── dashboard/         # app.goalspace.xyz
├── packages/
│   ├── ui/
│   ├── auth/
│   ├── goal-analyzer/
│   ├── database/
│   ├── ai/
│   ├── validation/
│   └── config/
├── package.json
└── turbo.json
```

### 1.2 Initial Configuration
1. Initialize Turborepo:
   ```bash
   npx create-turbo@latest
   ```

2. Root package.json setup:
   ```json
   {
     "private": true,
     "scripts": {
       "build": "turbo run build",
       "dev": "turbo run dev",
       "lint": "turbo run lint",
       "test": "turbo run test",
       "clean": "turbo run clean"
     },
     "devDependencies": {
       "turbo": "latest"
     }
   }
   ```

3. Turbo configuration (turbo.json):
   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "pipeline": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": [".next/**", "dist/**"]
       },
       "dev": {
         "cache": false,
         "persistent": true
       },
       "lint": {},
       "test": {
         "dependsOn": ["build"]
       }
     }
   }
   ```

## Phase 2: Package Extraction

### 2.1 Shared UI Components (packages/ui)
1. Extract shadcn components
2. Set up component library structure:
   ```bash
   packages/ui/
   ├── components/
   ├── styles/
   ├── hooks/
   ├── package.json
   └── tsconfig.json
   ```

### 2.2 Authentication Package (packages/auth)
1. Extract Supabase auth logic
2. Create shared auth hooks and utilities
3. Set up auth package structure:
   ```bash
   packages/auth/
   ├── src/
   │   ├── client.ts
   │   ├── hooks.ts
   │   └── types.ts
   ├── package.json
   └── tsconfig.json
   ```

### 2.3 Goal Analyzer Package (packages/goal-analyzer)
1. Extract goal analysis logic
2. Set up analyzer package structure:
   ```bash
   packages/goal-analyzer/
   ├── src/
   │   ├── analyzer.ts
   │   ├── prompts/
   │   └── types.ts
   ├── package.json
   └── tsconfig.json
   ```

## Phase 3: Application Split

### 3.1 Web Application (apps/web)
1. Create new Next.js application:
   ```bash
   cd apps/web
   npx create-next-app@latest
   ```

2. Structure:
   ```bash
   apps/web/
   ├── app/
   │   ├── page.tsx            # Landing page
   │   ├── analyze/
   │   └── auth/
   ├── features/
   │   └── goal-analysis/
   └── package.json
   ```

### 3.2 Dashboard Application (apps/dashboard)
1. Create new Next.js application:
   ```bash
   cd apps/dashboard
   npx create-next-app@latest
   ```

2. Structure:
   ```bash
   apps/dashboard/
   ├── app/
   │   ├── page.tsx            # Dashboard home
   │   ├── spaces/
   │   └── settings/
   ├── features/
   │   ├── spaces/
   │   └── mentors/
   └── package.json
   ```

## Phase 4: Data and State Management

### 4.1 Database Package Setup
1. Extract Supabase client configuration
2. Set up database package:
   ```bash
   packages/database/
   ├── src/
   │   ├── client.ts
   │   ├── schema.ts
   │   └── types.ts
   ├── package.json
   └── tsconfig.json
   ```

### 4.2 Environment Configuration
1. Create environment templates:
   ```bash
   apps/web/.env.example
   apps/dashboard/.env.example
   packages/database/.env.example
   ```

2. Document required environment variables

## Phase 5: Deployment Setup

### 5.1 Domain Configuration
1. Configure DNS for:
   - goalspace.xyz (web)
   - app.goalspace.xyz (dashboard)

2. Set up SSL certificates

### 5.2 CI/CD Pipeline
1. Create GitHub Actions workflows:
   ```yaml
   .github/workflows/
   ├── web.yml
   └── dashboard.yml
   ```

2. Configure deployment environments:
   - Development
   - Staging
   - Production

## Phase 6: Testing and Validation

### 6.1 Local Development Testing
1. Test concurrent app development:
   ```bash
   turbo dev
   ```

2. Verify hot reloading for both apps

### 6.2 Integration Testing
1. Test shared package updates
2. Verify authentication flow
3. Test goal analysis feature in both apps

## Phase 7: Migration Execution

### 7.1 Preparation
1. Freeze current development
2. Create backup of current codebase
3. Set up new repository structure

### 7.2 Step-by-Step Migration
1. Set up monorepo structure
2. Extract shared packages
3. Create new applications
4. Migrate existing code
5. Update dependencies
6. Test all features
7. Deploy to staging

### 7.3 Rollback Plan
1. Document rollback triggers
2. Maintain old codebase backup
3. Keep old deployment active during transition

## Phase 8: Post-Migration

### 8.1 Documentation Updates
1. Update development guides
2. Document new architecture
3. Update deployment procedures

### 8.2 Team Training
1. Conduct monorepo workflow training
2. Review new development processes
3. Document best practices

## Timeline and Dependencies

### Week 1-2: Setup and Package Extraction
- Repository setup
- Extract shared packages
- Initial configuration

### Week 3-4: Application Split
- Create web application
- Create dashboard application
- Configure shared dependencies

### Week 5: Testing and Deployment
- Set up CI/CD
- Configure domains
- Test all features

### Week 6: Migration and Launch
- Execute migration
- Deploy to production
- Monitor and fix issues

## Risk Mitigation

### Technical Risks
1. **Dependency Conflicts**
   - Solution: Strict version management
   - Regular dependency audits

2. **Performance Impact**
   - Solution: Monitor build times
   - Optimize Turborepo cache

3. **Integration Issues**
   - Solution: Comprehensive testing
   - Staged rollout

### Business Risks
1. **Service Disruption**
   - Solution: Staged migration
   - Quick rollback plan

2. **Development Slowdown**
   - Solution: Team training
   - Clear documentation

## Success Criteria
1. Both applications running independently
2. Shared packages working correctly
3. Development workflow smooth and efficient
4. Build and deployment processes automated
5. No degradation in performance
6. All features working as expected 