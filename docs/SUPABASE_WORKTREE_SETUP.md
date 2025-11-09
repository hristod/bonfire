# Supabase with Git Worktrees - Setup Guide

## Problem

When using Git worktrees with Supabase, the CLI by default tries to initialize a Supabase instance based on the current directory name. This can cause issues when working in worktree directories with custom names (like `.worktrees/initial-setup`), as each worktree would try to create a separate Supabase instance with different project IDs.

## Solution

Use the `--workdir` flag with all Supabase CLI commands to explicitly point to the project root directory containing the `supabase/` folder.

### Current Project Structure

```
bonfire/                          # Main git repository
├── .worktrees/                   # Worktrees directory (gitignored)
│   └── initial-setup/            # Feature worktree
│       ├── supabase/             # Supabase configuration (lives here)
│       ├── app/                  # Expo app
│       └── package.json          # Scripts with --workdir flag
└── supabase/                     # Does NOT exist in main repo
```

**Important:** The `supabase/` directory only exists in the worktree, not in the main repository. This is intentional for this project structure.

### Updated Scripts

All Supabase commands in `package.json` use the `--workdir .` flag:

```json
{
  "scripts": {
    "supabase:start": "supabase start --workdir .",
    "supabase:stop": "supabase stop --workdir .",
    "supabase:reset": "supabase db reset --workdir .",
    "supabase:status": "supabase status --workdir .",
    "supabase:types": "supabase gen types typescript --local --workdir . > shared/types/supabase.ts"
  }
}
```

The `--workdir .` tells Supabase to use the current worktree directory as the project root.

### Manual Commands

When running Supabase commands manually from a worktree, always include `--workdir .`:

```bash
# From within a worktree directory
supabase start --workdir .
supabase status --workdir .
supabase db reset --workdir .
supabase migration new my_migration --workdir .
```

### Project ID Configuration

Each worktree can have its own `project_id` in `supabase/config.toml`:

```toml
project_id = "initial-setup"
```

This ensures that if you create multiple worktrees with their own Supabase configurations, they won't conflict with each other when running locally.

### Environment Variables Alternative

You can also set the `SUPABASE_WORKDIR` environment variable:

```bash
export SUPABASE_WORKDIR=/Users/hristodimitrov/projects/bonfire/.worktrees/initial-setup
supabase start
```

However, using `--workdir` in scripts is more explicit and portable.

### Best Practices

1. **Always use `--workdir` flag** when working in worktrees
2. **Use unique `project_id`** in each worktree's `config.toml` to avoid Docker container conflicts
3. **Run commands from the worktree root** where `supabase/` directory exists
4. **Use the npm/pnpm scripts** rather than direct CLI commands to ensure consistency

### Troubleshooting

**Error: "cannot read config in /path/to/project: open supabase/config.toml: no such file or directory"**

This means Supabase is looking in the wrong directory. Ensure:
1. You're running the command from the worktree root (where `supabase/` exists)
2. You're using the `--workdir .` flag
3. The `supabase/` directory exists in your current location

**Multiple Supabase instances running:**

If you accidentally started Supabase without the `--workdir` flag, you might have multiple instances:

```bash
# Stop all instances
docker ps | grep supabase | awk '{print $1}' | xargs docker stop

# Then start correctly
pnpm supabase:start
```

### References

- [Supabase CLI Issue #2139](https://github.com/supabase/cli/issues/2139) - Discussion about worktree support
- [Supabase Docs - Local Development](https://supabase.com/docs/guides/local-development)
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
