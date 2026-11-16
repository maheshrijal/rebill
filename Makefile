.PHONY: dev build preview test test-report

# Start the Vite dev server
dev:
	@npm run dev

# Build the static site into dist/
build:
	@npm run build

# Serve the production build locally
preview:
	@npm run preview

# Run Playwright tests
test:
	@echo "Running Playwright tests..."
	@npx playwright test

# Show Playwright test report
test-report:
	@echo "Opening test report..."
	@npx playwright show-report
