/** @type {import('dependency-cruiser').IConfiguration} */
const features = [
  'account',
  'admin',
  'audit-logs',
  'auth',
  'dashboard',
  'loans',
  'notifications',
]

const featureToFeatureRules = features.flatMap((feature) =>
  features
    .filter((other) => other !== feature)
    .map((other) => ({
      name: `no-${feature}-to-${other}`,
      comment: `Feature '${feature}' cannot import from feature '${other}'`,
      severity: 'error',
      from: { path: `^src/features/${feature}/` },
      to: { path: `^src/features/${other}/` },
    })),
)

export default {
  forbidden: [
    {
      name: 'no-shared-to-features',
      comment: 'Shared code cannot import from features',
      severity: 'error',
      from: { path: '^src/shared' },
      to: { path: '^src/features' },
    },
    {
      name: 'no-shared-to-app',
      comment: 'Shared code cannot import from app',
      severity: 'error',
      from: { path: '^src/shared' },
      to: { path: '^src/app' },
    },
    {
      name: 'no-features-to-app',
      comment: 'Features cannot import from app',
      severity: 'error',
      from: { path: '^src/features' },
      to: { path: '^src/app' },
    },
    ...featureToFeatureRules,
    {
      name: 'no-circular',
      comment: 'No circular dependencies in application code',
      severity: 'error',
      from: { path: '^src/' },
      to: { circular: true, path: '^src/' },
    },
    {
      name: 'no-unresolved-imports',
      comment: 'All imports must resolve',
      severity: 'error',
      from: { path: '^src/' },
      to: { couldNotResolve: true },
    },
    {
      name: 'no-prod-to-test',
      comment: 'Production code must not import test modules',
      severity: 'error',
      from: { path: '^src/', pathNot: '(__tests__/|\\.spec\\.|\\.test\\.)' },
      to: { path: '(__tests__/|\\.spec\\.|\\.test\\.)' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
  },
}
