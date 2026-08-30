import {defineConfig} from 'vitest/config'

export default defineConfig({
    resolve: {tsconfigPaths: true},
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/lib/**', 'src/server/api/**', 'src/server/db/services/pricing.service.ts'],
        },
    },
})
