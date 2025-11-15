# CI/CD Workflows

This directory contains GitHub Actions workflows for automated testing and deployment.

## Workflows

### `ci.yml`
Main CI/CD pipeline that runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**
1. **Test** - Runs unit and integration tests
   - Sets up MySQL service
   - Installs dependencies
   - Runs linter (if configured)
   - Runs test suite
   - Uploads coverage reports to Codecov

2. **Performance** - Runs performance tests
   - Runs after test job succeeds
   - Executes performance benchmarks
   - Validates response times

## Environment Variables

The workflow uses the following environment variables (set in GitHub Secrets for production):

- `JWT_ACCESS_SECRET` - JWT access token secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `DEEPSEEK_API_KEY` - DeepSeek AI API key
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `MYSQL_HOST` - MySQL host
- `MYSQL_PASSWORD` - MySQL password
- `MYSQL_DATABASE` - MySQL database name

## Adding New Workflows

To add a new workflow:

1. Create a new `.yml` file in `.github/workflows/`
2. Define triggers (push, pull_request, schedule, etc.)
3. Define jobs and steps
4. Test locally using [act](https://github.com/nektos/act) or push to a test branch

## Local Testing

You can test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or download from https://github.com/nektos/act/releases

# Run workflow
act -j test
```

